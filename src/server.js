const express = require('express');
const cors = require('cors');
const db = require('./models'); // Sequelize (MySQL)
const { connectSqlServer } = require('./database/sqlServerConnection');
const { getHumanData } = require('./controller/controller');  // Import controller
const { getEmployeeStats } = require('./controller/employeeStatsController'); // Get data for chart
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
let isDataRefreshInProgress = false; // Flag to prevent concurrent refresh operations
let dataRefreshNeeded = false; // Flag to indicate if data refresh is needed

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

// API to return employee stats
async function calculateOnServerStart() {
  // If data refresh is already in progress, do not start a new one
  if (isDataRefreshInProgress) {
    console.log('🔄 Data refresh already in progress, marking for future refresh');
    dataRefreshNeeded = true;
    return;
  }

  // Đánh dấu đang trong quá trình refresh
  isDataRefreshInProgress = true;
  dataRefreshNeeded = false;
  
  try {
    console.log('🔄 Starting data refresh process...');
    let lastId = 0;
    let allHumans = [];
    let batchCount = 0;
    
    const startTime = Date.now();

    while (batchCount < 20 && lastId < 1000000) {
      const result = await getHumanData({
        query: {
          limit: 50000,
          lastId
        }
      });

      // Debug the result structure
      console.log(`Result type: ${typeof result}, has data: ${result && typeof result.data !== 'undefined'}, data length: ${result && result.data ? result.data.length : 'N/A'}`);

      // Handle the data based on its structure
      let dataBatch;
      if (result && result.data && Array.isArray(result.data)) {
        dataBatch = result.data;
      } else if (Array.isArray(result)) {
        dataBatch = result;
      } else if (result && typeof result === 'object') {
        // Look for any array property
        const arrayProp = Object.keys(result).find(key => Array.isArray(result[key]) && result[key].length > 0);
        dataBatch = arrayProp ? result[arrayProp] : null;
      }

      if (!dataBatch || dataBatch.length === 0) {
        lastId += 50000; // Tăng lastId để tránh vòng lặp vô hạn
        batchCount++;
        console.log(`📦 Batch ${batchCount}: Không còn dữ liệu để tải (Tổng: ${allHumans.length}); lastID = ${lastId}`);
        continue;
      }

      allHumans.push(...dataBatch);
      
      // Get the last Employee_Id from the last batch
      if (dataBatch.length > 0 && dataBatch[dataBatch.length - 1]?.Employee_Id) {
        lastId = dataBatch[dataBatch.length - 1].Employee_Id;
      } else {
        lastId += 50000; // Backup increment if there is not Employee_Id
      }
      
      batchCount++;

      console.log(`📦 Batch ${batchCount}: Đã tải thêm ${dataBatch.length} bản ghi (Tổng: ${allHumans.length})`);
    }

    // Update the Humans variable with the new data
    Humans = allHumans;
    lastSuccessfulUpdate = new Date().toISOString();
    console.log(`🏁 Tổng cộng ${Humans.length} bản ghi đã được load vào bộ nhớ trong ${(Date.now() - startTime) / 1000} giây`);
    
    // Announce the data update to all connected clients
    io.emit('dataUpdated', {
      timestamp: lastSuccessfulUpdate,
      recordCount: Humans.length,
      fromCache: false
    });

    return true;
  } catch (err) {
    console.error('🚨 Lỗi khi tải dữ liệu Human:', err);
    return false;
  } finally {
    // End the refresh process
    isDataRefreshInProgress = false;
    
    // Check if data refresh was requested during the process
    if (dataRefreshNeeded) {
      console.log('⚠️ Additional data refresh was requested during process, scheduling another refresh');
      // Chờ 10 giây trước khi thực hiện refresh mới
      setTimeout(() => calculateOnServerStart(), 10000);
    }
  }
}

// Create a new HTTP server and attach Socket.io
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

// Listen for RabbitMQ messages
onQueueUpdated('benefit_plan_changes', async (message) => {
  console.log('Emitting to WebSocket from benefit_plan_changes:', message);
  io.emit('benefitPlanUpdated', { message });

  // Flag check refresh needed
  dataRefreshNeeded = true;
  
  if (!isDataRefreshInProgress) {
    await calculateOnServerStart();
  }
});

onQueueUpdated('personal_changes', async (message) => {
  console.log('Emitting to WebSocket from personal_changes:', message);
  io.emit('personalChanged', { message });

  // Flag check refresh needed
  dataRefreshNeeded = true;
  
  if (!isDataRefreshInProgress) {
    await calculateOnServerStart();
  }
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
  
  // Load data only at the beginning
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