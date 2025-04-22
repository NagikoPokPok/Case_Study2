// models/Employment.js
module.exports = (sequelize, DataTypes) => {
    const Employment = sequelize.define('Employment', {
      personal_id: { type: DataTypes.INTEGER, primaryKey: true },
      employment_status: DataTypes.STRING // part-time or full-time
    }, {
      tableName: 'Employment',
      timestamps: false
    });
  
    return Employment;
  };
  