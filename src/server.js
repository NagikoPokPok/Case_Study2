const express = require('express');
const cors = require('cors');
const db = require('./models'); // Sequelize (MySQL)
const { connectSqlServer } = require('./database/sqlServerConnection');
const { getHumanData } = require('./controller/controller');  // Import controller

const http = require('http');
const { Server } = require('socket.io');
const path = require('path'); // Thêm module path để phục vụ file HTML
const { startRabbitConsumer, onQueueUpdated } = require('../rabbitReceiver'); // Import consumer


//route
const route = require('./route/route');

//Human merge
let Humans;

const app = express();
app.use(cors()); // Cho phép truy cập từ FE
app.use(express.json())
// Phục vụ trang HTML khi người dùng truy cập vào root
app.use(express.static(path.join(__dirname, ''))); // Đảm bảo index.html nằm trong thư mục 'public'


//use route
app.use('/api/route', route);


// Định nghĩa API trả về dữ liệu này
app.get('/api/humanList', (req, res) => {
  res.json(Humans); // Trả về mảng dữ liệu dưới dạng JSON
  // console.log( Humans); // Log kết quả
});

// API lấy dữ liệu employee
app.get('/api/employee', async (req, res) => {
  try {
      await sql.connect(config);
      const result = await sql.query('SELECT * FROM employee');
  
      res.json(result.recordset);
  } catch (err) {
      console.error(err);
      res.status(500).send('Lỗi khi truy vấn dữ liệu');
  }
});

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
      
      if (batchCount == 11 || batchCount == 12 || batchCount == 13) {
        console.log('Batch 11: .', result[0]);
        
      }

    }

    Humans = allHumans;
    console.log(`🏁 Tổng cộng ${Humans.length} bản ghi đã được load vào bộ nhớ`);

    console.log('✅ Đã cập nhật dữ liệu Humans cuối cùng', Humans.length);

    console.log("employee last: ", Humans[500199]);
    console.log("person last: ", Humans[500099]);

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

// Start RabbitMQ consumer
startRabbitConsumer();

// Lắng nghe thông điệp từ các queue và gửi qua WebSocket
onQueueUpdated('benefit_plan_changes', async (message) => {
    console.log('Emitting to WebSocket from benefit_plan_changes:', message);  // Log thông điệp trước khi phát
    io.emit('benefitPlanUpdated', { message }); // Emit thông điệp đến frontend qua WebSocket

    // Gọi lại hàm calculateOnServerStart khi có thông điệp mới
   await calculateOnServerStart();
});

onQueueUpdated('personal_changes', async (message) => {
    console.log('Emitting to WebSocket from personal_changes:', message);  // Log thông điệp trước khi phát
    io.emit('personalChanged', { message }); // Emit thông điệp đến frontend qua WebSocket

    // Gọi lại hàm calculateOnServerStart khi có thông điệp mới
    await calculateOnServerStart();
});

// Frontend connection via WebSocket
io.on('connection', (socket) => {
    console.log('A user connected');  // Log khi có người kết nối WebSocket
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Phục vụ trang HTML (frontend)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // Đảm bảo 'index.html' nằm trong thư mục 'public'
});


async function startApp() {
  try {
    await db.sequelize.authenticate(); // MySql
    console.log('✅ MySQL connected');

    await connectSqlServer(); // SQL Server

    // Gọi hàm tính toán khi server khởi động
    await calculateOnServerStart();  // Tính toán ngay khi server bắt đầu chạy


    app.listen(3000, () => {
      console.log('✅ Server đang chạy tại http://localhost:3000');
    });
  } catch (err) {
    console.error('🚨 Connection error:', err);
  }
}

startApp();


