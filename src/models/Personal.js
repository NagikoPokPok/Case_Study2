const Employee = require("./Employee");

// models/Personal.js
module.exports = (sequelize, DataTypes) => {
    const Personal = sequelize.define('Personal', {
      Employee_ID: { type: DataTypes.INTEGER, primaryKey: true },
      First_Name: DataTypes.STRING,
      Last_Name: DataTypes.STRING,
      Gender: DataTypes.BOOLEAN,
      Ethnicity: DataTypes.STRING,
      Shareholder_Status: DataTypes.BOOLEAN,
      Benefit_Plans: {
        type: DataTypes.INTEGER,
        references: {
          model: 'Benefit_Plans',
          key: 'Benefit_Plan_ID' 
        }
    }, 
  },
    {
      tableName: 'Personal',
      timestamps: false
    });

    Personal.associate = function(models) {
      // Đảm bảo các models được truyền vào đúng
      if (models.Benefit_Plans) {
          Personal.belongsTo(models.Benefit_Plans, {
              foreignKey: 'Benefit_Plans',
              targetKey: 'Benefit_Plan_ID',
              as: 'BenefitPlan'
          });
      }
      
      if (models.Employment) {
          Personal.hasOne(models.Employment, {
              foreignKey: 'Employee_ID',
              sourceKey: 'Employee_ID'
          });
      }

      if (models.Job_History) {
        Personal.hasMany(models.Job_History, {
            foreignKey: 'Employee_ID',
            sourceKey: 'Employee_ID',
            as: 'JobHistory'
        });
    }
  };
  
    return Personal;
  };
  