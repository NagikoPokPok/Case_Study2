const amqp = require('amqplib');

let channel;

async function connect() {
  if (channel) return channel;
  const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
  channel = await connection.createChannel();
  return channel;
}

async function sendMessage(queueName, message) {
  const ch = await connect();
  await ch.assertQueue(queueName, { durable: true });
  ch.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), { persistent: true });
  console.log(`Sent message to ${queueName}:`, message);
}

module.exports = { sendMessage };

// // controller.js hoặc service.js
// const { sendMessage } = require('./rabbitProducer');

// async function updateEmployee(req, res) {
//   // cập nhật database

//   // gửi message để các hệ thống khác xử lý
//   await sendMessage('personal_changes', { employeeId: req.body.id, action: 'update' });

//   res.json({ success: true });
// }
