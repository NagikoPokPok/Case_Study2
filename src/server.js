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
// app.get('/api/humanList', async (req, res) => {
//     try {
//         if (!Humans || !Humans.data || Humans.data.length === 0) {
//             console.log('No data available, attempting to load...');
//             await calculateOnServerStart();
//         }
        
//         // Double-check data availability and proper structure
//         if (Humans && Humans.data && Array.isArray(Humans.data) && Humans.data.length > 0) {
//             // Ensure each record has a Total_Earning property
//             const validatedData = {
//                 data: Humans.data.map(human => {
//                     if (typeof human.Total_Earning === 'undefined') {
//                         // Calculate Total_Earning if missing
//                         const totalEarning = (human.Paid_To_Date || 0) + 
//                                             (human.Average_Plan_Benefit || 0) + 
//                                             ((human.Pay_Amount || 0) * 0.1);
                        
//                         return {
//                             ...human,
//                             Total_Earning: totalEarning
//                         };
//                     }
//                     return human;
//                 }),
//                 nextLastId: Humans.nextLastId,
//                 hasMore: Humans.hasMore,
//                 stats: Humans.stats || { 
//                     recordCount: Humans.data.length,
//                     fixedStructure: true
//                 }
//             };
            
//             console.log(`Returning ${validatedData.data.length} records to client`);
//             res.json(validatedData);
//         } else {
//             console.log('No valid data structure available after attempted load');
            
//             // Last effort - try to provide SOME data
//             if (Humans && typeof Humans === 'object') {
//                 // If Humans is an array
//                 if (Array.isArray(Humans) && Humans.length > 0) {
//                     const arrayData = {
//                         data: Humans.map(human => ({
//                             ...human,
//                             Total_Earning: (human.Paid_To_Date || 0) + 
//                                           (human.Average_Plan_Benefit || 0) + 
//                                           ((human.Pay_Amount || 0) * 0.1)
//                         })),
//                         stats: { recordCount: Humans.length, fixedStructure: true }
//                     };
                    
//                     console.log(`Returning ${arrayData.data.length} records (fixed structure) to client`);
//                     res.json(arrayData);
//                     return;
//                 }
                
//                 // If Humans has any array property
//                 for (const key in Humans) {
//                     if (Array.isArray(Humans[key]) && Humans[key].length > 0) {
//                         const propData = {
//                             data: Humans[key].map(human => ({
//                                 ...human,
//                                 Total_Earning: (human.Paid_To_Date || 0) + 
//                                               (human.Average_Plan_Benefit || 0) + 
//                                               ((human.Pay_Amount || 0) * 0.1)
//                             })),
//                             stats: { recordCount: Humans[key].length, fixedStructure: true }
//                         };
                        
//                         console.log(`Returning ${propData.data.length} records from property ${key} to client`);
//                         res.json(propData);
//                         return;
//                     }
//                 }
//             }
            
//             res.status(503).json({ 
//                 error: 'Data unavailable', 
//                 message: 'No data available. Services may be initializing.' 
//             });
//         }
//     } catch (error) {
//         console.error('API endpoint error:', error);
//         res.status(500).json({
//             error: 'Server error',
//             message: error.message
//         });
//     }
// });

// // Hàm gọi API tính toán khi server chạy lần đầu
// async function calculateOnServerStart() {
//   try {
//     // Gọi controller với chỉ request params
//     const result = await getHumanData({ 
//       query: {
//         limit: 50300, 
//         lastId: 0 
//       }
//     });
    
//     Humans = result; // Lưu kết quả vào biến Humans
//     console.log('Đã cập nhật dữ liệu Humans mới nhất');
//   } catch (err) {
//     console.error('🚨 Error while calculating data on server start:', err);
//   }
// }

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

    //   console.log(`📦 Batch ${batchCount}: Loaded ${dataBatch.length} records (Total: ${allHumans.length})`);

    //   if (batchCount >= 11 && batchCount <= 13) {
    //     console.log(`Batch ${batchCount} first record:`, dataBatch[0]);
    //   }
    // }

    // // Update the global Humans object with proper structure
    // Humans = {
    //   data: allHumans,
    //   stats: {
    //     recordCount: allHumans.length,
    //     fixedStructure: true,
    //     fromCache: false
    //   }
    // };

    // lastSuccessfulUpdate = new Date().toISOString();
    // console.log(`🏁 Total ${Humans.data.length} records loaded into memory`);

    // // Debug last records
    // if (Humans.data.length > 500000) {
    //   console.log("Sample employee record:", Humans.data[500199]);
    //   console.log("Sample person record:", Humans.data[500099]);
    // }

    // // Notify connected clients of update
    // io.emit('dataUpdated', {
    //   timestamp: lastSuccessfulUpdate,
    //   recordCount: Humans.data.length,
    //   fromCache: false
    // });

    // return true;

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

async function calculateOnServerStart() {
  try {
    // Gọi controller với chỉ request params
    const result = await getHumanData({ 
      query: {
        limit: 50300, 
        lastId: 0 
      }
    });
    
    // Debug the result structure
    console.log(`Result type: ${typeof result}, has data: ${result && typeof result.data !== 'undefined'}, data length: ${result && result.data ? result.data.length : 'N/A'}`);
    
    if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
      Humans = result;
      lastSuccessfulUpdate = new Date().toISOString();
      console.log(`✅ Human data updated - ${result.data.length} records`);
      
      // Notify connected clients of update
      io.emit('dataUpdated', { 
        timestamp: lastSuccessfulUpdate,
        recordCount: result.data.length,
        fromCache: result.stats?.fromCache || false 
      });
      
      return true;
    } else {
      console.error('⚠️ Update completed but returned no data or invalid data structure:', result);
      
      // Try to fix the structure if possible
      if (result && typeof result === 'object') {
        // If result is an array itself (no data property)
        if (Array.isArray(result) && result.length > 0) {
          Humans = { data: result };
          lastSuccessfulUpdate = new Date().toISOString();
          console.log(`✅ Fixed array structure - ${result.length} records`);
          
          io.emit('dataUpdated', { 
            timestamp: lastSuccessfulUpdate,
            recordCount: result.length,
            fromCache: false
          });
          
          return true;
        }
        
        // If result has array property but not called 'data'
        const possibleArrayProps = Object.keys(result).filter(key => Array.isArray(result[key]) && result[key].length > 0);
        if (possibleArrayProps.length > 0) {
          const arrayProp = possibleArrayProps[0];
          Humans = { data: result[arrayProp] };
          lastSuccessfulUpdate = new Date().toISOString();
          console.log(`✅ Fixed structure using ${arrayProp} property - ${result[arrayProp].length} records`);
          
          io.emit('dataUpdated', { 
            timestamp: lastSuccessfulUpdate,
            recordCount: result[arrayProp].length,
            fromCache: false
          });
          
          return true;
        }
      }
      
      return false;
    }
  } catch (err) {
    console.error('🚨 Error while calculating data on server start:', err);
    
    // Check if we have previously loaded data
    if (Humans && Humans.data && Humans.data.length > 0) {
      io.emit('dataUpdateFailed', { 
        message: 'Update failed, using previous data',
        lastSuccessfulUpdate: lastSuccessfulUpdate
      });
      return false;
    } else {
      // Try to load from cache directly as a last resort
      try {
        const cachedData = await redisClient.get('humanData:50300:0');
        if (cachedData) {
          try {
            const parsedData = JSON.parse(cachedData);
            
            // Validate and fix the parsed data if needed
            if (parsedData && typeof parsedData === 'object') {
              // Check if parsedData has data property
              if (parsedData.data && Array.isArray(parsedData.data) && parsedData.data.length > 0) {
                Humans = parsedData;
                lastSuccessfulUpdate = new Date().toISOString();
                console.log(`✅ Loaded valid data from Redis cache - ${parsedData.data.length} records`);
              } 
              // Check if parsedData is array itself
              else if (Array.isArray(parsedData) && parsedData.length > 0) {
                Humans = { data: parsedData };
                lastSuccessfulUpdate = new Date().toISOString();
                console.log(`✅ Fixed array structure from Redis cache - ${parsedData.length} records`);
              }
              // Look for any array property in the object
              else {
                const possibleArrayProps = Object.keys(parsedData).filter(key => 
                  Array.isArray(parsedData[key]) && parsedData[key].length > 0
                );
                
                if (possibleArrayProps.length > 0) {
                  const arrayProp = possibleArrayProps[0];
                  Humans = { data: parsedData[arrayProp] };
                  lastSuccessfulUpdate = new Date().toISOString();
                  console.log(`✅ Fixed structure from Redis using ${arrayProp} property - ${parsedData[arrayProp].length} records`);
                } else {
                  console.error('❌ No valid data structure found in Redis cache');
                  io.emit('dataUnavailable', { message: 'Invalid data structure in cache' });
                  return false;
                }
              }
              
              io.emit('dataUpdated', { 
                timestamp: lastSuccessfulUpdate,
                recordCount: Humans.data.length,
                fromCache: true
              });
              
              return true;
            } else {
              console.error('❌ Invalid data format in Redis cache');
              io.emit('dataUnavailable', { message: 'Invalid data format in cache' });
              return false;
            }
          } catch (parseErr) {
            console.error('❌ Failed to parse Redis cache data:', parseErr);
            io.emit('dataUnavailable', { message: 'Failed to parse cached data' });
            return false;
          }
        } else {
          console.error('❌ No data found in Redis cache');
          io.emit('dataUnavailable', { message: 'No data found in cache' });
          return false;
        }
      } catch (cacheErr) {
        console.error('❌ Cache fallback also failed:', cacheErr);
        io.emit('dataUnavailable', { message: 'Cache access failed' });
        return false;
      }
    }
    
    // No data available at all
    io.emit('dataUnavailable', { message: 'Neither database nor cache data available' });
    return false;
  }
}
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