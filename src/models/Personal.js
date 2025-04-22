// models/Personal.js
module.exports = (sequelize, DataTypes) => {
    const Personal = sequelize.define('Personal', {
      personal_id: { type: DataTypes.INTEGER, primaryKey: true },
      name: DataTypes.STRING,
      gender: DataTypes.STRING,
      ethnicity: DataTypes.STRING,
      is_shareholder: DataTypes.BOOLEAN
    }, {
      tableName: 'Personal',
      timestamps: false
    });
  
    return Personal;
  };
  