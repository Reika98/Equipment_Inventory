var express = require('express'),
    app = express(),
    session = require ('express-session');
var path = require('path');
var formidable = require('formidable');
var fs = require('fs');

var router = express.Router();

var db = require('./queries');

router.use(session({secret: "ilovephilippines", resave: false, saveUninitialized:true}));
// var web = require('./webpages');

//web routes
router.get('/addequipment', db.check_user, db.renderAddEquip);
router.post('/confirmadd', db.check_user, db.newEquipment);
router.get('/searchforequipmentassignment', db.check_user, db.rend_searchEquipmentAssign);		//
router.get('/searchfordisposal', db.check_user, db.rend_searchEquipmentDisposal);				//88
router.post('/searchBatchEdit', db.check_user, db.findBatchEdit);
router.post('/searchDisposal', db.check_user, db.findEquipDisposal);							//88
router.post('/searchEditAssignment', db.check_user, db.findAssignmentDetails);					//
router.get('/searchforequipment', db.check_user, db.rend_searchEquip);
router.get('/searchforequipment2', db.check_user, db.rend_searchEquip1);						////
router.post('/searchEquipment', db.check_user, db.findEquipment);
router.post('/searchEquipment2', db.check_user, db.findEquipment1);								////
router.post('/searchIndivEquipment', db.check_user, db.find_indiv_equipment);
router.post('/viewIndEquipment', db.check_user, db.find_indiv_office_Equipment);
router.post('/disposeBatch', db.check_user, db.disposeProp);									//88
router.post('/batchDisposeEquipment', db.check_user, db.disposePropOffice);						//88
router.post('/editBatch', db.check_user, db.editBatchEquipment);
router.post('/editAssignment', db.check_user, db.editEquipmentAssignment);						//
router.get('/viewoffices', db.check_user, db.getOffices);
router.get('/viewdisposal', db.check_user, db.getDisposalList); // new addition 
router.post('/viewDispItems', db.check_user, db.getDisposalItems); 
router.post('/deleteEvent', db.check_user, db.delete_event);
router.get('/searchoffice', db.check_user, db.officeName);
router.post('/searchoffices', db.check_user, db.findOffice);
router.post('/viewequipment', db.check_user, db.getEquipment);
router.get('/viewequipment2', db.check_user, db.getEquipment1);									////
router.post('/viewitems', db.check_user, db.getItems);
router.post('/viewitems2', db.check_user, db.getItems1);										////
router.post('/viewdetails', db.check_user, db.getDetails);
router.post('/viewdetails2', db.check_user, db.getDetails1);
router.delete('/delete/:property_no', db.check_user, db.removeEquipment);
router.post('/editStatus', db.check_user, db.updateStatusEquip);
router.post('/move', db.check_user, db.moveEquipment);
router.get('/', db.login);
router.get('/2', db.login);																		////
router.get('/logout', db.check_user, db.userOut);
router.post('/login', db.userIn);
router.get('/dashboard', db.check_user, db.dashing);
router.get('/dashboard1', db.check_user, db.dashing1);
router.get('/equipment-details', db.check_user, db.rend_equipDetails);
router.get('/equipment-details2', db.check_user, db.rend_equipDetails2);
router.get('/transactionlog', db.check_user, db.rend_transactionlog);
router.post('/equipmentHistory', db.check_user, db.rend_equipmentHistory);

router.post('/upload', function(req, res){
  console.log("Upload Entry");
  // create an incoming form object
  var form = new formidable.IncomingForm();

  // specify that we want to allow the user to upload multiple files in a single request
  form.multiples = true;

  // store all uploads in the /uploads directory
  form.uploadDir = path.join(__dirname, '/public/equipment_images');

  // every time a file has been uploaded successfully,
  // rename it to it's orignal name
  form.on('file', function(field, file) {
    fs.rename(file.path, path.join(form.uploadDir, file.name));
  });
  // log any errors that occur
  form.on('error', function(err) {
    console.log('An error has occured: \n' + err);
  });
  // once all the files have been uploaded, send a response to the client
  form.on('end', function() {
    res.end('success');
  });
  // parse the incoming request containing the form data
  form.parse(req);
});

router.get('/generate-inventory-report/:office_id', db.check_user, db.generateInventory);
router.get('/generate-disposal-report/:office_id', db.check_user, db.generateDisposal);
router.get('/calendar', db.check_user, db.renderCalendar);
router.get('/calendar2', db.check_user, db.renderCalendar2); ////
router.get('/events', db.check_user, db.getEvents);
router.post('/setSchedule', db.check_user, db.addSchedule);
router.post('/qrcode', db.check_user, db.qrcode_gen);
//mobile routes
router.post('/scan-equipment', db.getScannedEquipment);
router.get('/m/offices', db.m_getAllOffices);
router.get('/m/offices/:office_name', db.m_getOfficeEquipment);
router.post('/m/update-equipment', db.m_updateEquipment);
router.get('/m/getchecklist/:office_name', db.m_getWorkingEquipment);
router.post('/m/login', db.m_login);
router.get('/m/office-assignments', db.m_getInventoryAssign);
router.get('/m/checker-default-list/:username', db.m_getListforCheckers);
router.post('/m/send-disposal-list', db.m_disposalListfromClerks);
router.get('/m/disposal-list/:username', db.m_getDisposalListforCheckers);

//error-handling
router.get('*', function(err, req, res, next) {
  console.log("get ***");
  res.render('pagenotfound');
});

router.use(function(err, req, res, next) {
  console.log("OOPS! " + err.message);
  res.render('pagenotfound');
});

module.exports = router;
