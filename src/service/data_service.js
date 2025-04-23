class DataService {
    constructor() {
        this.cachedData = null;
        this.lastFetchTime = null;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    }

    async getData() {
        // Check cache first
        const cachedData = this.getFromCache();
        if (cachedData) {
            return cachedData;
        }

        // If no cache, fetch new data
        return await this.fetchAndCacheData();
    }

    getFromCache() {
        const cached = localStorage.getItem('humanData');
        if (!cached) return null;

        const {data, timestamp} = JSON.parse(cached);
        // Check if cache is still valid
        if (Date.now() - timestamp < this.CACHE_DURATION) {
            this.cachedData = data;
            return data;
        }

        return null;
    }

    async fetchAndCacheData() {
        let allData = [];
        let lastId = 0;
        let hasMore = true;

        while (hasMore) {
            try {
                const response = await fetch(`http://localhost:3000/api/employee/human?limit=50000&lastId=${lastId}`);
                const result = await response.json();
                
                if (result.data && result.data.length > 0) {
                    allData = allData.concat(result.data);
                    lastId = result.nextLastId;
                    hasMore = result.hasMore;
                } else {
                    hasMore = false;
                }
            } catch (error) {
                console.error('Error:', error);
                break;
            }
        }

        // Cache the data
        this.cachedData = allData;
        localStorage.setItem('humanData', JSON.stringify({
            data: allData,
            timestamp: Date.now()
        }));

        return allData;
    }

    clearCache() {
        localStorage.removeItem('humanData');
        this.cachedData = null;
    }
}

export const dataService = new DataService();