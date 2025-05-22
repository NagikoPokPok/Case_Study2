const amqp = require('amqplib');

async function startConsumer(exchangeName, queueName, messageHandler, senderId, routingKey = '') {
  const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
  const channel = await connection.createChannel();

  await channel.assertExchange(exchangeName, 'direct', { durable: true });
  await channel.assertQueue(queueName, { durable: true });

  // Bind queue với exchange theo routing key
  await channel.bindQueue('dashboard-queue', 'person-events-exchange', 'payroll.person.create');
  await channel.bindQueue('dashboard-queue', 'person-events-exchange', 'payroll.person.update');
  await channel.bindQueue('dashboard-queue', 'person-events-exchange', 'payroll.person.delete');

  await channel.bindQueue('dashboard-queue', 'person-events-exchange', 'hr.person.create');
  await channel.bindQueue('dashboard-queue', 'person-events-exchange', 'hr.person.update');
  await channel.bindQueue('dashboard-queue', 'person-events-exchange', 'hr.person.delete');
  

  // await channel.bindQueue(queueName, exchangeName, routingKey);
  console.log(`Waiting for messages in queue ${queueName} bound to exchange ${exchangeName}...`);


  channel.consume(queueName, async (msg) => {
    if (msg !== null) {
      const content = msg.content.toString();
      console.log(`Received message from ${queueName}:`, content);
      try {
        const data = JSON.parse(content);

        // Nếu có senderId và trùng với hệ thống này, bỏ qua message
        if (data.senderId && data.senderId === senderId) {
          console.log('Message from self, ignoring.');
          channel.ack(msg);
          return;
        }

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
