// models/Employee.js
module.exports = (sequelize, DataTypes) => {
    const Employee = sequelize.define('Employee', {
      idEmployee: { type: DataTypes.INTEGER, primaryKey: true },
      Paid_To_Date: DataTypes.DECIMAL(2, 0),
      Paid_Last_Year: DataTypes.DECIMAL(2, 0),
      Vacation_Days: DataTypes.INTEGER,
      PayRate_ID: {
        type: DataTypes.INTEGER,
        references: {
          model: 'Pay_Rate',
          key: 'idPay_Rates' 
        }
      },
    }, {
      tableName: 'employee',
      timestamps: false
    });
  
    return Employee;
  };
  