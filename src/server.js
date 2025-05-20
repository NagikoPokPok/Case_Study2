const express = require('express');
const cors = require('cors');
const db = require('./models'); // Sequelize (MySQL)
const { connectSqlServer } = require('./database/sqlServerConnection');
const { getHumanData } = require('./controller/controller');  // Import controller
const redisClient = require('./utils/redisClient'); // Redis client
const { checkCircuitHealth, circuitState } = require('./service/service'); // Import circuit breaker status check

const { startConsumer } = require('./utils/rabbitConsumer'); // RabbitMQ consumer

const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
// const { startRabbitConsumer, onQueueUpdated } = require('../rabbitReceiver'); // Import consumer

//route
const route = require('./route/route');

//Human merge
let Humans = [];
let lastSuccessfulUpdate = null;
let isDataRefreshInProgress = false; // Flag to prevent concurrent refresh operations
let dataRefreshNeeded = false; // Flag to indicate if data refresh is needed

function getHumans() {
  return Humans;
}

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
    console.log('🔄 Starting data refresh process...');
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

      // Handle the data based on its structure
      const dataBatch = result;;

      if (!dataBatch || dataBatch.length === 0) {
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

async function handlePersonalChangeMessage(message) {
  console.log('Received message from personal_changes queue:', message);
  
  // Khi nhận được message, load lại dữ liệu mới
  await calculateOnServerStart();
}

// Khởi động consumer và xử lý message
async function startRabbitConsumer() {
  try {
    await startConsumer('personal_changes', handlePersonalChangeMessage);
    console.log('RabbitMQ consumer for personal_changes started');
  } catch (err) {
    console.error('Failed to start RabbitMQ consumer:', err);
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

// Listen for Socket.io connections
io.on('connection', (socket) => {
  console.log('A user connected');
  
  // Gửi trạng thái dữ liệu cho client mới kết nối
  socket.emit('dataStatus', { 
    hasData: Humans && Array.isArray(Humans) && Humans.length > 0,
    lastUpdate: lastSuccessfulUpdate,
    recordCount: Humans.length || 0
  });
  
  // Allow client to request data refresh
  socket.on('requestDataRefresh', () => {
    console.log('Client requested data refresh');
    // Flag check refresh needed
    dataRefreshNeeded = true;
    
    // Only start refresh if not already in progress
    if (!isDataRefreshInProgress) {
      calculateOnServerStart();
    } else {
      socket.emit('refreshStatus', { 
        status: 'queued', 
        message: 'Your refresh request has been queued' 
      });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Start RabbitMQ consumer (if available)
try {
  startRabbitConsumer();
} catch (err) {
  console.error('RabbitMQ consumer failed to start:', err);
  // Continue app execution even if RabbitMQ fails
}

// // Listen for RabbitMQ messages
// onQueueUpdated('benefit_plan_changes', async (message) => {
//   console.log('Emitting to WebSocket from benefit_plan_changes:', message);
//   io.emit('benefitPlanUpdated', { message });

//   // Flag check refresh needed
//   dataRefreshNeeded = true;
  
//   if (!isDataRefreshInProgress) {
//     await calculateOnServerStart();
//   }
// });

// onQueueUpdated('personal_changes', async (message) => {
//   console.log('Emitting to WebSocket from personal_changes:', message);
//   io.emit('personalChanged', { message });

//   // Flag check refresh needed
//   dataRefreshNeeded = true;
  
//   if (!isDataRefreshInProgress) {
//     await calculateOnServerStart();
//   }
// });

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
  
  // Load data only at the beginning
  try {
    await calculateOnServerStart();
  } catch (err) {
    console.error('Initial data load failed completely:', err);
  }

  await startRabbitConsumer();
  
  // Start the server regardless of database or data load success
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
    console.log(`Database status: MySQL ${mysqlConnected ? 'connected' : 'disconnected'}, SQL Server ${sqlServerConnected ? 'connected' : 'disconnected'}`);
  });
  
  // Thay thế setInterval với health check không làm mới dữ liệu
  setInterval(async () => {
    try {
      await checkCircuitHealth();
      
      // Không tự động làm mới dữ liệu nữa - chỉ khi cần thiết
      if (dataRefreshNeeded && !isDataRefreshInProgress) {
        console.log('Running scheduled data refresh based on flags');
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

module.exports = { getHumans };
