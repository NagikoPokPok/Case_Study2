// Socket connection handler
class SocketClient {
    constructor(serverUrl) {
        // Use the current URL if no server URL provided
        this.socket = io('http://localhost:3000'); 
        this.setupEventHandlers();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.eventCallbacks = {};
    }

    setupEventHandlers() {
        this.socket.on('connect', () => {
            console.log('Connected to WebSocket server');
            this.reconnectAttempts = 0;
            this.updateConnectionStatus('connected');
            
            // Emit an event to request initial data when connection is established
            this.socket.emit('requestPersonalData');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
            this.updateConnectionStatus('disconnected');
            this.handleReconnect();
        });

        // Setup event listeners for different data updates
        this.setupDataEventListeners();
    }

    setupDataEventListeners() {
        const events = ['dataUpdated', 'personalChanged', 'benefitPlanUpdated'];
        
        events.forEach(eventName => {
            this.socket.on(eventName, (data) => {
                console.log(`Received ${eventName}:`, data);
                // Execute any registered callbacks for this event
                if (this.eventCallbacks[eventName]) {
                    this.eventCallbacks[eventName].forEach(callback => callback(data));
                }
                // Always trigger data refresh if updateDataFromAPI is defined
                if (typeof updateDataFromAPI === 'function') {
                    updateDataFromAPI();
                }
            });
        });

        // Handle error events
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.updateConnectionStatus('error');
        });
    }

    // Register a callback function for a specific event
    on(eventName, callback) {
        if (!this.eventCallbacks[eventName]) {
            this.eventCallbacks[eventName] = [];
        }
        this.eventCallbacks[eventName].push(callback);
    }

    // Send data to the server
    emit(eventName, data) {
        this.socket.emit(eventName, data);
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.textContent = `WebSocket: ${status}`;
            statusElement.className = `status-${status}`;
        }
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => {
                this.socket.connect();
            }, 5000); // Wait 5 seconds before trying to reconnect
        } else {
            console.error('Max reconnection attempts reached');
            this.updateConnectionStatus('failed');
        }
    }
}

let lastDataFetch = 0;
let debounceTimeout = null;

async function updateDataFromAPI() {
    const now = Date.now();
    if (debounceTimeout) clearTimeout(debounceTimeout);

    // Debounce: only allow one fetch per 500ms
    if (now - lastDataFetch < 500) {
        debounceTimeout = setTimeout(updateDataFromAPI, 500 - (now - lastDataFetch));
        return;
    }
    lastDataFetch = now;

    try {
        console.log('Fetching fresh data from API...');
        const response = await fetch('http://localhost:3000/api/humanList');
        if (!response.ok) throw new Error('Failed to fetch data');
        const result = await response.json();

        console.log('Data refreshed from API:', result.length);

        // Dispatch a custom event that other scripts can listen for
        const event = new CustomEvent('dataRefreshed', { detail: result });
        document.dispatchEvent(event);

        return result;
    } catch (err) {
        
        console.error('Error updating data:', err);
        // Add this log:
        document.dispatchEvent(new CustomEvent('dataRefreshed', { detail: null }));
        return null;
    }
}

// Create and export a singleton instance
const socketClient = new SocketClient();

// Export the socketClient for use in other modules
window.socketClient = socketClient;

// Make updateDataFromAPI globally available
window.updateDataFromAPI = updateDataFromAPI;