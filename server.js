const express = require('express'); //Line 1
const app = express(); //Line 2
const port = process.env.PORT || 8081; //Line 3
const bodyParser = require("body-parser");
const router = express.Router();
const _ = require('lodash');
var async = require("async");
const got = require('got');
var http = require('http');
var https = require('https');
var fs = require('fs');
const cors = require("cors");

var mysql = require('mysql2');
/*var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Shaka2022',
  database: 'sportsheat'
});*/

var connection = mysql.createConnection({
  //host: 'db-mysql-nyc3-sportsalum-do-user-11001808-0.b.db.ondigitalocean.com',
  host: 'db-mysql-nyc3-sportsalum-do-user-11001808-0.b.db.ondigitalocean.com',
  user: 'doadmin',
  port: 25060,
  password: 'AVNS_ma24JLhQbt-rkQx',
  database: 'sportsalum'
})



connection.connect(function(err) {
  if (err) {
    console.error('error connecting: ', err);
    return;
  }
});

//console.log("connection: ", connection);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.listen(port, () => console.log(`Listening on prt ${port}`));

require('./routes/auth.routes')(app);
require('./routes/user.routes')(app);

// database
const db = require("./models");
const Role = db.role;

db.sequelize.sync();
console.log("db.sequelize: ", db.sequelize);

function initial() {
  Role.create({
    id: 1,
    name: "user"
  });
 
  Role.create({
    id: 2,
    name: "moderator"
  });
 
  Role.create({
    id: 3,
    name: "admin"
  });
}

const connectCoachToTeam = (rows, i) => {
    //connection.connect();
    console.log("connectCoachToTeam:rows[i]: ", rows[i]);
    if (rows[i] !== undefined) {
      connection.query(rows[i], function (err1, rows1, fields1) {
          if (err1) throw err1
          i = i + 1;
          connectCoachToTeam(rows, i);
      });
    }
}

router.post('/connect_person_to_team', async (request,response) => {

  let numOfYears = parseInt(request.body.team_person.end_year) - parseInt(request.body.team_person.start_year);
  let startYear = parseInt(request.body.team_person.start_year);
  let endYear = parseInt(request.body.team_person.end_year);
  let position_type;
  let rows10 = [];
  if (request.body.team_person.position_type === null) {
    for (let i = 0; i<=numOfYears; i++) {
      let insertString =  "INSERT INTO person_team_year_2 VALUES (NULL, " 
      + request.body.team_person.amateur_id + ", "
      + request.body.team_person.team_id + ", '" + (startYear + i) + "', '" + request.body.team_person.team_type + "', NULL); ";
      rows10.push(insertString);
    }
  } else {
    for (let i = 0; i<=numOfYears; i++) {
      let insertString =  "INSERT INTO person_team_year_2 VALUES (NULL, " 
      + request.body.team_person.amateur_id + ", "
      + request.body.team_person.team_id + ", '" + (startYear + i) + "', '" + request.body.team_person.team_type + "', '" + request.body.team_person.position_type; + "'); ";
      rows10.push(insertString);
    }
  }

  let i = 0;
  connectCoachToTeam(rows10, i);

});

const setTeamDisplayName = (rows, i) => {
    let displayName = rows[i].display_name.replace(/'/g, "\\'");
    connection.query("UPDATE team SET display_name = '" + displayName + "' WHERE school_id = '" + rows[i].idschool + "'", function (err1, rows1, fields1) {
            if (err1) throw err1
            i = i + 1;
            setTeamDisplayName(rows, i);

    });
}

router.post('/set_team_display_name', async (request,response) => {
  connection.connect();
  connection.query("SELECT idschool, display_name FROM school WHERE division = '1'", function (err, rows, fields) {
    if (err) throw err
    
    let i = 0;
    setTeamDisplayName(rows, i);
    
  });
});

const findNewWcbbPeople = (rows1, i) => {
  
  if (i < rows1.length) {
    let name = splitAtFirstSpace(rows1[i].name);

    let firstname = name[0].replace(/'/g, "");
    let lastname = name[1].replace(/'/g, "");
    connection.query("SELECT * from wcbb_person where firstname = '" + firstname + "' and lastname = '" + lastname + "'" , function (err, rows, fields) {
      
      if (rows === undefined) {
        console.log("New player: ", firstname + " " + lastname);
      }

      i = i + 1;
      findNewWcbbPeople(rows1, i);
    });
  }

}

router.post('/find_new_wcbb_people', async (request,response) => {
  connection.connect();
  console.log("/find_new_wcbb_people");

  connection.query("SELECT * FROM wcbb_temp_table_510", function (err, rows, fields) {
    if (err) throw err

    let i = 0;
    findNewWcbbPeople(rows, i);
    
  });
});

////////////////////////////

const createWcbbYearPerson = (rows, i) => {
  
  if (i < rows.length) {
    let itemYears = rows[i].year.split('-');
    let firstYear = '20' + itemYears[0].substr(2,2);
    let lastYear = '20' + itemYears[1];
    connection.query("INSERT INTO wcbb_person_team_year_510 VALUES (NULL," + rows[i].person_id + "," + rows[i].team_id + ",'"+firstYear+"','','')" , function (err1, rows1, fields1) {
      connection.query("INSERT INTO wcbb_person_team_year_510 VALUES (NULL," + rows[i].person_id + "," + rows[i].team_id + ",'"+lastYear+"','','')" , function (err1, rows1, fields1) {
      
        i = i + 1;
        createWcbbYearPerson(rows, i);
      });
    });
  }

}

router.post('/create_wcbb_year_person', async (request,response) => {
  connection.connect();
  console.log("create_wcbb_year_person");

  connection.query("SELECT * FROM wcbb_temp_table_510", function (err, rows, fields) {
    if (err) throw err

    let i = 0;
    createWcbbYearPerson(rows, i);

  });
});

const updateWcbbTeamAmateurId = (rows, i) => {
  
  if (i < rows.length) {
    let playerName = rows[i].firstname + " " + rows[i].lastname;
    
    console.log("UPDATE wcbb_temp_table_510 SET person_id = " + rows[i].idperson + " WHERE name = '" + playerName + "'");

    connection.query("UPDATE wcbb_temp_table_510 SET person_id = " + rows[i].idperson + " WHERE name = '" + playerName + "'" , function (err1, rows1, fields1) {
        console.log("updateWcbbTeamAmateurId:rows1: ", rows1);
        i = i + 1;
        updateWcbbTeamAmateurId(rows, i);
    });
  }

}

router.post('/update_wcbb_team_amateur_id', async (request,response) => {
  connection.connect();
  console.log("update_wcbb_team_amateur_id");

  connection.query("SELECT * FROM wcbb_person", function (err, rows, fields) {
    if (err) throw err

    let i = 0;
    updateWcbbTeamAmateurId(rows, i);
    
  });
});

let insertCoachesURL = '';
//let coachesJSON = require('./coaches_json/z_coaches1.json');
let unknownSchools = [{'team1':'St. Josephs','team2': 'Saint Josephs'},
    {'team1':'Louisiana','team2': 'Lafayette'},
    {'team1':'Bethune-Cookman','team2': 'Bethune–Cookman'},
    {'team1':'Detroit','team2': 'Detroit Mercy'},
    {'team1':'Long Beach State','team2': 'Cal State Long Beach'},
    {'team1':'Pitt','team2': 'Pittsburgh'},
    {'team1':'UNLV','team2': 'Nevada-Las Vegas'},
    {'team1':'UCSB','team2': 'UC-Santa Barbara'},
    {'team1':'UNC Asheville','team2': 'North Carolina-Asheville'},
    {'team1':'Louisiana-Monroe','team2': 'Louisiana–Monroe'},
    {'team1':'BYU','team2': 'Brigham Young'},
    {'team1':'LSU','team2': 'Louisiana State'},
    {'team1':'UConn','team2': 'Connecticut'},
    {'team1':'UMass','team2': 'Massachusetts'},
    {'team1':'Saint Marys','team2': 'Saint Marys (CA)'},
    {'team1':'USC','team2': 'Southern California'},
    {'team1':'Ole Miss','team2': 'Mississippi'},
    {'team1':'UTEP','team2': 'Texas-El Paso'},
    {'team1':'California','team2': 'University of California'},
    {'team1':'UNC Greensboro','team2': 'North Carolina-Greensboro'},
    {'team1':'Bellarmine','team2': ''},
    {'team1':'North Alabama','team2': ''},
    {'team1':'VMI','team2': 'Virginia Military Institute'},
    {'team1':'Oklahoma City','team2': ''},
    {'team1':'Southern Miss','team2': 'Southern Mississippi'},
    {'team1':'California Baptist','team2': ''},
    {'team1':'UIC','team2': 'Illinois-Chicago'},
    {'team1':'VCU','team2': 'Virginia Commonwealth'},
    {'team1':'St. Peters','team2': 'Saint Peters'},
    {'team1':'UNC','team2': 'North Carolina'},
    {'team1':'Loyola Marymount','team2': 'Loyola (LA)'},
    {'team1':'SMU','team2': 'Southern Methodist'},
    {'team1':'TCU','team2': 'Texas Christian'},
    {'team1':'NYU','team2': ''},
    {'team1':'Centenary (LA)','team2': 'Centenary College of Louisiana'},
    {'team1':'UMKC','team2': 'Missouri-Kansas City'},
    {'team1':'ETSU','team2': 'East Tennessee State'},
    {'team1':'UCF','team2': 'Central Florida'},
    {'team1':'LIU','team2': 'Long Island University'},
    {'team1':'UNC Wilmington','team2': 'North Carolina-Wilmington'},
    {'team1':'Central Connecticut','team2': 'Central Connecticut State'},
    {'team1':'UT-Martin', 'team2': 'Tennessee-Martin'},
    {'team1':'UTSA', 'team2': 'Texas-San Antonio'},
    {'team1':'NC State', 'team2': 'North Carolina State'},
    {'team1':'Brooklyn', 'team2': 'Brooklyn College'},
    {'team1':'SIU-Edwardsville', 'team2': 'Southern Illinois-Edwardsville'},
    {'team1':'Texas A&M-Corpus Christi', 'team2': 'Texas A&M–Corpus Christi'},
    {'team1':'Penn', 'team2': 'Pennsylvania'},
    {'team1':'UC-San Diego', 'team2': 'San Diego'},
    {'team1':'UMBC', 'team2': 'Maryland-Baltimore County'},
    {'team1':'Savannah State', 'team2': 'Savannah State University'},
    {'team1':'UMass-Lowell', 'team2': 'Massachusetts-Lowell'},
    {'team1':'West Chester', 'team2': 'West Chester University'},
    {'team1':'Kansas City', 'team2': 'Missouri-Kansas City'},
    {'team1':'West Texas A&M', 'team2': 'West Texas A&M University'}
  ];

const insertCoachesURLs = (i, coachesQuery) => {
  
  if (i < coachesJSON.length-1) {
    let name = splitAtFirstSpace(coachesJSON[i].name);

    let coachesSchool = '';
    let teamSchool = '';
    if (coachesJSON[i].school === null) {
      coachesSchool = '';
    } else {
      coachesSchool = coachesJSON[i].school;
    }

    teamSchool = coachesSchool;
    unknownSchools.forEach((item) => {
      if (coachesSchool === item.team1) {
        teamSchool = item.team2;
      }
    });

    let yearSplit = [];
    let year1 = '';
    let year2 = '';

    if (coachesJSON[i].year !== null) {
      yearSplit = coachesJSON[i].year.split('-');
      if (parseInt(yearSplit[1]) > 0 && parseInt(yearSplit[1]) < 25) {
        yearSplit[1] = parseInt('20' + yearSplit[1]);
      } else if (parseInt(yearSplit[1]) >= 25) {
        yearSplit[1] = parseInt('19' + yearSplit[1]);
      }

      year1 = parseInt(yearSplit[0]);
      year2 = parseInt(yearSplit[1]);
    }
    
    connection.query("SELECT idperson FROM person WHERE firstname = '" + name[0] + "' AND lastname = '" + name[1] + "' AND person_type = 'coach'", function (err1, rows1, fields1) {
      if (!_.isEmpty(coachesSchool)) {
        connection.query("SELECT team_id, display_name FROM team WHERE display_name = '" + teamSchool + "' AND gender = 'M'", function (err2, rows2, fields2) {
          let unknownSchool = '';
          let teamId = 0;
          
          if (_.isEmpty(rows2)) {
            unknownSchool = teamSchool;
            teamId = 0;
          } else {
            teamId = rows2[0].team_id;
          }

          coachesQuery = coachesQuery + "INSERT INTO coaches_team_year VALUES (NULL, " + rows1[0].idperson + ", " +teamId+ ", '" + year1 + "', '" + unknownSchool + "'); ";
          coachesQuery = coachesQuery + "INSERT INTO coaches_team_year VALUES (NULL, " + rows1[0].idperson + ", " +teamId+ ", '" + year2 + "', '" + unknownSchool + "'); ";
          
          i = i + 1;
          insertCoachesURLs(i, coachesQuery);
        });
      } else {
        coachesQuery = coachesQuery + "INSERT INTO coaches_team_year VALUES (NULL, " +rows1[0].idperson + ", NULL, '" + year1 + "', ''); ";
        coachesQuery = coachesQuery + "INSERT INTO coaches_team_year VALUES (NULL, " +rows1[0].idperson+ ", NULL, '" + year2 + "', ''); ";
        i = i + 1;
        insertCoachesURLs(i, coachesQuery);
      }
    });
  } else {
    
    require('fs').writeFile(

      './coaches_json/z_coaches_insert.txt',

      JSON.stringify(coachesQuery),

      function (err) {
          if (err) {
              console.error('Crap happens');
          }
      }
    );
  }
  
}

router.post('/insert_coaches_urls', async (request,response) => {
  connection.connect();
  console.log("insert_coaches_urls");

    let coachesQuery = '';
    let i = 0;
    insertCoachesURLs(i, coachesQuery);

});

let coachesURL = '';

const buildCoachesURLs = (rows, i) => {
  if (i < rows.length) {
    let coachesURL1 = rows[i].firstname.toLowerCase()+ " " +rows[i].lastname.toLowerCase()+ ",https://www.sports-reference.com/cbb/coaches/"+rows[i].firstname.toLowerCase()+"-"+rows[i].lastname.toLowerCase()+"-1.html\r\n";

    require('fs').appendFile('z_coaches.txt', coachesURL1, function (err) {
      if (err) return console.log(err);
    });
    
      i = i + 1;
      buildCoachesURLs(rows, i);
  }
}

router.post('/build_coaches_urls', async (request,response) => {
  connection.connect();

  connection.query("SELECT * FROM person WHERE person_type = 'coach' AND lastname LIKE 'z%'", function (err, rows, fields) {
    if (err) throw err

    coachesURL = '';
    let i = 0;
    buildCoachesURLs(rows, i);

  });
});

const getCoachesURLs = (rows, i) => {
  
  if (i < rows.length) {
    let urlArray = rows[i].split(',');
    let fullName = urlArray[0].split(' ');
    let destName = fullName[0] + "_" + fullName[1] + ".html";
    download(rows, i, destName, urlArray[1]);
  }

  /*if (i === rows.length) {
    //console.log("1:buildTransferURLs:transferURL: ", transferURL);

    require('fs').writeFile(

      './url_transfers.txt',

      JSON.stringify(transferURL),

      function (err) {
          if (err) {
              console.error('Crap happens');
          }
      }
    );
  }*/

}

router.post('/get_coaches_urls', async (request,response) => {
  connection.connect();

  let fileLineArray = [];

  readEachLineSync('z_coaches.txt', 'utf8', function(line) {
    fileLineArray.push(line);
  })

  let i = 0;
  getCoachesURLs(fileLineArray, i);
  
});

var download = function(rows, i, dest, url) {
  var file = fs.createWriteStream("z_coaches_html/" + dest);
  var request = https.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close();  // close() is async, call cb after close completes.
      i = i + 1;
      getCoachesURLs(rows, i);
    });
  }).on('error', function(err) { // Handle errors
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
    if (cb) cb(err.message);
  });
};

////////////////////////////

//let nbaJSON = require('./nba_html.json');
let nbaJSON = '';

//let nbaTeamsAbbrJSON = require('./nba_team_abbr.json');
let nbaTeamsAbbrJSON = '';

router.post('/insert_nba_teams_abbr', async (request,response) => {
  connection.connect();
  console.log("insert_nba_teams_abbr");

  let nbaTeamsAbbrInsert = '';

  nbaTeamsAbbrJSON.forEach((item) => {
    nbaTeamsAbbrInsert = nbaTeamsAbbrInsert + "INSERT INTO pro_team VALUES (NULL, '" + item.team[1] + "', '" + item.team[1] + "', '" + item.team[0] + "', '', '', '" + item.team[2] + "', '" + item.team[3] + "', '', '', '', '', '', '', 0, '', '', 'nba', '', '', ''); "
  });

  require('fs').writeFile(

    'insert_nba_team_abbr_db.txt',

    JSON.stringify(nbaTeamsAbbrInsert),

    function (err) {
        if (err) {
          
        }
    }
  );

});

router.post('/get_nba_teams', async (request,response) => {
  connection.connect();

  let fileLineArray = [];
  let i = 0;
  let nbaTeams = [];

  nbaJSON.forEach((item) => {
    let teamPresent = false;
    for (let i = 0; i<nbaTeams.length; i++) {
      if (nbaTeams[i] === item.team) {
        teamPresent = true;
      }
    }
    if (teamPresent === false) {
      nbaTeams.push(item.team)
    }
  })

  require('fs').writeFile(

    '.nba_team_abbr.txt',

    JSON.stringify(nbaTeams),

    function (err) {
        if (err) {
            console.error('Crap happens');
        }
    }
  );

});

const insertNBAPlayers = (i, nbaPlayersQuery) => {
  if (i < nbaJSON.length-1) {
    let name = splitAtFirstSpace(nbaJSON[i].name);

    /*let coachesSchool = '';
    let teamSchool = '';
    if (coachesJSON[i].school === null) {
      coachesSchool = '';
    } else {
      coachesSchool = coachesJSON[i].school;
    }

    teamSchool = coachesSchool;
    unknownSchools.forEach((item) => {
      if (coachesSchool === item.team1) {
        teamSchool = item.team2;
        console.log("teamSchool: ", teamSchool);
      }
    });*/
    let year1 = 0;
    let year2 = 0;
    let yearSplit = [];
    if (nbaJSON[i].year !== null) {
      yearSplit = nbaJSON[i].year.split('-');
      if (parseInt(yearSplit[1]) > 0 && parseInt(yearSplit[1]) < 25) {
        yearSplit[1] = parseInt('20' + yearSplit[1]);
      } else if (parseInt(yearSplit[1]) >= 25) {
        yearSplit[1] = parseInt('19' + yearSplit[1]);
      }

      year1 = parseInt(yearSplit[0]);
      year2 = parseInt(yearSplit[1]);
    } else {
      year1 = 0;
      year2 = 0;
    }
    
    connection.query("SELECT idm_pro_bb_person FROM m_pro_bb_person WHERE firstname = '" + name[0] + "' AND lastname = '" + name[1] + "'", function (err1, rows1, fields1) {

        if (nbaJSON[i].team !== null && nbaJSON[i].year !== null) {
          connection.query("SELECT idpro_team, abbr FROM pro_team WHERE abbr = '" + nbaJSON[i].team + "'", function (err2, rows2, fields2) {
            let teamId = 0;
            
            if (_.isEmpty(rows2)) {
              teamId = 0;
            } else {
              teamId = rows2[0].idpro_team;
            }

            nbaPlayersQuery = nbaPlayersQuery + "INSERT INTO nba_person_team_year VALUES (NULL, " + rows1[0].idm_pro_bb_person + ", " + teamId + ", '" + year1 + "', '', '', '" + rows2[0].abbr + "'); ";
            nbaPlayersQuery = nbaPlayersQuery + "INSERT INTO nba_person_team_year VALUES (NULL, " + rows1[0].idm_pro_bb_person + ", " + teamId + ", '" + year2 + "', '', '', '" + rows2[0].abbr + "'); ";
            
            i = i + 1;
            insertNBAPlayers(i, nbaPlayersQuery);
          });
        } else {
          i = i + 1;
          insertNBAPlayers(i, nbaPlayersQuery);
        }
    });
  } else {
    
    require('fs').writeFile(

      './nba_players_insert/nba_players_insert.txt',

      JSON.stringify(nbaPlayersQuery),

      function (err) {
          if (err) {
              console.error('');
          }
      }
    );
  }
  
}

router.post('/insert_nba_players', async (request,response) => {
    
    let nbaPlayersQuery = '';
    let i = 0;
    insertNBAPlayers(i, nbaPlayersQuery);

});

let nbaURL = '';

const buildNBAURLs = (rows, i) => {
  
  if (i < rows.length) {
    
    let nbaURL1 = rows[i].firstname.toLowerCase()+ " " +rows[i].lastname.toLowerCase()+ ",https://www.basketball-reference.com/players/" + rows[i].lastname.toLowerCase().charAt(0) + "/" + rows[i].page_name + ".html; ";

    require('fs').appendFile('nba_urls.txt', nbaURL1, function (err) {
      if (err) return console.log(err);
      console.log('successfully appended "' + nbaURL1 + '"');
    });
    
    i = i + 1;
    buildNBAURLs(rows, i);

  }
}

router.post('/build_nba_urls', async (request,response) => {
  connection.connect();

  connection.query("SELECT * FROM m_pro_bb_person WHERE person_type = 'player'", function (err, rows, fields) {
    if (err) throw err

    nbaURL = '';
    let i = 0;
    buildNBAURLs(rows, i);
    //response.send({ person: rows });

  });
});

const getNBAURLs = (rows, i) => {
  
  if (i < rows.length) {
    //download(url, dest, cb);
    let urlArray = rows[i].split(',');
    
    let fullName = splitAtFirstSpace(urlArray[0])
    fullName[1] = fullName[1].replace(/\s+/g, '');
    let destName = fullName[0] + "_" + fullName[1] + ".html";

    downloadNBA(rows, i, destName, urlArray[1]);

  }

  /*if (i === rows.length) {
    //console.log("1:buildTransferURLs:transferURL: ", transferURL);

    require('fs').writeFile(

      './url_transfers.txt',

      JSON.stringify(transferURL),

      function (err) {
          if (err) {
              console.error('Crap happens');
          }
      }
    );
  }*/

}

router.post('/get_nba_urls', async (request,response) => {
  connection.connect();
  
  let fileLineArray = [];

  readEachLineSync('nba_urls.txt', 'utf8', function(line) {
    fileLineArray.push(line);
  })

  let i = 0;
  getNBAURLs(fileLineArray, i);
  
});

var downloadNBA = function(rows, i, dest, url) {
  var file = fs.createWriteStream("nba_html/" + dest);
  var request = https.get(url, function(response) {
    console.log("downloadNBA:url: ", url);
    response.pipe(file);
    file.on('finish', function() {
      console.log("downloadNBA:file:finish");
      file.close();  // close() is async, call cb after close completes.
      i = i + 1;
      getNBAURLs(rows, i);
    });
  }).on('error', function(err) { // Handle errors
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
    if (cb) cb(err.message);
  });
};

const redoMensTeams = (rows, i) => {
  
  if (i < rows.length) {
    connection.query("UPDATE team SET team_id = " + rows[i].team_id + " WHERE display_name = '" + rows[i].team_text + "' AND gender = 'M'" , function (err1, rows1, fields1) {
      i = i + 1;
      redoMensTeams(rows, i);
    });
  }

}

router.post('/redo_mens_teams', async (request,response) => {
  connection.connect();

  connection.query("SELECT * FROM person where type = 'player'", function (err, rows, fields) {
    if (err) throw err

    let i = 0;
    redoMensTeams(rows, i);
    //response.send({ person: rows });

  });
});

const getSchoolsWithNoTeams = (rows, i) => {
  
  if (i < rows.length) {
    connection.query("UPDATE team SET team_id = " + rows[i].team_id + " WHERE display_name = '" + rows[i].team_text + "' AND gender = 'M'" , function (err1, rows1, fields1) {
      i = i + 1;
      redoMensTeams(rows, i);
    });
  }

}

router.post('/get_schools_with_no_teams', async (request,response) => {
  connection.connect();
  
  connection.query("SELECT idschool FROM schools where division = 3", function (err, rows, fields) {
    if (err) throw err

    let schoolIds = [];
    rows.forEach((item) => {
      schoolIds.push(item);
    });

    connection.query("SELECT * FROM team where WHERE school_id IN (" + schoolIds + ")", function (err1, rows1, fields1) {
      if (err1) throw err1
      response.send({ person: 0 });
    });
  });
});

////////////////////////////

const reverseGeocoding = async (rows, i) => {
  
  if (i < rows.length) {
    (async () => {
        try {
          let uri = "https://api.opencagedata.com/geocode/v1/json?q=" + rows[i].name + " " + rows[i].city + " " + rows[i].state + "&key=54c9943b71a14e9da566da5dc9248516&language=en&pretty=1"
          const encoded = encodeURI(uri);
          console.log("encoded: ", encoded);
          const response = await got(encoded, { json: true });
          
            if (!_.isEmpty(response.body.results)) {
              console.log("UPDATE school SET lat = '" + response.body.results[0].geometry.lat + "', lon = '" + response.body.results[0].geometry.lng + "' WHERE idschool = " + rows[i].idschool);
              connection.query("UPDATE school SET lat = '" + response.body.results[0].geometry.lat + "', lon = '" + response.body.results[0].geometry.lng + "' WHERE idschool = " + rows[i].idschool , function (err1, rows1, fields1) {
                console.log("rows1: ", rows1);
                setTimeout(() => {
                    i = i + 1;
                    reverseGeocoding(rows, i);
                  }, 1000);
                });
            } else {
              console.log("No result");
              setTimeout(() => {
                i = i + 1;
                reverseGeocoding(rows, i);
              }, 1000);
            }
          } catch (error) {
            console.log(error);
          }
          
      })();
  }

}

router.post('/reverse_geocoding', async (request,response) => {
  connection.connect();
  console.log("/reverse_geocoding");

  connection.query("SELECT * FROM school where lat = '' AND lon = '' AND division = 'hs' AND state = 'MN'", function (err, rows, fields) {
    if (err) throw err

    console.log("rows.length: ", rows.length);
    let i = 0;
    reverseGeocoding(rows, i);

  });
});

const createTeamFromHS = (rows, i) => {
  if (i < rows.length) {
    connection.query("INSERT INTO team VALUES (NULL, 0, '" + rows[i].name + "', '', '', 'basketball', 'M', 'hs', '', '" + rows[i].idschool + "')" , function (err1, rows1, fields1) {
        i = i + 1;
        createTeamFromHS(rows, i);
    });
  }

}

router.post('/create_teams_from_hs', async (request,response) => {
  connection.connect();
  console.log("redo_mens_teams");

  connection.query("SELECT * FROM school where division = 'hs'", function (err, rows, fields) {
    if (err) throw err

    let i = 0;
    createTeamFromHS(rows, i);
    //response.send({ person: rows });

  });
});

const connWcbbPlayersTeams = (rows, i) => {
  
  let unknownWcbbSchools = [
    {'team1':'A&M-Corpus Christi','team2': 'Texas A&M–Corpus Christi'},
    {'team1':'Alabama St.','team2': 'Alabama State'},
    {'team1':'Alcorn','team2': 'Alcorn State'},
    {'team1':'App State','team2': 'Appalachian State'},
    {'team1':'Arizona St.','team2': 'Arizona State'},
    {'team1':'Ark.-Pine Bluff','team2': 'Arkansas-Pine Bluff'},
    {'team1':'Arkansas St.','team2': 'Arkansas State'},
    {'team1':'Army West Point','team2': 'Army'},
    {'team1':'Ball St.','team2': 'Ball State'},
    {'team1':'Bethune-Cookman','team2': 'Bethune–Cookman'},
    {'team1':'Boise St.','team2': 'Boise State'},
    {'team1':'Boston U.','team2': 'Boston University'},
    {'team1':'Bowling Green','team2': 'Bowling Green State'},
    {'team1':'BYU','team2': 'Brigham Young'},
    {'team1':'Cal St. Fullerton','team2': 'Cal State Fullerton'},
    {'team1':'California','team2': 'University of California'},
    {'team1':'California Baptist','team2': ''},
    {'team1':'Central Ark.','team2': 'Central Arkansas'},
    {'team1':'Central Conn. St.','team2': 'Central Connecticut State'},
    {'team1':'Central Mich.','team2': 'Central Michigan'},
    {'team1':'Charleston So.','team2': 'Charleston Southern'},
    {'team1':'Chicago St.','team2': 'Chicago State'},
    {'team1':'Cleveland St.','team2': 'Cleveland State'},
    {'team1':'Col. of Charleston','team2': 'College of Charleston'},
    {'team1':'Colorado St.','team2': 'Colorado State'},
    {'team1':'Coppin St.','team2': 'Coppin State'},
    {'team1':'CSU Bakersfield','team2': 'Cal State Bakersfield'},
    {'team1':'CSUN','team2': 'Cal State Northridge'},
    {'team1':'Delaware St.','team2': 'Delaware State'},
    {'team1':'Eastern Ill.','team2': 'Eastern Illinois'},
    {'team1':'Eastern Ky.','team2': 'Eastern Kentucky'},
    {'team1':'Eastern Mich.','team2': 'Eastern Michigan'},
    {'team1':'Eastern Wash.','team2': 'Eastern Washington'},
    {'team1':'ETSU','team2': 'East Tennessee State'},
    {'team1':'FGCU','team2': 'Florida Gulf Coast'},
    {'team1':'FIU','team2': 'Florida International'},
    {'team1':'Fla. Atlantic','team2': 'Florida Atlantic'},
    {'team1':'Florida St.','team2': 'Florida State'},
    {'team1':'Fresno St.','team2': 'Fresno State'},
    {'team1':'Ga. Southern','team2': 'Georgia Southern'},
    {'team1':'Georgia St.','team2': 'Georgia State'},
    {'team1':'Idaho St.','team2': 'Idaho State'},
    {'team1':'Illinois St.','team2': 'Illinois State'},
    {'team1':'Indiana St.','team2': 'Indiana State'},
    {'team1':'Iowa St.','team2': 'Iowa State'},
    {'team1':'Jackson St.','team2': 'Jackson State'},
    {'team1':'Jacksonville St.','team2': 'Jacksonville State'},
    {'team1':'Kansas City','team2': 'Missouri-Kansas City'},
    {'team1':'Kansas St.','team2': 'Kansas State'},
    {'team1':'Kennesaw St.','team2': 'Kennesaw State'},
    {'team1':'Kent St.','team2': 'Kent State'},
    {'team1':'Lamar University','team2': 'Lamar'},
    {'team1':'LIU','team2': 'Long Island University'},
    {'team1':'LMU (CA)','team2': 'Loyola (LA)'},
    {'team1':'Long Beach St.','team2': 'Cal State Long Beach'},
    {'team1':'Louisiana','team2': 'Lafayette'},
    {'team1':'Loyola Chicago','team2': 'Loyola (IL)'},
    {'team1':'Loyola Maryland','team2': 'Loyola (MD)'},
    {'team1':'LSU','team2': 'Louisiana State'},
    {'team1':'McNeese','team2': 'McNeese State'},
    {'team1':'Merrimack','team2': ''},
    {'team1':'Michigan St.','team2': 'Michigan State'},
    {'team1':'Middle Tenn.','team2': 'Middle Tennessee'},
    {'team1':'Mississippi St.','team2': 'Mississippi State'},
    {'team1':'Mississippi Val.','team2': 'Mississippi Valley State'},
    {'team1':'Missouri St.','team2': 'Missouri State'},
    {'team1':'Montana St.','team2': 'Montana State'},
    {'team1':'Morehead St.','team2': 'Morehead State'},
    {'team1':'Morgan St.','team2': 'Morgan State'},
    {'team1':"Mount St. Mary's",'team2': 'Mount St. Marys'},
    {'team1':'Murray St.','team2': 'Murray State'},
    {'team1':'N.C. A&T','team2': 'North Carolina A&T'},
    {'team1':'N.C. Central','team2': 'North Carolina Central'},
    {'team1':'NC State','team2': 'North Carolina State'},
    {'team1':'New Mexico St.','team2': 'New Mexico State'},
    {'team1':'Nicholls','team2': 'Nicholls State'},
    {'team1':'Norfolk St.','team2': 'Norfolk State'},
    {'team1':'North Ala.','team2': ''},
    {'team1':'North Dakota St.','team2': 'North Dakota State'},
    {'team1':'Northern Ariz.','team2': 'Northern Arizona'},
    {'team1':'Northern Colo.','team2': 'Northern Colorado'},
    {'team1':'Northern Ill.','team2': 'Northern Illinois'},
    {'team1':'Northern Ky.','team2': 'Northern Kentucky'},
    {'team1':'Northwestern St.','team2': 'Northwestern State'},
    {'team1':'Ohio St.','team2': 'Ohio State'},
    {'team1':'Oklahoma St.','team2': 'Oklahoma State'},
    {'team1':'Ole Miss','team2': 'Mississippi'},
    {'team1':'Oregon St.','team2': 'Oregon State'},
    {'team1':'Penn','team2': 'Pennsylvania'},
    {'team1':'Penn St.','team2': 'Penn State'},
    {'team1':'Portland St.','team2': 'Portland State'},
    {'team1':'Purdue Fort Wayne','team2': 'Purdue-Fort Wayne'},
    {'team1':'Sacramento St.','team2': 'Sacramento State'},
    {'team1':"Saint Joseph\'s",'team2': 'Saint Josephs'},
    {'team1':"Saint Mary\'s (CA)",'team2': 'Saint Marys (CA)'},
    {'team1':"Saint Peter\'s",'team2': 'Saint Peters'},
    {'team1':'Sam Houston','team2': 'Sam Houston State'},
    {'team1':'San Diego St.','team2': 'San Diego State'},
    {'team1':'San Jose St.','team2': 'San Jose State'},
    {'team1':'Seattle U','team2': 'Seattle'},
    {'team1':'SFA','team2': 'Stephen F. Austin'},
    {'team1':'SIUE','team2': 'Southern Illinois-Edwardsville'},
    {'team1':'SMU','team2': 'Southern Methodist'},
    {'team1':'South Carolina St.','team2': 'South Carolina State'},
    {'team1':'South Dakota St.','team2': 'South Dakota State'},
    {'team1':'South Fla.','team2': 'South Florida'},
    {'team1':'Southeast Mo. St.','team2': 'Southeast Missouri State'},
    {'team1':'Southeastern La.','team2': 'Southeastern Louisiana'},
    {'team1':'Southern Ill.','team2': 'Southern Illinois'},
    {'team1':'Southern Miss.','team2': 'Southern Mississippi'},
    {'team1':'Southern U.','team2': 'Southern'},
    {'team1':'St. Francis Brooklyn','team2': 'St. Francis (NY)'},
    {'team1':"St. John\'s (NY)",'team2': 'St. Johns (NY)'},
    {'team1':'TCU','team2': 'Texas Christian'},
    {'team1':'Tennessee St.','team2': 'Tennessee State'},
    {'team1':'Texas St.','team2': 'Texas State'},
    {'team1':'UAB','team2': 'Alabama-Birmingham'},
    {'team1':'UC Davis','team2': 'UC-Davis'},
    {'team1':'UC Irvine','team2': 'UC-Irvine'},
    {'team1':'UC Riverside','team2': 'UC-Riverside'},
    {'team1':'UC Santa Barbara','team2': 'UC-Santa Barbara'},
    {'team1':'UCF','team2': 'Central Florida'},
    {'team1':'UConn','team2': 'Connecticut'},
    {'team1':'UIC','team2': 'Illinois-Chicago'},
    {'team1':'UIW','team2': 'Incarnate Word'},
    {'team1':'ULM','team2': 'Louisiana–Monroe'},
    {'team1':'UMass Lowell','team2': 'Massachusetts-Lowell'},
    {'team1':'UMBC','team2': 'Maryland-Baltimore County'},
    {'team1':'UMES','team2': 'Maryland-Eastern Shore'},
    {'team1':'UNC Asheville','team2': 'North Carolina-Asheville'},
    {'team1':'UNC Greensboro','team2': 'North Carolina-Greensboro'},
    {'team1':'UNCW','team2': 'North Carolina-Wilmington'},
    {'team1':'UNI','team2': 'Northern Iowa'},
    {'team1':'UNLV','team2': 'Nevada-Las Vegas'},
    {'team1':'USC Upstate','team2': 'South Carolina Upstate'},
    {'team1':'UT Arlington','team2': 'Texas-Arlington'},
    {'team1':'UT Martin','team2': 'Tennessee-Martin'},
    {'team1':'Utah St.','team2': 'Utah State'},
    {'team1':'UTEP','team2': 'Texas-El Paso'},
    {'team1':'UTRGV','team2': 'Texas-Rio Grande Valley'},
    {'team1':'UTSA','team2': 'Texas-San Antonio'},
    {'team1':'VCU','team2': 'Virginia Commonwealth'},
    {'team1':'Washington St.','team2': 'Washington State'},
    {'team1':'Weber St.','team2': 'Weber State'},
    {'team1':'Western Caro.','team2': 'Western Carolina'},
    {'team1':'Western Ill.','team2': 'Western Illinois'},
    {'team1':'Western Ky.','team2': 'Western Kentucky'},
    {'team1':'Western Mich.','team2': 'Western Michigan'},
    {'team1':'Wichita St.','team2': 'Wichita State'},
    {'team1':'Wright St.','team2': 'Wright State'},
    {'team1':'Youngstown St.','team2': 'Youngstown State'}
  ];
  
  if (i < rows.length) {
    let display_name = '';
    unknownWcbbSchools.forEach((item) => {
      if (item.team2 === rows[i].display_name) {
        display_name = item.team1;
        console.log("connWcbbPlayersTeams:display_name: ", display_name);
      }
    }); 
    if (display_name === '') {
      display_name = rows[i].display_name;
    }

    connection.query("UPDATE wcbb_temp_table_510 SET team_id = " + rows[i].team_id + " WHERE school = '" + display_name + "'" , function (err1, rows1, fields1) {
      i = i + 1;
      connWcbbPlayersTeams(rows, i);
    });
  }

}

router.post('/connect_wcbb_players_with_teams', async (request,response) => {
  connection.connect();
  console.log("connect_wcbb_players_with_teams");

  connection.query("SELECT * FROM team WHERE division = 1 AND gender = 'W'", function (err, rows, fields) {
    if (err) throw err

    let i = 0;
    connWcbbPlayersTeams(rows, i);

  });
});

const connTwS = (rows, i) => {
  
  if (i < rows.length) {
    connection.query("SELECT team_id, name FROM team WHERE name = '" + rows[i].team_text + "'", function (err1, rows1, fields1) {
      if (err1) throw err1
      
      if (rows1.length === 1) {
        //console.log("UPDATE person SET team_id = " + rows1[0].idteam + " WHERE idperson=" + rows[i].idperson);
        //connection.query("UPDATE person SET team_id = " + rows1[0].idteam + " WHERE idperson = " + rows[i].idperson, function (err, rows, fields) {

        //});
      }
      i = i + 1;
      connTwS(rows, i);
    });
  }

}

router.post('/connect_teams_with_schools', async (request,response) => {
  connection.connect();

  connection.query("SELECT idperson, team_text FROM person", function (err, rows, fields) {
    if (err) throw err

    let i = 0;
    connTwS(rows, i);
    //response.send({ person: rows });

  });
});

const personTeamTable = (rows, i) => {
  
  if (i < rows.length) {
    let yearsActiveArray = [];
    yearsActiveArray = rows[i].years_active.split('-');

    let numYears = parseInt(yearsActiveArray[1]) - parseInt(yearsActiveArray[0]) + 1;
    let insertStatement = '';
    for (let k = 0; k<numYears; k++) {
      let year = parseInt(yearsActiveArray[0]) + k;
      insertStatement = insertStatement + 'INSERT INTO person_team_year VALUES (NULL, ' + rows[i].idperson + ', ' + rows[i].team_id + ', ' + year + '); ';
    }

    i = i + 1;
    personTeamTable(rows, i);
  }

}

router.post('/person_team_table', async (request,response) => {
  connection.connect();
  connection.query("SELECT idperson, team_id, years_active FROM person", function (err, rows, fields) {
    if (err) throw err
    
    let insertStatement = '';
    for (let m = 0; m<rows.length; m++) {
      if (!_.isEmpty(rows[m].team_id)) {
        let yearsActiveArray = [];
        yearsActiveArray = rows[m].years_active.split('-');

        let numYears = parseInt(yearsActiveArray[1]) - parseInt(yearsActiveArray[0]) + 1;
        
        for (let k = 0; k<numYears; k++) {
          let year = parseInt(yearsActiveArray[0]) + k;
          insertStatement = insertStatement + 'INSERT INTO person_team_year_2 VALUES (NULL, ' + rows[m].idperson + ', ' + rows[m].team_id + ', ' + year + ', \'amateur\', \'\');';
        }
      }

    }

    require('fs').writeFile(

      './personTeamTable2.txt',
  
      JSON.stringify(insertStatement),
  
      function (err) {
          if (err) {
              console.error('Crap happens');
          }
      }
    );

  });
});

const teamIdFromTeamText = (rows, i) => {
  connection.query("SELECT team_id, name FROM team WHERE display_name = '" + rows[i].team_text + "'", function (err1, rows1, fields1) {
    if (err1) throw err1
    if (rows1.length !== 0) {
      connection.query("UPDATE person SET team_id = " + rows1[0].team_id + " WHERE idperson = " + rows[i].idperson, function (err, rows, fields) {

      });
    }
    i = i + 1;
    teamIdFromTeamText(rows, i);
  });
}

// create team_id from team_text
router.post('/team_id_from_team_text', async (request,response) => {
  connection.connect();
  connection.query("SELECT * FROM person", function (err, rows, fields) {
    if (err) throw err
    console.log("/team_id_from_team_text:rows.length: ", rows.length);
    
    let i = 0;
    teamIdFromTeamText(rows, i);

  });
});

/*** School queries ***/
router.post('/school',(request,response) => {
  console.log("/school:request.body.id: ", request.body.id);
  connection.connect();
  connection.query("SELECT * FROM school WHERE idschool = " + request.body.id, function (err, rows, fields) {
    if (err) throw err
    response.send({ schoolInfo: rows  });

  });
});

router.post('/save_school',(request,response) => {
  connection.connect();
  connection.query("UPDATE school SET " +
    " name = '" + request.body.schoolObj['school_name'] + "'," +
    " display_name = '" + request.body.schoolObj['school_display_name'] + "'," +
    " address1 = '" + request.body.schoolObj['school_address1'] + "'," +
    " address2 = '" + request.body.schoolObj['school_address2'] + "'," +
    " city = '" + request.body.schoolObj['school_city'] + "'," + 
    " state = '" + request.body.schoolObj['school_state'] + "'," +
    " zip = '" + request.body.schoolObj['school_zip'] + "'," +
    " website = '" + request.body.schoolObj['school_website'] + "'," +
    " instagram = '" + request.body.schoolObj['school_instagram'] + "'," +
    " twitter = '" + request.body.schoolObj['school_twitter'] + "'," +
    " facebook = '" + request.body.schoolObj['school_facebook'] + "'," +
    " nickname = '" + request.body.schoolObj['school_nickname'] + "'," +
    " enrollment = '" + request.body.schoolObj['school_enrollment'] + "'," +
    " affiliation = '" + request.body.schoolObj['school_affiliation'] + "'," +
    " mascotid = " + request.body.schoolObj['school_mascotid'] + "," +
    " lat = '" + request.body.schoolObj['school_lat'] + "'," +
    " lon = '" + request.body.schoolObj['school_lon'] + "'," +
    " abbreviation = '" + request.body.schoolObj['school_abbreviation'] + "'," +
    " division = '" + request.body.schoolObj['school_division'] + "'," +
    " conference = '" + request.body.schoolObj['school_conference'] + "'," +
    " type = '" + request.body.schoolObj['school_type'] + "'," +
    " color1 = '" + request.body.schoolObj['school_color1'] + "'," +
    " color2 = '" + request.body.schoolObj['school_color2'] +  "', " +
    " logo = '" + request.body.schoolObj['school_logo'] +  "' " +
    "WHERE idschool=" + request.body.schoolObj['school_id'], function (err, rows, fields) {
    if (err) throw err
    response.send({ complete: true });
    
  });
});

router.post('/save_new_school',(request,response) => {
  connection.connect();
  connection.query("INSERT INTO school VALUES (NULL, " +
    "'" + request.body.schoolObj['school_name'] + "'," +
    "'" + request.body.schoolObj['school_display_name'] + "'," +
    "'" + request.body.schoolObj['school_address1'] + "'," +
    "'" + request.body.schoolObj['school_address2'] + "'," +
    "'" + request.body.schoolObj['school_city'] + "'," + 
    "'" + request.body.schoolObj['school_state'] + "'," +
    "'" + request.body.schoolObj['school_zip'] + "'," +
    "'" + request.body.schoolObj['school_website'] + "'," +
    "'" + request.body.schoolObj['school_instagram'] + "'," +
    "'" + request.body.schoolObj['school_twitter'] + "'," +
    "'" + request.body.schoolObj['school_facebook'] + "'," +
    "'" + request.body.schoolObj['school_nickname'] + "'," +
    "'" + request.body.schoolObj['school_enrollment'] + "'," +
    "'" + request.body.schoolObj['school_affiliation'] + "'," +
    request.body.schoolObj['school_mascotid'] + "," +
    "'" + request.body.schoolObj['school_lat'] + "'," +
    "'" + request.body.schoolObj['school_lon'] + "'," +
    "'" + request.body.schoolObj['school_abbreviation'] + "'," +
    "'" + request.body.schoolObj['school_division'] + "'," +
    "'" + request.body.schoolObj['school_conference'] + "'," +
    "'" + request.body.schoolObj['school_type'] + "'," +
    "'" + request.body.schoolObj['school_color1'] + "'," +
    "'" + request.body.schoolObj['school_color2'] +  "', " +
    "'" + request.body.schoolObj['school_logo'] +  "')", function (err, rows, fields) {
    if (err) throw err
    response.send({ complete: true });
    
  });
});

router.post('/do_claim',(request,response) => {
  connection.connect();
  connection.query("UPDATE users SET claimed = 1, amateur_id = " + request.body.amateur_id + ", pro_id = " + request.body.pro_id + " WHERE id = " + request.body.user_id, function (err, rows, fields) {
    if (err) throw err
    connection.query("UPDATE m_pro_bb_person SET claimed = 1, user_id = " + request.body.user_id + " WHERE idm_pro_bb_person = " + request.body.pro_id, function (err1, rows1, fields1) {
      if (err1) throw err1
      
      connection.query("UPDATE person SET claimed = 1, user_id = " + request.body.user_id + " WHERE idperson = " + request.body.amateur_id, function (err2, rows2, fields2) {
        if (err2) throw err2
        response.send({ claimed: 1  });
      });
    });
  });
});

router.post('/approve_claim',(request,response) => {

  connection.connect();
  if (request.body.sportsoption === 'mcbb') {
    connection.query("UPDATE users SET claimed = 2 WHERE id = " + request.body.user_id, function (err, rows, fields) {if (err) throw err
      connection.query("UPDATE person SET claimed = 2 WHERE idperson = " + request.body.amateur_id, function (err1, rows1, fields1) {if (err1) throw err1
        connection.query("UPDATE m_pro_bb_person SET claimed = 2 WHERE idm_pro_bb_person = " + request.body.pro_id, function (err2, rows2, fields2) {if (err2) throw err2
          console.log("approve_claim -> activity feed");
          connection.query("INSERT INTO activity_feed VALUES (NULL, '"
          + new Date().toISOString().slice(0, 19).replace('T', ' ') + "', 'joined', '"
          + request.body.firstname + "', '"
          + request.body.lastname + "', '', '', '" + request.body.amateur_team + ", " + request.body.pro_team + "', 'player', 0, '', '', 0, " + request.body.amateur_id + ", " + request.body.pro_id + ", '" + request.body.sportsoption + "')"
          , function (err3, rows3, fields3) {
            if (err3) throw err3
              response.send({ result: true });
          });
        });
      });
    });
  } else if (request.body.sportsoption === 'wcbb') {
    connection.query("UPDATE users SET claimed = 2 WHERE id = " + request.body.user_id, function (err, rows, fields) {if (err) throw err
      connection.query("UPDATE wcbb_person SET claimed = 2 WHERE idperson = " + request.body.amateur_id, function (err1, rows1, fields1) {if (err1) throw err1
        console.log("approve_claim -> activity feed");
          connection.query("INSERT INTO activity_feed VALUES (NULL, '"
          + new Date().toISOString().slice(0, 19).replace('T', ' ') + "', 'joined', '"
          + request.body.firstname + "', '"
          + request.body.lastname + "', '', '', '" + request.body.amateur_team + ", " + request.body.pro_team + "', 'player', 0, '', '', 0, " + request.body.amateur_id + ", " + request.body.pro_id + ", '" + request.body.sportsoption + "')"
          , function (err3, rows3, fields3) {
            if (err3) throw err3
              response.send({ result: true });
          });
      });
    });
  }
});

router.post('/pending_claims',(request,response) => {
  
  connection.connect();
  connection.query("SELECT users.id, users.username, users.firstname, users.lastname, users.sports_option, person.firstname AS person_firstname, person.lastname AS person_lastname, users.pro_id, users.amateur_id, users.claimed AS users_claimed, person.claimed AS person_claimed FROM users INNER JOIN person ON users.amateur_id = person.idperson WHERE users.claimed = 1 OR users.claimed = 2", function (err, rows, fields) {if (err) throw err
    connection.query("SELECT users.id, users.username, users.firstname, users.lastname, users.sports_option, m_pro_bb_person.firstname AS m_pro_bb_person_firstname, m_pro_bb_person.lastname AS m_pro_bb_person_lastname, users.pro_id, users.amateur_id, users.claimed AS users_claimed, m_pro_bb_person.claimed AS m_pro_bb_person_claimed FROM users INNER JOIN m_pro_bb_person ON users.amateur_id = m_pro_bb_person.idm_pro_bb_person WHERE users.claimed = 1 OR users.claimed = 2", function (err1, rows1, fields1) {if (err1) throw err1
      connection.query("SELECT users.id, users.username, users.firstname, users.lastname, users.sports_option, wcbb_person.firstname AS wcbb_person_firstname, wcbb_person.lastname AS wcbb_person_lastname, users.pro_id, users.amateur_id, users.claimed AS users_claimed, wcbb_person.claimed AS wcbb_person_claimed FROM users INNER JOIN wcbb_person ON users.amateur_id = wcbb_person.idperson WHERE users.claimed = 1 OR users.claimed = 2", function (err2, rows2, fields2) {if (err2) throw err2

        response.send({ result: rows.concat(rows1.concat(rows2)) });
        
      });
    });
  });
});

router.post('/user',(request,response) => {
  connection.connect();
  connection.query("SELECT * FROM user WHERE iduser = " + request.body.id, function (err, rows, fields) {
    if (err) throw err
    response.send({ userInfo: rows  });

  });
});

router.post('/save_user',(request,response) => {
  connection.connect();
  connection.query("UPDATE user SET " +
    " firstname = '" + request.body.userObj['user_firstname'] + "'," +
    " lastname = '" + request.body.userObj['user_lastname'] + "'," +
    " join_date = '" + request.body.userObj['user_join_date'] + "'," +
    " last_login = '" + request.body.userObj['user_last_login'] + "'," +
    " account_type = '" + request.body.userObj['user_account_type'] + "'," + 
    " logged_in = '" + request.body.userObj['user_logged_in'] + "'," +
    " active = '" + request.body.userObj['user_active'] + "'," +
    " email = '" + request.body.userObj['user_email'] + "'," +
    " username = '" + request.body.userObj['user_username'] + "'," +
    "WHERE iduser=" + request.body.userObj['user_password'], function (err, rows, fields) {
    if (err) throw err
    response.send({ complete: true });
    
  });
});

router.post('/save_new_user',(request,response) => {
  connection.connect();
  connection.query("INSERT INTO user VALUES (NULL, " +
    "'" + request.body.userObj['user_firstname'] + "'," +
    "'" + request.body.userObj['user_lastname'] + "'," +
    "'" + new Date().toISOString().slice(0, 19).replace('T', ' ') + "'," +
    "'" + new Date().toISOString().slice(0, 19).replace('T', ' ') + "'," +
    "'" + request.body.userObj['user_account_type'] + "'," + 
    "'" + request.body.userObj['user_logged_in'] + "'," +
    "'" + request.body.userObj['user_active'] + "'," +
    "'" + request.body.userObj['user_email'] + "'," +
    "'" + request.body.userObj['user_username'] + "'," +
    "'" + request.body.userObj['user_password'] +  "')", function (err, rows, fields) {
    if (err) throw err
    response.send({ complete: true });
    
  });
});

router.post('/school_all',(request,response) => {
  connection.connect();
  connection.query("SELECT idschool, name FROM school", function (err, rows, fields) {
    if (err) throw err
    response.send({ schools: rows  });
  });
});

router.post('/user_all',(request,response) => {
  connection.connect();
  connection.query("SELECT iduser, firstname, lastname FROM user", function (err, rows, fields) {
    if (err) throw err
    response.send({ users: rows  });
  });
});

router.post('/list_school_teams',(request,response) => {
  
  let teamType = '';
  if (request.body.team_type !== false) {
    switch (request.body.team_type) {
      case 'mcbb':
        teamType = "M";
        break;
      case 'wcbb':
        teamType = "W";
        break;
      default:
        return;
    }
    connection.connect();
    connection.query("SELECT * FROM team WHERE school_id = " + request.body.school_id + " AND gender = '" + teamType + "'", function (err, rows, fields) {
      if (err) throw err
      response.send({ teams: rows  });

    });
  } else {

    connection.connect();
    connection.query("SELECT * FROM team WHERE school_id = '" + request.body.school_id + "'", function (err, rows, fields) {
      if (err) throw err
      response.send({ teams: rows  });

    });
  }
});

/*** Person queries ***/

router.post('/person',(request,response) => {
  
  let tableType;
  switch (request.body.person_type) {
    case 'mcbb':
      tableType = "person";
      break;
    case 'wcbb':
      tableType = "wcbb_person";
      break;
    default:
      return;
  }
  connection.connect();
  connection.query("SELECT * FROM " + tableType + " WHERE idperson = " + request.body.amateur_id, function (err, rows, fields) {
    if (err) throw err
    if (!_.isEmpty(request.body.pro_id)) {
      connection.query("SELECT * FROM m_pro_bb_person WHERE idm_pro_bb_person = " + request.body.pro_id, function (err1, rows1, fields1) {
        if (err1) throw err1
        console.log("/person:m_pro_bb_person: ", rows1);
        let personTeams = rows.concat(rows1);
        response.send({ personInfo: rows });
      });
    } else {
      response.send({ personInfo: rows });
    }
  });

});

router.post('/save_person',(request,response) => {
  connection.connect();
  connection.query("UPDATE person SET " +
    " firstname = '" + request.body.personObj['person_firstname'] + "'," +
    " lastname = '" + request.body.personObj['person_lastname'] + "'," +
    " type = '" + request.body.personObj['person_type'] + "'," +
    " dob = '" + request.body.personObj['person_dob'] + "'," +
    " position = '" + request.body.personObj['person_position'] + "'," + 
    " website = '" + request.body.personObj['person_website'] + "'," +
    " instagram = '" + request.body.personObj['person_instagram'] + "'," +
    " twitter = '" + request.body.personObj['person_twitter'] + "'," +
    " facebook = '" + request.body.personObj['person_facebook'] + "'," +
    " hometowncity = '" + request.body.personObj['person_hometowncity'] + "'," +
    " hometownstate = '" + request.body.personObj['person_hometownstate'] + "'," +
    " height = '" + request.body.personObj['person_height'] + "'," +
    " weight = '" + request.body.personObj['person_weight'] + "'," +
    " nicknames = '" + request.body.personObj['person_nicknames'] + "'," +
    " team_id = '" + request.body.personObj['person_team_id'] + "'," +
    " team_text = '" + request.body.personObj['person_team_text'] + "'," +
    " years_active = '" + request.body.personObj['person_years_active'] + "', " +
    " lat = '" + request.body.personObj['person_lat'] + "', " +
    " lon = '" + request.body.personObj['person_lon'] + "' " +
    "WHERE idperson=" + request.body.personObj['amateur_id'], function (err, rows, fields) {
    if (err) throw err
    response.send({ complete: true });
    
  });
});

router.post('/person_all',(request,response) => {
  connection.connect();
  connection.query("SELECT idperson, firstname, lastname FROM person", function (err, rows, fields) {
    if (err) throw err
    response.send({ person: rows  });
  });
});

/*** Team queries ***/

router.post('/team',(request,response) => {
  connection.connect();
  connection.query("SELECT * FROM team WHERE team_id = " + request.body.id, function (err, rows, fields) {
    if (err) throw err
    connection.query("SELECT * FROM school WHERE idschool = " + rows[0].school_id, function (err1, rows1, fields1) {
      if (err1) throw err1
        rows[0].logo = rows1[0].logo;
        rows[0].color1 = rows1[0].color1;
        rows[0].color2 = rows1[0].color2;
        response.send({ teamInfo: rows });
    });
  });
});

router.post('/save_team',(request,response) => {
  connection.connect();
  connection.query("UPDATE team SET " +
    " name = '" + request.body.personObj['person_name'] + "'," +
    " sport = '" + request.body.personObj['person_sport'] + "'," +
    " gender = '" + request.body.personObj['person_gender'] + "'," +
    " division = '" + request.body.personObj['person_division'] + "'," +
    " league = '" + request.body.personObj['person_league'] + "'," + 
    " school_id = '" + request.body.personObj['person_school_id'] + "'," +
    "WHERE team_id=" + request.body.personObj['amateur_id'], function (err, rows, fields) {
    if (err) throw err
      response.send({ complete: true });
    
  });
});

router.post('/team_all',(request,response) => {

  connection.connect();
  if (request.body.division === 'pro') {
      connection.query("SELECT * FROM pro_team", function (err, rows2, fields) {
        if (err) throw err
        response.send({ teams: rows2 });
      });
  } else {
    connection.query("SELECT * FROM team WHERE division = '" + request.body.division + "' LIMIT 50", function (err, rows1, fields) {
      if (err) throw err
        response.send({ teams: rows1 });
    });
  }
});

router.post('/activity_feed',(request,response) => {
  connection.connect();
  connection.query("SELECT * FROM activity_feed ORDER BY activity_datetime desc LIMIT 20", function (err, rows, fields) {
    if (err) throw err
    response.send({ activity_feed: rows });
  });
});

router.post('/get_teams_from_ids',(request,response) => {
  connection.connect();
  
  if (request.body.pro_id !== 0 && request.body.amateur_id !== 0) {
    connection.query("SELECT * FROM nba_person_team_year_2 WHERE person_id = " + request.body.pro_id, function (err, rows, fields) {
      if (err) throw err
      connection.query("SELECT * FROM person_team_year_3 WHERE amateur_id = " + request.body.amateur_id, function (err1, rows1, fields1) {
        if (err1) throw err1
        connection.query("SELECT * FROM team WHERE team_id = " + rows1[0].team_id, function (err2, rows2, fields2) {
          if (err2) throw err2
          connection.query("SELECT * FROM pro_team WHERE idpro_team = " + rows[0].team_id, function (err3, rows3, fields3) {
            if (err3) throw err3
              response.send({ pro_team: rows3[0].display_name, amateur_team: rows2[0].display_name });
            });
        });
      });
    });
  } else {
    connection.query("SELECT * FROM team WHERE team_id = " + request.body.amateur_id, function (err1, rows1, fields1) {
      if (err1) throw err1
        response.send({ pro_teams: [], amateur_teams: rows1 });
    });
  }
});

router.post('/create_team',(request,response) => {
  connection.connect();
  connection.query("INSERT INTO team VALUES (NULL, NULL, '"
    + request.body.team.name + "', '"
    + request.body.team.display_name + "', '', '"
    + request.body.team.sport + "', '"
    + request.body.team.gender + "', '"
    + request.body.team.division + "', '"
    + request.body.team.league + "', '"
    + request.body.team.school_id + "')", function (err, rows, fields) {
    if (err) throw err
    response.send({ create_team: true  });
  });
});

router.post('/create_user',(request,response) => {
  connection.connect();
  connection.query("INSERT INTO user VALUES (NULL, '" 
    + request.body.user.firstname + "', '"
    + request.body.user.lastname + "', '"
    + request.body.user.join_date + "', '"
    + request.body.user.last_login + "', '"
    + request.body.user.logged_in + "', '"
    + request.body.user.active + "', '"
    + request.body.user.email + "', '"
    + request.body.user.username + "', '"
    + request.body.user.password + "')", function (err, rows, fields) {
    if (err) throw err
    response.send({ create_user: true  });

  });
});

router.post('/toggle_cheers',(request,response) => {
  connection.connect();
  if (request.body.usercheers === 'add') {
    connection.query("INSERT INTO comment_cheers VALUES (NULL, "
      + request.body.comment_id + ", '"
      + new Date().toISOString().slice(0, 19).replace('T', ' ') + "', " 
      + request.body.user_id + ", '"
      + request.body.firstname + "', '"
      + request.body.lastname + "')",
      function (err, rows, fields) {
        if (err) throw err
        response.send({ toggle_cheers: true  });
    });
  } else {
    connection.query("DELETE FROM comment_cheers WHERE idcomment_cheers = "+ request.body.cheersid,
    function (err1, rows1, fields1) {
      if (err1) throw err1
      response.send({ toggle_cheers: true  });
  });
  }
});

router.post('/create_comment',(request,response) => {
  let replyCommentId = 0;
  if (request.body.type === "reply") {
    replyCommentId = request.body.reply_comment_id;
  }
  
  connection.connect();
  connection.query("INSERT INTO comment VALUES (NULL, '"
    + new Date().toISOString().slice(0, 19).replace('T', ' ') + "', '" 
    + request.body.type + "', '"
    + request.body.content + "', '"
    + request.body.amateur_id + "', '"
    + request.body.pro_id + "', '"
    + request.body.team_name + "', '"
    + request.body.user_id + "', '"
    + request.body.team_id + "', '"
    + request.body.team_type + "', '"
    + replyCommentId + "', 0, '"
    + request.body.sports_option + "')", function (err, rows, fields) {
    if (err) throw err
      
      connection.query("INSERT INTO activity_feed VALUES (NULL, '"
      + new Date().toISOString().slice(0, 19).replace('T', ' ') + "', 'comment', '"
      + request.body.commenter_firstname + "', '"
      + request.body.commenter_lastname + "', '', '', '', '', '"
      + rows.insertId + "', '"
      + request.body.firstname + "', '"
      + request.body.lastname + "', 0, "
      + request.body.amateur_id + ", "
      + request.body.pro_id + ", '"
      + request.body.sports_option + "')"
      , function (err1, rows1, fields1) {
        if (err1) throw err1

        response.send({ create_comment: true  });

      });
  });
});

router.post('/get_comments',(request,response) => {
  
  let commentsQuery = '';
  if (request.body.amateur_id !== undefined) {
    commentsQuery = "SELECT * FROM comment WHERE amateur_id = " + request.body.amateur_id;
  }

  if (request.body.amateur_id === undefined && request.body.pro_id !== undefined) {
    commentsQuery = "SELECT * FROM comment WHERE pro_id = " + request.body.pro_id;
  }

  connection.connect();
  connection.query(commentsQuery,
    function (err, rows, fields) {
      if (err) throw err
      let userIds = [];
      console.log("/get_comments:rows: ", rows);
      rows.forEach((item) => {
        userIds.push(item.user_id);
      });

      let comment_cheers_counts = [];
      async.forEachOf(rows, function (dataElement, i, inner_callback) {
        connection.query("SELECT COUNT(*) FROM comment_cheers where comment_id = " + dataElement['idcomment'], function(err1, rows1, fields1){
            let comment_cheers_item = {};
            comment_cheers_item.commentid = dataElement['idcomment'];
            comment_cheers_item.count = rows1[0]['COUNT(*)'];
            comment_cheers_counts.push(comment_cheers_item);
        });
      });

      let comment_cheers = [];
      async.forEachOf(rows, function (dataElement, i, inner_callback){
        connection.query("SELECT * FROM comment_cheers where comment_id = " + dataElement['idcomment'], function(err1, rows1, fields1){
          if (!_.isEmpty(rows1)) {
            comment_cheers.push(rows1);
          }
        });
      });

      if (!_.isEmpty(userIds)) {
        connection.query("SELECT username, id, firstname, lastname FROM users WHERE id IN (" + userIds + ")",
        function (err1, rows1, fields1) {
          if (err1) throw err1
      
          for (let i = 0; i<rows1.length; i++) {
            for (let j = 0; j<rows.length; j++) {
              if (parseInt(rows1[i].id) === parseInt(rows[j].user_id)) {
                rows[j].firstname = rows1[i].firstname;
                rows[j].lastname = rows1[i].lastname;
              }
            }
          }

          let comments_and_replies = [];
          for (let i = 0; i<rows.length; i++) {
            rows[i].replies = [];
            if (rows[i].type === 'comment') {
              comments_and_replies.push(rows[i]);
            }
          }

          for (let j = 0; j<comments_and_replies.length; j++) {
            for (let k = 0; k<rows.length; k++) {
              rows[k].user_cheers = "";
              if (rows[k].type === "reply" && parseInt(comments_and_replies[j].idcomment) === parseInt(rows[k].reply_comment_id)) {
                comments_and_replies[j].replies.push(rows[k]);
              }
            }
          }

          for (let j = 0; j<comments_and_replies.length; j++) {
            for (let k = 0; k<comment_cheers_counts.length; k++) {
              if (comment_cheers_counts[k].commentid === comments_and_replies[j].idcomment) {
                comments_and_replies[j].cheers = comment_cheers_counts[k].count;
              }
            }
          }

          for (let l = 0; l<comments_and_replies.length; l++) {
            for (let m = 0; m<comment_cheers.length; m++) {
              for (let n = 0; n<comment_cheers[m].length; n++) {
                if (comment_cheers[m][n].comment_id === comments_and_replies[l].idcomment) {
                  if (comment_cheers[m][n].user_id === request.body.user_id) {
                    comments_and_replies[l].user_cheers = "user_cheers";
                    comments_and_replies[l].cheers_id = comment_cheers[m][n].idcomment_cheers;
                  }
                }
              }
            }
          }

          response.send({ comments: rows, users: rows1, comments_and_replies: comments_and_replies, comment_cheers_counts: comment_cheers_counts });
        });
      }
    });
});

router.post('/connect_team_person',(request,response) => {
  let numOfYears = parseInt(request.body.team_person.end_year) - parseInt(request.body.team_person.start_year);
  let startYear = parseInt(request.body.team_person.start_year);
  let endYear = parseInt(request.body.team_person.end_year);
  let insertString = '';
  for (let i = 0; i<=numOfYears; i++) {
    insertString = insertString + "INSERT INTO person_team_year_2 VALUES (NULL, " 
    + request.body.team_person.amateur_id + ", "
    + request.body.team_person.team_id + ", '" + (startYear + i) + "', 'amateur', ''); ";
  }
});

router.post('/person_team_year',(request,response) => {
  connection.connect();
  
  let tableType;
  switch (request.body.person_type) {
    case 'mcbb':
      if (request.body.coach === "true") {
        tableType = "coaches_team_year";
      } else {
        tableType = "person_team_year_3";
      }
      break;
    case 'wcbb':
      tableType = "wcbb_person_team_year";
      
      break;
    default:
      return;
  }

  connection.query("SELECT * FROM " + tableType + " WHERE amateur_id = " + request.body.id, function (err, rows, fields) {
    let idarray = [];
    for (let p = 0; p<rows.length; p++) {
      if (rows[p].team_id !== null) {
        idarray.push(rows[p].team_id);
      }
    }

    if (!_.isEmpty(idarray)) {
      connection.query("SELECT * FROM team WHERE team_id IN (" + idarray + ")", function (err, rows2, fields) {
        
        let idarray2 = [];
        for (let p2 = 0; p2<rows2.length; p2++) {
          idarray2.push(rows2[p2].school_id);
        }
        connection.query("SELECT * FROM school WHERE idschool IN (" + idarray2 + ")", function (err, rows3, fields) {
          connection.query("SELECT * FROM nba_person_team_year_2 WHERE person_id = " + request.body.pro_id, function (err4, rows4, fields4) {
            if (!_.isEmpty(rows4)) {
              let proArray = [];
              for (let q = 0; q<rows4.length; q++) {
                if (rows4[q].team_id !== null) {
                  proArray.push(rows4[q].team_id);
                }
              }
              let sortedRows = _.sortBy(rows, 'year');
              let sortedRows4 = _.sortBy(rows4, 'year');
              connection.query("SELECT * FROM pro_team WHERE idpro_team IN (" + proArray + ")", function (err5, rows5, fields5) {
                response.send({ schools: rows3, teams: rows2, person_teams_years: sortedRows, pro_teams_years: sortedRows4, pro_teams: rows5 });
              });
            } else {
              let sortedRows = _.sortBy(rows, 'year');
              response.send({ schools: rows3, teams: rows2, person_teams_years: sortedRows, pro_teams_years: [], pro_teams: [] });
            }
          });
        });
      });
    } else {
      response.send({ schools: [], teams: [], person_teams_years: [], pro_teams: [], pro_teams_years: [] });
    }
  });
});

router.post('/league',(request,response) => {
  connection.connect();
  connection.query("SELECT * FROM league_team WHERE league_id = " + request.body.id, function (err, rows, fields) {
    //console.log("league:request.body.id: ", request.body.id);
    if (err) throw err
    //console.log("POST->league:id:rows: ", rows);
    let idarray = [];
    for (let p = 0; p<rows.length; p++) {
      idarray.push(rows[p].team_id);
    }
    //console.log("POST->league:idarray: ", idarray);
    connection.query("select * from team where idteam IN (" + idarray + ")", function (err1, rows1, fields1) {
      if (err1) throw err1
      //console.log("league:rows1: ", rows1);
      let schoolIds = [];
      for (let m = 0; m<rows1.length; m++) {
        schoolIds.push(rows1[m].school_id)
      }
        connection.query("select lat, lon, idschool from school where idschool IN (" + schoolIds + ")", function (err2, rows2, fields2) {
          if (err2) throw err2
          //console.log("league:school:rows1[m].school_id: ", rows1[m].school_id);
          let resultArray = Object.values(JSON.parse(JSON.stringify(rows2)));
          //console.log("resultArray: ", resultArray);
          for (let l = 0; l<rows1.length; l++) {
            for (let m = 0; m<resultArray.length; m++) {
              if (rows1[l].school_id === resultArray[m].idschool) {
                rows1[l].lat = resultArray[m].lat;
                rows1[l].lon = resultArray[m].lon;
              }
            }
          }
          //console.log("POST->league:send:teams:rows1: ", rows1);
          response.send({ teams: rows1 });
        });
      //}
      //console.log("POST->league:send:teams:rows1: ", rows1);
      //response.send({ teams: rows1 });
    });
    //response.send({ id: 0 });
  });
});

router.post('/search_team',(request,response) => {
  let tableType = '';
  let collegeDivArray = '"1","2","3","naia","juco"';
  
  switch (request.body.team_type) {
    case 'hs':
      tableType = 'hs';
      break;
    case 'college':
      tableType = 'team';
      break;
    case 'pro':
      tableType = 'pro_team';
      break;
    default:
      return;
  }
  
  let searchTeamQuery = '';
  let searchTeamArray = [];
  let q = 0;
  connection.connect();
  switch (tableType) {
    case 'hs':
      searchTeamQuery = "SELECT * FROM team WHERE gender = '" + request.body.gender_type + "' AND division = 'hs' AND name LIKE '%" + request.body.term + "%' LIMIT 50";
      connection.query(searchTeamQuery, function (err, rows, fields) {
        
        let schoolIdArray = [];
        rows.forEach((item1) => {
          schoolIdArray.push(item1.school_id);
        });

        connection.query("SELECT idschool, city, state FROM school WHERE idschool IN (" + schoolIdArray + ")", function (err1, rows1, fields1) {
          rows.forEach((item) => {
            let returnItem = {};
            let inState = '';
            let inCity = '';
            rows1.forEach((item3) => {
              if (item3.idschool === item.school_id) {
                inState = item3.state;
                inCity = item3.city;
              }
            });
            returnItem.label = item.name + " - " + item.gender + "BB - " + inCity + ", " + inState;
            returnItem.id = item.idteam;
            returnItem.index = q;
            searchTeamArray.push(returnItem);
            q++;
          });
          response.send({ searchTeamArray: searchTeamArray });
        });
      });
      break;
    case 'team':
      searchTeamQuery = "SELECT * FROM team WHERE gender = '" + request.body.gender_type + "' AND division IN (" + collegeDivArray + ") AND name LIKE '%" + request.body.term + "%' LIMIT 50";
      connection.query(searchTeamQuery, function (err, rows, fields) {
        
        let schoolIdArray = [];
        rows.forEach((item1) => {
          schoolIdArray.push(item1.school_id);
        });

        connection.query("SELECT idschool, city, state FROM school WHERE idschool IN (" + schoolIdArray + ")", function (err1, rows1, fields1) {
          rows.forEach((item) => {
            let returnItem = {};
            let inState = '';
            let inCity = '';
            rows1.forEach((item3) => {
              if (item3.idschool === item.school_id) {
                inState = item3.state;
                inCity = item3.city;
              }
            });
            returnItem.label = item.name + " - " + item.gender + "BB - " + inCity + ", " + inState;
            returnItem.id = item.idteam;
            returnItem.index = q;
            searchTeamArray.push(returnItem);
            q++;
          });
          response.send({ searchTeamArray: searchTeamArray });
        });
      });
      break;
    case 'pro_team':
      searchTeamQuery = "SELECT * FROM pro_team WHERE name LIKE '%" + request.body.term + "%' LIMIT 50";
      connection.query(searchTeamQuery, function (err, rows, fields) {
        rows.forEach((item) => {
          let returnItem = {};
          returnItem.label = item.display_name;
          returnItem.id = item.idpro_team;
          returnItem.index = q;
          searchTeamArray.push(returnItem);
          q++;
        });
        response.send({ searchTeamArray: searchTeamArray });
      });
      break;
    default:
      return;
  }
});

router.post('/search_amateur_by_id',(request,response) => {
  let tableType;
  switch (request.body.gender) {
    case 'mcbb':
      tableType = "person";
      break;
    case 'wcbb':
      tableType = "wcbb_person";
      break;
    default:
      return;
  }
  connection.connect();
  connection.query("SELECT firstname, lastname, claimed FROM " + tableType + " WHERE idperson = '" + request.body.amateur_id + "'", function (err, rows, fields) {
    if (err) throw err
  
    response.send({ searchAmateurArray: rows });
  });
});

router.post('/search_pro_by_id',(request,response) => {
  let q = 0;
  connection.connect();
  connection.query("SELECT firstname, lastname FROM person WHERE idperson LIKE '%" + request.body.term + "%'", function (err, rows, fields) {
    if (err) throw err
  
    let searchPersonArray = [];
    rows.forEach((item) => {
      let returnItem = {};
      returnItem.label = item.firstname + ' ' + item.lastname + ' - ' + item.team_text;
      returnItem.id = item.idperson;
      returnItem.index = q;
      searchPersonArray.push(returnItem);
      q++;
    });
    response.send({ searchPersonArray: searchPersonArray });
  });
});

router.post('/search_person',(request,response) => {
  let q = 0;
  connection.connect();
  connection.query("SELECT idperson, firstname, lastname, team_text FROM person WHERE lastname LIKE '%" + request.body.term + "%'", function (err, rows, fields) {
    if (err) throw err
  
    let searchPersonArray = [];
    rows.forEach((item) => {
      let returnItem = {};
      returnItem.label = item.firstname + ' ' + item.lastname + ' - ' + item.team_text;
      returnItem.id = item.idperson;
      returnItem.index = q;
      searchPersonArray.push(returnItem);
      q++;
    });
    response.send({ searchPersonArray: searchPersonArray });
  });
});

router.post('/search_team_and_year',(request,response) => {

  let tableType = '';
  let personType = '';
  
  switch (request.body.team_type) {
    case 'mcbb':
      tableType = "person_team_year_3";
      personType = "person";
      break;
    case 'wcbb':
      tableType = "wcbb_person_team_year";
      personType = "wcbb_person";
      break;
    default:
      return;
  }

  let q = 0;
  connection.connect();
  let searchYears = request.body.year.split('-');
  let year1 = searchYears[0];
  let year2;
  if (parseInt(searchYears[1]) < 25) {
    year2 = "20" + searchYears[1];
  } else {
    year2 = "19" + searchYears[1];
  }

  let playersYearQuery = "SELECT * FROM " + tableType + " WHERE year IN (" + year1 + "," + year2 + ") AND team_id = " + request.body.team_id;
  let playersYearQuery1 = "SELECT * FROM " + tableType + " WHERE year BETWEEN " + year1 + " AND " + year2 + " AND team_id = " + request.body.team_id;

  console.log("/search_team_and_year: SELECT * FROM " + tableType + " WHERE year BETWEEN " + year1 + " AND " + year2 + " AND team_id = " + request.body.team_id);

  connection.query(playersYearQuery1, function (err, rows1, fields) {
    if (err) throw err
    
    let amateurIdArray = [];
    let amateurIdObjArray = [];
    rows1.forEach((item) => {
      amateurIdArray.push(item.amateur_id);
    });

    rows1.forEach((item) => {
      amateurIdObjArray.forEach((item1) => {
        if (item.amateur_id === item1.amateur_id) {
          item1.years.push(item.year);
        }
      });
    });

    let uniqueArray = [];
    let uniqueArrayStr = ''
    if (!_.isEmpty(amateurIdArray)) {
      uniqueArrayStr = " WHERE amateur_id IN (" + [...new Set(amateurIdArray)] + ")";
    }

    let amateurIDQuery = "SELECT * FROM " + tableType + uniqueArrayStr;
    connection.query(amateurIDQuery , function (err10, rows10, fields10) {
      if (err10) throw err10
      
      let amateurObjArray = [];

      amateurIdArray.forEach((item) => {
        let amateurObj = {};
        amateurObj.amateur_id = item;
        amateurObj.years = [];
        amateurObjArray.push(amateurObj);
      });

      rows10.forEach((item) => {
        amateurObjArray.forEach((item1) => {
          if (item.amateur_id === item1.amateur_id && item.team_id === request.body.team_id) {
            item1.years.push(item.year);
          }
        });
      });

      let newAmateurArray = [];
      amateurObjArray.forEach((item) => {
        let hasYear1 = false;
        let hasYear2 = false;
        item.years.forEach((item1) => {
          if (parseInt(year1) === parseInt(item1)) {
            hasYear1 = true;
          }
          if (parseInt(year2) === parseInt(item1)) {
            hasYear2 = true;
          }
        });
        if (hasYear1 === true && hasYear2 === true) {
          newAmateurArray.push(item.amateur_id);
        } else if (parseInt(item.years[0]) === parseInt(year2) && item.years.length === 1) {
          newAmateurArray.push(item.amateur_id);
        }
      });

      if (request.body.all_team === true) {
        amateurObjArray.forEach((item) => {
          newAmateurArray.push(item.amateur_id);
        });
      }

      amateurIdArray.forEach((item) => {
        let amateurIdObj = {};
        amateurIdObj.amateur_id = item;
        amateurIdObj.years = [];
        amateurIdObjArray.push(amateurIdObj);
      });

      rows1.forEach((item) => {
        amateurIdObjArray.forEach((item1) => {
          if (item.amateur_id === item1.amateur_id) {
            item1.years.push(item.year);
          }
        });
      });

    if (_.isEmpty(newAmateurArray)) {
      connection.query("SELECT school_id FROM team WHERE team_id = " + request.body.team_id, function (err, rows3, fields) {
          if (err) throw err
          connection.query("SELECT lat, lon, color1, color2 FROM school WHERE idschool = " + rows3[0].school_id, function (err, rows4, fields) {
            if (err) throw err
            
            response.send({ persons: [], lat: rows4[0].lat, lon: rows4[0].lon, color1: rows4[0].color1, color2: rows4[0].color2 });
          });
        });
    } else {
      connection.query("SELECT * FROM " + personType + " WHERE idperson IN (" + newAmateurArray + ")", function (err, rows2, fields) {
        if (err) throw err
        amateurObjArray.forEach((item1) => {
          rows2.forEach((item2) => {
            if (item1.amateur_id === item2.idperson) {
              item2.startYear = item1.years[0];
              item2.endYear = item1.years[item1.years.length-1];
            }
          });
        });
       connection.query("SELECT school_id FROM team WHERE team_id = " + request.body.team_id, function (err, rows3, fields) {
          if (err) throw err
          connection.query("SELECT lat, lon, color1, color2 FROM school WHERE idschool = " + rows3[0].school_id, function (err, rows4, fields) {
            if (err) throw err
            
            response.send({ persons: rows2, lat: rows4[0].lat, lon: rows4[0].lon, color1: rows4[0].color1, color2: rows4[0].color2 });
          });
        });
      });
    }
  });
  });
});

router.post('/search',(request,response) => {
  console.log("1:/search");
  let trimFirstTerm = request.body.firstTerm.trim();
  let trimLastTerm = request.body.lastTerm.trim();
  let trimSearchType = request.body.searchType.trim();
  let schoolDiv = request.body.schoolDiv || '';
  let numResults = request.body.numResults;
  let testString = ' ';
  let q = 0;
  connection.connect();
  if (trimLastTerm.indexOf(" ") === -1 && !_.isEmpty(trimLastTerm)) {
    if (_.isEmpty(trimFirstTerm) && !_.isEmpty(trimLastTerm)) {
      if (trimLastTerm === 'all') {
        trimLastTerm = '';
      }
      if (!_.isEmpty(schoolDiv)) {
        connection.query("SELECT name, school_id FROM team WHERE division LIKE '%" + schoolDiv + "%' and name LIKE '%" + trimLastTerm + "%'", function (err, rows, fields) {
          if (err) throw err
            let idArray = [];
            rows.forEach((item) => {
              idArray.push(item.school_id);
            });
          let idschoolQuery = 'AND idschool NOT IN (' + idArray + ')'
          if (idArray.length === 0) {
            idschoolQuery = "";
          }

          connection.query("SELECT display_name, idschool FROM school WHERE division LIKE '%" + schoolDiv + "%' and name LIKE '%" + trimLastTerm + "%' " + idschoolQuery + " LIMIT " + numResults, function (err1, rows1, fields1) {
            if (err1) throw err1
          
            let returnSchoolArray = [];
            rows1.forEach((item) => {
              let returnItem = {};
    
              returnItem.label = item.display_name;
              returnItem.id = item.idschool;
              returnItem.index = q;
              returnItem.type = 'school';
              returnSchoolArray.push(returnItem);
              q++;
            });
            response.send({ returnPersonArray: [], returnProPlayerArray: [], returnSchoolArray: returnSchoolArray, returnPlayersArray: [], returnCoachesArray: [] });
          });
        });
      } else {
      connection.query("SELECT display_name, idschool FROM school WHERE division LIKE '%" + schoolDiv + "%' and name LIKE '%" + trimLastTerm + "%' LIMIT " + numResults, function (err, rows, fields) {
        if (err) throw err
      
        let returnSchoolArray = [];
        rows.forEach((item) => {
          let returnItem = {};

          returnItem.label = item.display_name;
          returnItem.id = item.idschool;
          returnItem.index = q;
          returnItem.type = 'school';
          returnSchoolArray.push(returnItem);
          q++;
        });

        let playerSelect = '';
        let playerProSelect = '';
        let coachSelect = '';
        let schoolSelect = '';

        let searchType;

        switch (trimSearchType) {
          case 'mcbb':
            searchType = "person";
            break;
          case 'wcbb':
            searchType = "wcbb_person";
            break;
          default:
            return;
        }
        
        if (request.body.firstTerm.length > 1) {
          playerSelect = "SELECT * FROM " + searchType + " WHERE (firstname LIKE '%" + trimFirstTerm + "%' AND lastname LIKE '%" + trimLastTerm + "%') AND person_type='player' LIMIT " + numResults;

          playerProSelect = "SELECT * FROM m_pro_bb_person WHERE (firstname LIKE '%" + trimFirstTerm + "%' AND lastname LIKE '%" + trimLastTerm + "%') LIMIT " + numResults;

          coachSelect = "SELECT * FROM " + searchType + " WHERE (firstname LIKE '%" + trimFirstTerm + "%' AND lastname LIKE '%" + trimLastTerm + "%') AND person_type='coach' LIMIT " + numResults;

        } else {
          playerSelect = "SELECT * FROM " + searchType + " WHERE (lastname LIKE '%" + trimLastTerm + "%' OR firstname LIKE '%" + trimLastTerm + "%') AND person_type='player' LIMIT " + numResults;

          playerProSelect = "SELECT * FROM m_pro_bb_person WHERE (lastname LIKE '%" + trimLastTerm + "%' OR firstname LIKE '%" + trimLastTerm + "%') LIMIT " + numResults;

          coachSelect = "SELECT * FROM " + searchType + " WHERE (lastname LIKE '%" + trimLastTerm + "%' OR firstname LIKE '%" + trimLastTerm + "%') AND person_type='coach' LIMIT " + numResults;
        }
          connection.query(playerSelect, function (err1, rows1, fields1) {
            if (err) throw err
      
            let returnPersonArray = [];
            rows1.forEach((item) => {
              let returnItem1 = {};
              returnItem1.label = item.firstname + ' ' + item.lastname;
              returnItem1.firstname = item.firstname;
              returnItem1.lastname = item.lastname;
              returnItem1.id = item.idperson;
              returnItem1.index = q;
              returnItem1.type = 'person';
              returnItem1.claimed = item.claimed;
              returnPersonArray.push(returnItem1);
              q++;
            });

            let returnPlayersArray = [];
            rows1.forEach((item) => {
              let returnItem1 = {};
              returnItem1.label = item.firstname + ' ' + item.lastname;
              returnItem1.firstname = item.firstname;
              returnItem1.lastname = item.lastname;
              returnItem1.id = item.idperson;
              returnItem1.index = q;
              returnItem1.type = 'person';
              returnItem1.claimed = item.claimed;
              returnPlayersArray.push(returnItem1);
              q++;
            });

            connection.query(coachSelect, function (err2, rows2, fields2) {
              if (err2) throw err2
            
              let returnCoachesArray = [];
              rows2.forEach((item) => {
                let returnItem1 = {};
                returnItem1.label = item.firstname + ' ' + item.lastname;
                returnItem1.firstname = item.firstname;
                returnItem1.lastname = item.lastname;
                returnItem1.id = item.idperson;
                returnItem1.index = q;
                returnItem1.type = 'person';
                returnItem1.claimed = item.claimed;
                returnCoachesArray.push(returnItem1);
                q++;
              });

              connection.query(playerProSelect, function (err3, rows3, fields3) {
                  if (err3) throw err3
                
                  let returnProPlayerArray = [];
                  rows3.forEach((item) => {
                    let returnItem1 = {};
                    returnItem1.label = item.firstname + ' ' + item.lastname;
                    returnItem1.firstname = item.firstname;
                    returnItem1.lastname = item.lastname;
                    returnItem1.id = item.idm_pro_bb_person;
                    returnItem1.index = q;
                    returnItem1.type = 'person';
                    returnItem1.claimed = item.claimed;
                    returnProPlayerArray.push(returnItem1);
                    q++;
                  });
                  response.send({ returnPersonArray: returnPersonArray, returnProPlayerArray: returnProPlayerArray, returnSchoolArray: returnSchoolArray, returnPlayersArray: returnPlayersArray, returnCoachesArray: returnCoachesArray });
                });
            })
          })
      })
    }
    } else {
      
        let personSelect = '';

        let searchType;

        switch (trimSearchType) {
          case 'mcbb':
            searchType = "person";
            break;
          case 'wcbb':
            searchType = "wcbb_person";
            break;
          default:
            return;
        }
        
        if (request.body.firstTerm.length > 1) {
          personSelect = "SELECT * FROM " + searchType + " WHERE (firstname LIKE '%" + trimFirstTerm + "%' AND lastname LIKE '%" + trimLastTerm + "%') AND person_type='player' LIMIT " + numResults;

          playerProSelect = "SELECT * FROM m_pro_bb_person WHERE (firstname LIKE '%" + trimFirstTerm + "%' AND lastname LIKE '%" + trimLastTerm + "%') LIMIT " + numResults;

          coachSelect = "SELECT * FROM " + searchType + " WHERE (firstname LIKE '%" + trimFirstTerm + "%' AND lastname LIKE '%" + trimLastTerm + "%') AND person_type='coach' LIMIT " + numResults;

          schoolSelect = "SELECT * FROM school WHERE (name LIKE '%" + trimFirstTerm + " " + trimLastTerm + "%') LIMIT " + numResults;
        
        } else {
          personSelect = "SELECT * FROM " + searchType + " WHERE lastname LIKE '%" + trimLastTerm + "%' AND person_type='player' LIMIT " + numResults;

          playerProSelect = "SELECT * FROM m_pro_bb_person WHERE (lastname LIKE '%" + trimLastTerm + "%' OR firstname LIKE '%" + trimLastTerm + "%') LIMIT " + numResults;

          coachSelect = "SELECT * FROM " + searchType + " WHERE lastname LIKE '%" + trimLastTerm + "%' AND person_type='coach' LIMIT " + numResults;

          schoolSelect = "SELECT * FROM school WHERE name LIKE '%" + trimLastTerm + "%' LIMIT " + numResults;
        }
        
          connection.query(personSelect, function (err1, rows1, fields1) {
            if (err1) throw err1
      
            let returnPersonArray = [];
            rows1.forEach((item) => {
              let returnItem1 = {};
              returnItem1.label = item.firstname + ' ' + item.lastname;
              returnItem1.firstname = item.firstname;
              returnItem1.lastname = item.lastname;
              returnItem1.id = item.idperson;
              returnItem1.index = q;
              returnItem1.type = 'person';
              returnItem1.claimed = item.claimed;
              returnPersonArray.push(returnItem1);
              q++;
            });

            let returnPlayersArray = [];
            rows1.forEach((item) => {
              let returnItem1 = {};
              returnItem1.label = item.firstname + ' ' + item.lastname;
              returnItem1.firstname = item.firstname;
              returnItem1.lastname = item.lastname;
              returnItem1.id = item.idperson;
              returnItem1.index = q;
              returnItem1.type = 'person';
              returnItem1.claimed = item.claimed;
              returnPlayersArray.push(returnItem1);
              q++;
            });

            connection.query(coachSelect, function (err2, rows2, fields2) {
              if (err2) throw err2
            
              let returnCoachesArray = [];
              rows2.forEach((item) => {
                let returnItem1 = {};
                returnItem1.label = item.firstname + ' ' + item.lastname;
                returnItem1.firstname = item.firstname;
                returnItem1.lastname = item.lastname;
                returnItem1.id = item.idperson;
                returnItem1.index = q;
                returnItem1.type = 'person';
                returnItem1.claimed = item.claimed;
                returnCoachesArray.push(returnItem1);
                q++;
              });

                connection.query(playerProSelect, function (err3, rows3, fields3) {
                  if (err3) throw err3
                
                  let returnProPlayerArray = [];
                  rows3.forEach((item) => {
                    let returnItem1 = {};
                    returnItem1.label = item.firstname + ' ' + item.lastname;
                    returnItem1.firstname = item.firstname;
                    returnItem1.lastname = item.lastname;
                    returnItem1.id = item.idm_pro_bb_person;
                    returnItem1.index = q;
                    returnItem1.type = 'person';
                    returnItem1.claimed = item.claimed;
                    returnProPlayerArray.push(returnItem1);
                    q++;
                  });

                  connection.query(schoolSelect, function (err3, rows3, fields3) {
                    if (err3) throw err3
                  
                    let schoolArray = [];
                    rows3.forEach((item) => {
                      let returnItem1 = {};
                      returnItem1.label = item.name + " - " + item.state;
                      returnItem1.name = item.name;
                      returnItem1.id = item.idschool;
                      returnItem1.index = q;
                      returnItem1.type = 'school';
                      schoolArray.push(returnItem1);
                      q++;
                    });

                  response.send({ returnPersonArray: returnPersonArray, returnSchoolArray: schoolArray, returnPlayersArray: returnPlayersArray, returnCoachesArray: returnCoachesArray, returnProPlayerArray: returnProPlayerArray });
                });
              });
          });
        })
      }
    }
});
  
// add router in the Express app.
app.use("/", router);

//const fs = require('fs');
const lineReader = require('line-reader');
let readEachLineSync = require('read-each-line-sync');
//let playersJSON = require('./z_transfers.json');
//let nbaCSV = require('../nba_csv.csv');
//console.log("playersJSON: ", playersJSON);
function splitAtFirstSpace(str) {
  if (! str) return [];
  var i = str.indexOf(' ');
  if (i > 0) {
    return [str.substring(0, i), str.substring(i + 1)];
  }
  else return [str];
}

// create a GET route
app.get('/express_backend', (req, res) => { //Line 9

  console.log('express_backend');

  //var fs = require('fs');
  //var files = fs.readdirSync('z_coaches_html');

  //console.log("files: ", files);

  /*let localUrlsArray = [];
  files.forEach((item) => {
    console.log("item: ", item);
    let localUrl = "file:///Users/michaelford/Desktop/SportsHeat/sportsheatapp/z_coaches_html/" + item;
    localUrlsArray.push(localUrl);
  });

  console.log("localUrlsArray: ", localUrlsArray);

  require('fs').writeFile(

    './coaches_json/z_coaches_html.txt',

    JSON.stringify(localUrlsArray),

    function (err) {
        if (err) {
            console.error('Crap happens');
        }
    }
  );*/

  //let fileLineArray = [];

  //let aplayers_json = JSON.parse(aPlayers);

  /*let aPlayerQuery = '';

  nbaCSV.forEach((item) => {
    // school city state conference

    let nbaPlayer = item.split(',');

    console.log("nbaPlayer: ", nbaPlayer);

    /*console.log("item.school1: ", item.school1);
    let nameSplit = splitAtFirstSpace(item.name);
    let newName0 = '';
    let newName1 = '';
    if (nameSplit[0] === null || nameSplit[0] === undefined) {
      newName0 = '';
    } else {
      newName0 = nameSplit[0].replace(/'/g, "");
    }
    if (nameSplit[1] === null || nameSplit[1] === undefined) {
      newName1 = '';
    } else {
      newName1 = nameSplit[1].replace(/'/g, "");
    }*/

    /*let school1;
    if (item.school1 === null) {
      school1 = '';
    } else {
      school1 = item.school1.replace(/'/g, "");
    }

    let school2;
    if (item.school2 === null) {
      school2 = '';
    } else {
      school2 = item.school2.replace(/'/g, "");
    }
    */

    //let newYears1 = item.years.replace(/\(/g, "");
    //let newYears2 = newYears1.replace(/\)/g, "");
    //let newYears3 = newYears2.replace(/ /g, "");

    //console.log("item: ", item);

    /*if (item.school2 !== null) {
      console.log("append to query");
      aPlayerQuery = aPlayerQuery + " INSERT INTO players_transfers VALUES (NULL, '"+newName0+"', '"+newName1+"', '"+school1+"', '"+school2+"');";
    }*/
  //});

  // idplayers_transfers, first_name, last_name, school1, school2

  /*console.log("aPlayerQuery: ", aPlayerQuery);

  require('fs').writeFile(

    './z_players_transfers.txt',

    JSON.stringify(aPlayerQuery),

    function (err) {
        if (err) {
            console.error('Crap happens');
        }
    }
  );*/

  /*let fileLineArray = [];

  readEachLineSync('wcbb_2122.csv', 'utf8', function(line) {
    //console.log(line);
    let arrayLine = line.split(',');
    //console.log("arrayLine: ", arrayLine);
    fileLineArray.push(arrayLine);
  })

  //console.log("fileLineArray: ", fileLineArray);

  let insertLine = '';
  fileLineArray.forEach((item) => {
    //console.log("insertLine:item[0]: ", item[0]);
    //console.log("insertLine:item[1]: ", item[1]);
    let nameSplit = splitAtFirstSpace(item[0]);
    let newFirst = '';
    let newLast = '';
    if (nameSplit[0] === null || nameSplit[0] === undefined) {
      newFirst = '';
    } else {
      newFirst = nameSplit[0].replace(/'/g, "\'");
    }
    if (nameSplit[1] === null || nameSplit[1] === undefined) {
      newLast = '';
    } else {
      newLast = nameSplit[1].replace(/'/g, "\'");
    }
    //insertLine = insertLine + "INSERT INTO m_pro_bb_person VALUES (NULL, '" + newFirst + "', '" + newLast + "', 'player', null, '"+item[8]+"', '"+item[4]+"', '"+item[5]+"', '"+item[6]+"', '"+item[7]+"', '"+item[1]+"'); ";
    // idm_pro_bb_person, firstname, lastname, person_type, amateur_id, college, pos, height, weight, dob
    
    //let cityState = item[1].split(',');

    item[1] = item[1].replace(/'/g, "\'");
    item[2] = item[2].replace(/'/g, "\'");
    
    insertLine = insertLine + 'INSERT INTO wcbb_temp_table_510 VALUES (NULL, "'+item[0]+'", "'+item[1]+'", "'+item[2]+'", 0, 0); ';

    //console.log("1:insertLine: ", insertLine);
  });

  console.log("1:insertLine: ", insertLine);

  require('fs').writeFile(

    './wcbb_2122_insert.txt',

    JSON.stringify(insertLine),

    function (err) {
        if (err) {
            console.error('Crap happens');
        }
    }
  );*/

  res.send({ express: 'YOUR EXPRESS BACKEND IS CONNECTED TO REACT' }); //Line 10
}); //Line 11
