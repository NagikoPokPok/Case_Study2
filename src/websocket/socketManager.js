const { Server } = require('socket.io');
const events = require('./event');

class SocketManager {
    constructor(server) {
        this.io = new Server(server, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });
        
        this.connections = new Set();
        this.setupEventHandlers();
        
        // Keep track of last state for new clients
        this.lastState = {
            personalData: null,
            benefitData: null
        };
    }

    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            this.connections.add(socket);
            console.log(`Client connected: ${socket.id}. Total connections: ${this.connections.size}`);

            // Register all event handlers from events/index.js
            events.registerEvents(socket);

            // Handle client requesting initial data
            socket.on('requestPersonalData', () => {
                console.log(`Client ${socket.id} requested initial data`);
                
                // If we have cached state, send it to the new client
                if (this.lastState.personalData) {
                    socket.emit('personalChanged', this.lastState.personalData);
                }
                
                if (this.lastState.benefitData) {
                    socket.emit('benefitPlanUpdated', this.lastState.benefitData);
                }
            });

            socket.on('disconnect', () => {
                this.connections.delete(socket);
                console.log(`Client disconnected: ${socket.id}. Total connections: ${this.connections.size}`);
            });
        });
    }

    // Method to broadcast updates to all connected clients
    broadcastUpdate(eventName, data) {
        const enrichedData = {
            ...data,
            timestamp: new Date().toISOString()
        };
        
        // Store the latest state for new clients
        if (eventName === 'personalChanged') {
            this.lastState.personalData = enrichedData;
        } else if (eventName === 'benefitPlanUpdated') {
            this.lastState.benefitData = enrichedData;
        }
        
        // Broadcast to all clients
        this.io.emit(eventName, enrichedData);
        console.log(`Broadcasted ${eventName} to ${this.connections.size} clients`);
    }
    
    // Get connected client count
    getConnectionCount() {
        return this.connections.size;
    }
}

// Export as a singleton that can be required elsewhere
let instance = null;

module.exports = {
    initialize: (server) => {
        instance = new SocketManager(server);
        return instance;
    },
    getInstance: () => {
        if (!instance) {
            throw new Error("SocketManager has not been initialized. Call initialize() first.");
        }
        return instance;
    }
};