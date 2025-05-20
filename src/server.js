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
app.get('/api/humanList', async (req, res) => {
    try {
        if (!Humans || !Humans.data || Humans.data.length === 0) {
            console.log('No data available, attempting to load...');
            await calculateOnServerStart();
        }
        
        // Double-check data availability and proper structure
        if (Humans && Humans.data && Array.isArray(Humans.data) && Humans.data.length > 0) {
            // Ensure each record has a Total_Earning property
            const validatedData = {
                data: Humans.data.map(human => {
                    if (typeof human.Total_Earning === 'undefined') {
                        // Calculate Total_Earning if missing
                        const totalEarning = (human.Paid_To_Date || 0) + 
                                            (human.Average_Plan_Benefit || 0) + 
                                            ((human.Pay_Amount || 0) * 0.1);
                        
                        return {
                            ...human,
                            Total_Earning: totalEarning
                        };
                    }
                    return human;
                }),
                nextLastId: Humans.nextLastId,
                hasMore: Humans.hasMore,
                stats: Humans.stats || { 
                    recordCount: Humans.data.length,
                    fixedStructure: true
                }
            };
            
            console.log(`Returning ${validatedData.data.length} records to client`);
            res.json(validatedData);
        } else {
            console.log('No valid data structure available after attempted load');
            
            // Last effort - try to provide SOME data
            if (Humans && typeof Humans === 'object') {
                // If Humans is an array
                if (Array.isArray(Humans) && Humans.length > 0) {
                    const arrayData = {
                        data: Humans.map(human => ({
                            ...human,
                            Total_Earning: (human.Paid_To_Date || 0) + 
                                          (human.Average_Plan_Benefit || 0) + 
                                          ((human.Pay_Amount || 0) * 0.1)
                        })),
                        stats: { recordCount: Humans.length, fixedStructure: true }
                    };
                    
                    console.log(`Returning ${arrayData.data.length} records (fixed structure) to client`);
                    res.json(arrayData);
                    return;
                }
                
                // If Humans has any array property
                for (const key in Humans) {
                    if (Array.isArray(Humans[key]) && Humans[key].length > 0) {
                        const propData = {
                            data: Humans[key].map(human => ({
                                ...human,
                                Total_Earning: (human.Paid_To_Date || 0) + 
                                              (human.Average_Plan_Benefit || 0) + 
                                              ((human.Pay_Amount || 0) * 0.1)
                            })),
                            stats: { recordCount: Humans[key].length, fixedStructure: true }
                        };
                        
                        console.log(`Returning ${propData.data.length} records from property ${key} to client`);
                        res.json(propData);
                        return;
                    }
                }
            }
            
            res.status(503).json({ 
                error: 'Data unavailable', 
                message: 'No data available. Services may be initializing.' 
            });
        }
    } catch (error) {
        console.error('API endpoint error:', error);
        res.status(500).json({
            error: 'Server error',
            message: error.message
        });
    }
});

// API to return human data with pagination
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
        lastId += 50000; // Increase lastId to avoid infinite loop
        batchCount++;
        console.log(`📦 Batch ${batchCount}: No more data to load (Total: ${allHumans.length}); lastID = ${lastId}`);
        continue;
      }

      allHumans.push(...dataBatch);
      lastId = dataBatch[dataBatch.length - 1]?.Employee_Id || lastId;
      batchCount++;

      console.log(`📦 Batch ${batchCount}: Loaded ${dataBatch.length} records (Total: ${allHumans.length})`);

      if (batchCount >= 11 && batchCount <= 13) {
        console.log(`Batch ${batchCount} first record:`, dataBatch[0]);
      }
    }

    // Update the global Humans object with proper structure
    Humans = {
      data: allHumans,
      stats: {
        recordCount: allHumans.length,
        fixedStructure: true,
        fromCache: false
      }
    };

    lastSuccessfulUpdate = new Date().toISOString();
    console.log(`🏁 Total ${Humans.data.length} records loaded into memory`);

    // Debug last records
    if (Humans.data.length > 500000) {
      console.log("Sample employee record:", Humans.data[100000]);
      console.log("Sample person record:", Humans.data[500099]);
    }

    // Notify connected clients of update
    io.emit('dataUpdated', {
      timestamp: lastSuccessfulUpdate,
      recordCount: Humans.data.length,
      fromCache: false
    });

    return true;

  } catch (err) {
    console.error('🚨 Error while calculating data on server start:', err);

    // Fallback to cache if available
    try {
      const cachedData = await redisClient.get('humanData:50300:0');
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        if (parsedData && typeof parsedData === 'object') {
          if (parsedData.data && Array.isArray(parsedData.data)) {
            Humans = parsedData;
          } else if (Array.isArray(parsedData)) {
            Humans = { data: parsedData };
          }

          if (Humans && Humans.data) {
            lastSuccessfulUpdate = new Date().toISOString();
            console.log(`✅ Loaded ${Humans.data.length} records from Redis cache`);
            
            io.emit('dataUpdated', {
              timestamp: lastSuccessfulUpdate,
              recordCount: Humans.data.length,
              fromCache: true
            });
            
            return true;
          }
        }
      }
    } catch (cacheErr) {
      console.error('❌ Cache fallback failed:', cacheErr);
    }

    io.emit('dataUnavailable', { message: 'Neither database nor cache data available' });
    return false;
  }
}

// Create HTTP server and Socket.IO instance
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