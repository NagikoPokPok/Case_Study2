// models/PayRate.js
module.exports = (sequelize, DataTypes) => {
    const PayRate = sequelize.define('Pay_Rate', {
      idPay_Rates: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      Pay_Amount: {
        type: DataTypes.DECIMAL(10, 0),
        allowNull: false
      },
      Pay_Rate_Name: {
        type: DataTypes.STRING(40),
        allowNull: false
      },
      Pay_Type: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      PT_Level_C: {
        type: DataTypes.DECIMAL(10, 0),
        allowNull: false
      },
      Tax_Percentage: {
        type: DataTypes.DECIMAL(10, 0),
        allowNull: false
      },
      Value: {
        type: DataTypes.DECIMAL(10, 0),
        allowNull: false
      }
    }, {
      tableName: 'pay_rates', // Tên bảng trong MySQL
      timestamps: false,
    });
  
    return PayRate;
  };
  