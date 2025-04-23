// models/BenefitPlans.js
module.exports = (sequelize, DataTypes) => {
    const BenefitPlans = sequelize.define('Benefit_Plans', {
      Benefit_Plan_ID: { type: DataTypes.INTEGER, primaryKey: true },
      Plan_Name: DataTypes.STRING,
      Deductable: DataTypes.DECIMAL(18, 0),
      Percentage_CoPay: DataTypes.INTEGER,
    }, {
      tableName: 'Benefit_Plans',
      timestamps: false
    });
  
    return BenefitPlans;
  };
  