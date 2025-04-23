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
        this.Average_Plan_Benefit = data.Average_Plan_Benefit;
        this.Pay_Amount = data.Pay_Amount;
        this.Tax_Percentage = data.Tax_Percentage;
        this.Total_Earning = this.calculateTotalEarning();
    }

    calculateTotalEarning() {
        return (this.Pay_Amount * this.Tax_Percentage) / 100;
    }
}

module.exports = Human;