// models/Employee.js
module.exports = (sequelize, DataTypes) => {
    const Employee = sequelize.define('Employee', {
      employee_id: { type: DataTypes.INTEGER, primaryKey: true },
      paid_to_date: DataTypes.FLOAT,
      paid_last_year: DataTypes.FLOAT,
      vacation_days: DataTypes.INTEGER
    }, {
      tableName: 'Employee',
      timestamps: false
    });
  
    return Employee;
  };
  