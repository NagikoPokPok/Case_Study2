function personalEvents(socket) {
    socket.on('personalChanged', async (data) => {
        try {
            console.log('Processing personal data update:', data);
            // Trigger any necessary data updates
            socket.broadcast.emit('personalChanged', {
                message: 'Personal data updated',
                timestamp: new Date().toISOString(),
                data
            });
        } catch (error) {
            console.error('Error processing personal data update:', error);
            socket.emit('error', { message: 'Failed to process personal data update' });
        }
    });

    // Handle client requests for initial data or specific updates
    socket.on('requestPersonalData', async () => {
        try {
            console.log('Client requested personal data');
            // You could fetch fresh data here if needed
            socket.emit('personalChanged', {
                message: 'Personal data requested',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error handling personal data request:', error);
            socket.emit('error', { message: 'Failed to get personal data' });
        }
    });
}

module.exports = personalEvents;