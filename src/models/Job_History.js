// models/JobHistory.js
module.exports = (sequelize, DataTypes) => {
    const JobHistory = sequelize.define('Job_History', {
      personal_id: DataTypes.INTEGER,
      department: DataTypes.STRING,
      // Các field khác nếu cần
    }, {
      tableName: 'Job_History',
      timestamps: false
    });
  
    return JobHistory;
  };
  