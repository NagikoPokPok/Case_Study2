const amqp = require('amqplib');

let channel;
let connection;

async function connect() {
  if (channel) return channel;
  const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
  channel = await connection.createChannel();
  return channel;
}

/**
 * Gửi message lên exchange
 * @param {string} exchangeName Tên exchange, ví dụ 'personal_changes_exchange'
 * @param {string} routingKey routing key, ví dụ '' hoặc 'hr' hoặc 'payroll'
 * @param {object} message object message gửi lên
 */

async function sendMessage(exchangeName, routingKey, message) {
  const ch = await connect();
  await ch.assertExchange(exchangeName, 'direct', { durable: true }); // hoặc 'topic' tùy nhu cầu
  ch.publish(exchangeName, routingKey, Buffer.from(JSON.stringify(message)), { persistent: true });
  console.log(`Sent message to exchange "${exchangeName}" with routingKey "${routingKey}":`, message);
}

async function closeConnection() {
  if (channel) {
    await channel.close();
    channel = null;
  }
  if (connection) {
    await connection.close();
    connection = null;
  }
}

module.exports = { sendMessage , closeConnection };
