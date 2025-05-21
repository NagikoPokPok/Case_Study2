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

    setHumans(allHumans);
    // Delete old data from Redis cache
    const keys = [];
    for await (const key of redisClient.scanIterator({ MATCH: 'humanData:*' })) {
      if (key && typeof key === 'string' && key.trim() !== '') {
        keys.push(key);
      }
    }
    for (const key of keys) {
      await redisClient.del(key);
      console.log(`Deleted Redis cache key: ${key}`);
    }

    console.log(`🏁 Tổng cộng ${getHumans().length} bản ghi đã được load vào bộ nhớ`);

    // PHÁT SỰ KIỆN WEBSOCKET CHO CLIENT
    if (typeof io !== 'undefined') {
      io.emit('personalChanged', { message: 'Data updated from legacy system' });
      console.log('WebSocket event personalChanged emitted');
    }

    console.log(`🏁 Tổng cộng ${getHumans().length} bản ghi đã được load vào bộ nhớ`);

  } catch (err) {
    console.error('🚨 Lỗi khi tải dữ liệu Human:', err);
  }
}

async function handlePersonalChangeMessage(message) {
  console.log('Received message:', message);

  try {
    const humans = getHumans();
    const empId = Number(message.Employee_ID);
    const operation = message.Operation;
    const data = message.data;

    if (!empId && operation !== 'Delete') {
      console.warn('Message thiếu Employee_ID hoặc data, bỏ qua');
      return;
    }

    switch (operation) {
      case 'Add':
        {
          // Kiểm tra đã tồn tại chưa
          const exists = humans.some(h => h.Employee_Id === empId);
          if (!exists) {
            humans.push(data);
            console.log(`Added new employee with ID ${empId}`);
          } else {
            console.log(`Employee ID ${empId} đã tồn tại, không thêm`);
          }
        }
        break;

      case 'Update':
        {
          const idx = humans.findIndex(h => h.Employee_Id === empId);
          if (idx >= 0) {
            humans[idx] = { ...humans[idx], ...data };
            console.log(`Updated employee with ID ${empId}`);
          } else {
            // Nếu chưa có thì thêm mới
            humans.push(data);
            console.log(`Added new employee with ID ${empId} vì không tìm thấy khi update`);
          }
        }
        break;

      case 'Delete':
        {
          const idx = humans.findIndex(h => h.Employee_Id === empId);
          if (idx >= 0) {
            humans.splice(idx, 1);
            console.log(`Deleted employee with ID ${empId}`);
          } else {
            console.log(`Employee ID ${empId} không tồn tại để xóa`);
          }
        }
        break;

      default:
        console.warn(`Operation không hợp lệ: ${operation}`);
        return;
    }

    // Phát sự kiện websocket để frontend cập nhật
    if (typeof io !== 'undefined') {
      io.emit('personalChanged', {
        message: `${operation} employee ${empId}`,
        employeeId: empId,
        operation,
        employee: data || null
      });
      console.log('WebSocket event personalChanged emitted');
    }
  } catch (err) {
    console.error('Error handling personal change message:', err);
  } finally {
    isDataRefreshInProgress = false;
    
    // If another refresh was needed while we were processing, trigger it
    if (dataRefreshNeeded) {
      dataRefreshNeeded = false;
      setTimeout(() => handlePersonalChangeMessage(message), 1000);
    }
  }
}

// Add new employee
async function addHuman(human) {
    const response = await fetch('http://localhost:3000/api/humanList', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(human)
    });
    return await response.json();
}

// Update employee
async function updateHuman(id, human) {
    const response = await fetch(`http://localhost:3000/api/humanList/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(human)
    });
    return await response.json();
}

// Delete employee
async function deleteHuman(id) {
    const response = await fetch(`http://localhost:3000/api/humanList/${id}`, {
        method: 'DELETE'
    });
    return await response.json();
}

async function startRabbitConsumer() {
  try {
    await startConsumer(
      'personal_changes_exchange',       // Tên Exchange
      'personal_changes_myapp_queue',    // Queue riêng của hệ thống bạn
      handlePersonalChangeMessage,       // Hàm xử lý message nhận được
      'myapp'                           // senderId, để hệ thống bạn bỏ qua message do chính nó gửi
    );
    console.log('RabbitMQ consumer for personal_changes_exchange started');
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
