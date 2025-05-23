// Socket connection handler
class SocketClient {
    constructor(serverUrl) {
        // Use the current URL if no server URL provided
        this.socket = io('http://localhost:3000'); 
        this.setupEventHandlers();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.eventCallbacks = {};
        
        this.lastDataFetch = 0;
        this.debounceTimeout = null;
        this.debounceInterval = 1000; // Reduced to 1 second for faster updates
        
        // Track if we have initial data
        this.hasInitialData = false;
        
        this.isFetchingData = false;
    }

    setupEventHandlers() {
        this.socket.on('connect', () => {
            console.log('🔗 Connected to WebSocket server');
            this.reconnectAttempts = 0;
            this.updateConnectionStatus('connected');
            
            // Request initial data on connect
            this.socket.emit('requestPersonalData');
        });

        this.socket.on('disconnect', () => {
            console.log('📡 Disconnected from WebSocket server');
            this.updateConnectionStatus('disconnected');
            this.handleReconnect();
        });

        // Setup event listeners for different data updates
        this.setupDataEventListeners();
    }

    setupDataEventListeners() {
    this.socket.on('personalChanged', (data) => {
        console.log('👤 Received personalChanged:', data);
        
        // Skip if it's just a data request
        if (data.message === 'Personal data requested') {
            return;
        }
        
        // Only trigger update for actual changes
        if (this.eventCallbacks['personalChanged']) {
            this.eventCallbacks['personalChanged'].forEach(callback => callback(data));
        }
    });

    // Remove automatic update on reconnect
    this.socket.on('reconnect', () => {
        console.log('🔄 Reconnected to server');
        this.updateConnectionStatus('connected');
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
            console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => {
                this.socket.connect();
            }, 3000); // Wait 3 seconds before trying to reconnect
        } else {
            console.error('❌ Max reconnection attempts reached');
            this.updateConnectionStatus('failed');
        }
    }
    
    forceUpdateDataFromAPI() {
    if (this.isFetchingData) {
        console.log('⏳ Update already in progress, skipping...');
        return;
    }
    
    console.log('⚡ Force updating data from API...');
    this.isFetchingData = true;
    
    updateDataFromAPI().finally(() => {
        this.isFetchingData = false;
    });
    }
    
    // Debounced API update function - keep for other scenarios
    debouncedUpdateDataFromAPI() {
        const now = Date.now();
        if (this.debounceTimeout) clearTimeout(this.debounceTimeout);

        // Only allow one fetch per debounceInterval
        if (now - this.lastDataFetch < this.debounceInterval) {
            this.debounceTimeout = setTimeout(() => {
                updateDataFromAPI();
            }, this.debounceInterval - (now - this.lastDataFetch));
            return;
        }
        
        // Update the timestamp and trigger the update
        this.lastDataFetch = now;
        updateDataFromAPI();
    }
}

let isFetching = false;
let retryCount = 0;
const maxRetries = 3;

async function updateDataFromAPI() {
    // Prevent concurrent fetches
    if (isFetching) {
        console.log('⏳ Data fetch already in progress, skipping...');
        return;
    }
    
    isFetching = true;
    
    try {
        console.log('📡 Fetching fresh data from API...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch('http://localhost:3000/api/humanList', {
            signal: controller.signal,
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });

        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log(`✅ Data refreshed from API - Total records: ${result.length}`);

        window.currentHumanData = result;
        retryCount = 0;

        // Only dispatch event if we have valid data
        if (result && Array.isArray(result) && result.length >= 0) {
            // Dispatch a custom event that other scripts can listen for
            const event = new CustomEvent('dataRefreshed', { 
                detail: {
                    data: result,
                    timestamp: new Date().toISOString(),
                    source: 'api_refresh'
                }
            });
            document.dispatchEvent(event);

            const errorContainer = document.getElementById('error-container');
            if (errorContainer) {
                errorContainer.style.display = 'none';
            }

            // 🔧 FIX: Show success message briefly
            console.log('📊 Data successfully updated and dispatched to UI');
        }

        return result;
        
    } catch (error) {
        console.error('❌ Error updating data:', error);

        if (retryCount < maxRetries) {
            retryCount++;
            console.log(`🔄 Retrying data fetch (${retryCount}/${maxRetries})...`);
            
            // Retry after a short delay
            setTimeout(() => {
                isFetching = false; // Reset flag for retry
                updateDataFromAPI();
            }, 2000 * retryCount); // Exponential backoff
            
            return; // Don't execute the error UI update yet
        }
        
        // Show error message in UI after all retries failed
        const errorMessage = document.getElementById('error-message');
        const errorContainer = document.getElementById('error-container');
        if (errorMessage && errorContainer) {
            errorMessage.textContent = `Connection error: ${error.message} (Failed after ${maxRetries} retries)`;
            errorContainer.style.display = 'block';
        }
        
        // Reset retry count for next attempt
        retryCount = 0;
        
    } finally {
        isFetching = false;
    }
}

function initializeSocketClient() {
    const socketClient = new SocketClient();
    window.socketClient = socketClient;
    window.updateDataFromAPI = updateDataFromAPI;
    
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🎯 Socket client initialized and ready');
        // Chỉ load data lần đầu khi khởi tạo
        if (!window.currentHumanData) {
            updateDataFromAPI();
        }
    });
    
    return socketClient;
}

// Initialize immediately
const socketClient = initializeSocketClient();