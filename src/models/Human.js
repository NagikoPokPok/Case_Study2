module.exports = (sequelize, DataTypes) => {
    const Human = sequelize.define('Human', {
        Employee_Id: {
            type: DataTypes.INTEGER,
            primaryKey: true
        },
        ShareHolder: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        Gender: {
            type: DataTypes.STRING,
            allowNull: true
        },
        Ethnicity: {
            type: DataTypes.STRING,
            allowNull: true
        },
        Employment_Status: {
            type: DataTypes.STRING,
            allowNull: true
        },
        Department: {
            type: DataTypes.STRING,
            allowNull: true
        },
        Paid_To_Date: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: true
        },
        Paid_Last_Year: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: true
        },
        Vacation_Days: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        Benefit_Plan: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        Benefit_Plan_Avg: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: true
        }
    }, {
        tableName: 'Human',
        timestamps: false
    });

    return Human;
};