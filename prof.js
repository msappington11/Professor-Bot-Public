class prof{
    firstName=''; lastName=''; link=''; firstYear=0; lastYear=0; A=0; B=0; C=0; D=0; F=0; Q=0; total=0; gpa=0;
    constructor(firstName, lastName){
        this.firstName = firstName;
        this.lastName = lastName;
    }
    //Get methods============================================================================================================
    getFirstName(){
        return this.firstName;
    }
    getLastName(){
        return this.lastName;
    }
    getFirstYear(){
        return this.firstYear;
    }
    getLastYear(){
        return this.lastYear;
    }
    getGPA(){
        this.gpa = ((this.A*4 + this.B*3 + this.C*2 + this.D) / (this.total - this.Q)).toFixed(2);
        return this.gpa;
    }
    getA(){
        return this.A;
    }
    getB(){
        return this.B;
    }
    getC(){
        return this.C;
    }
    getD(){
        return this.D;
    }
    getF(){
        return this.F;
    }
    getQ(){
        return this.Q;
    }
    getTotal(){
        return this.total;
    }
    getLink(){
        return this.link;
    }

    //Set methods============================================================================================================
    setLink(url){
        this.link = url;
    }
    setFirstYear(year){
        this.firstYear = year;
    }
    setLastYear(year){
        this.lastYear = year;
    }

    //Add methods============================================================================================================
    addA(num){
        this.A += num;
        this.total += num;
    }
    addB(num){
        this.B += num;
        this.total += num;
    }
    addC(num){
        this.C += num;
        this.total += num;
    }
    addD(num){
        this.D += num;
        this.total += num;
    }
    addF(num){
        this.F += num;
        this.total += num;
    }
    addQ(num){
        this.Q += num;
        this.total +=num;
    }
}
module.exports = prof;