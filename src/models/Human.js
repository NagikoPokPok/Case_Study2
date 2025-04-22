class Human {
    constructor(data) {
        this.Employee_Id = data.Employee_Id;
        this.ShareHolder = data.ShareHolder;
        this.Gender = data.Gender;
        this.Ethnicity = data.Ethnicity;
        this.Employment_Status = data.Employment_Status;
        this.Department = data.Department;
        this.Paid_To_Date = data.Paid_To_Date;
        this.Paid_Last_Year = data.Paid_Last_Year;
        this.Vacation_Days = data.Vacation_Days;
        this.Benefit_Plan = data.Benefit_Plan;
        this.Total_Earning = this.calculateTotalEarning();
    }

    calculateTotalEarning() {
        // Logic tính toán Total_Earning
        return this.Paid_To_Date + this.Paid_Last_Year;
    }
}

module.exports = Human;