function benefitEvents(socket) {
    socket.on('benefitPlanUpdated', async (data) => {
        try {
            console.log('Processing benefit plan update:', data);
            // Trigger any necessary data updates
            socket.broadcast.emit('benefitPlanUpdated', {
                message: 'Benefit plan updated',
                timestamp: new Date().toISOString(),
                data
            });
        } catch (error) {
            console.error('Error processing benefit plan update:', error);
            socket.emit('error', { message: 'Failed to process benefit plan update' });
        }
    });
}

module.exports = benefitEvents;