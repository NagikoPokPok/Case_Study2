const { sequelizeMySQL, sequelizeSQLServer } = require('../database/sequelizeConnection');
const Employee = require('../models/Employee')(sequelizeMySQL, require('sequelize').DataTypes);
const Personal = require('../models/Personal')(sequelizeSQLServer, require('sequelize').DataTypes);
const BenefitPlans = require('../models/Benefit_Plan')(sequelizeSQLServer, require('sequelize').DataTypes);
const PayRate = require('../models/Pay_Rate')(sequelizeMySQL, require('sequelize').DataTypes);
const Human = require('../models/Human');
const Employment = require('../models/Employment')(sequelizeSQLServer, require('sequelize').DataTypes);
const JobHistory = require('../models/Job_History')(sequelizeSQLServer, require('sequelize').DataTypes);
const redisClient = require('../utils/redisClient');

// Setup associations
Employee.associate({ Pay_Rate: PayRate });

const sqlServerModels = {
    Benefit_Plans: BenefitPlans,
    Employment: Employment,
    Job_History: JobHistory
};

// Setup associations for Personal
Personal.associate(sqlServerModels);

// Circuit breaker state
const circuitState = {
    mysqlCircuitOpen: false,
    sqlServerCircuitOpen: false,
    lastMySQLFailure: null,
    lastSQLServerFailure: null,
    resetTimeout: 60000 // 1 minute - adjust as needed
};

// Circuit breaker functions
async function checkCircuitHealth() {
    const now = Date.now();
    
    // Check if it's time to try reconnecting to MySQL
    if (circuitState.mysqlCircuitOpen && 
        circuitState.lastMySQLFailure && 
        (now - circuitState.lastMySQLFailure) > circuitState.resetTimeout) {
        
        try {
            await sequelizeMySQL.authenticate();
            console.log('✅ MySQL circuit closed - connection restored');
            circuitState.mysqlCircuitOpen = false;
        } catch (error) {
            console.error('❌ MySQL circuit remains open - connection still failed');
            circuitState.lastMySQLFailure = now;
        }
    }
    
    // Check if it's time to try reconnecting to SQL Server
    if (circuitState.sqlServerCircuitOpen && 
        circuitState.lastSQLServerFailure && 
        (now - circuitState.lastSQLServerFailure) > circuitState.resetTimeout) {
        
        try {
            await sequelizeSQLServer.authenticate();
            console.log('✅ SQL Server circuit closed - connection restored');
            circuitState.sqlServerCircuitOpen = false;
        } catch (error) {
            console.error('❌ SQL Server circuit remains open - connection still failed');
            circuitState.lastSQLServerFailure = now;
        }
    }
}

// Function to mark circuit as open
function openCircuit(dbType) {
    if (dbType === 'mysql') {
        circuitState.mysqlCircuitOpen = true;
        circuitState.lastMySQLFailure = Date.now();
    } else if (dbType === 'sqlserver') {
        circuitState.sqlServerCircuitOpen = true;
        circuitState.lastSQLServerFailure = Date.now();
    }
    
    // Schedule a check to see if we can close the circuit
    setTimeout(() => checkCircuitHealth(), circuitState.resetTimeout);
}

async function getHumanDataService(limit = 50000, lastId = 0) {
    const cacheKey = `humanData:${limit}:${lastId}`;
    const startTime = Date.now();
    
    // Check circuit breaker status first
    await checkCircuitHealth();

    try {
        // 1. Always check Redis cache first
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            console.log('Cache hit - serving data from Redis');
            return JSON.parse(cachedData);
        }
        
        console.log('Cache miss - querying databases');
        
        // If both circuits are open, we can't get fresh data
        if (circuitState.mysqlCircuitOpen && circuitState.sqlServerCircuitOpen) {
            throw new Error('Both databases are currently unavailable');
        }

        // 2. Get employee data from MySQL (if circuit is closed)
        let employeeData = [];
        if (!circuitState.mysqlCircuitOpen) {
            try {
                employeeData = await Employee.findAll({
                    where: {
                        idEmployee: {
                            [sequelizeMySQL.Sequelize.Op.gt]: lastId
                        }
                    },
                    include: [{
                        model: PayRate,
                        attributes: ['Pay_Amount', 'Tax_Percentage']
                    }],
                    limit,
                    order: [['idEmployee', 'ASC']],
                    raw: true,
                    nest: true
                });
            } catch (error) {
                console.error('MySQL query failed:', error);
                openCircuit('mysql');
                throw new Error('MySQL database is currently unavailable');
            }
        } else {
            throw new Error('MySQL database is currently unavailable');
        }

        if (employeeData.length === 0) {
            return {
                data: [],
                nextLastId: lastId,
                hasMore: false
            };
        }

        // 3. Get personal data from SQL Server (if circuit is closed)
        let personalData = [];
        if (!circuitState.sqlServerCircuitOpen) {
            try {
                personalData = await Personal.findAll({
                    where: {
                        Employee_ID: {
                            [sequelizeSQLServer.Sequelize.Op.gt]: lastId,
                            [sequelizeSQLServer.Sequelize.Op.lte]: employeeData[employeeData.length - 1].idEmployee
                        }
                    },
                    include: [{
                        model: BenefitPlans,
                        as: 'BenefitPlan',
                        attributes: ['Benefit_Plan_ID', 'Deductable', 'Percentage_CoPay'],
                        required: false
                    }, {
                        model: Employment,
                        attributes: ['Employment_status'],
                        required: false
                    }, {
                        model: JobHistory,
                        as: 'JobHistory',
                        attributes: ['Department'],
                        required: false,
                        order: [['id', 'DESC']], 
                        limit: 1,
                        separate: false
                    }],
                    order: [['Employee_ID', 'ASC']],
                    raw: true,
                    nest: true,
                });
            } catch (error) {
                console.error('SQL Server query failed:', error);
                openCircuit('sqlserver');
                throw new Error('SQL Server database is currently unavailable');
            }
        } else {
            throw new Error('SQL Server database is currently unavailable');
        }

        // 4. Resolve the data

        console.log(`Found ${employeeData.length} employees and ${personalData.length} personal records`);

        const humans = [];
        let currentIdx = 0;
        const batchSize = 5000;

        while (currentIdx < personalData.length) {
            const batch = personalData.slice(currentIdx, currentIdx + batchSize);
          
            for (const person of batch) {
                const employee = employeeData.find(emp => emp.idEmployee === person.Employee_ID);
                if (employee) {
                    if (!person.Employee_ID || !employee.idEmployee) {
                        console.warn('Data mismatch:', { person, employee });
                        continue;
                    }

                    const avgBenefit = person.BenefitPlan && 
                        typeof person.BenefitPlan.Deductable === 'number' && 
                        typeof person.BenefitPlan.Percentage_CoPay === 'number' ? 
                        (person.BenefitPlan.Deductable * (100 - person.BenefitPlan.Percentage_CoPay)) / 100 : 0;

                    humans.push(new Human({
                        Employee_Id: person.Employee_ID,
                        ShareHolder: person.Shareholder_Status,
                        Gender: person.Gender,
                        Ethnicity: person.Ethnicity,
                        Employment_Status: person.Employment?.Employment_status || 'Not Specified',
                        Department: person.JobHistory?.Department || 'Not Specified',
                        Paid_To_Date: employee.Paid_To_Date || 0,
                        Paid_Last_Year: employee.Paid_Last_Year || 0,
                        Vacation_Days: employee.Vacation_Days || 0,
                        Benefit_Plan: person.BenefitPlan?.Benefit_Plan_ID,
                        Average_Plan_Benefit: avgBenefit,
                        Pay_Amount: employee.Pay_Rate?.Pay_Amount || 0,
                        Tax_Percentage: employee.Pay_Rate?.Tax_Percentage || 0
                    }));
                }
            }

            currentIdx += batchSize;
            if (currentIdx % (batchSize * 10) === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        if (humans.length === 0) {
            console.error('No records after merging:', {
                employeeCount: employeeData.length,
                personalCount: personalData.length
            });
        }


        const result = {
            data: humans,
            nextLastId: employeeData[employeeData.length - 1]?.idEmployee || lastId,
            hasMore: employeeData.length === limit,
            stats: {
                queryTime: Date.now() - startTime,
                recordCount: humans.length,
                fromCache: false
            }
        };

        // Cache successful results
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(result)); // Cache for 1 hour
        return result;
        
    } catch (error) {
        console.error('Error in getHumanDataService:', error);
        
        // Try to serve stale cache in case of any error
        const cacheData = await redisClient.get(cacheKey);
        if (cacheData) {
            console.log('[Redis] Serving stale cache due to database error');
            const parsedData = JSON.parse(cacheData);
            // Add flag to indicate this is stale data
            parsedData.stats = {
                ...parsedData.stats,
                fromCache: true,
                cacheServedAt: new Date().toISOString(),
                reason: 'Database error'
            };
            return parsedData;
        }
        
        // If no cache available, throw error
        throw error;
    }
}

module.exports = { 
    getHumanDataService,
    checkCircuitHealth,
    circuitState 
};