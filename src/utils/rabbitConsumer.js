const amqp = require('amqplib');

async function startConsumer(queueName, messageHandler) {
  const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
  const channel = await connection.createChannel();
  await channel.assertQueue(queueName, { durable: true });
  console.log(`Waiting for messages in ${queueName}...`);

  channel.consume(queueName, async (msg) => {
    if (msg !== null) {
      const content = msg.content.toString();
      console.log(`Received message from ${queueName}:`, content);
      try {
        const data = JSON.parse(content);
        await messageHandler(data);
        channel.ack(msg);
      } catch (error) {
        console.error('Error processing message:', error);
        channel.nack(msg, false, false); // Không gửi lại message lỗi
      }
    }
  });
}

module.exports = { startConsumer };

// server.js hoặc app.js
// const { startConsumer } = require('./rabbitConsumer');

// async function processPersonalChange(data) {
//   // Xử lý dữ liệu nhận được
//   console.log('Processing personal change:', data);
//   // Gọi hàm cập nhật DB, cache, gọi API khác ...
// }

// startConsumer('personal_changes', processPersonalChange);

