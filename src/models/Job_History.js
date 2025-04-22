// models/JobHistory.js
module.exports = (sequelize, DataTypes) => {
    const JobHistory = sequelize.define('Job_History', {
      Employee_ID: {
        type: DataTypes.INTEGER,
        references: {
          model: 'Personal',
          key: 'Employee_ID' 
        }
      },
      Department: DataTypes.STRING,
      // Các field khác nếu cần
    }, {
      tableName: 'Job_History',
      timestamps: false
    });
  
    return JobHistory;
  };
  