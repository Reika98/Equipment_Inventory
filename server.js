var app = require('./app');
var debug = require('debug')('node-postgres-promises:server');
var http = require('http');

var port = process.env.PORT || '3000';
app.set('port', port);

var server = http.createServer(app);

server.listen(port);
server.on('listening',function(){
    console.log("Server open at " + port);
});