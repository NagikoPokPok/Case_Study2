const Employee = require("./Employee");

// models/Personal.js
module.exports = (sequelize, DataTypes) => {
    const Personal = sequelize.define('Personal', {
      Employee_ID: { type: DataTypes.INTEGER, primaryKey: true },
      First_Name: DataTypes.STRING,
      Gender: DataTypes.STRING,
      Ethnicity: DataTypes.STRING,
      Shareholder_Status: DataTypes.BOOLEAN,
      Benefit_Plan: {
        type: DataTypes.INTEGER,
        references: {
          model: 'Benefit_Plans',
          key: 'benefit_plan_id' 
        }
    }, 
  },
    {
      tableName: 'Personal',
      timestamps: false
    });
  
    return Personal;
  };
  