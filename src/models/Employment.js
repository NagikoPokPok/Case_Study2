// models/Employment.js
module.exports = (sequelize, DataTypes) => {
    const Employment = sequelize.define('Employment', {
      Employee_Id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'Personal',
          key: 'Employee_ID' 
        }
      },
      Employment_status: DataTypes.STRING // part-time or full-time
    }, {
      tableName: 'Employment',
      timestamps: false
    });
  
    return Employment;
  };
  