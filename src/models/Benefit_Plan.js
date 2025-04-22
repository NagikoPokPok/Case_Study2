// models/BenefitPlans.js
module.exports = (sequelize, DataTypes) => {
    const BenefitPlans = sequelize.define('Benefit_Plans', {
      benefit_plan_id: { type: DataTypes.INTEGER, primaryKey: true },
      name: DataTypes.STRING,
      average_benefit_paid: DataTypes.FLOAT
    }, {
      tableName: 'Benefit_Plans',
      timestamps: false
    });
  
    return BenefitPlans;
  };
  