/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path');

var app = express()
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);

// all environments
app.set('port', 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon(__dirname + '/public/images/favicon.ico'));
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// routing
app.get('/', routes.index); 
app.get('/streams', routes.streams);

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

io.sockets.on('connection', function(client) {
  console.log('-- ' + client.id + ' connected --');
   	
  // pass a message
  client.on('message', function (details) {
    var otherClient = io.sockets.sockets[routes.getNextNode(details.to)];

    if (!otherClient) {
      return;
    }
      details.from = client.id;
      otherClient.emit('message', details);
  });
  
  client.on('complete', function(seed) {
    routes.addNode(client.id, seed);
  });

  client.on('join', function(name) {
    
    console.log('-- ' + client.id + ' joined ' + name + ' --');
    if (name === 'sRoom') {
      routes.addPeer(client.id);
    }
    client.join(name);
  });
    
  client.on('readyToStream', function() {
    console.log('-- ' + client.id + ' is ready to stream --');
    client.emit('readyToJoin');
  });

  function leave() {
    console.log('-- ' + client.id + ' leaved --');
    routes.removePeer(client.id);
  }

  client.on('disconnect', leave);
  client.on('leave', leave);
});
