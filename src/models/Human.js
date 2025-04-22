const { Sequelize, DataTypes } = require('sequelize');

// Khởi tạo Sequelize instance không cần database
const sequelize = new Sequelize('sqlite::memory:');

const Human = sequelize.define('Human', {
    Employee_Id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        field: 'idEmployee'
    },
    ShareHolder: {
        type: DataTypes.BOOLEAN,
        allowNull: true
    },
    Gender: {
        type: DataTypes.BOOLEAN,
        allowNull: true
    },
    Ethnicity: {
        type: DataTypes.STRING(45),
        allowNull: true
    },
    Employment_Status: {
        type: DataTypes.STRING(45),
        allowNull: true
    },
    Department: {
        type: DataTypes.STRING(45),
        allowNull: true
    },
    Paid_To_Date: {
        type: DataTypes.DECIMAL(2,0),
        allowNull: true
    },
    Paid_Last_Year: {
        type: DataTypes.DECIMAL(2,0),
        allowNull: true
    },
    Total_Earning: {
        type: DataTypes.VIRTUAL,
        get() {
            return null; // Logic tính toán có thể thêm sau
        }
    },
    Vacation_Days: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    Benefit_Plan: {
        type: DataTypes.STRING(45),
        allowNull: true
    },
    Benefit_Plan_Avg: {
        type: DataTypes.DOUBLE,
        allowNull: true
    },
}, {
    timestamps: false
});

module.exports = Human;