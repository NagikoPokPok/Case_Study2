const amqp = require('amqplib');
const { EventEmitter } = require('events');
const emitter = new EventEmitter();

async function startRabbitConsumer() {
    try {
        const conn = await amqp.connect('amqp://localhost'); // Kết nối đến RabbitMQ
        const channel = await conn.createChannel();

        const queues = ['benefit_plan_changes', 'personal_changes']; // Danh sách các queue cần lắng nghe

        // Đảm bảo các queue tồn tại
        for (const queue of queues) {
            await channel.assertQueue(queue, { durable: false });
        }

        console.log("[*] Waiting for messages in %s. To exit press CTRL+C", queues.join(", "));

        // Lắng nghe và xử lý thông điệp từ các queue
        queues.forEach((queue) => {
            channel.consume(queue, (msg) => {
                if (msg !== null) {
                    const message = msg.content.toString();
                    console.log("[x] Received from %s:", queue, message);

                    // Emit sự kiện cho các phần khác trong ứng dụng
                    emitter.emit(`${queue}Updated`, message);
                }
            }, { noAck: true });
        });
    } catch (err) {
        console.error('Error connecting to RabbitMQ:', err);
    }
}

// Để có thể lắng nghe sự kiện từ các queue
function onQueueUpdated(queueName, callback) {
    emitter.on(`${queueName}Updated`, callback);
}

module.exports = { startRabbitConsumer, onQueueUpdated };
