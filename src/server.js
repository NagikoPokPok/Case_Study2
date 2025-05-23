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
const socketManager = require('./websocket/socketManager'); // Socket.io manager
const path = require('path');
// const { startRabbitConsumer, onQueueUpdated } = require('../rabbitReceiver'); // Import consumer

//route
const route = require('./route/route');
const { setHumans, getHumans } = require('./utils/dataStore');

//Human merge
// let Humans = [];
let lastSuccessfulUpdate = null;
let isDataRefreshInProgress = false; // Flag to prevent concurrent refresh operations
let dataRefreshNeeded = false; // Flag to indicate if data refresh is needed

// async function getHumans() {
//   return Humans;
// }

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
  console.log('Received request for human data: ', getHumans().length);
  if (getHumans() && Array.isArray(getHumans()) && getHumans().length > 0) {
    res.json(getHumans());
  } else {
    res.status(503).json({ 
      error: 'Data unavailable', 
      message: 'No data is currently available. Services may be initializing or experiencing issues.' 
    });
  }
});

async function clearAllRedisCache() {
  try {
    if (!redisClient.isReady) {
      console.log('⚠️ Redis not connected, skipping cache clear');
      return;
    }

    console.log('🗑️ Clearing all Redis cache...');
    
    // Method 1: Clear all humanData keys
    const keys = [];
    for await (const key of redisClient.scanIterator({ MATCH: 'humanData:*' })) {
      if (key && typeof key === 'string' && key.trim() !== '') {
        keys.push(key);
      }
    }
    
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`✅ Deleted ${keys.length} Redis cache keys`);
    }

    // Method 2: Also clear any other related cache patterns
    const otherKeys = [];
    for await (const key of redisClient.scanIterator({ MATCH: '*human*' })) {
      if (key && typeof key === 'string' && key.trim() !== '') {
        otherKeys.push(key);
      }
    }
    
    if (otherKeys.length > 0) {
      await redisClient.del(otherKeys);
      console.log(`✅ Deleted ${otherKeys.length} additional cache keys`);
    }

  } catch (err) {
    console.error('❌ Error clearing Redis cache:', err);
  }
}

// Hàm gọi API tính toán khi server chạy lần đầu
async function calculateOnServerStart() {
  try {
    console.log('🔄 Starting data refresh process...');

    await clearAllRedisCache();

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

    console.log("Humans[0]: ", allHumans[0]);
    setHumans(allHumans);
    
    // Delete old data from Redis cache
    lastSuccessfulUpdate = new Date().toISOString();

    console.log(`🏁 Tổng cộng ${getHumans().length} bản ghi đã được load vào bộ nhớ`);

  } catch (err) {
    console.error('🚨 Lỗi khi tải dữ liệu Human:', err);
  }
}

function cleanData(data) {
  return Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined && v !== null && v !== '')
  );
}

async function handlePersonalChangeMessage(message) {
  console.log('Received message:', message);

  try {
    if (isDataRefreshInProgress) {
      console.log('⏳ Data refresh already in progress, queuing...');
      dataRefreshNeeded = true;
      return;
    }

    isDataRefreshInProgress = true;

    const humans = getHumans();
    const empId = Number(message.Employee_ID);
    const operation = message.Operation;
    const data = {
        Employee_Id: empId,
        First_Name: message.First_Name,
        Last_Name: message.Last_Name,
        ShareHolder: message.Shareholder_Status,
        Gender: message.Gender,
        Ethnicity: message.Ethnicity,
        PayRates_id: message.PayRates_id,
        Paid_To_Date: message.Paid_To_Date,
        Paid_Last_Year: message.Paid_Last_Year,
        Vacation_Days: message.Vacation_Days,
        Benefit_Plan: message.Benefit_Plans
    };
    
    const newData = cleanData(data);

    if (!empId && operation !== 'Delete') {
      console.warn('Message thiếu Employee_ID hoặc data, bỏ qua');
      return;
    }

    switch (operation) {
      case 'Create':
        {
          // Check if the employee already exists
          const exists = humans.some(h => h.Employee_Id === empId);
          if (!exists) {
            humans.push(newData);
            console.log(`Added new employee with ID ${empId}`);
            operationSuccess = true;

            // Update Redis cache
            if (redisClient.isReady) {
              await redisClient.setEx(`humanData:${empId}`, 3600, JSON.stringify(data)); // TTL 1 giờ
              console.log(`Redis cache set for added Employee_Id ${empId}`);
            }
          } else {
            console.log(`Employee ID ${empId} đã tồn tại, không thêm`);
          }
        }
        break;

      case 'Update':
        {
          const idx = humans.findIndex(h => h.Employee_Id === empId);
          if (idx >= 0) {
            humans[idx] = { ...humans[idx], ...newData };
            console.log(`Updated employee with ID ${empId}`);
            console.log('new humans' , humans[idx]);
            operationSuccess = true;

            // Update Redis cache
            if (redisClient.isReady) {
              await redisClient.setEx(`humanData:${empId}`, 3600, JSON.stringify(humans[idx]));
              console.log(`Redis cache updated for updated Employee_Id ${empId}`);
            }
          } else {
            // Nếu chưa có thì thêm mới
            humans.push(newData);
            console.log(`Added new employee with ID ${empId} vì không tìm thấy khi update`);
            operationSuccess = true;

            // Update Redis cache
            if (redisClient.isReady) {
              await redisClient.setEx(`humanData:${empId}`, 3600, JSON.stringify(data));
              console.log(`Redis cache set for new Employee_Id ${empId} on update`);
            }
          }
        }
        break;

      case 'Delete':
        {
          const idx = humans.findIndex(h => h.Employee_Id === empId);
          if (idx >= 0) {
            humans.splice(idx, 1);
            console.log(`Deleted employee with ID ${empId}`);
            operationSuccess = true;

            // Xóa cache Redis key tương ứng
            if (redisClient.isReady) {
              await redisClient.del(`humanData:${empId}`);
              console.log(`Redis cache deleted for deleted Employee_Id ${empId}`);
            }
          } else {
            console.log(`Employee ID ${empId} không tồn tại để xóa`);
          }
        }
        break;

      default:
        console.warn(`Operation không hợp lệ: ${operation}`);
        return;
    }

    if (operationSuccess) {
      // Update timestamp
      lastSuccessfulUpdate = new Date().toISOString();
      
      // Update humans data in memory
      if (redisClient.isReady) {
        // Clear any aggregate cache that might be affected
        const aggregateKeys = [];
        for await (const key of redisClient.scanIterator({ MATCH: '*total*' })) {
          if (key && typeof key === 'string' && key.trim() !== '') {
            aggregateKeys.push(key);
          }
        }
        if (aggregateKeys.length > 0) {
          await redisClient.del(aggregateKeys);
          console.log(`💾 Cleared ${aggregateKeys.length} aggregate cache keys`);
        }
      }

      // Emit WebSocket event to all connected clients
      if (typeof io !== 'undefined') {
        const updatedData = {
          operation,
          employeeId: empId,
          updatedEmployee: operation !== 'Delete' ? newData : null,
          totalRecords: getHumans().length,
          timestamp: lastSuccessfulUpdate,
          message: `${operation} employee ${empId} successfully`
        };

        // Emit to all connected clients
        io.emit('personalChanged', updatedData);
        console.log(`📡 WebSocket event 'personalChanged' emitted:`, {
          operation,
          employeeId: empId,
          totalRecords: getHumans().length
        });

        // Also emit a general data refresh event
        io.emit('dataRefreshNeeded', {
          reason: `Employee ${operation}`,
          timestamp: lastSuccessfulUpdate,
          affectedId: empId
        });
        console.log(`📡 WebSocket event 'dataRefreshNeeded' emitted`);
      }
    }

  } catch (err) {
    console.error('❌ Error handling personal change message:', err);
  } finally {
    isDataRefreshInProgress = false;
    
    // If another refresh was needed while we were processing, trigger it
    if (dataRefreshNeeded) {
      dataRefreshNeeded = false;
      console.log('🔄 Processing queued data refresh...');
      setTimeout(() => handlePersonalChangeMessage(message), 1000);
    }
  }
}

async function startRabbitConsumer() {
  try {
    await startConsumer(
      'person-events-exchange',       // Tên Exchange
      'dashboard-queue',    // Queue riêng của hệ thống bạn
      handlePersonalChangeMessage,       // Hàm xử lý message nhận được
      'myapp'                           // senderId, để hệ thống bạn bỏ qua message do chính nó gửi
    );
    console.log('RabbitMQ consumer for person-events-exchange started');
  } catch (err) {
    console.error('Failed to start RabbitMQ consumer:', err);
  }
}

// Tạo server HTTP và kết nối với Socket.io
const server = http.createServer(app);
const io = socketManager.initialize(server).io;

// Start RabbitMQ consumer (if available)
try {
  startRabbitConsumer();
} catch (err) {
  console.error('RabbitMQ consumer failed to start:', err);
  // Continue app execution even if RabbitMQ fails
}

// Phục vụ trang HTML (frontend)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/triggerRefresh', async (req, res) => {
  try {
    // Check if a refresh is already in progress
    if (isDataRefreshInProgress) {
      return res.status(429).json({ message: 'A data refresh is already in progress' });
    }
    
    await clearAllRedisCache();

    // Trigger a data refresh with a dummy message
    await handlePersonalChangeMessage({ source: 'manual', trigger: 'api' });
    
    // Return success
    res.json({ message: 'Data refresh triggered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger refresh', message: err.message });
  }
});

// Add API endpoint to get WebSocket connection status
app.get('/api/socket/status', (req, res) => {
  try {
    const socketManagerInstance = socketManager.getInstance();
    res.json({
      connections: socketManagerInstance.getConnectionCount(),
      status: 'active'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get socket status', message: err.message });
  }
});

app.post('/api/clearCache', async (req, res) => {
  try {
    await clearAllRedisCache();
    res.json({ message: 'Cache cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear cache', message: err.message });
  }
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

    await clearAllRedisCache();
    
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
    // Just do an initial circuit health check
  try {
    await checkCircuitHealth();
  } catch (err) {
    console.error('Initial health check failed:', err);
  }
}

// Start the application
startApp().catch(err => {
  console.error('Fatal application error:', err);
});
