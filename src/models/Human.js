class Human {
    constructor(data) {
        this.Employee_Id = data.Employee_Id;
        this.ShareHolder = data.ShareHolder || false;
        this.Gender = data.Gender || 'Unknown';
        this.Ethnicity = data.Ethnicity || 'Unknown';
        this.Employment_Status = data.Employment_Status || 'Unknown';
        this.Department = data.Department || 'Unknown';
        this.Paid_To_Date = data.Paid_To_Date || 0;
        this.Paid_Last_Year = data.Paid_Last_Year || 0;
        this.Vacation_Days = data.Vacation_Days || 0;
        this.Benefit_Plan = data.Benefit_Plan || 0;
        this.Average_Plan_Benefit = data.Average_Plan_Benefit || 0;
        this.Pay_Amount = data.Pay_Amount || 0;
        this.Tax_Percentage = data.Tax_Percentage || 0;
        this.Total_Earning = this.calculateTotalEarning() || 0;
    }

    calculateTotalEarning() {
        return (this.Pay_Amount * (100 - this.Tax_Percentage)) / 100;
    }
}

module.exports = Human;