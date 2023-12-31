const global_users = require("../Users/global_users_db.js");
const sessions = require("../sessions_db.js");
const fs = require('fs');
const { hash_data } = require("../Users/hash.js");
const { v4: uuidv4 } = require('uuid');

let db = new global_users.users_dbmanager;
let sess = new sessions.sessions_dbmanager;

//needed for getting the path to the database on any machine
//Gotta use whenever you open the database
const get_path = (callback) => {
    const pwd = process.cwd();
    let db_path = pwd;
    db_path = db_path + "\\DreamTeam\\Back-End\\database.db";
    db_path = db_path.replace(/\\/g,"/");

    callback(db_path);
}

const get_path_session = (callback) => {
    const pwd = process.cwd();
    let db_path = pwd;
    db_path = db_path + "\\DreamTeam\\Back-End\\sessions.db";
    db_path = db_path.replace(/\\/g,"/");

    callback(db_path);
}

//gets all of a users info
const get_user = (req, res) => {
    const { sessId } = req.params;

    get_path_session( (path) => {
        sess.open(path);
        sess.get_session(sessId, (sessData) => {
            //console.log("Got " + sessData.username);
            const id = sessData.id;
            sess.close();
            get_path( (path) => {
                db.open(path);
                db.get_all(id, (username, first_name, last_name, playerID, teamID, leagueID, email, bio, pos, picPath) => {
                    //console.log(username + " " + first_name + " " + last_name + " " + playerID + " " + teamID + " " + email + " " + bio + " " + pos + " " + picPath)
                    let encodedPic;
                    if(picPath !== null) 
                    {
                        encodedPic = encodePhoto(picPath);
                    }
                    const userData = {
                        id: id,
                        username: username,
                        firstName: first_name,
                        lastName: last_name,
                        playerID: playerID,
                        teamID: teamID,
                        leagueID: leagueID,
                        email: email,
                        bio: bio,
                        pos: pos,
                        pp: encodedPic
                    };
                    JSON.stringify(userData);
                    console.log(`\nSent user ${userData.username}'s data to client\n`);
                    res.send(userData);
                    db.close();
                });
            });
        });
    });
}

//user authentication
const login = (req, res) => {
    const user = req.body;

    let hash_pass = hash_data(user.passwordField); //hash password
    user.passwordField = hash_pass;

    //console.log(user.emailField + " " + user.passwordField);

    get_path( (path) => {
        db.open(path);
        db.get_ID(user.emailField, (password, id) => {
            //console.log("Got password: "+ password + " from id " + id);
            if(password == null) //can't find email in database
            {
                console.log(`The email "${user.emailField}" was not found\n`);
                res.status(500).send("Email is not found");
            }
            else
            {
                //console.log(hash_pass + "\n" + password);
                if(hash_pass == password) //password match
                {
                    //console.log("Logged in");
                    db.get_all(id, (un,fn,ln,pID,tID,email,bio,pos) => {
                        const user = {
                            id: id,
                            username: un,
                            firstName: fn,
                            lastName: ln,
                            playerID: pID,
                            teamID: tID,
                            email: email,
                            bio: bio,
                            pos: pos
                        };

                        create_session(req, res, user, () => { //create the session 
                            //console.log(`Session created for ${req.session.user.username} with ID ${req.session.id}`);
                            const sessionData = JSON.stringify(req.session.user);
                            get_path_session( (sessPath) => {
                                sess.open(sessPath);
                                sess.create_session(req.session.id,sessionData, () => {
                                    sess.close();
                                })
                                console.log(`\nUser ${user.username} was logged in\n`);
                                res.status(200).send("Passwords Match! Logged in");
                            });
                        });
                    });
                }
                else //incorrect password
                {
                    console.log("An incorrect Password Was Recieved\n");
                    res.status(400).send("Invalid password");
                }
            }
            db.close();
        });
    });
};

//fucntion that creates the session with all the user's data
const create_session = (req, res, userJSON, callback) => {
    req.session.user = { 
        id: userJSON.id,
        username: userJSON.username, 
        firstName: userJSON.firstName,
        lastName: userJSON.lastName,
        playerID: userJSON.playerID,
        teamID: userJSON.teamID,
        email: userJSON.email,
        bio: userJSON.bio,
        pos: userJSON.pos 
    };
    res.cookie('UserCookie' + userJSON.id.substring(0,5), req.session.id);
    callback();
};

//shows all users in the database
const show_all = (req, res) => {
    get_path( (path) => {
        db.open(path);
        db.display_all( () => {
            //console.log("in controllers: " + path)
            db.close();
        });
    });

    sess = new sessions_dbmanager();
    sess.open("sessions.db");
    sess.create_session(5,"test", () => {
        sess.close();
    });

    res.send("read all");
};

//creates a new user
const create_user = (req, res) => {
    get_path( (path) => {
        const user = req.body;
        const userID = uuidv4();
  
        //adds unique ID to the user
        const uwid = { ... user, id: userID}

        //console.log(uwid);

        let hash_pass = hash_data(uwid.password);
        uwid.password = hash_pass;

        db.open(path);
        db.insert(uwid.id,uwid.username,uwid.email,uwid.password,uwid.firstName,uwid.lastName,uwid.playerID,uwid.teamID,uwid.leagueID,uwid.bio,uwid.position,null, () => {
            db.get_all(uwid.id, (un,fn,ln,pID,tID,lID,email,bio,pos) => {
                const user = {
                    id: uwid.id,
                    username: un,
                    firstName: fn,
                    lastName: ln,
                    playerID: pID,
                    teamID: tID,
                    leagueID: lID,
                    email: email,
                    bio: bio,
                    pos: pos
                };

                create_session(req, res, user, () => { //create the session 
                    //console.log(`Session created for ${req.session.user.username} with ID ${req.session.id}`);
                    const sessionData = JSON.stringify(req.session.user);
                    get_path_session( (sessPath) => {
                        sess.open(sessPath);
                        sess.create_session(req.session.id,sessionData, () => {
                            sess.close();
                        });
                        console.log(`\nUser ${uwid.username} was created\n`);
                        res.send(`User with the name ${uwid.firstName} added to the database`);
                    });
                });
            });
            db.close();
        });
    });
};

//deletes a user
const delete_user = (req, res) => {
    const { id } = req.params;

    get_path( (path) => {
        db.open(path);
        db.delete_user(id, () => {
            db.close();
            res.send(`User with the id ${id} deleted`);
        });
    });
};

const delete_session = (req, res) => {
    const { sessId } = req.params;
    
    get_path_session((sessionPath) => {
        sess.open(sessionPath);
        sess.delete_session(sessId, () => {
            sess.close();
            res.send("Session Deleted");
        })
    })
}

//updates username
const update_username = (req, res) => {
    const { id } = req.params;
    const new_username = req.body.un;

    //console.log(new_username + " " + id);

    get_path( (path) => {
        db.open(path);
        db.update_user_name(new_username,id, () => {
            db.close();
        });

        res.send('Username updated');
    });
}

//updates email
const update_email = (req, res) => {
    const { id } = req.params;
    const new_email = req.body;

    //console.log(new_email + " " + id);

    get_path( (path) => {
        db.open(path);
        db.update_email(new_email,id, () => {
            db.close();
        });

        res.send('Email updated');
    });
}

//updates bio
const update_bio = (req, res) => {
    const { id } = req.params;
    const new_bio = req.body.bio;

    //console.log(new_bio + " " + id);

    get_path( (path) => {
        db.open(path);
        db.update_bio(new_bio,id, () => {
            db.close();
        });

        res.send('Bio updated');
    });
}

//updates firstname
const update_firstname = (req, res) => {
    const { id } = req.params;
    const new_first_name = req.body.fn;

    //console.log(new_first_name + " " + id);

    get_path( (path) => {
        db.open(path);
        db.update_first_name(new_first_name,id, () => {
            db.close();
        });

        res.send('First Name updated');
    });
}

//updates lastname
const update_lastname = (req, res) => {
    const { id } = req.params;
    const new_lastname = req.body.ln;

    //console.log(new_lastname + " " + id);

    get_path( (path) => {
        db.open(path);
        db.update_last_name(new_lastname,id, () => {
            db.close();
        });

        res.send('Lastname updated');
    });
}

//updates position
const update_position = (req, res) => {
    const { id } = req.params;
    const new_position = req.body.pos;

    //console.log(new_position + " " + id);

    get_path( (path) => {
        db.open(path);
        db.update_pos(new_position,id, () => {
            db.close();
        });

        res.send('Position updated');
    });
}

//updates password
const update_password = (req, res) => {
    const { id } = req.params;
    const new_password = req.body;

    //console.log(new_password + " " + id);

    let hash_pass = hash_data(new_password);

    get_path( (path) => {
        db.open(path);
        db.update_password(hash_pass,id, () => {
            db.close();
        });

        res.send('Password updated');
    });
};

//for when a user joins a team, a player will be created
const update_player = (req, res) => {
    const { id } = req.params;
    const playerId = req.body.playerId;

    get_path((path) => {
        db.open(path);
        db.update_playerId(playerId,id, () => {
            db.close();
        });

        res.send('Player ID updated');
    });
}

//for when a user joins a team
const update_team = (req, res) => {
    const { id } = req.params;
    const teamId = req.body.teamId;

    get_path((path) => {
        db.open(path);
        db.update_teamId(teamId,id, () => {
            db.close();
        });

        res.send('Team ID updated');
    });
}

//for when a user joins a league
const update_league = (req, res) => {
    const { id } = req.params;
    const leagueId = req.body.leagueId;

    get_path((path) => {
        console.log(leagueId);
        db.open(path);
        db.update_leagueId(leagueId,id, () => {
            db.close();
        });

        res.send('League ID updated');
    });
}

const update_profile_picture = (req, res) => {
    const { id } = req.params;
    const new_pp = req.body.pp;

    //console.log(new_pp + " " + id);

    storePhoto(new_pp, id, (picPath) => {
        get_path( (path) => {
            db.open(path);
            db.update_profile_picture(picPath,id, () => {
                db.close();
            });
    
            res.send('Picture updated');
        });
    })
}

const storePhoto = function(base64Encoded, id, callback) {
    const data = base64Encoded.replace(/^data:image\/\w+;base64,/, "");

    const buffer = Buffer.from(data, 'base64');

    let picPath = "./DreamTeam/Back-End/Users/profile_pictures/" + id + ".png";

    fs.writeFile(picPath, buffer, function(err) {
        if(err) {
            console.log(err);
        } else {
            //console.log("The file was saved!");
        }
    });

    callback(picPath);
}

const encodePhoto = function(picPath) {
    console.log(picPath)

    let pic = fs.readFileSync(picPath);
    let picBase64 = Buffer.from(pic).toString('base64');

    //console.log("PIC STRING: " + picBase64);
    return(picBase64);
}

module.exports = { get_user, login, show_all, create_user, delete_user, delete_session, update_firstname, update_lastname, update_username, update_password, update_email, update_bio, update_position, update_player, update_team, update_league, update_profile_picture };