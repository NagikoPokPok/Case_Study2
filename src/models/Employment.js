// models/Employment.js
module.exports = (sequelize, DataTypes) => {
    const Employment = sequelize.define('Employment', {
      Employee_ID: {
        type:  DataTypes.INTEGER, primaryKey: true ,
        references: {
          model: 'Personal',
          key: 'Employee_ID' 
        },
      },
      Employment_Status: DataTypes.STRING // part-time or full-time
    }, {
      tableName: 'Employment',
      timestamps: false
    });
  
    return Employment;
  };
  