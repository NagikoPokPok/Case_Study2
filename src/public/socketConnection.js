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
        this.socket.on('dataInitialized', (data) => {
            console.log('📊 Received dataInitialized:', data);
            this.hasInitialData = true;
            
            // Execute callbacks
            if (this.eventCallbacks['dataInitialized']) {
                this.eventCallbacks['dataInitialized'].forEach(callback => callback(data));
            }
            
            // Force refresh data from API immediately
            this.forceUpdateDataFromAPI();
        });

        // 🔧 FIX: Enhanced personalChanged handler
        this.socket.on('personalChanged', (data) => {
            console.log('👤 Received personalChanged:', data);
            
            // Execute callbacks first
            if (this.eventCallbacks['personalChanged']) {
                this.eventCallbacks['personalChanged'].forEach(callback => callback(data));
            }
            
            // 🔧 FIX: Always force a full refresh for consistency
            // This ensures we get the latest data from server
            console.log('🔄 Triggering data refresh due to personalChanged event');
            this.forceUpdateDataFromAPI();
        });

        // 🔧 FIX: New event handler for dataRefreshNeeded
        this.socket.on('dataRefreshNeeded', (data) => {
            console.log('🔄 Received dataRefreshNeeded:', data);
            
            // Force immediate refresh
            this.forceUpdateDataFromAPI();
        });

        this.socket.on('benefitPlanUpdated', (data) => {
            console.log('💰 Received benefitPlanUpdated:', data);
            if (this.eventCallbacks['benefitPlanUpdated']) {
                this.eventCallbacks['benefitPlanUpdated'].forEach(callback => callback(data));
            }
            this.forceUpdateDataFromAPI();
        });

        // Handle error events
        this.socket.on('error', (error) => {
            console.error('❌ Socket error:', error);
            this.updateConnectionStatus('error');
        });

        // 🔧 FIX: Handle reconnection events
        this.socket.on('reconnect', () => {
            console.log('🔄 Reconnected to server');
            this.updateConnectionStatus('connected');
            // Force refresh after reconnection
            this.forceUpdateDataFromAPI();
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
        console.log('⚡ Force updating data from API...');
        
        // Cancel any pending debounced updates
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
            this.debounceTimeout = null;
        }
        
        // Update immediately
        updateDataFromAPI();
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
    // Create and export a singleton instance
    const socketClient = new SocketClient();
    
    // Export the socketClient for use in other modules
    window.socketClient = socketClient;
    
    // Make updateDataFromAPI globally available
    window.updateDataFromAPI = updateDataFromAPI;
    
    document.addEventListener('DOMContentLoaded', () => {
        // Add any initialization that needs DOM to be ready
        console.log('🎯 Socket client initialized and ready');
        
        // Try to get initial data
        updateDataFromAPI();
    });
    
    // 🔧 FIX: Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && socketClient.socket.connected) {
            console.log('👁️ Page became visible, refreshing data...');
            updateDataFromAPI();
        }
    });
    
    return socketClient;
}

// Initialize immediately
const socketClient = initializeSocketClient();