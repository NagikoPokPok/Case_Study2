// models/BenefitPlans.js
module.exports = (sequelize, DataTypes) => {
    const BenefitPlans = sequelize.define('Benefit_Plans', {
      Benefit_plan_id: { type: DataTypes.INTEGER, primaryKey: true },
      Name: DataTypes.STRING,
      Deductable: DataTypes.DECIMAL(18, 0),
      Percentage_Copay: DataTypes.INTEGER,
    }, {
      tableName: 'Benefit_Plans',
      timestamps: false
    });
  
    return BenefitPlans;
  };
  