// models/Employee.js
module.exports = (sequelize, DataTypes) => {
    const Employee = sequelize.define('Employee', {
      idEmployee: { type: DataTypes.INTEGER, primaryKey: true },
      Paid_To_Date: DataTypes.FLOAT,
      Paid_Last_Year: DataTypes.FLOAT,
      Vacation_Days: DataTypes.INTEGER
    }, {
      tableName: 'employee',
      timestamps: false
    });
  
    return Employee;
  };
  