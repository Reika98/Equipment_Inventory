var express = require('express'),
	path = require('path'),
	bodyParser = require('body-parser'),
	cons = require('consolidate'),
	dust = require('dustjs-helpers'),
	pg = require('pg'),
	app = express();
	session = require ('express-session');

//DB Connect String
var conString = "postgres://postgres:1234@localhost:5432/upceis_db";

//Assign Dust Engine to .dust Files
app.engine('dust', cons.dust);

//Set Default Ext .dust
app.set('view engine', 'dust');
app.set('views', __dirname + '/views');

//Set Public Folder
app.use(session({secret: "ilovephilippines", resave: false, saveUninitialized:true}));
app.use(express.static(path.join(__dirname, 'public')));

//Body Parser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));

app.get('/', function(req,res){
	if(!(session['login']))
		res.render('login');
	else
		res.render('index', {user: session['user']});
});

app.get('/logout', function(req,res){
	console.log(session['user'] + "is logging out");
	session['login'] = false;
	session['user'] = undefined;

	res.redirect('/');
});

app.post('/login', function(req,res){
	pg.connect(conString,function (err, client, done) {
		if (err){
			return console.error('error fetching client from pool', err);
		}

		var username = req.body.username;
		var pass = req.body.password;

		client.query('SELECT  * from spmo WHERE username = $1 AND password = crypt ($2, password)',[username, pass], function (err, result) {
	    		if (err) {
	    			return console.error('error running query', err);
	    		}

	    		if(result.rows.length == 1){
	    			session['login'] = true;
					session['user'] = username;
					res.redirect('dashboard');
					done();
	    		}
	    		else{
	    			res.render('login', {error: 'Incorrect credentials!'})

	    		}
	   			
			});
	});
});

app.get('/dashboard', function(req, res){
	pg.connect(conString,function (err, client, done) {
		if (err){
			return console.error('error fetching client from pool', err);
		}

		console.log("user is: " + session['user']);
		if(!(session['login']))
			res.redirect('/');
		else{
			res.render('index', {user: session['user']});
		}


		// client.query('SELECT  * from office, staff, clerk WHERE clerk.username = $1 AND staff.staff_id = clerk.username AND office.office_id = staff.office_id AND office.password = crypt ($2, password)',[req.body.username, req.body.password], function (err, result) {
	    // 		if (err) {
	 	//  			return console.error('error running query', err);
	    //   		}
	    // 		res.render('index', {clerk: result.rows});
		// 		done();
		// 	});
	});
});


app.get('/addequipment', function(req,res){
	// res.render('index');
	
	pg.connect(conString,function (err, client, done) {
		if (err){
			return console.error('error fetching client from pool', err);
		}
		if(!(session['login']))
				res.redirect('/');
		
		// var x = "Something";
		// var y = "Something";
		else{
				client.query('SELECT * FROM office', function (err, result1) {
			    if (err) {
			    	return console.error('error running query', err);
			    };
			    
			    client.query('SELECT * FROM staff', function (err, result2) {
		    		if (err) {
		    			return console.error('error running query', err);
		    		}
		    		res.render('addequipment', {office: result1.rows, staff: result2.rows, user: session['user']});
					done();
				});
		    });
		}
	});
});

app.post('/confirmadd', function(req,res){
	//PG Connect
	pg.connect(conString,function (err, client, done) {
	  if (err){
	  	return console.error('error fetching client from pool', err);
	  }


		
			if (req.body.quantity>1){
					for (var i = 1; i<=req.body.quantity; i++){
						 	client.query("INSERT INTO equipment(qrcode, article_name, property_no, component_no, date_acquired, description, unit_cost, condition, type) VALUES ($1, $2, $3, $9, $4, $5, $6, $7, $8)",
						 	[req.body.property_no + i, 
						 	req.body.article_name, 
						 	req.body.property_no,  
						 	req.body.date_acquired, 
						 	req.body.description, 
						 	req.body.unit_cost,
						 	'Working', 
						 	req.body.type,
						 	i], function (err, result) {
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
				}
			}


		else{
					
			 	client.query("INSERT INTO equipment(qrcode, article_name, property_no, date_acquired, description, unit_cost, condition, type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
			 	[req.body.property_no, 
			 	req.body.article_name, 
			 	req.body.property_no,  
			 	req.body.date_acquired, 
			 	req.body.description, 
			 	req.body.unit_cost,
			 	'Working', 
			 	req.body.type], function (err, result) {
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
		}


	 done();
	 res.render('index', {user: session['user']});
	});
});

app.get('/searchforeditequipment', function(req,res){
	if(!(session['login']))
			res.redirect('/');
	else
		res.render('editEquipment', {user: session['user']});
});

app.get('/searchforequipment', function(req,res){
	if(!(session['login']))
			res.redirect('/');
	else
		res.render('searchEquipment' , {user: session['user']});
});

app.post('/searchEdit', function(req,res){
	//PG Connect
	pg.connect(conString,function (err, client, done) {
		if (err){
			return console.error('error fetching client from pool', err);
		}
		
		if(!(session['login']))
			res.redirect('/');

		if(req.body.comno == null || req.body.comno == ""){
			client.query("SELECT * from equipment_date_extracted_office_staff WHERE property_no = $1", [req.body.propno], function (err, result){
				if (err) {
					return console.error('error running query', err);
				}
				var temp = result.rows[0];
				if(result.rows.length <= 0){
					res.render('editEquipment', {error: "Equipment not found", prop: req.body.propno, user: session['user']});
					done();
				}else if(result.rows.length > 1 || temp['component_no'] != null){
					res.render('editEquipment', {error: "Input not specific. (Try putting the component number of the equipment)", prop: req.body.propno, user: session['user']});
					done();
				} else {
					if(result.rows[0]['day'].toString().length == 1)
						result.rows[0]['day'] = '0' + result.rows[0]['day'].toString();
					if(result.rows[0]['month'].toString().length == 1)
						result.rows[0]['month'] = '0' + result.rows[0]['month'].toString();
					client.query('SELECT * FROM office', function (err, result1) {
					    if (err) {
					    	return console.error('error running query', err);
					    };
					    client.query('SELECT * FROM staff', function (err, result2) {
				    		if (err) {
				    			return console.error('error running query', err);
				    		}
				    		res.render('editProper', {equipment: result.rows, office: result1.rows, staff: result2.rows, user: session['user']});
							done();
						});
				    });
				}
	 		});
		}

		else if(req.body.comno != null && req.body.comno != ""){
			client.query("SELECT * from equipment_date_extracted_office_staff WHERE property_no = $1 and component_no = $2", [req.body.propno, req.body.comno], function (err, result){
				if (err) {
					return console.error('error running query', err);
				}
				if(result.rows.length <= 0){
					res.render('editEquipment', {error: "Equipment not found", prop: req.body.propno, comno: req.body.comno, user: session['user']});
					done();
				} else {
					if(result.rows[0]['day'].toString().length == 1)
						result.rows[0]['day'] = '0' + result.rows[0]['day'].toString();
					if(result.rows[0]['month'].toString().length == 1)
						result.rows[0]['month'] = '0' + result.rows[0]['month'].toString();
					client.query('SELECT * FROM office', function (err, result1) {
					    if (err) {
					    	return console.error('error running query', err);
					    };
					    client.query('SELECT * FROM staff', function (err, result2) {
				    		if (err) {
				    			return console.error('error running query', err);
				    		}
				    		res.render('editProper', {equipment: result.rows, office: result1.rows, staff: result2.rows, user: session['user']});
							done();
						});
				    });
				}
		 	});
		}
	});
});

app.post('/searchEquipment', function(req,res){
	//PG Connect
	pg.connect(conString,function (err, client, done) {
		if (err){
			return console.error('error fetching client from pool', err);
		}
		
		if(!(session['login']))
			res.redirect('/');
		else{
		if(req.body.comno == null || req.body.comno == ""){
			client.query("SELECT * from equipment_date_extracted_office_staff WHERE property_no = $1", [req.body.propno], function (err, result){
				if (err) {
					return console.error('error running query', err);
				}
				var temp = result.rows[0];
				if(result.rows.length <= 0){
					res.render('searchEquipment', {error: "Equipment not found", prop: req.body.propno, user: session['user']});
					done();
				}else if(result.rows.length > 1 || temp['component_no'] != null){
					res.render('searchEquipment', {error: "Input not specific. (Try putting the component number of the equipment)", prop: req.body.propno, user: session['user']});
					done();
				} else {
					if(result.rows[0]['day'].toString().length == 1)
						result.rows[0]['day'] = '0' + result.rows[0]['day'].toString();
					if(result.rows[0]['month'].toString().length == 1)
						result.rows[0]['month'] = '0' + result.rows[0]['month'].toString();
		    		res.render('viewdetails', {equipment: result.rows, user: session['user']});
					done();
				}
	 		});
		}

		else if(req.body.comno != null && req.body.comno != ""){
			client.query("SELECT * from equipment_date_extracted_office_staff WHERE property_no = $1 and component_no = $2", [req.body.propno, req.body.comno], function (err, result){
				if (err) {
					return console.error('error running query', err);
				}
				if(result.rows.length <= 0){
					res.render('searchEquipment', {error: "Equipment not found", prop: req.body.propno, comno: req.body.comno, user: session['user']});
					done();
				} else {
					if(result.rows[0]['day'].toString().length == 1)
						result.rows[0]['day'] = '0' + result.rows[0]['day'].toString();
					if(result.rows[0]['month'].toString().length == 1)
						result.rows[0]['month'] = '0' + result.rows[0]['month'].toString();
		    		res.render('viewdetails', {equipment: result.rows, user: session['user']});
					done();
				}
		 	});
		}
	}
	});
});

app.post('/edit', function(req,res){
	//PG Connect
	pg.connect(conString,function (err, client, done) {
		if (err){
			return console.error('error fetching client from pool', err);
		}

		if(!(session['login']))
			res.redirect('/');
		else{
		if(req.body.comno == null || req.body.comno == ""){
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
			client.query("UPDATE assigned_to set (office_id_holder, staff_id) = ($1, $2) WHERE equipment_qr_code = md5($3)", 
				[req.body.office_name,
				req.body.staffs,
				req.body.propno], function (err, result){
				if (err) {
					return console.error('error running query', err);
				}
			});
		}
		else if(req.body.comno != null && req.body.comno != ""){
			client.query("UPDATE equipment set (article_name, date_acquired, description, unit_cost, type) = ($1, $2, $3, $4, $5) WHERE property_no = $6 AND component_no = $7", 
				[req.body.artname,
				req.body.date,
				req.body.description,
				req.body.cost,
				req.body.type,
				req.body.propno,
				req.body.comno], function (err, result){
				if (err) {
					return console.error('error running query', err);
				}
			});
			client.query("UPDATE assigned_to set (office_id_holder, staff_id) = ($1, $2) WHERE equipment_qr_code = md5($3 || $4)", 
				[req.body.office_name,
				req.body.staffs,
				req.body.propno,
				req.body.comno], function (err, result){
				if (err) {
					return console.error('error running query', err);
				}
			});
		}
		done();
		res.render('index', {user: session['user']});
	}
	});
});

app.get('/viewoffices', function(req,res){
	// res.render('index');
	pg.connect(conString,function (err, client, done) {
		if (err){
			return res.send()
		}

		if(!(session['login']))
			res.redirect('/');
		else{
		client.query('SELECT * FROM office order by office_name', function (err, result1) {
		    if (err) {
		    	return console.error('error running query', err);
		    };
	    	res.render('viewoffices', {office: result1.rows, user: session['user']});
			done();
	    });
	}
	});
});

app.get('/searchoffice', function(req,res){
	pg.connect(conString,function (err, client, done) {
		if (err){
			return console.error('error fetching client from pool', err);
		}
		client.query('SELECT office_name FROM office', function (err, result1) {
		    if (err) {
		    	return console.error('error running query', err);
		    };
	    	res.render('searchOffice', {office: result1.rows, user: session['user']});
			done();
	    });
	});
});

app.post('/searchoffices', function(req,res){
	// res.render('index');
	pg.connect(conString,function (err, client, done) {
		if (err){
			return console.error('error fetching client from pool', err);
		}
		if (req.body.office_id == null || req.body.office_id == "" || req.body.office_id == " " || !req.body.office_id) {
			client.query('SELECT * FROM office where office_name = $1', [req.body.office_name], function (err, result1) {
			    if (err) {
			    	return console.error('error running query', err);
			    };
			    if(result1.rows.length == 0){
			    	res.render('searchOffice', {error: "Office not found.", office_name: req.body.office_name, user: session['user']});
					done();
			    }
			    else{
			    	res.render('viewoffices', {office: result1.rows, user: session['user']});
					done();
				}
		    });
		} else {
			client.query('SELECT * FROM office where office_id = $1', [req.body.office_id], function (err, result1) {
			    if (err) {
			    	return console.error('error running query', err);
			    };
			    if(result1.rows.length == 0){
			    	res.render('searchOffice', {error: "Office not found.", office_id: req.body.office_id, user: session['user']});
					done();
			    }
			    else {
			    	res.render('viewoffices', {office: result1.rows, user: session['user']});
					done();
				}
		    });
		}
	});
});

app.post('/viewequipment', function(req,res){
	// res.render('index');
	pg.connect(conString,function (err, client, done) {
	  if (err){
	  	return console.error('error fetching client from pool', err);
	  }
	 
	 if(!(session['login']))
			res.redirect('/');
	else{
	  client.query('SELECT DISTINCT (article_name), property_no from equipment, assigned_to, office WHERE equipment.qrcode = assigned_to.equipment_qr_code AND assigned_to.office_id_holder = office.office_id AND office.office_name =$1 ORDER BY equipment.article_name', [req.body.office_name,], function (err, result) {
	    if (err) {
	    	return console.error('error running query', err);
	    }
	    client.query('SELECT office_name from office WHERE office_name =$1', [req.body.office_name,], function (err, result2) {
		    if (err) {
		    	return console.error('error running query', err);
		    }    
			    res.render('viewequipment', {equipment: result.rows, office: result2.rows, user: session['user']});
			    done();
			});
		});	
	}
	});
});


app.post('/viewitems', function(req,res){
	// res.render('index');
	console.log("Entering " + req.body.office_name);
	pg.connect(conString,function (err, client, done) {
	  if (err){
	  	return console.error('error fetching client from pool', err);
	  }
	 
	 if(!(session['login']))
			res.redirect('/');
	else{
	  client.query('SELECT * from equipment, assigned_to, office WHERE equipment.qrcode = assigned_to.equipment_qr_code AND assigned_to.office_id_holder = office.office_id AND office.office_name =$1 AND equipment.article_name = $2', [req.body.office_name, req.body.holder], function (err, result) {
	    if (err) {
	    	return console.error('error running query', err);
	    }
	    client.query('SELECT office_name from office WHERE office_name =$1', [req.body.office_name,], function (err, result2) {
		    if (err) {
		    	return console.error('error running query', err);
		    }
		    client.query('SELECT DISTINCT(count), equipment.article_name from count, equipment, office, assigned_to where equipment.qrcode = assigned_to.equipment_qr_code AND assigned_to.office_id_holder = office.office_id AND office.office_name = $1 AND count.office_name = $1 AND count.article_name = equipment.article_name AND equipment.article_name = $2 ORDER BY equipment.article_name;', [req.body.office_name, req.body.article_name], function (err, result3) {
		    if (err) {
		    	return console.error('error running query', err);
		    }		    
		    res.render('viewitems', {equipment: result.rows, office: result2.rows, count:result3.rows, user: session['user']});
		    done();
			});
		});
		});
	}
	});
});

app.post('/viewdetails', function(req,res){
	// res.render('index');
	pg.connect(conString,function (err, client, done) {
	  if (err){
	  	return console.error('error fetching client from pool', err);
	  }

	  if(!(session['login']))
			res.redirect('/');
		else{
	  client.query('SELECT * from equipment_date_extracted_office_staff where qrcode = $1', [req.body.qrcode], function (err, result) {
	    if (err) {
	    	return console.error('error running query', err);
	    }
	    res.render('viewdetails', {equipment: result.rows, user: session['user']});
	    done();
	  });
	}
	});
});

app.delete('/delete/:property_no', function(req, res){
	//PG Connect
	pg.connect(conString,function (err, client, done) {
	  	if (err){
	  		return console.error('error fetching client from pool', err);
	  	}
	  	

		if(req.body.component_no == null || req.body.component_no == ""){
			client.query("DELETE FROM equipment WHERE property_no = $1",
	 		[req.params.property_no]);
	 		done();
	 		res.send(200);
		}
		else if(req.body.component_no != null && req.body.component_no != ""){
			client.query("DELETE FROM equipment WHERE property_no = $1 and component_no = $2",
	 		[req.params.property_no, req.params.component_no]);
	 		done();
	 		res.send(200);
		}
	 	
	});
})

app.post('/editStatus', function(req, res){
	//PG Connect
	pg.connect(conString,function (err, client, done) {
	  if (err){
	  	return console.error('error fetching client from pool', err);
	  }
	  
	  if(!(session['login']))
			res.redirect('/');
		else{
	 client.query("UPDATE working_equipment SET status=$1 WHERE qrcode = md5($2 || $3)",
	 	[req.body.status, req.body.property_no, req.body.component_no]);
	 done();
	 res.render('index', {user: session['user']});
	}
	});
})

app.post('/move', function(req, res){
	//PG Connect
	pg.connect(conString,function (err, client, done) {
	  	if (err){
	  		return console.error('error fetching client from pool', err);
	  	}

	 	client.query("UPDATE equipment SET condition=$1 WHERE property_no = $2", ['Disposed', req.body.property_no]);
	 	client.query("DELETE from working_equipment WHERE qrcode = md5($1 || $2)", [req.body.property_no, req.body.component_no]);

	 	if(req.body.way_of_disposal == "Sale")
	 		client.query("INSERT INTO disposed_equipment VALUES (md5($1 || $2), $3, $4, $5, $6)", [req.body.property_no, req.body.component_no, req.body.appraised_value, req.body.way_of_disposal, req.body.or_no, req.body.amount]);
	 	else
	 		client.query("INSERT INTO disposed_equipment VALUES (md5($1 || $2), $3, $4)", [req.body.property_no, req.body.component_no, req.body.appraised_value, req.body.way_of_disposal]);

	 	done();

	});
	res.render('index', {user: session['user']});
})

app.get('/generate-inventory-report/:office_id', function (req,res){

	res.setHeader('Content-Type', 'application/json');	
	var client = new pg.Client(conString);
	client.connect();
	var query = client.query("Select article_name, description, date_acquired, property_no, component_no, unit_cost from equipment, assigned_to where assigned_to.office_id_holder = '"+ req.params.office_id +"' and assigned_to.equipment_qr_code = equipment.qrcode");
	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
	//	var resultName = '{\n"inventory_report":';
		var jsonString = JSON.stringify(result.rows, null, " ");
	//	var finalString = resultName.concat(jsonString + "\n}");
		console.log(jsonString);
		console.log("WEB HAS ACCESSED INVENTORY OF " + req.params.office_id);
		res.send(jsonString);
		client.end();
	});
});

app.get('/events', function(req,res){
	// res.render('index');
	var query = "select id, title, start + interval '1' day as start," + '"end"' +" + interval '1' day as " + '"end" from schedule';
	pg.connect(conString,function (err, client, done) {
	  if (err){
	  	return console.error('error fetching client from pool', err);
	  }
	  if(!(session['login']))
			res.redirect('/');
	  else{
		  client.query(query, function (err, result) {
		    if (err) {
		    	return console.error('error running query', err);
		    }
			console.log(result.start_date);
		    res.send( result.rows);
		    done();
		  });
	  }
	});
});

app.get('/calendar', function(req,res){
	// res.render('index');

	pg.connect(conString,function (err, client, done) {
	  	if (err){
	  		return console.error('error fetching client from pool', err);
	  	}
	  	if(!(session['login']))
			res.redirect('/');
		else{
	  		client.query("select * from sched_simple where start >= CURRENT_DATE", function (err, result) {
		    if (err) {
		    	return console.error('error running query', err);
		    }
		    res.render('calendar', {sched: result.rows, user: session['user']});
		    done();
		});
	  }
	});
});

app.post('/setSchedule', function(req, res){
	pg.connect(conString,function (err, client, done) {
		  if (err){
		  	return console.error('error fetching client from pool', err);
		  }
		  if(!(session['login']))
			res.redirect('/');
		  else{
		  	client.query('insert into schedule(start,title,"end") values ($1,$2,$3)', [req.body.date1, req.body.title, req.body.date2]);
		    done();
	   		res.redirect('calendar');
	   	}
	});
});

//Server
app.listen(3000, function(){
	console.log('Door 3000 is now open master!');
});
