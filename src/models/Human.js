class Human {
    constructor(employeeId, shareholder, gender, ethnicity, employmentStatus, department, paidToDate, paidLastYear, vacationDays, benefitPlan, benefitPlanAvg) {
        this.Employee_Id = employeeId;
        this.ShareHolder = shareholder;
        this.Gender = gender;
        this.Ethnicity = ethnicity;
        this.Employment_Status = employmentStatus;
        this.Department = department;
        this.Paid_To_Date = paidToDate;
        this.Paid_Last_Year = paidLastYear;
        this.Vacation_Days = vacationDays;
        this.Benefit_Plan = benefitPlan;
        this.Benefit_Plan_Avg = benefitPlanAvg;
    }

    // Tính toán tổng thu nhập (có thể thêm logic theo yêu cầu)
    get Total_Earning() {
        return 0;
    }
}

module.exports = Human;
