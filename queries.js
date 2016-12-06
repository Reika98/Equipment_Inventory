var promise = require('bluebird'),
    pg = require('pg'),
    session = require ('express-session'),
    path = require('path'),
    fs = require('fs'),
    async = require('async'),
    nodemailer = require('nodemailer'),
    schedule = require('node-schedule');

var mode;

var express = require('express');
express.Router().use(session({secret: "ilovephilippines", resave: false, saveUninitialized:true}));
var options = {
  // Initialization Options
  promiseLib: promise
};

var pgp = require('pg-promise')(options);
//var connectionString = "postgres://inventory:&3c6u4o@127.0.0.1:5432/csu_app_inventory";
var connectionString = "postgres://postgres:1234@localhost:5432/upceisdb";
var db = pgp(connectionString);

function setMode() {
    db.task( function(t) {
        return t.any('SELECT update_sched()')
            .then(function (data) {
                return t.one("SELECT * from schedule where event_status='Ongoing'")
                        .then(function (event) {
                            if(event.length <= 0)
                                mode = 'Default';
                            else {
                                mode = event['title'];
                            var date = new Date();
                            console.log(date + "-" + event['start'].toString());
                            }
                        })
                        .catch(function (err) {
                            mode = 'Default';
                            console.log("[SET-MODE1] " + err);
                        });
            });
        })
        .then(function (data) {
            console.log('SCHEDULE UPDATED');
            console.log("MODE: " + mode);
        })
        .catch(function (err) {
            console.log("[SET-MODE2] " + err);
            return next(err);
        });
}

function start_inventory() {
    db.any("Select reset_equip_stat()") 
        .then(function (data) {
           console.log("Equipment Status reset to NOT FOUND for Inventory")
        })
        .catch(function (err) {
            console.log("[START-INVENTORY]" + err);
            return next(err);
    });    
}
 
schedule.scheduleJob('00 00 00 * * *', function(){
    db.task( function(t) {
        return t.any('SELECT update_sched()')
            .then(function (data) {
                return t.one("SELECT title from schedule where event_status='Ongoing'")
                        .then(function (event) {
                            mode = event['title'];
                            if(event['title']=='Inventory')
                                start_inventory();
                        })
                        .catch(function (err) {
                            mode = 'Default';
                        });
            });
        })
        .then(function (data) {
            console.log('SCHEDULE UPDATED');
            console.log("MODE: " + mode);
        })
        .catch(function (err) {
            console.log("[UPDATE-SCHED] " + err);
            return next(err);
        });
});

schedule.scheduleJob('00 00 09 * * *', function(){
    //console.log('The answer to life, the universe, and everything!');
    db.task(function (t) {
        return t.batch([
                t.one("Select * from schedule where start = (CURRENT_DATE + interval '1 week')", req.body),
                t.any("Select * from schedule where start = (CURRENT_DATE + interval '1 day')")
            ]);
        })
        .then(function (data) {
            console.log(data);
            var message;
            if(data[0].length > 0) {
                if(data[0]['title']=='Inventory')
                    message = "Good day,\n\nReminding you of the scheduled Equipment Inventory this " + data[0]['start'] + " which will last until " + data[0]['end'] + ".\nKindly prepare the equipment listed under your office before hand.\n\n\nThank you.";
                else if(data[0]['title']=='Disposal')
                    message = "Good day,\n\nReminding you of the scheduled Equipment Disposal this " + data[0]['start'] + " which will last until " + data[0]['end'] + ".\n\nThank you.";
                send_email('clerk', message);
            }
            if(data[1].length > 0) {     
                if(data[1]['title']=='Inventory')
                    message = "Good day,\n\nReminding you of the scheduled Equipment Inventory tomorrow which will last until " + data[1]['end'] + ".\nKindly see the list of equipment on the app and prepare the equipment listed under your office before hand.\n\n\nThank you.";
                else if(data[1]['title']=='Disposal')
                    message = "Good day,\n\nReminding you of the scheduled Equipment Disposal tomorrow which will last until " + data[1]['end'] + ".\n\nThank you.";
                send_email('clerk', message);
            }
        })
        .catch(function (err) {
            console.log("[SCHED-REMINDER] " + err);
            return next(err);
        });
});

// function send_email_inventory(send_to) {
//     var email = send_to;
//     var smtpConfig = {
//         host: 'smtp.gmail.com',
//         port: 465,
//         secure: true,
//         auth: {
//             user: 'sjisantillan@gmail.com',
//             pass: 'gkjmoenievjfntxx'
//         }
//     };

//     var transporter = nodemailer.createTransport(smtpConfig);

//     var mailOptions = {
//         from: '"UP CEBU SPMO" <sjisantillan@gmail.com>', // sender address
//         to: email, // list of receivers bar@blurdybloop.com, baz@blurdybloop.com
//         subject: 'SPMO', // Subject line
//         text: message // plaintext body
//         //html: '<b>Hello world 🐴</b>' // html body
//     };

//     transporter.sendMail(mailOptions, function(error, info){
//         if(error){
//             return console.log(error);
//         }
//         console.log('Message sent: ' + info.response);
//     });
// }

function send_email(send_to, message) {
    var email;
    // if(send_to == 'clerk') {
    //     db.any('SELECT email from office')
    //         .then(function (data) {
    //             email = data[0]['email'].toString();
    //             for(var i=1; i<data.length; i++)
    //                 email += ", " + data[i]['email'].toString();
    //             console.log(email);
    //         })
    //         .catch(function (err) {
    //             console.log("[EMAIL-CLERK] " + err);
    //             return next(err);
    //         });
    // }
    // else if(send_to == 'checker') {
    //     db.any('SELECT email from checker')
    //         .then(function (data) {
    //             email = data[0]['email'].toString();
    //             for(var i=1; i<data.length; i++)
    //                 email += ", " + data[i]['email'].toString();
    //             console.log(email);
    //         })
    //         .catch(function (err) {
    //             console.log("[EMAIL-CHECKER] " + err);
    //             return next(err);
    //         });
    // }
    // else {
    //     email = send_to;
    // }
    email = 'arvin.arbuis5@gmail.com';
    var smtpConfig = {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: 'sjisantillan@gmail.com',
            pass: 'gkjmoenievjfntxx'
        }
    };

    var transporter = nodemailer.createTransport(smtpConfig);

    var mailOptions = {
        from: '"UP CEBU SPMO" <sjisantillan@gmail.com>', // sender address
        to: email, // list of receivers bar@blurdybloop.com, baz@blurdybloop.com
        subject: 'SPMO', // Subject line
        text: message // plaintext body
        //html: '<b>Hello world 🐴</b>' // html body
    };

    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            return console.log(error);
        }
        console.log('Message sent: ' + info.response);
    });
}

function check_user(req, res, next) {
    if(!(req.session.in)){
      console.log("USER NOT RECOGNIZED");
      res.redirect('/');
  }
  else
    next();
}

function login(req, res, next){
    console.log("login-page");
  if(req.session.in == "log" || (!req.session.in))
    res.render('login');
  else if(req.session.role == 'Clerk')
    res.render('index2', {user: req.session.user});
  else
    res.render('index', {user: req.session.user});
}

function userOut(req, res, next){
    console.log("logout");
    req.session.in = "log"

    res.redirect('/');
}


function userIn(req, res, next){
    console.log("login");
    setMode();
    console.log("MODE: " + mode);
    db.task(function (t) {
        return t.batch([
            t.any("SELECT * from spmo WHERE username = ${username} AND password = crypt (${password}, password)", req.body),
            t.any("SELECT * from clerk, office WHERE clerk.username = ${username} AND office.password = crypt (${password}, password) AND clerk.designated_office = office.office_id", req.body)
        ]);
    })
    .then(function (data) {
        if(data[0].length >= 1){
            req.session.in = true;
            req.session.user = req.body.username;
            req.session.role = 'SPMO';
            console.log("user is: " + req.session.user);
            res.redirect('/dashboard');
        } else if(data[1].length >= 1){
            req.session.in = true;
            req.session.user = req.body.username;
            req.session.role = 'Clerk';
            console.log("user is: " + req.session.user);
            res.redirect('/dashboard1');
        } else{
            res.render('login', {error: 'Incorrect credentials!'})
        }
    })
    .catch(function (err) {
      console.log("[USER-IN] " + err);
      return next(err);
    });
}

function dashing(req, res, next){
    console.log("dashboard");
    console.log("user is: " + req.session.user);

     db.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5") 
        .then(function (data) {
            if(!(req.session.in) || req.session.role == 'Clerk')
                res.redirect('/');
            else{
                res.render('index', {user: req.session.user, notification: data, noti_qty: data.length});
            }
        })
        .catch(function (err) {
            console.log("[DASHBOARD]" + err);
            return next(err);
    });    
}

function dashing1(req, res, next){
    console.log("dashboard1");
    console.log("user is: " + req.session.user);
    db.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5") 
        .then(function (data) {
            if(!(req.session.in) || req.session.role == 'SPMO') {
                 console.log(data);
                res.redirect('/');
            }
            else{
                console.log(data);
                res.render('index2', {user: req.session.user, notification: data, noti_qty: data.length});
            }
        })
        .catch(function (err) {
            console.log("[DASHBOARD]" + err);
            return next(err);
    });    
}

function renderAddEquip(req, res, next) {
    console.log("AddEquip-page");
   db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM office"),
            t.any("SELECT * FROM staff"),
            t.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5")
        ]);
  })
  .then(function (data, err) {
    res.status(200);
        res.render('addequipment', {office: data[0], staff: data[1], user: req.session.user, notification: data[2], noti_qty: data[2].length});
  })
  .catch(function(err) {
      console.log("[REND-ADD] " + err);
      return next(err);
  });
}

function newEquipment(req, res, next) {
    console.log("new equipment");   
    setMode();
    if(mode == 'Inventory' || mode == 'Disposal') {
        var message = 'The system is in ' + mode + ' Mode. You cannot add new equipment.';
        if(mode == 'Inventory')
            res.render('isinventory');
        else
            res.render('isdisposal');
        return;
    }
    pg.connect(connectionString,function (err, client, done) {
    if (err){
        return console.error('error fetching client from pool', err);
    }
    var image = req.body.uploads;
    image = image.replace(/^.*\\/, "");

    client.query('SET datestyle = "ISO, MDY"');
        if (req.body.quantity>1){
            for (var i = 1; i<=req.body.quantity; i++){
                    client.query("INSERT INTO equipment(qrcode, article_name, property_no, component_no, date_acquired, description, unit_cost, condition, type, image_file) VALUES ($1, $2, $3, $9, $4, $5, $6, $7, $8, $10)",
                    [req.body.property_no + i, 
                    req.body.article_name, 
                    req.body.property_no,  
                    req.body.date_acquired, 
                    req.body.description, 
                    req.body.unit_cost,
                    'Working', 
                    req.body.type,
                    i,
                    image], function (err, result) {
                        if (err) {
                            return console.error('error running query', err);
                        }
                 });
        
                client.query("INSERT INTO assigned_to (equipment_qr_code, office_id_holder, date_assigned, staff_id) VALUES (md5($4), $1, $2, $3)",
                    [req.body.office_id,
                     req.body.date_acquired,
                     req.body.staffs,
                     req.body.property_no + i], function (err, result) {
                        if (err) {
                            return console.error('error running query', err);
                        }
                });
                client.query("INSERT INTO transaction_log (staff_id,transaction_details,equip_qrcode) values ($1,'added an equipment',md5($2))",
                    [req.session.user,
                     req.body.property_no+i], 
                     function (err, result) {
                    if (err) {
                        return console.error('error running query', err);
                    }
                });
            }
        }
        else{
                    
            client.query("INSERT INTO equipment(qrcode, article_name, property_no, date_acquired, description, unit_cost, condition, type, image_file) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
                [req.body.property_no, 
                req.body.article_name, 
                req.body.property_no,  
                req.body.date_acquired, 
                req.body.description, 
                req.body.unit_cost,
                'Working', 
                req.body.type,
                image], function (err, result) {
                    if (err) {
                        return console.error('error running query', err);
                    }
             });
                
            client.query("INSERT INTO assigned_to (equipment_qr_code, office_id_holder, date_assigned, staff_id) VALUES (md5($4), $1, $2, $3)",
                [req.body.office_id,
                 req.body.date_acquired,
                 req.body.staffs,
                 req.body.property_no], function (err, result) {
                if (err) {
                    return console.error('error running query', err);
                }
            });
            client.query("INSERT INTO transaction_log (staff_id,transaction_details,equip_qrcode) values ($1,'added an equipment',$2)",
                    [req.session.user,
                     req.body.property_no], 
                     function (err, result) {
                    if (err) {
                        return console.error('error running query', err);
                    }
            });
        }
     res.redirect('/dashboard');
    });
}

////////////////////////////////////////////////////////////
//
function rend_searchEquipmentAssign(req, res, next) {
    console.log("searchBatchEdit-page");
    db.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5") 
        .then(function (data) {
            if(req.session.error != null && req.session.propno != null) {
                var err = req.session.error;
                var propno = req.session.propno;
                req.session.error = null;
                req.session.propno = null;
                res.render('editAssignmentSearch', {error: err, prop: propno, user: req.session.user, notification: data, noti_qty: data.length}); 
            } else {
                res.render('editAssignmentSearch', {user: req.session.user, notification: data, noti_qty: data.length});
            }
         })  
        .catch(function (err) {
            console.log("[REND-EDITASSIGN]" + err);
            return next(err);
    });
}//
////////////////////////////////////////////////////////////
//
function rend_searchEquipmentDisposal(req, res, next) {
    console.log("searchBatchEdit-page");
     db.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5") 
        .then(function (data) {
            if(req.session.error != null && req.session.propno != null) {
                var err = req.session.error;
                var propno = req.session.propno;
                req.session.error = null;
                req.session.propno = null;
                res.render('disposalSearch', {error: "Equipment not found", prop: req.body.propno, user: req.session.user, user: req.session.user, notification: data, noti_qty: data.length});
            } else {
                res.render('disposalSearch', {user: req.session.user, notification: data, noti_qty: data.length});
            }
        })  
        .catch(function (err) {
            console.log("[RENDEDITDISPOSAL]" + err);
            return next(err);
    });
}
function rend_searchEquip1(req, res, next) {
    console.log("searchEquip1-page");
    db.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5") 
        .then(function (data) {
            if(!(req.session.in) || req.session.role != 'Clerk')
                res.redirect('/');
            else
                res.render('searchEquipment2', {user: req.session.user, notification: data, noti_qty: data.length});    
         })  
        .catch(function (err) {
            console.log("[REND-SEQUIP1]" + err);
            return next(err);
    });
    
}
//
////////////////////////////////////////////////////////////
function rend_searchEquip(req, res, next) {
    console.log("searchEquip-page");
    db.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5") 
        .then(function (data) {
            if(!(req.session.in) || req.session.role == 'Clerk')
                res.redirect('/');
            else {
                if(req.session.error != null && req.session.propno != null) {
                    var err = req.session.error;
                    var propno = req.session.propno;
                    req.session.error = null;
                    req.session.propno = null;
                    res.render('searchEquipment', {error: err, prop: propno, user: req.session.user, notification: data, noti_qty: data.length});
                }
                else
                res.render('searchEquipment', {user: req.session.user, notification: data, noti_qty: data.length});
        
            }
            //    res.render('searchEquipment', {user: req.session.user, notification: data, noti_qty: data.length});   
         })  
        .catch(function (err) {
            console.log("[REND-SEQUIP]" + err);
            return next(err);
    });
    
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
function findBatchEdit(req, res, next) {
    var query;
    console.log("findBatchEdit");
    query = "SELECT * from equipment_date_extracted_office_staff WHERE property_no = ${propno}";

    db.task(function (t) {
        return t.batch([
            t.any(query, req.body),
            t.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5")
        ]);
    })
    .then(function (data) {
        var temp = data[0][0]; 
        var comno = [];
        
        if(data[0].length <= 0){
            console.log("BES1");
            //res.render('editBatchEquipment', {error: "Equipment not found", prop: req.body.propno});
            req.session.error = "Equipment not found";
            req.session.propno = req.body.propno;
            res.redirect('/searchforbatcheditequipment');
        } else {
            if(temp['component_no'] != null){
                comno.push(temp['component_no'].toString());
                temp['component_no'] = temp['component_no'].toString();
                for (var i = 1; i < data[0].length; i++) {
                    temp['component_no'] = temp['component_no'] + ", " + data[0][i]['component_no'].toString();
                    comno.push(data[0][i]['component_no'].toString());
                }
                console.log(comno.length);

                console.log(temp['component_no']);
                if(temp['day'].toString().length == 1)
                    temp['day'] = '0' + temp['day'].toString();
                if(temp['month'].toString().length == 1)
                    temp['month'] = '0' + temp['month'].toString();
            }
            res.render('editBatchProper', {equipment: temp, comno: comno, user: req.session.user, notification: data[1], noti_qty: data[1].length});
        }
    })
   .catch(function (err) {
        console.log("[FIND-BATCH-EDIT]" + err);
        return next(err);
    });
}
//8888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888
function findEquipDisposal(req, res, next) {
    var query;
    console.log("findEquipEdit");
    query = "SELECT component_no from equipment_date_extracted_office_staff WHERE condition = 'Working' AND property_no = ${propno}";

    db.task(function (t) {
        return t.batch([
            t.any(query, req.body),
            t.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5")
        ]);
    })
    .then(function (data) {
        var temp = data[0][0];
        
        if(data[0].length <= 0){
            console.log("BES1");
            req.session.error = "Equipment not found";
            req.session.propno = req.body.propno;
            res.redirect('/searchfordisposal');
            //res.render('disposalSearch', {error: "Equipment not found", prop: req.body.propno, user: req.session.user});
        } else 
             res.render('disposalProper', {comno: data[0], propno: req.body.propno, user: req.session.user, notification: data[1], noti_qty: data[1].length});
        
    })
   .catch(function (err) {
        console.log("[FIND-EQUIP-DISPOSAL]" + err);
        return next(err);
    });
}

function disposePropOffice(req, res, next) {
    var query;
    console.log("findEquipEdit");
    query = "SELECT component_no from equipment_date_extracted_office_staff WHERE condition = 'Working' AND property_no = ${propno} AND office_name = ${office_name}";

    db.task(function (t) {
        return t.batch([
            t.any(query, req.body),
            t.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5")
        ]);
    })
    .then(function (data) {
        var temp = data[0][0];
        
        if(data[0].length <= 0){
            console.log("BES1");
            //req.session.error = "All of those equipment were already disposed.";
            //req.session.propno = req.body.propno;
            //res.redirect('/searchfordisposal');
            res.render('disposalSearch', {error: "All of those equipment were already disposed.", prop: req.body.propno, user: req.session.user});
        } else 
             res.render('disposalProper', {comno: data[0], propno: req.body.propno, user: req.session.user, notification: data[1], noti_qty: data[1].length});
        
    })
   .catch(function (err) {
        console.log("[FIND-EQUIP-DISPOSAL]" + err);
        return next(err);
    });
}
//8888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888
function findAssignmentDetails(req, res, next) { ///////////////////
    var query;
    console.log("findAssignmentDetails");
    if(req.body.comno == null || req.body.comno == "")
        query = "SELECT * from equipment_date_extracted_office_staff WHERE property_no = ${propno}";
    else if(req.body.comno != null && req.body.comno != "")
        query = "SELECT * from equipment_date_extracted_office_staff WHERE property_no = ${propno} AND component_no = ${comno}";

    db.task(function (t) {
        return t.batch([
            t.any(query, req.body),
            t.any("SELECT * FROM office"),
            t.any("SELECT * FROM staff"),
            t.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5")
        ]);
    })
    .then(function (data) {
        var temp = data[0][0];
        
        if(data[0].length <= 0){
            console.log("BES1");
            req.session.error = "Equipment not found";
            req.session.propno = req.body.propno;
            res.redirect('/searchforequipmentassignment');
            //res.render('editAssignmentSearch', {error: "Equipment not found", prop: req.body.propno, user: req.session.user});
        } else if(data[0].length > 1 && temp['component_no'] != null){
            res.render('editAssignmentSearch', {error: "Input not specific. (Try putting the component number of the equipment)", prop: req.body.propno, user: req.session.user});
        } else {
            console.log("mana bes, naa didto ang error");
            res.render('editAssignment', {equipment: temp, office: data[1], staff: data[2], user: req.session.user, notification: data[3], noti_qty: data[3].length});
        }
        
    })
   .catch(function (err) {
        console.log("[FIND-ASSIGNMENT-DETAILS]" + err);
        return next(err);
    });
}

//////////////////
function rend_equipDetails(req, res, next) {
    console.log("view details");
    db.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5") 
        .then(function (data) {
             if(req.session.details != null) {
                 var details = req.session.details;
                 req.session.details = null;
                res.render('viewdetails', {equipment: details, user: req.session.user, notification: data, noti_qty: data.length});   
             }
            else
                next();
        })  
        .catch(function (err) {
            console.log("[REND-EQUIP-DETAILS]" + err);
            return next(err);
    });
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function findEquipment(req, res, next) {
    console.log("searchEquip");
    var query;
    var editable;
    query ="SELECT * from equipment_date_extracted_office_staff WHERE property_no = ${propno}";

    db.any(query, req.body)
        .then(function (data) {
            var temp = data[0];
            var comno = [];

            if(data.length <= 0){
                req.session.error = "Equipment not found";
                req.session.propno = req.body.propno;
                res.redirect('/searchforequipment');
            } else if(temp['component_no'] != null) {
                comno.push(temp['component_no'].toString());
                temp['component_no'] = temp['component_no'].toString();
                for(var i=1; i<data.length; i++) {
                    temp['component_no'] = temp['component_no'] + ", " + data[i]['component_no'].toString();
                    comno.push(data[i]['component_no'].toString());
                }
                console.log("here");
                if(data[0]['day'].toString().length == 1)
                    data[0]['day'] = '0' + data[0]['day'].toString();
                if(data[0]['month'].toString().length == 1)
                    data[0]['month'] = '0' + data[0]['month'].toString();
            }   
            req.session.details = data[0];
            res.redirect('/equipment-details');
        })
        .catch(function (err) {
            console.log("[FIND-EQUIP]" + err);
            return next(err);
    });
}
////////////////////////////////////////////////////////////////////////
function rend_equipDetails2(req, res, next) {
    console.log("view details");
    db.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5") 
        .then(function (data) {
             if(req.session.details != null) {
                 var details = req.session.details;
                 var comno = req.session.comno;
                 req.session.details = null;
                 req.session.comno = comno;
                res.render('viewdetails2', {equipment: details, comno: comno, user: req.session.user, notification: data, noti_qty: data.length}); 
             }
            else
                next();
        })  
        .catch(function (err) {
            console.log("[REND-EQUIP-DETAILS2]" + err);
            return next(err);
    });
}
function findEquipment1(req, res, next) {
    console.log("searchEquip");
    var query;
    var editable;
    query ="SELECT * from equipment_date_extracted_office_staff WHERE property_no = ${propno} and office_id = (select designated_office from clerk where username = '" + req.session.user + "')";

    db.any(query, req.body)
        .then(function (data) {
            var temp = data[0];
            var comno = [];

            if(data.length <= 0){
                res.render('searchEquipment2', {error: "Equipment not found", prop: req.body.propno});
            } else if(data[0]['component_no'] != null) {
                comno.push(data[0]['component_no'].toString());
                data[0]['component_no'] = data[0]['component_no'].toString();
                for(var i=1; i<data.length; i++) {
                    data[0]['component_no'] = data[0]['component_no'] + ", " + data[i]['component_no'].toString();
                    comno.push(data[i]['component_no'].toString());
                }
                console.log("here");
                if(data[0]['day'].toString().length == 1)
                    data[0]['day'] = '0' + data[0]['day'].toString();
                if(data[0]['month'].toString().length == 1)
                    data[0]['month'] = '0' + data[0]['month'].toString();

                req.session.details = data[0];
                req.session.comno = comno;    
                res.redirect('/equipment-details2');
            }
            else{
                req.session.details = data[0];
                req.session.comno = comno;    
                res.redirect('/equipment-details2');
            }
        })
        .catch(function (err) {
            console.log("[FIND-EQUIP]" + err);
            return next(err);
    });
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
function editBatchEquipment(req, res, next) {
    setMode();
    if(mode == 'Inventory' || mode == 'Disposal') {
        var message = 'The system is in ' + mode + ' Mode. You cannot add new equipment.';
        if(mode == 'Inventory')
            res.render('isinventory');
        else
            res.render('isdisposal');
        return;
    }
    pg.connect(connectionString,function (err, client, done) {
        if (err){
            return console.error('error fetching client from pool', err);
        }

        client.query("UPDATE equipment set (article_name, date_acquired, description, unit_cost, type) = ($1, $2, $3, $4, $5) WHERE property_no = $6", 
            [req.body.artname,
            req.body.date,
            req.body.description,
            req.body.cost,
            req.body.type,
            req.body.propno], function (err, result){
            if (err) {
                return console.error('error running query', err);
            }
        });

        client.query("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5", function (err, result1) {
            if (err) {
                return console.error('error running query', err);
            }
        });

        client.query("INSERT INTO transaction_log (staff_id,transaction_details) values ($1,'updated an equipment by batch')",
            [req.session.user],
            function (err, result) {
            if (err) {
                return console.error('error running query', err);
            }
        });

        done();
        res.redirect('/dashboard');
    });
}

//88888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888
function disposeProp(req, res, next) {

    pg.connect(connectionString,function (err, client, done) {
        if (err){
            return console.error('error fetching client from pool', err);
        }
        client.query("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5", function (err, data) {
            if (err) {
                return console.error('error running query', err);
            }
        });
        for(var i=0; i<req.body.component_nos.length; i++){
            if(req.body.component_nos[i] != null)
                client.query("UPDATE equipment set condition = $1 WHERE property_no = $2 AND component_no = $3", 
                    ['Disposed',
                    req.body.propno,
                    req.body.component_nos[i]
                    ], function (err, result){
                    if (err) {
                        return console.error('error running query', err);
                    }
                });
            else
                client.query("UPDATE equipment set condition = $1 WHERE property_no = $2", 
                    ['Disposed',
                    req.body.propno
                    ], function (err, result){
                    if (err) {
                        return console.error('error running query', err);
                    }
                });
            if(req.body.way_of_disposal == "Sale")
                client.query("INSERT INTO disposed_equipment VALUES (md5($1 || $2), $3, $4, $5, $6)", 
                    [req.body.propno,
                    req.body.component_nos[i],
                    req.body.appraised_value,
                    req.body.way_of_disposal,
                    req.body.or_no,
                    req.body.amount], function (err, result){
                    if (err) {
                        return console.error('error running query', err);
                    }
                });
            else
                client.query("INSERT INTO disposed_equipment VALUES (md5($1 || $2), $3, $4)", 
                    [req.body.propno,
                    req.body.component_nos[i],
                    req.body.appraised_value,
                    req.body.way_of_disposal], function (err, result){
                    if (err) {
                        return console.error('error running query', err);
                    }
                });
            client.query("DELETE from working_equipment WHERE qrcode = (md5($1 || $2))", 
                [req.body.propno,
                req.body.component_nos[i]], function (err, result){
                if (err) {
                    return console.error('error running query', err);
                }
            });
        }

        done();
        res.redirect('/dashboard');
    });
}
//8888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888

function editEquipmentAssignment(req, res, next) {
    setMode();
    if(mode == 'Inventory' || mode == 'Disposal') {
        var message = 'The system is in ' + mode + ' Mode. You cannot add new equipment.';
        if(mode == 'Inventory')
            res.render('isinventory');
        else
            res.render('isdisposal');
        return;
    }
    pg.connect(connectionString,function (err, client, done) {
        if (err){
            return console.error('error fetching client from pool', err);
        }
        client.query("UPDATE assigned_to set (office_id_holder, staff_id, date_assigned) = ($1, $2, CURRENT_DATE) WHERE equipment_qr_code = md5($3 || $4)", 
            [req.body.office_name,
            req.body.staffs,
            req.body.propno,
            req.body.comno], function (err, result){
            if (err) {
                return console.error('error running query', err);
            }
        });

        client.query("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5", function (err, data) {
            if (err) {
                return console.error('error running query', err);
            }
        });

        client.query("INSERT INTO transaction_log (staff_id,transaction_details,equip_qrcode) values ($1,'moved an equipment',md5($2 || $3))",
            [req.session.user,
            req.body.propno,
            req.body.comno], 
             function (err, result) {
            if (err) {
                return console.error('error running query', err);
            }
        });

        done();
        res.redirect('/dashboard');

    });
}
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function getOffices(req, res, next) {
    console.log("getOffices");
    db.task(function (t) {
        return t.batch([
            t.any('SELECT * from office order by office_name'),
            t.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5")
        ]);
    })
    .then(function (data) {
      res.status(200)
        .render('viewoffices', {office: data[0], user: req.session.user, notification: data[1], noti_qty: data[1].length});
    })
    .catch(function (err) {
      console.log("[GET-OFFICES] " + err);
      return next(err);
    });
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
function find_indiv_office_Equipment(req, res, next) {
    console.log("searchIndivOfficeEquip");
    var query;
    query ="SELECT * from equipment_date_extracted_office_staff WHERE property_no = ${propno} and office_name = ${office_name}";

    db.task(function (t) {
        return t.batch([
            t.any(query, req.body),
            t.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5")
        ]);
    })
        .then(function (data) {
            res.render('findindivoffequipment', {equipment: data[0], office_name: req.body.office_name, user: req.session.user, notification: data[1], noti_qty: data[1].length});
        })
        .catch(function (err) {
            console.log("[FIND-INDIV-OFFICE-EQUIP]" + err);
            return next(err);
    });
}

function getDisposalItems(req, res, next) { // addition Nov. 22, 2016
    console.log("getDisposalList");

    var ask = "SELECT article_name, property_no, component_no, month, day, year from equipment, extract_office_trans, mobile_trans WHERE extract_office_trans.office_name = ${office} AND extract_office_trans.parameter = mobile_trans.parameter AND mobile_trans.parameter = equipment.qrcode ORDER BY year, month, day"
    db.task(function (t) {
        return t.batch([
            t.any(ask, req.body),
            t.any("SELECT category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5")
        ]);
    })
    .then(function (data) {
      res.status(200)
        .render('dispItem', {mobiletrans: data[0], user: req.session.user, notification: data[1], noti_qty: data[1].length});
    })
    .catch(function (err) {
      console.log("[GET-] " + err);
      return next(err);
    });
}

function getDisposalList(req, res, next) { // addition Nov. 22, 2016
    console.log("getDisposalList11");
    db.task(function (t) {
        return t.batch([
            t.any("SELECT office_name, count from dis_count"),
            t.any("SELECT category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5")
        ]);
    })
    .then(function (data) {
      res.status(200)
        .render('viewdisposal', {mobiletrans: data[0], user: req.session.user, notification: data[1], noti_qty: data[1].length});
    })
    .catch(function (err) {
      console.log("[GET-] " + err);
      return next(err);
    });
}

function find_indiv_equipment(req, res, next) {
    console.log("searchIndivEquip");
    var query;
    if(req.body.comno == null || req.body.comno == "")
        query ="SELECT * from equipment_date_extracted_office_staff WHERE property_no = ${propno}";
    else
        query ="SELECT * from equipment_date_extracted_office_staff WHERE property_no = ${propno} AND component_no = ${comno}";

     db.task(function (t) {
        return t.batch([
            t.any(query, req.body),
            t.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5")
        ]);
    })
        .then(function (data) {
            console.log(data);
            res.render('viewdetails', {equipment: data[0], hidden: req.body.editable, user: req.session.user, notification: data[1], noti_qty: data[1].length});
        })
        .catch(function (err) {
            console.log("[FIND-INDIV-OFFICE-EQUIP]" + err);
            return next(err);
    });
}
//
////////////////////////////////////////////////////////////////////////////////////////////
function officeName(req, res, next) {
    console.log("officeNames");
    db.task(function (t) {
        return t.batch([
            t.any('SELECT office_name from office'),
            t.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5")
        ]);
    })
    .then(function (data) {
      res.status(200)
      if(req.session.error != null && req.session.label != null && req.session.body) {
        var err = req.session.error;
        var label = req.session.label;
        var body = req.session.body;
        req.session.error = null;
        req.session.label= null;
        req.session.body = null;
        res.render('searchOffice', {error: err, label: body, office: data[0], user: req.session.user, notification: data[1], noti_qty: data[1].length});
      }
      else
        res.render('searchOffice', {office: data[0], user: req.session.user, notification: data[1], noti_qty: data[1].length});
    })
    .catch(function (err) {
      console.log("[OFFICE-NAME] " + err);
      return next(err);
    });
}

function findOffice(req, res, next) {
    var query;
    var body;
    var label;
    console.log("findOffice");
    if(req.body.office_id == null || req.body.office_id == "" || req.body.office_id == " " || !req.body.office_id) {
        query = "SELECT * FROM office where office_name = ${office_name}";
        body = req.body.office_name;
        label = "office_name";
    }
    else {
        query = "SELECT * FROM office where office_id = ${office_id}";
        body = req.body.office_id;
        label = "office_id";
    }
    db.any(query, req.body)
        .then(function (data) {
            if(data.length == 0) {
                req.session.error = "Office not found.";
                req.session.label = label;
                req.session.body = body;
                res.redirect('/searchoffice');
                //res.render('searchOffice', {error: "Office not found.", label: body, user: req.session.user});
            }
            else
                res.render('viewoffices', {office: data, user: req.session.user});
        })
        .catch(function (err) {
            console.log("[FIND-OFFICE] " + err);
            return next(err);
        });
}

function getEquipment(req, res, next) {
    console.log("getEquipment");
    db.task(function (t) {
        return t.batch([
            t.any('SELECT * from eq_count where office_name = ${office_name}', req.body),
            t.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5")
        ]);
    })
    .then(function (data) {
        for(var i=0; i<data[0].length; i++){
            if(data[0][i]['no_of_eq'].toString() == '0')
                data[0][i]['no_of_eq'] = '1';
        }

        res.status(200);
        console.log(req.body.office_name);
        res.render('viewequipment', {equipment: data[0], office_name: req.body.office_name, user: req.session.user, notification: data[1], noti_qty: data[1].length});
    })
    .catch(function(err) {
        console.log("[GET-ITEMS] " + err);
        return next(err);
    });
}

function getEquipment1(req, res, next) {
    console.log("getEquipment1");
    db.task(function (t) {
        return t.batch([
            t.any("SELECT * from eq_count where office_name = (SELECT office_name FROM office WHERE office_id = (SELECT designated_office FROM clerk WHERE username = '" + req.session.user + "'))"),
            t.any("SELECT office_name FROM office WHERE office_id = (SELECT designated_office from clerk where username = '" + req.session.user + "')"),
            t.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5")
        ]);
    })
    .then(function (data) {
        for(var i=0; i<data[0].length; i++){
            if(data[0][i]['no_of_eq'].toString() == '0')
                data[0][i]['no_of_eq'] = '1';
        }

        res.status(200);
        console.log(req.body.office_name);
        res.render('viewequipment2', {equipment: data[0], office: data[1], user: req.session.user, notification: data[2], noti_qty: data[2].length});
    })
    .catch(function(err) {
        console.log("[GET-ITEMS1] " + err);
        return next(err);
    });
}

function getItems(req, res, next) {
    db.task(function (t) {
        return t.batch([
            t.any('SELECT * from equipment, assigned_to, office WHERE equipment.qrcode = assigned_to.equipment_qr_code AND assigned_to.office_id_holder = office.office_id AND office.office_name =${office_name} AND equipment.article_name = ${holder}', req.body),
            t.any('SELECT office_name from office WHERE office_name =${office_name}', req.body),
            t.any('SELECT DISTINCT(no_of_eq), equipment.article_name from eq_count, equipment, office, assigned_to where AND assigned_to.office_id_holder = office.office_id AND office.office_name = ${office_name} AND eq_count.office_name = ${office_name} AND eq_count.article_name = equipment.article_name AND equipment.article_name = ${article_name} ORDER BY equipment.article_name;', req.body),
            t.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5")
        ]);
    })
    .then(function (data) {
        res.status(200);
            res.render('viewitems', {equipment: data[0], office: data[1], no_of_eq:data[2], user: req.session.user, notification: data[3], noti_qty: data[3].length});
    })
    .catch(function(err) {
        console.log("[GET-ITEMS] " + err);
        return next(err);
    });
}

function getItems1(req, res, next) {
    console.log("Entering " + req.body.office_name);
    pg.connect(connectionString,function (err, client, done) {
        if (err){
            return console.error('error fetching client from pool', err);
        }
     
        if(!(req.session.in))
            res.redirect('/');
        else if(req.session.role == 'SPMO') {
            console.log("SPMO");
            res.redirect('/viewitems');
        }
        else{
            client.query('SELECT * from equipment, office, staff WHERE article_name = $1 AND staff.office_id = office.office_id AND staff.staff_id = $2 ORDER BY component_no', [req.body.holder, req.session.user], function (err, result) {
            if (err) {
                return console.error('error running query', err);
            }
                client.query('SELECT office_name from office, staff WHERE office.office_id = staff.office_id AND staff.staff_id = $1', [req.session.user], function (err, result2) {
                    if (err) {
                        return console.error('error running query', err);
                    }
                    client.query('SELECT DISTINCT(no_of_eq), equipment.article_name from eq_count, equipment, office, assigned_to where equipment.qrcode = assigned_to.equipment_qr_code AND assigned_to.office_id_holder = office.office_id AND office.office_name = $1 AND eq_count.office_name = $1 AND eq_count.article_name = equipment.article_name AND equipment.article_name = $2 ORDER BY equipment.article_name;', [req.body.office_name, req.body.article_name], function (err, result3) {
                    if (err) {
                        return console.error('error running query', err);
                    }           
                    res.render('viewitems2', {equipment: result.rows, office: result2.rows, count:result3.rows, user: req.session.user});
                    done();
                    });
                });
            });
        }
    });
}

function getDetails(req, res, next) {
    console.log("getDetails");
    db.any("SELECT * from equipment_date_extracted_office_staff where qrcode = ${qrcode}", req.body)
    .then(function (data) {
        req.session.details = data;
        res.status(200)
            .redirect('/equipment-details');
      })
    .catch(function (err) {
      console.log("[GET-DETAILS] " + err);
      return next(err);
    });
}

function getDetails1(req, res, next) {
    console.log("getDetails");
    db.any("SELECT * from equipment_date_extracted_office_staff where qrcode = ${qrcode}", req.body)
    .then(function (data) {
        req.session.details = data;
        res.status(200)
            .redirect('/equipment-details2');
      })
    .catch(function (err) {
      console.log("[GET-DETAILS] " + err);
      return next(err);
    });
}
function removeEquipment(req, res, next) {
    setMode();
    if(mode == 'Inventory' || mode == 'Disposal') {
        var message = 'The system is in ' + mode + ' Mode. You cannot add new equipment.';
        if(mode == 'Inventory')
            res.render('isinventory');
        else
            res.render('isdisposal');
        return;
    }
    var query;
    console.log("removeEquipment");
    if(req.body.component_no == null || req.body.component_no == "")
        query = "DELETE FROM equipment WHERE property_no = ${property_no}";
    else if(req.body.component_no != null && req.body.component_no != "")
        query = "DELETE FROM equipment WHERE property_no = ${property_no} and component_no = ${component_no}";
    
    db.none(query, req.params)
        .then(function (data) {
            res.send(200);
        })
        .catch(function (err) {
            console.log("[REMOVE-EQUIP] " + err);
            return next(err);
        });
}

function updateStatusEquip(req, res, next) {
    console.log("updateStatusEquip");
    db.none("UPDATE working_equipment SET status=${status} WHERE qrcode = md5(${property_no} || ${component_no})", req.body)
        .then(function (data) {
            res.status(200)
                .redirect('/dashboard');
        })
        .catch(function (err) {
            console.log("[UPDATE-EQUIP] " + err);
            return next(err);
        });
}

function moveEquipment(req, res, next) {
    console.log("moveEquipment " + req.body.property_no + " " + req.body.component_no);
    var query, query2;
    if(req.body.way_of_disposal == "Sale")
        query = "INSERT INTO disposed_equipment VALUES (md5(${property_no} || ${component_no}), ${appraised_value}, ${way_of_disposal}, ${or_no}, ${amount})";
    else
        query = "INSERT INTO disposed_equipment VALUES (md5(${property_no} || ${component_no}), ${appraised_value}, ${way_of_disposal})";
    if(req.body.component_no == null || req.body.component_no == "")
        query2 = "UPDATE equipment SET condition='Disposed' WHERE property_no = ${property_no}";
    else
        query2 = "UPDATE equipment SET condition='Disposed' WHERE property_no = ${property_no} and component_no = ${component_no}";
    db.task(function (t) {
        return t.batch([
            t.none(query2, req.body),
            t.none("DELETE from working_equipment WHERE qrcode = md5(${property_no} || ${component_no})", req.body),
            t.none(query, req.body),
            t.none("INSERT INTO transaction_log (staff_id,transaction_details, equip_qrcode) values ($1,'disposed an equipment', md5($2||$3))", [req.session.user, req.body.property_no, req.body.component_no])
        ]);
    })
    .then(function (data) {
        res.status(200)
            .redirect('/dashboard');
    })
    .catch(function(err) {
        console.log("[MOVE-EQUIP] " + err);
        return next(err);
    });
}

function generateInventory(req, res, next) {
    console.log("generateInventory");
  res.setHeader('Content-Type', 'application/json');
  db.any("Select article_name, description, date_acquired, property_no, component_no, unit_cost from equipment, assigned_to where assigned_to.office_id_holder = $1 and assigned_to.equipment_qr_code = equipment.qrcode", req.params.office_id)
    .then(function (data) {
      res.status(200)
        .send(JSON.stringify(data, null, " "));
    })
    .catch(function (err) {
       console.log("[INVENT-REPORT] " + err); 
      return next(err);
    });
}

function generateDisposal(req, res, next) {
    console.log("generateDisposal");
  res.setHeader('Content-Type', 'application/json');
  db.any('Select date_acquired, article_name, property_no, component_no, unit_cost, way_of_disposal, appraised_value, or_no, amount from equipment, disposed_equipment where (select time::timestamp::date from disposed_equipment where equipment.qrcode = disposed_equipment.qrcode) <= (select "end" from schedule where "end" = (select max("end") from schedule) and event_status = $1) AND (select time::timestamp::date from disposed_equipment where equipment.qrcode = disposed_equipment.qrcode) >= (select start from schedule where "end" = (select max("end") from schedule) and event_status = $1);', 'Done')
    .then(function (data) {
      res.status(200)
        .send(JSON.stringify(data, null, " "));
    })
    .catch(function (err) {
       console.log("[DISPOSAL-REPORT] " + err); 
      return next(err);
    });
}

function getEvents(req, res, next) {
    console.log("getEvents");
    query = "select id,title,start + interval '1' day as start," + '"end"' + "+ interval '1' day as " + '"end" from schedule';
  db.any(query)
    .then(function (data) {
      res.status(200)
        .send(data);
    })
    .catch(function (err) {
      console.log("[GET-EVENTS]" + err);
      return next(err);
  });
}

function renderCalendar(req, res, next) {
    console.log("calendar");
    db.task(function (t) {
        return t.batch([
            t.any('select * from sched_simple where start >= CURRENT_DATE'),
            t.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5"),
            t.any("select * from staff,spmo where staff.staff_id = spmo.username and staff.role = 'SPMO'"),
            t.any("select * from office"),
            t.any('select * from schedule, sched_simple where schedule.id = sched_simple.id order by schedule.id desc')
        ]);
    })
    .then(function (data) {
      res.status(200)
        .render('calendar', {sched: data[0], user: req.session.user, notification: data[1], noti_qty: data[1].length, spmo_staff: data[2], office: data[3], sched_disp: data[4]});
    })
    .catch(function (err) {
      console.log("[REND-CALENDAR]" + err);
      return next(err);
  });
  
}

function renderCalendar2(req, res, next) {
    console.log("calendar");
    db.task(function (t) {
        return t.batch([
            t.any('select * from sched_simple where start >= CURRENT_DATE'),
            t.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5")
        ]);
    })
    .then(function (data) {
      res.status(200)
        .render('calendar2', {sched: data[0], user: req.session.user, notification: data[1], noti_qty: data[1].length});
    })
    .catch(function (err) {
      console.log("[REND-CALENDAR]" + err);
      return next(err);
  });
  
}

function addSchedule(req, res, next) {
    console.log("FIRST:" + req.body.office1);

    db.task(function (t) {
        var retr = [t.none('SET datestyle = "ISO, MDY"'), t.none('insert into schedule(start,title,"end") values (${date1},${title},${date2})', req.body)];
        if(req.body.title == 'Inventory'){
            retr.push(t.none('insert into inventory_details values ((select max(id) from schedule), ${user})', req.session));
        
            for(var i = 1; i <= 60; i++) {
                var temp_query = "insert into spmo_staff_assignment values ((select max(inventory_id) from inventory_details), " + i + ", ${office" + i + "})";
                retr.push(t.none(temp_query,  req.body));
                // var messge = "Good day,\n\nPlease be aware that you are assigned in " + req.body.off[i] + " in the inventory scheduled on " + req.body.date1 + " to " + req.body.date2 + ".";
                // // if(req.body.)
                //send_email_inventory(,messge);
            }
        }
        return t.batch(retr);
    })
    .then(function (data) {
        //console.log(req.body);
        var message = 'Good day,\n\nPlease be aware that we have set a schedule for ' + req.body.title + ' this coming ' + req.body.date1 + ' up until ' + req.body.date2 + '.\nWe will be sending a list a week before.\n\nThank you.';
        send_email('clerk',message);
        res.status(200)
            .redirect('/calendar');
    })
    .catch(function(err) {
        console.log("[ADD-SCHED] " + err);
      return next(err);
    });
}

function delete_event(req, res, next) {
    console.log("at delete event");
    db.none("delete from schedule where id = $1", req.body.id)
    db.none("delete from spmo_staff_assignment where inventory_id = $1", req.body.id)
        .then(function (data) {
          res.redirect('/calendar');
        })
        .catch(function (err) {
            console.log("[DELETE-EVENT] " + err);
          return next(err);
      });
}

function qrcode_gen(req,res){
    // res.render('index');
    console.log(req.body.office_name);
    pg.connect(connectionString,function (err, client, done) {
      if (err){
        return console.error('error fetching client from pool', err);
      }
      client.query('SELECT * from equipment_date_extracted_office_staff, office, assigned_to where qrcode = $1 AND assigned_to.equipment_qr_code = $1 AND office_id_holder = office.office_id', [req.body.qrcode], function (err, result) {
        if (err) {
            return console.error('error running query', err);
        }
        res.render('qrcode', {equip : result.rows, user: req.session.user});
        done();
      });
    });
}

function rend_transactionlog(req, res, next) {
    console.log("transactionlog");
    db.task(function (t) {
            return t.batch([
                t.any("select transaction_no, staff_id, transaction_date::timestamp::date, transaction_time, transaction_details from transaction_log"),
                t.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5")
            ]);
        })
        .then(function (data) {
            res.status(200)
                .render('transactionlog', {transaction: data[0], notification: data[1], noti_qty: data[1].length, user: req.session.user}); 
        })  
        .catch(function (err) {
            console.log("[REND-TRANSLOG]" + err);
            return next(err);
    });
}

function rend_equipmentHistory(req, res, next) {
    console.log("transactionlog");
    db.task(function (t) {
            return t.batch([
                t.any("select * from equipment_history where equip_qrcode = $1", req.body.qrcode),
                t.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5")
            ]);
        })
        .then(function (data) {
            console.log(data);
            res.status(200)
                .render('equipmentHistory', {history: data[0], notification: data[1], noti_qty: data[1].length, user: req.session.user}); 
        })  
        .catch(function (err) {
            console.log("[REND-TRANSLOG]" + err);
            return next(err);
    });
}

function getAssignments(req, res, next) {
    db.task(function (t) {
        return t.batch([
            t.any('SELECT * from spmo_staff_assignment, schedule, office WHERE spmo_assigned = ${user} AND inventory_id = schedule.id AND inventory_office = office.office_id', req.session),
            t.any("Select category, read from dummy_transaction where time > (now() - interval '24 hours') order by time desc limit 5")
        ]);
    })
    .then(function (data) {
        res.status(200);
            res.render('viewassign', {equipment: data[0], user: req.session.user, notification: data[1], noti_qty: data[1].length});
    })
    .catch(function(err) {
        console.log("[GET-ITEMS] " + err);
        return next(err);
    });
}

/////////MOBILE////////////
function m_login(req, res, next) {
    console.log(req.body);
    var office_name;
    var role;
    var type;
    setMode();
    res.setHeader('Content-Type', 'application/json');
    db.task( function(t) {
            return t.one("SELECT * FROM staff where staff_id=$1", req.body.username)
            .then(function (staff) {
                if(staff.role == 'Clerk') {
                    return t.one("select office_name from office where office_id=$1 and password=crypt($2,password)", [staff.office_id, req.body.password])
                            .then(function (office) { 
                                console.log(staff.office_id + " " + office.office_name);
                                role = 'clerk';
                                office_name = office.office_name;
                            })
                            .catch(function (err) {
                                console.log("[MOBILE-LOGIN] " + err);
                                res.send({feedback: 'incorrect password'});
                                return next(err);
                            });
                }
                else if(staff.role == 'SPMO') {
                    return t.one("select * from spmo where username=$1 and password=crypt($2,password)", [req.body.username, req.body.password])
                        .then(function (spmo) { 
                            role = 'spmo';
                        })
                        .catch(function (err) {
                            console.log("[MOBILE-LOGIN] " + err);
                            res.send({feedback: 'incorrect password'});
                            return next(err);
                        });
                }
                else {
                    return t.one("select type from checker where username=$1 and password=crypt($2,password)", [req.body.username, req.body.password])
                        .then(function (checker) { 
                            role = 'checker';
                            type = checker.type;
                        })
                        .catch(function (err) {
                            console.log("[MOBILE-LOGIN] " + err);
                            res.send({feedback: 'incorrect password'});
                            return next(err);
                        });
                }
                    
            });
        })
        .then(function (data) {
            console.log("MOBILE HAS LOGGED IN AS (" + role + ")");
           res.status(200);
            if(role == 'clerk')
                res.send({feedback: 'success', mode: mode, role: role, office: office_name, username: req.body.username});
            else if(role == 'SPMO')
                res.send({feedback: 'success', mode: mode, role: role, username: req.body.username});
            else
                res.send({feedback: 'success', mode: mode, role: role, type: type, username: req.body.username});
        })
        .catch(function (err) {
            console.log("[MOBILE-LOGIN] " + err);
            res.send({feedback: 'not found'});
            return next(err);
        });
}

//default mode
function m_getListforCheckers(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    db.any("select article_name, property_no, component_no, description, condition, temp1.type from equipment as temp1 join (select type from checker where username=$1) as temp2 on temp1.type = temp2.type order by article_name", req.params.username)
        .then(function (data) {
            var resultName = '{\n"list_of_equipment":';
            var jsonString = JSON.stringify(data, null, " ");
            var finalString = resultName.concat(jsonString + "\n}");
            //console.log(finalString);
            console.log("MOBILE HAS ACCESSED LIST FOR CHECKERS");
            res.status(200)
                .send(finalString);
        })
        .catch(function (err) {
            console.log("[M-CHECKERS-LIST] " + err);
            return next(err);
        });
}

//disposal mode (checker)
function m_getDisposalListforCheckers(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    db.any("select office_name, temp1.type, content from disposal_requests as temp1 join (select type from checker where username=$1) as temp2 on temp1.type = temp2.type", req.params.username)
        .then(function (data) {
            var resultName = '{\n"disposal_requests":';
            var jsonString = JSON.stringify(data, null, " ");
            var finalString = resultName.concat(jsonString + "\n}");
            //console.log(finalString);
            console.log("MOBILE HAS ACCESSED DISPOSAL LIST FOR CHECKERS");
            res.status(200)
                .send(finalString);
        })
        .catch(function (err) {
            console.log("[M-CHECKERS-DISPOSAL] " + err);
            return next(err);
        });
} 
//disposal mode (clerk)
function m_disposalListfromClerks(req, res, next) {
    console.log(req.body);
    res.setHeader('Content-Type', 'application/json');
    var email = [];
    var nullstring = '{"listofEquipmentToDispose":[]}';

    db.task( function(t) {
        var queries = [];

        if(req.body.disposalList_LabEquipment != nullstring) {
            queries.push(t.any("Insert into disposal_requests(username, type, office_name, content) values($1, $2, $3, $4, $5, $6, $7)", 
            [req.body.username,'Lab Equipment',req.body.officeName, req.body.disposalList_LabEquipment]));
        }
        if(req.body.disposalList_ITequipment != nullstring) {
            queries.push(t.any("Insert into disposal_requests(username, type, office_name, content) values($1, $2, $3, $4, $5, $6, $7)", 
            [req.body.username,'IT Equipments',req.body.officeName, req.body.disposalList_ITequipment]));
        }
        if(req.body.disposalList_Aircon != nullstring) {
            queries.push(t.any("Insert into disposal_requests(username, type, office_name, content) values($1, $2, $3, $4, $5, $6, $7)", 
            [req.body.username,'Aircons',req.body.officeName, req.body.disposalList_Aircon]));
        }
        if(req.body.disposalList_Furnitures_and_Fixtures != nullstring) {
            queries.push(t.any("Insert into disposal_requests(username, type, office_name, content) values($1, $2, $3, $4)", 
            [req.body.username,'Furnitures and Fixtures',req.body.officeName, req.body.disposalList_Furnitures_and_Fixtures]));
        }
        if(req.body.disposalList_NonIT != nullstring) {
            queries.push(t.any("Insert into disposal_requests(username, type, office_name, content) values($1, $2, $3, $4)", 
            [req.body.username,'Non-IT Equipment',req.body.officeName, req.body.disposalList_NonIT]));
        }

        return t.batch(queries)
                .then(function (qr) {
                    return t.none("insert into mobile_trans(username, transaction, parameter, result, remarks) values($1,'Disposal Request','','For checking','Success')", [req.body.username]);
                })
                .catch(function (err) {
                    console.log("[M-SEND-DISPOSAL1] " + err);
                    return t.none("insert into mobile_trans(username, transaction, parameter, result, remarks) values(${username},'Disposal Request','','List not recorded','Failed')", req.body);
                });
        })
        .then(function (data) {
            //send email to checkers

            console.log("MOBILE HAS SENT DISPOSAL LIST");
            res.status(200)
                .send({feedback: 'sent'});
        })
        .catch(function (err) {
            console.log("[M-SEND-DISPOSAL2] " + err);
             res.status(200)
                .send({feedback: 'not sent'});
            return next(err);
        });
}

//disposal mode (checker)
function m_confirmedListfromChecker(req, res, next) {
    console.log(req.body);
    res.setHeader('Content-Type', 'application/json');
    
    // pg.connect(connectionString,function (err, client, done) {
    //     var count = req.body.listofEquipmentToDispose.length;
    //     var list = req.body.listofEquipmentToDispose;
    //     for(var i = 0; i < count; i++) {
            
    //     }
    // });

    res.status(200)
        .send({feedback: 'sent'});

}

//disposal mode (spmo)
function m_confirmedListforSPMO(req, res, next) {
    console.log(req.body);
    res.setHeader('Content-Type', 'application/json');
    
    // pg.connect(connectionString,function (err, client, done) {
    //     var count = req.body.listofEquipmentToDispose.length;
    //     var list = req.body.listofEquipmentToDispose;
    //     for(var i = 0; i < count; i++) {
            
    //     }
    // });

    res.status(200)
        .send({feedback: 'sent'});

}

//inventory mode
function m_getInventoryAssign(req, res, next) {
    console.log("mobile inventory assignment");
    res.setHeader('Content-Type', 'application/json');
    setMode();
    if(mode == 'Default') {
        res.status(200)
            .send({"inventory_details": []});
    }

    pg.connect(connectionString,function (err, client, done) {
        var finalString;
        var jsonString;
        if (err){
            return console.error('error fetching client from pool', err);
        }
        console.log("PG NEW");
        var rows = [];
        var office = [];
        var jsonString = "";

        var jsonString = '{\n"inventory_details":';
        client.query("select spmo_assigned as spmo_officer, null as offices from spmo_staff_assignment group by spmo_assigned", function (err, result) {
            for(var i = 0; i < result.rows.length; i++) {
                rows.push(result.rows[i]);
            }
            //console.log(rows.length);
            var queries = [];
            var office = [];
            var num = 0;
            var q;
            for(var i = 0; i < rows.length; i++) {
                q = "select office_name from office as temp1 inner join (select inventory_office from spmo_staff_assignment where spmo_assigned='"+ rows[i]['spmo_officer'] + "') as temp on temp1.office_id = temp.inventory_office";
                queries.push(q);
            }            
            async.forEach(queries, function(q, callback) {
                var query = client.query(q);
                query.on("row", function (row, result) {
                    result.addRow(row);
                });
                query.on("end", function (result) {
                    office.push(result.rows);
                    client.end();
                    callback(null);
                });
            }, function() {
                for(var i = 0; i < office.length; i++) {
                    rows[i]['offices'] = office[i];
                    console.log(rows[i]['offices']);
                }   
                var finalString = jsonString.concat(JSON.stringify(rows)+ "\n}");
                res.send(finalString);
            });
            
        });
    });
}

//inventory mode (clerk, spmo, checker)
function m_getWorkingEquipment(req, res, next) {
    console.log("working_equipment");
    res.setHeader('Content-Type', 'application/json');
    db.task( function(t) {
            return t.any("select article_name, property_no, component_no, description, condition, status from ((select * from  equipment, assigned_to where equipment.qrcode = assigned_to.equipment_qr_code AND assigned_to.office_id_holder = (SELECT office_id from office where office_name = $1)) as temp1 inner join working_equipment as temp on temp1.qrcode = temp.qrcode) as temp2 order by article_name", req.params.office_name)
        })
        .then(function (data) {
            var resultName = '{\n"list_of_equipment":';
            var jsonString = JSON.stringify(data, null, " ");
            var finalString = resultName.concat(jsonString + "\n}");
            //console.log(finalString);
            console.log("MOBILE HAS ACCESSED LIST OF WORKING EQUIP");
            res.status(200)
                .send(finalString);
        })
        .catch(function (err) {
            console.log("[M-WORKING-EQUIP] " + err);
            return next(err);
        });
}

//default mode (clerk, checker, spmo)
//inventory mode (checker, spmo)
//disposal mode (checker, spmo)
function getScannedEquipment(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    db.task( function(t) {
        return t.one("SELECT * FROM equipment where qrcode=$1", req.body.qrCode)
            .then(function (qr) {
                return t.none("insert into mobile_trans(username, transaction, parameter, result, remarks) values($1,'Scan QR Code',$2,$3,'Success')", [req.body.username, req.body.qrCode, qr[0]['article_name']]);
            })
            .catch(function (err) {
                console.log("[M-SCAN-EQUIP1] " + err);
               return t.none("insert into mobile_trans(username, transaction, parameter, result, remarks) values(${username},'Scan QR Code',${qrCode},'Not Found','Failed')", req.body);
            });
        })
        .then(function (data) {
            var jsonString = JSON.stringify(data, null, " ");
            var finalString = jsonString.replace("[", "");
            finalString = finalString.replace("]", "");
            finalString = finalString.trim();
            //console.log(finalString);
            console.log("MOBILE HAS ACCESSED AN EQUIPMENT");
            res.status(200)
                .send(finalString);
        }) 
        .catch(function (err) {
            console.log("[M-SCAN-EQUIP2] " + err);
            return next(err);
        });
}

function m_getAllOffices(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    db.any("SELECT office_name FROM office order by office_name")
        .then(function (data) {
        var resultName = '{\n"offices":';
        var jsonString = JSON.stringify(data, null, " ");
        var finalString = resultName.concat(jsonString + "\n}");
        //console.log(finalString);
        console.log("MOBILE HAS ACCESSED LIST OF OFFICES");

        res.status(200)
            .send(finalString);
        })
        .catch(function (err) {
            console.log("[M-OFFICES] " + err);
            return next(err);
        });
}

//defualt mode (spmo)
function m_getOfficeEquipment(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    setMode();
    var query;
    if(mode == 'Inventory')
        query = 'SELECT * FROM equipment, assigned_to, working_equipment where equipment.qrcode = assigned_to.equipment_qr_code AND equipment.qrcode = working_equipment.qrcode AND assigned_to.office_id_holder = (SELECT office_id from office where office_name = $1) order by article_name';
    else if(mode == 'Default' || mode == 'Disposal')
        query = 'SELECT * FROM equipment, assigned_to where equipment.qrcode = assigned_to.equipment_qr_code AND assigned_to.office_id_holder = (SELECT office_id from office where office_name = $1) order by article_name';
    db.any(query, req.params.office_name)
        .then(function (data) {
        var resultName = '{\n"list_of_equipment":';
        var jsonString = JSON.stringify(data, null, " ");
        var finalString = resultName.concat(jsonString + "\n}");
        //console.log(finalString);
        console.log("MOBILE HAS ACCESSED LIST OF OFFICES");

        res.status(200)
            .send(finalString);
        })
        .catch(function (err) {
            console.log("[M-OFFICE-EQUIP] " + err);
            return next(err);
        });
}

//inventory mode (spmo)
//disposal mode (spmo)
function m_updateEquipment(req, res, next) {
    db.task( function(t) {
        return t.one("select equipment_qr_code from assigned_to as temp1 inner join (select inventory_office from spmo_staff_assignment where spmo_assigned='"+rows[i]['spmo_officer']+"') as temp on temp1.office_id_holder = temp.inventory_office where equipment_qr_code = $1", req.body.qrCode)
            .then(function (qr) {
                return t.none("update working_equipment set status='Found' where qrcode=$1", qr.qrcode)
                    .then(function () {
                        return t.none("insert into mobile_trans(username, transaction, parameter, result, remarks) values(${username},'Update Equipment Status',${qrCode},'Updated','Success')", req.body);
                    })
                    .catch(function (err) {
                        console.log("[M-UPDATE-EQUIP] " + err);
                        res.send({feedback: 'not found'});
                       return t.none("insert into mobile_trans(username, transaction, parameter, result, remarks) values(${username},'Update Equipment Status',${qrCode},'Not Found','Failed');", req.body);
                    
                    });
            });
    })
    .then( function() {
        console.log("FOUND: " + req.body.qrCode);
        res.status(200)
            .send({feedback: 'updated'});
    })
    .catch( function(err) {
        console.log("[M-UPDATE-EQUIP] " + err);
        res.send({feedback: 'You have no appointment with this office'});
        return next(err);
    });
}


module.exports = {
    disposePropOffice: disposePropOffice,
    dashing1: dashing1,
    rend_searchEquip1: rend_searchEquip1,
    findEquipment1: findEquipment1,
    getEquipment1: getEquipment1,
    rend_equipDetails: rend_equipDetails,
    rend_equipDetails2: rend_equipDetails2,
    renderAddEquip: renderAddEquip,
    newEquipment: newEquipment,
    rend_searchEquip: rend_searchEquip,
    rend_searchEquipmentAssign: rend_searchEquipmentAssign,
    rend_searchEquipmentDisposal: rend_searchEquipmentDisposal,
    rend_transactionlog: rend_transactionlog,
    rend_equipmentHistory: rend_equipmentHistory,
    findBatchEdit: findBatchEdit,
    findEquipment: findEquipment,
    find_indiv_office_Equipment: find_indiv_office_Equipment,
    find_indiv_equipment: find_indiv_equipment,
    findAssignmentDetails: findAssignmentDetails,
    findEquipDisposal: findEquipDisposal,
    disposeProp: disposeProp,
    editEquipmentAssignment: editEquipmentAssignment,
    editBatchEquipment: editBatchEquipment,
    getOffices: getOffices,
    getDisposalList: getDisposalList,
    getDisposalItems: getDisposalItems,
    officeName: officeName,
    findOffice: findOffice,
    getEquipment: getEquipment,
    getItems: getItems,
    getAssignments: getAssignments,
    getItems1: getItems1,
    getDetails: getDetails,
    getDetails1: getDetails1,
    removeEquipment: removeEquipment,
    updateStatusEquip: updateStatusEquip,
    moveEquipment: moveEquipment,
    generateInventory: generateInventory,
    generateDisposal: generateDisposal,
    getScannedEquipment: getScannedEquipment,
    renderCalendar: renderCalendar,
    renderCalendar2: renderCalendar2,
    getEvents: getEvents,
    userOut: userOut,
    userIn: userIn,
    dashing: dashing,
    check_user: check_user,
    login: login,
    addSchedule: addSchedule,
    delete_event: delete_event,
    m_login: m_login,
    m_getAllOffices: m_getAllOffices,
    m_getOfficeEquipment: m_getOfficeEquipment,
    m_updateEquipment: m_updateEquipment,
    m_getWorkingEquipment: m_getWorkingEquipment,
    m_getInventoryAssign: m_getInventoryAssign,
    m_getListforCheckers: m_getListforCheckers,
    m_disposalListfromClerks: m_disposalListfromClerks,
    m_getDisposalListforCheckers: m_getDisposalListforCheckers,
    m_confirmedListfromChecker: m_confirmedListfromChecker,
    qrcode_gen: qrcode_gen,
    send_email: send_email
};