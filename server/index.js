var server = require('http').createServer()
  , url = require('url')
  , WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({ server: server })
  , express = require('express')
  , app = express()
  , port = 4080;

var utils = require('./utils')

//MAIN.JS
var connections = {}
var players = {};
var nextid = 0;
var food = {};
var dead = [];

var width = 800;
var height = 600;

setInterval(() => {
  moveSnakes();
  checkCollisions();
  sendState();
}, 25)

setInterval(() => {
  addFood();
}, 1000)

function addFood() {
  if (food.length <= 90) {
    var toAdd = 100 - food.length;
    for(var i = 0; i < toAdd; i++) {
      var foodWPX = Math.floor(Math.random() * (width - (width * .2)));
      var foodHPX = Math.floor(Math.random() * (height - (height * .2)));

      food.add([foodWPX, foodHPX]);
    }

    //TODO: After done adding all food to the field, need to inform the client where the new food has been added.
  }
  else {
    return;
  }
}

function moveSnakes() {
  Object.keys(players).map(key => players[key]).forEach(player => {
    var x = 0;
    var y = 0;

    // If we are going up or down, we are only changing direction in the Y Plane, else we change direction in the X Plane.
    if (player.dir == 0)
    {
      y = 1;
    }
    else if (player.dir == 2) {
      y = -1;
    }
    else if (player.dir == 1) {
      x = -1;
    }
    else if (player.dir == 3) {
      x = 1;
    }

    var head = player.pos[0]
    player.pos.unshift([head[0] + x, head[1] + y])
    player.pos.pop();

    // Need to communicate to client that their snake has moved and grown/shrunk
  });
}

function checkCollisions() {
  var p = Object.keys(players).map(k => players[k])
  for (var i = 0; i < p.length; i++) {
    var first = p[i];
    var head = first.pos[0];
    for (var j = 0; j < p.length; j++) {
      if (i == j) continue

      var other = p[j]
      var tail = other.pos
      for (var k = 0; k < tail.length; k++) {
        var r = first.radius + other.radius;
        if (squaredDistance(head, tail[k]) < r*r) {
          dead.push(first)
          continue;
        }
      }
    }
  }
}

function sendState() {
  var json = JSON.stringify(players);
  Object.keys(connections).map(k => connections[k]).forEach(x => {
    x.send(json);
  })

}

function squaredDistance([x1, y1], [x2, y2]) {
  var dy = y2-y1
  var dx = x2-x1

  return dy*dy + dx*dx;
}

//PER CONNECTION
wss.on('connection', function connection(ws) {

  var myid = nextid++;

  //we have the player in scope when we get a message
  var player = {
    id: myid,
    pos: [[400,400], [300, 300]],
    len: 2,
    dir: 1,
    radius: 3,
  }

  function cleanup() {
    delete players[myid];
    delete connections[myid];
  }

  players[myid] = player;
  connections[myid] = {
    send(msg) {
      ws.send(msg, err => {
        if (err) {
          cleanup()
        }
      })
    }
  }

  var location = url.parse(ws.upgradeReq.url, true);
  // you might use location.query.access_token to authenticate or share sessions
  // or ws.upgradeReq.headers.cookie (see http://stackoverflow.com/a/16395220/151312)


  //when we connect... we make a function + bind it as the handler for that websocket
  ws.on('message', function incoming(message) {
    var dir = parseInt(message);

    //TODO: Convert this to some nice structure to not utilize magic numbers.
    if (dir > 3 || dir < 0) {
      // PLEASE STOP CHEATING.
    }

    player.direction = dir;

    Object.keys(players).map(k => players[k]).filter(x => x !== player).forEach(x => x.ws.send());
  });

  ws.on('close', function () {
    cleanup();
    //var i = connections.indexOf(ws);
    //connections = connections.slice(0, i).concatconnections.slice()i+1
  });

  //ws.send('something');
});


app.use(express.static('./public'));
server.on('request', app);
server.listen(port, function () { console.log('Listening on ' + server.address().port) });
