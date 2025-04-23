// models/Employee.js
module.exports = (sequelize, DataTypes) => {
    const Employee = sequelize.define('Employee', {
      idEmployee: { type: DataTypes.INTEGER, primaryKey: true },
      Paid_To_Date: DataTypes.DECIMAL(2, 0),
      Paid_Last_Year: DataTypes.DECIMAL(2, 0),
      Vacation_Days: DataTypes.INTEGER,
      PayRates_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'pay_rates',
          key: 'idPay_Rates' 
        }
      },
    }, {
      tableName: 'employee',
      timestamps: false
    });

    Employee.associate = function(models) {
      Employee.belongsTo(models.Pay_Rate, {
          foreignKey: 'PayRates_id',
          targetKey: 'idPay_Rates'
      });
  };

  
    return Employee;
  };
  