// Socket connection handler
class SocketClient {
    constructor(serverUrl) {
        // Use the current URL if no server URL provided
        this.socket = io('http://localhost:3000'); 
        this.setupEventHandlers();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.eventCallbacks = {};
        
        // Debounce properties - FIXED: Reduce debounce time
        this.lastDataFetch = 0;
        this.debounceTimeout = null;
        this.debounceInterval = 2000; // Reduced to 2 seconds for faster updates
        
        // Track if we have initial data
        this.hasInitialData = false;
    }

    setupEventHandlers() {
        this.socket.on('connect', () => {
            console.log('Connected to WebSocket server');
            this.reconnectAttempts = 0;
            this.updateConnectionStatus('connected');
            
            // Only request initial data if we don't have it yet
            if (!this.hasInitialData) {
                this.socket.emit('requestPersonalData');
            }
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
        // FIXED: Handle different event types properly
        this.socket.on('dataInitialized', (data) => {
            console.log('Received dataInitialized:', data);
            this.hasInitialData = true;
            // Execute callbacks
            if (this.eventCallbacks['dataInitialized']) {
                this.eventCallbacks['dataInitialized'].forEach(callback => callback(data));
            }
            // Force refresh data from API
            this.forceUpdateDataFromAPI();
        });

        this.socket.on('personalChanged', (data) => {
            console.log('Received personalChanged:', data);
            // Execute callbacks
            if (this.eventCallbacks['personalChanged']) {
                this.eventCallbacks['personalChanged'].forEach(callback => callback(data));
            }
            
            // FIXED: Handle incremental updates vs full refresh
            if (data.operation && data.updatedEmployee) {
                // This is an incremental update - handle it directly
                this.handleIncrementalUpdate(data);
            } else {
                // This might be a full data refresh
                this.debouncedUpdateDataFromAPI();
            }
        });

        this.socket.on('benefitPlanUpdated', (data) => {
            console.log('Received benefitPlanUpdated:', data);
            if (this.eventCallbacks['benefitPlanUpdated']) {
                this.eventCallbacks['benefitPlanUpdated'].forEach(callback => callback(data));
            }
            this.debouncedUpdateDataFromAPI();
        });

        // Handle error events
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.updateConnectionStatus('error');
        });
    }

    // FIXED: Handle incremental updates without full API refresh
    handleIncrementalUpdate(data) {
        console.log('Handling incremental update:', data);
        
        // Get current data from memory/cache
        const currentData = window.currentHumanData || [];
        
        if (data.operation === 'Update' && data.updatedEmployee) {
            // Find and update the specific employee
            const empIndex = currentData.findIndex(emp => emp.Employee_Id === data.employeeId);
            if (empIndex >= 0) {
                currentData[empIndex] = { ...currentData[empIndex], ...data.updatedEmployee };
                console.log('Updated employee in local data:', currentData[empIndex]);
            }
        } else if (data.operation === 'Create' && data.updatedEmployee) {
            // Add new employee
            currentData.push(data.updatedEmployee);
        } else if (data.operation === 'Delete') {
            // Remove employee
            const empIndex = currentData.findIndex(emp => emp.Employee_Id === data.employeeId);
            if (empIndex >= 0) {
                currentData.splice(empIndex, 1);
            }
        }
        
        // Store updated data
        window.currentHumanData = currentData;
        
        // Dispatch event with updated data
        const event = new CustomEvent('dataRefreshed', { detail: currentData });
        document.dispatchEvent(event);
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
    
    // FIXED: Force update without debounce for initial load
    forceUpdateDataFromAPI() {
        console.log('Force updating data from API...');
        updateDataFromAPI();
    }
    
    // Debounced API update function
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

// Only keep one instance of fetch data
let isFetching = false;

async function updateDataFromAPI() {
    // Prevent concurrent fetches
    if (isFetching) {
        console.log('Data fetch already in progress, skipping...');
        return;
    }
    
    isFetching = true;
    
    try {
        console.log('Fetching fresh data from API...');
        const response = await fetch('http://localhost:3000/api/humanList');
        
        if (!response.ok) throw new Error('Failed to fetch data');
        
        const result = await response.json();
        console.log('Data refreshed from API - Total records:', result.length);

        // FIXED: Store data globally for incremental updates
        window.currentHumanData = result;

        // Only dispatch event if we have valid data
        if (result && Array.isArray(result) && result.length > 0) {
            // Dispatch a custom event that other scripts can listen for
            const event = new CustomEvent('dataRefreshed', { detail: result });
            document.dispatchEvent(event);
            
            // FIXED: Clear any error messages
            const errorContainer = document.getElementById('error-container');
            if (errorContainer) {
                errorContainer.style.display = 'none';
            }
        }

        return result;
    } catch (error) {
        console.error('Error updating data:', error);
        // Show error message in UI
        const errorMessage = document.getElementById('error-message');
        const errorContainer = document.getElementById('error-container');
        if (errorMessage && errorContainer) {
            errorMessage.textContent = `Connection error: ${error.message}`;
            errorContainer.style.display = 'block';
        }
    } finally {
        isFetching = false;
    }
}

// Create and export a singleton instance
const socketClient = new SocketClient();

// Export the socketClient for use in other modules
window.socketClient = socketClient;

// Make updateDataFromAPI globally available
window.updateDataFromAPI = updateDataFromAPI;