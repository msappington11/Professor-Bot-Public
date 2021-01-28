const Discord = require('discord.js');
const cheerio = require('cheerio');
var request = require('sync-request');
const puppeteer = require('puppeteer');
const prof = require('./prof.js')

const client = new Discord.Client();

client.on('ready', () =>{
    console.log('Professor Bot 4.0 is online');
});

queue = [];
inProgress = false;
client.on('message', msg=> {
    if(msg.content.startsWith('-')){
        var args = msg.content.substring(1).split(' ');
        if(args[0]=='prof'){
            if(args.length != 5){
                msg.channel.send('Invalid format. Please enter -prof <first name> <last name> <subject> <course number>\nEx: -prof john smith math 101 or -prof john smith math 101H (for honors)')
            }
            else{
                try{
                    type = 'prof'
                    firstName = args[1].toLowerCase();
                    lastName = args[2].toLowerCase();
                    subject = args[3].toLowerCase();
                    number = args[4];
                    Channel = msg.channel;
                    msg.channel.send('Adding to queue: ' + firstName + ' ' + lastName + ' ' + subject + ' ' + number);

                    //creates item and adds it to the queue
                    item = {type, firstName, lastName, subject, number, Channel}
                    queue.push(item)

                     //searches the first item in the queue if it is not searching anything else
                     if(!inProgress){
                        profSearch(queue[0].firstName, queue[0].lastName, queue[0].subject, queue[0].number, queue[0].Channel);    
                    }
                }
                catch{
                    msg.channel.send('Invalid format. Please enter -prof <first name> <last name> <subject> <course number>\nEx: -prof john smith math 101 or -prof john smith math 101H (for honors)');
                }
            }
        }
        else if(args[0]=='rank'){
            if(args.length != 3){
                msg.channel.send('Invalid format. Enter -rank <subject> <course number>\nEx: -rank math 101 or -rank math 101H (for honors)');
            }
            else{
                try{
                    type = 'rank'
                    subject = args[1].toLowerCase();
                    number = args[2];
                    Channel = msg.channel;
                    msg.channel.send('Adding to queue: ' + subject + ' ' + number);

                    //creates item and adds it to the queue
                    item = {type, subject, number, Channel};
                    queue.push(item);

                    //searches the first item in the queue if it is not searching anything else
                    if(!inProgress){
                        rank(queue[0].subject, queue[0].number, queue[0].Channel);    
                    }
                }
                catch{
                    msg.channel.send('Invalid format. Enter -rank <subject> <course number>\nEx: -rank math 101 or -rank math 101H (for honors)');
                }
            }
        }
        else if(args[0]=='help'){
            var embed = new Discord.MessageEmbed()
            .setColor('#800000')
            .setTitle('Commands:')
            .addField('-prof', 'Finds specific data for an entered professor. Use format:\n-prof <first name> <last name> <subject> <course number>\nEx: -prof john smith math 101 or -prof john smith math 101H (for honors)')
            .addField('-rank', 'Ranks all recent professors for a specific subject. This takes into account all professors who have taught in the last year to try to avoid profs that no longer teach the course.\n-rank <subject> <course number>\nEx: -rank math 101 or -rank math 101H (for honors)');
            msg.channel.send(embed);
        }
    }
})

function profSearch(firstName, lastName, subject, number, Channel){
    /*
    Creates a prof object and assigns its grade data from a chart. Calls another method to make an embed if the professor is found.
    If not found, prints an error statement and advances the queue
    Parameters
    ----------
    firstName : String
        The first name of a professor to search
    lastName : String
        The last name of a professor to search
    subject : String
        The 4 letter abbreviation for a subject (math, chem, csce, etc.)
    number : String
        The 3 letter course number
    Channel : channel attribute of msg
        The information from the channel where the command was excecuted
    */

    //moves through queue
    inProgress = true;
    queue.shift();

    //creates professor object
    professor = new prof(firstName, lastName);
    getRMP(professor, subject, number);

    //gets chart for the specific class
    getChart(subject, number, Channel).then(chart => {
        total = getTotal(chart);
        var found = false;
        //assigns values to professor
        for(var i=1; i<chart.length; i++){
            if(chart[i][2].includes((professor.getLastName() + ' ' + professor.getFirstName().substring(0, 1)).toUpperCase())){
                found = true;
                professor.addA(parseInt(chart[i][5]));
                professor.addB(parseInt(chart[i][6]));
                professor.addC(parseInt(chart[i][7]));
                professor.addD(parseInt(chart[i][8]));
                professor.addF(parseInt(chart[i][9]));
                professor.addQ(parseInt(chart[i][11]));
                professor.setLastYear(chart[i][0]);
                if(professor.getFirstYear()==0){
                    professor.setFirstYear(chart[i][0]);
                }
            }
        }
        if(found){
            makeProfEmbed(professor, total, subject, number, Channel);
        }
        else{
            Channel.send(professor.getFirstName() + ' ' + professor.getLastName() + ' has no history teaching ' + subject.toUpperCase() + ' ' + number + '.');
            advanceQueue();
        }
    });
}

function rank(subject, number, Channel){
    /*
    Creates a list of prof objects from a certain subject and ranks them based on their average GPA. Calls another method to
    make an embed. If there has been no professor that has taught the class in 2 years, it will print that and continue the queue.
    Parameters
    ----------
    subject : String
        The 4 letter abbreviation for a subject (math, chem, csce, etc.)
    number : String
        The 3 letter course number
    Channel : channel attribute of msg
        The information from the channel where the command was excecuted
    */

    //moves through queue
    inProgress = true;
    queue.shift();

    nameList = [];
    profList = [];
    getChart(subject, number, Channel).then(chart => {
        if(chart.length == 0){
            Channel.send('No data from the past 2 years for: ' + subject.toUpperCase() + ' ' + number);
            advanceQueue();
            return;
        }
        //populates a list of all professor names that have taught in the past year
        currentYear = parseInt(chart[chart.length-1][0]);
        for(var i=0; i<chart.length; i++){
            if(!nameList.includes(chart[i][2]) && (parseInt(chart[i][0]) > currentYear-2)){
                nameList.push(chart[i][2]);
            }
        }
        //populates a list called profList that contains prof objects that have the names from nameList
        for(var i=0; i<nameList.length; i++){
            splitName = nameList[i].split(' ');
            last = splitName[0];
            first = splitName[1]
            profList.push(new prof(first, last));
        }
        //Sets grade data from the grade chart for all profs in profList
        for(var a=0; a<profList.length; a++){
            for(var i=1; i<chart.length; i++){       
                if(chart[i][2].includes((profList[a].getLastName() + ' ' + profList[a].getFirstName()).toUpperCase())){
                    profList[a].addA(parseInt(chart[i][5]));
                    profList[a].addB(parseInt(chart[i][6]));
                    profList[a].addC(parseInt(chart[i][7]));
                    profList[a].addD(parseInt(chart[i][8]));
                    profList[a].addF(parseInt(chart[i][9]));
                    profList[a].addQ(parseInt(chart[i][11]));
                    profList[a].setLastYear(chart[i][0]);
                }
            }
        }
        //Sorts profList from highest to lowest GPA
        for(var a=0; a<profList.length; a++){
            for(var i=0; i<profList.length-1; i++){
                if(profList[i].getGPA() < profList[i+1].getGPA()){
                    temp = profList[i];
                    profList[i] = profList[i+1];
                    profList[i+1] = temp;
                }
            }
        }
        total = getTotal(chart);

        //if there are more than 10 professors, limits to the top 10
        if(profList.length > 10){
            len = 10; 
        }
        else{
            len = profList.length;
        }
        profList = profList.slice(0, len);

        //finds the RMP links
        for(var i=0; i<profList.length; i++){
            getRMP(profList[i], subject, number)
        }
        //creates embed
        makeRankEmbed(profList, total, subject, number, Channel);
    }); 
}

async function getChart(subject, number, Channel){
    /*
    Finds the grade chart for a specific class. Each row has the professor name, and the grade distribution.
    Also seperates the honors classes unless honors is specified.
    Parameters
    ----------
    subject : String
        The 4 letter abbreviation for a subject (math, chem, csce, etc.)
    number : String
        The 3 letter course number
    Channel : channel attribute of msg
        The information from the channel where the command was excecuted
    Returns
    -------
    profChart : 2D array
        Has grade distribution and professor name for every class that has been taught
    */

    //Sets honors to either true or false
    honors = false;
    if(number.includes('H')){
        honors = true
        number = number.substring(0, 3)
    }
    
    //launch puppeteer
    var link = 'https://anex.us/grades/?dept=' + subject + '&number=' + number;
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(link, { waitUntil: 'domcontentloaded' });

    //get html
    await page.waitForFunction('document.querySelector("body").innerText.includes("o")');
    var bodyHTML = await page.evaluate(() => document.body.outerHTML);
    await browser.close();

    //put html in cheerio
    var profChart = [];
    const $ = cheerio.load(bodyHTML);
    //converts the the html from website into usable 2D list by using headers "tr" and "td"
    $('#dataTable').find('tr').each((i, el) => {
        profChart[i] = [];
        $(el).find('td').each((a, elm)=>{
            profChart[i][a] = $(elm).text();
        })
    })

    //checks to see if there is a chart (if the class exists)
    try{
        test = profChart[0][0];
    }
    catch{
        Channel.send('Invalid course entered: ' + subject.toUpperCase() + ' ' + number);
        advanceQueue();
        return;
    }

    //Removes all honors classes
    if(honors == false){
        var i = 0;
        while(i<profChart.length){
            if(profChart[i][2].includes('(H)')){
                profChart.splice(i, 1);
            }
            else{
                i++;
            }
        }
    }
    //Removes all non-honors classes
    else{
        var i = 0;
        while(i<profChart.length){
            if(!profChart[i][2].includes('(H)')){
                profChart.splice(i, 1);
            }
            else{
                i++;
            }
        }
        number = number + 'H';
    }

    //filter array
    profChart = profChart.filter(function(){
        return true;
    });
    return profChart;
}

function getRMP(professor, subject, number){
    /*
    Gets the professors link from ratemyprofessor.com. Sets the link attribute of the prof.
    Parameters
    ----------
    professor : prof
        prof object
    subject : String
        The 4 letter abbreviation for a subject (math, chem, csce, etc.)
    number : String
        The 3 letter course number
    */

    //uses a google search link to find the RMP link
    var link = 'https://www.google.com/search?q=tamu+rate+my+professor+' + professor.getFirstName() + '+' + professor.getLastName() + '+' + subject + '+' + number;
    //gets the html from the google url
    var res = request('GET', link);
    text = res.getBody().toString();
    const $ = cheerio.load(text);
    //finds the professorID in the html of the google link
    split1 = text.substring(text.indexOf('ratemyprofessors.com/')-4); 
    split2 = split1.substring(0, split1.indexOf('"'));
    code = split2.substring(split2.indexOf('D')+1, split2.indexOf('&'))
    //sets the professors link
    rmpLink = 'https://www.ratemyprofessors.com/ShowRatings.jsp?tid=' + code
    professor.setLink(rmpLink);
}

function getTotal(chart){
    /*
    Creates a prof object with the information from all students
    Parameters
    ----------
    chart : 2D array
        2D array containing every professors letter grade distributions from the class
    Returns
    -------
    total : prof object
        prof object with the grade information from all classes
    */

    //creates a new professor with name "total" to designate that it has the stats of all students in the course
    total = new prof('total', 'total');
    for(var i=1; i<chart.length; i++){
        total.addA(parseInt(chart[i][5]));
        total.addB(parseInt(chart[i][6]));
        total.addC(parseInt(chart[i][7]));
        total.addD(parseInt(chart[i][8]));
        total.addF(parseInt(chart[i][9]));
        total.addQ(parseInt(chart[i][11]));
    }
    return total;
}

function makeProfEmbed(professor, total, subject, number, Channel){
    /*
    Makes an embed from the prof object and prints it to the user then advances the queue
    Parameters
    ----------
    professor : prof
        prof object
    total : prof
        prof object with the total grade distributions
    subject : String
        The 4 letter abbreviation for a subject (math, chem, csce, etc.)
    number : String
        The 3 letter course number
    Channel : channel attribute of msg
        The information from the channel where the command was excecuted
    */

    var embed = new Discord.MessageEmbed();
    //capitalizes the name and adds "Honors" if the user entered honors
    nameString = professor.getFirstName().substring(0,1).toUpperCase() + professor.getFirstName().substring(1).toLowerCase() + ' ' + professor.getLastName().substring(0,1).toUpperCase() + professor.getLastName().substring(1).toLowerCase();
    if(number.includes('H')){
        nameString = nameString + ' Honors'
        number = number.substring(0, 3)
    }
    //populates the embed and sends it
    embed
    .setColor('#800000')
    .setTitle(nameString)
    .addField('Average course GPA:', total.getGPA(), true)
    .addField('Professors average GPA:', professor.getGPA())
    .addField('% A:', (professor.getA() / professor.getTotal() * 100).toFixed(2), true)
    .addField('% B:', (professor.getB() / professor.getTotal() * 100).toFixed(2), true)
    .addField('% C:', (professor.getC() / professor.getTotal() * 100).toFixed(2), true)
    .addField('% D:', (professor.getD() / professor.getTotal() * 100).toFixed(2), true)
    .addField('% F:', (professor.getF() / professor.getTotal() * 100).toFixed(2), true)
    .addField('% Q drop:', (professor.getQ() / professor.getTotal() * 100).toFixed(2), true)
    .addField('First year taught:', professor.getFirstYear(), true)
    .addField('Last year taught:', professor.getLastYear(), true)
    .addField('Links:', 'https://anex.us/grades/?dept=' + subject + '&number=' + number + '\n' + professor.getLink());
    Channel.send(embed); 

    advanceQueue();
}

function makeRankEmbed(profList, total, subject, number, Channel){
    /*
    Makes an embed from profList, a list of prof objects, and prints it to the user then advances the queue
    Parameters
    ----------
    profList : list
        List of prof objects
    total : Professor
        prof object with the total grade distributions
    subject : String
        The 4 letter abbreviation for a subject (math, chem, csce, etc.)
    number : String
        The 3 letter course number
    Channel : channel attribute of msg
        The information from the channel where the command was excecuted
    */

    var embed = new Discord.MessageEmbed();
    //populares embed with basic information from the profList
    embed.setColor('#800000');
    embed.setTitle('Best ' + subject.toUpperCase() + ' ' + number + ' Professors');
    embed.addField('Average course GPA: ', total.getGPA());
    for(var i=0; i<profList.length; i++){
        p = profList[i];
        embed.addField(p.getFirstName() + ' ' + p.getLastName(), 'GPA: '+ p.getGPA() + ' | Total Students: ' + p.getTotal() + ' | Last Year Taught: ' + p.getLastYear() +'\nRMP: ' + p.getLink());
        
    }
    embed.setFooter('*Only shows professors who have taught in the past year but shows data from entire history teaching the course.\n*Use "-prof <first name> <last name> <subject> <course number>" to get more specific information or use: https://anex.us/grades/?dept=' + subject + '&number=' + number);
    Channel.send(embed);

    advanceQueue();
}

function advanceQueue(){
    /*
    Advances the queue by excecuting the next item, which either calls profSearch() or rank()
    */

    if(queue.length > 0){
        if(queue[0].type == 'prof'){
            profSearch(queue[0].firstName, queue[0].lastName, queue[0].subject, queue[0].number, Channel);
        }
        else{
            rank(queue[0].subject, queue[0].number, Channel);
        }
        queue.shift();
    }
    inProgress = false;
}

client.login('Nzg4ODc0NzY5OTM2Mjg1NzA3.X9p24Q.tEaPQd2S-LTOPod2-Rm6a-A2Jss')