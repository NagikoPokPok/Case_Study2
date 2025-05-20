const express = require('express');
const cors = require('cors');
const db = require('./models'); // Sequelize (MySQL)
const { connectSqlServer } = require('./database/sqlServerConnection');
const { getHumanData } = require('./controller/controller');  // Import controller
const redisClient = require('./utils/redisClient'); // Redis client
const { checkCircuitHealth, circuitState } = require('./service/service'); // Import circuit breaker status check

const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { startRabbitConsumer, onQueueUpdated } = require('../rabbitReceiver'); // Import consumer

//route
const route = require('./route/route');

//Human merge
let Humans = [];
let lastSuccessfulUpdate = null;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '')));

//use route
app.use('/api/route', route);

// Middleware to check database status
app.use('/api/status', async (req, res) => {
  try {
    await checkCircuitHealth();
    res.json({
      mysql: !circuitState.mysqlCircuitOpen ? 'connected' : 'disconnected',
      sqlServer: !circuitState.sqlServerCircuitOpen ? 'connected' : 'disconnected',
      redis: redisClient.isReady ? 'connected' : 'disconnected',
      lastSuccessfulUpdate: lastSuccessfulUpdate
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not check status', message: err.message });
  }
});

// API to return human data
app.get('/api/humanList', (req, res) => {
  console.log('Received request for human data: ', Humans.length);
  if (Humans && Array.isArray(Humans) && Humans.length > 0) {
    res.json(Humans);
  } else {
    res.status(503).json({ 
      error: 'Data unavailable', 
      message: 'No data is currently available. Services may be initializing or experiencing issues.' 
    });
  }
});

// Hàm gọi API tính toán khi server chạy lần đầu
async function calculateOnServerStart() {
  try {
    let lastId = 0;
    let allHumans = [];
    let batchCount = 0;

    while (batchCount < 20 && lastId < 1000000) {
      const result = await getHumanData({
        query: {
          limit: 50000,
          lastId
        }
      });
      // console.log('Đã tải dữ liệu từ API:', result);

      const dataBatch = result;
      // console.log('Đã tải dữ liệu từ API:', result.length);
      if (!dataBatch || dataBatch.length === 0) {
        // console.log('⛔ Không còn dữ liệu để tải.');
        lastId += 50000; // Tăng lastId để tránh vòng lặp vô hạn
        batchCount++;
        console.log(`📦 Batch ${batchCount}: Không còn dữ liệu để tải (Tổng: ${allHumans.length}); lastID = ${lastId}`);
        continue;
      }

      allHumans.push(...dataBatch);
      lastId = result[result.length - 1]?.Employee_Id || lastId; // Tăng lastId để tải dữ liệu tiếp theo 
      batchCount++;

      console.log(`📦 Batch ${batchCount}: Đã tải thêm ${dataBatch.length} bản ghi (Tổng: ${allHumans.length})`);
    }

    Humans = allHumans;
    console.log(`🏁 Tổng cộng ${Humans.length} bản ghi đã được load vào bộ nhớ`);

  } catch (err) {
    console.error('🚨 Lỗi khi tải dữ liệu Human:', err);
  }
}

// Tạo server HTTP và kết nối với Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Start RabbitMQ consumer (if available)
try {
  startRabbitConsumer();
} catch (err) {
  console.error('RabbitMQ consumer failed to start:', err);
  // Continue app execution even if RabbitMQ fails
}

// Lắng nghe thông điệp từ các queue và gửi qua WebSocket
onQueueUpdated('benefit_plan_changes', async (message) => {
  console.log('Emitting to WebSocket from benefit_plan_changes:', message);
  io.emit('benefitPlanUpdated', { message });

  // Try to update data on change notification
  try {
    await calculateOnServerStart();
  } catch (err) {
    console.error('Failed to update data after benefit plan change:', err);
  }
});

onQueueUpdated('personal_changes', async (message) => {
  console.log('Emitting to WebSocket from personal_changes:', message);
  io.emit('personalChanged', { message });

  // Try to update data on change notification
  try {
    await calculateOnServerStart();
  } catch (err) {
    console.error('Failed to update data after personal change:', err);
  }
});

// Frontend connection via WebSocket
io.on('connection', (socket) => {
  console.log('A user connected');
  
  // Send data status to newly connected client
  socket.emit('dataStatus', { 
    hasData: Humans && Humans.data && Humans.data.length > 0,
    lastUpdate: lastSuccessfulUpdate,
    recordCount: Humans?.data?.length || 0
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Phục vụ trang HTML (frontend)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


async function startApp() {
  console.log('Starting application...');
  let mysqlConnected = false;
  let sqlServerConnected = false;
  
  // Try to connect to MySQL, but continue even if it fails
  try {
    await db.sequelize.authenticate();
    console.log('✅ MySQL connected');
    mysqlConnected = true;
  } catch (err) {
    console.error('🚨 MySQL connection error:', err);
  }
  
  // Try to connect to SQL Server, but continue even if it fails
  try {
    await connectSqlServer();
    sqlServerConnected = true;
  } catch (err) {
    console.error('🚨 SQL Server connection error:', err);
  }
  
  // Try to connect to Redis, but continue even if it fails
  if (!redisClient.isReady) {
    console.error('⚠️ Redis client not ready. Will keep trying to connect...');
  }
  
  // Try to load data - even if databases are down, we might get cached data
  try {
    await calculateOnServerStart();
  } catch (err) {
    console.error('Initial data load failed completely:', err);
  }
  
  // Start the server regardless of database or data load success
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
    console.log(`Database status: MySQL ${mysqlConnected ? 'connected' : 'disconnected'}, SQL Server ${sqlServerConnected ? 'connected' : 'disconnected'}`);
  });
  
  // Schedule periodic health checks and data refreshes
  setInterval(async () => {
    try {
      await checkCircuitHealth();
      
      // If we have successful database connections, try to refresh data
      if (!circuitState.mysqlCircuitOpen || !circuitState.sqlServerCircuitOpen) {
        await calculateOnServerStart();
      }
    } catch (err) {
      console.error('Scheduled health check failed:', err);
    }
  }, 60000); // Check every minute
}

// Start the application
startApp().catch(err => {
  console.error('Fatal application error:', err);
});