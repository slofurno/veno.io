var server = require('http').createServer()
  , url = require('url')
  , WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({ server: server })
  , express = require('express')
  , app = express()
  , port = 4080;

//well, what is this ordering??? hello???
//MAIN.JS
var _connections = {}
var _players = {};
var nextid = 0;
var nextfood = 0;
var _food = {};
var dead = [];

var width = 800;
var height = 600;
var n = 0;


setInterval(() => {
  let start = Date.now();
  const diff = []
  addFood(diff);
  moveSnakes();
  checkCollisions(diff);
  sendState(diff);
  let dt = Date.now() - start;
  if ((n = n+1&63) === 0)
    console.log(dt + "ms");
}, 25)

setInterval(() => {
  addFood();
}, 1000)

function addFood(diff) {
  const len = Object.keys(_food).length
  if (len <= 90) {
    var toAdd = 100 - len;
    for(var i = 0; i < toAdd; i++) {
      var id = nextfood++;
      var foodWPX = Math.floor(Math.random() * (width - (width * .2)));
      var foodHPX = Math.floor(Math.random() * (height - (height * .2)));
      const pos = [foodWPX, foodHPX]
      _food[id] = pos
      diff.push({
        id,
        pos,
      })
    }

    //TODO: After done adding all food to the field, need to inform the client where the new food has been added.
  }
  else {
    return;
  }
}

function moveSnakes() {
  Object.keys(_players).map(key => _players[key]).forEach(player => {
    var x = 0;
    var y = 0;

    // If we are going up or down, we are only changing direction in the Y Plane, else we change direction in the X Plane.
    if (player.dir == 0)
    {
      y = -1;
    }
    else if (player.dir == 2) {
      y = 1;
    }
    else if (player.dir == 1) {
      x = -1;
    }
    else if (player.dir == 3) {
      x = 1;
    }
    var head = player.pos[0]
    player.pos.unshift([head[0] + x, head[1] + y])
    //player.pos.pop();

    // Need to communicate to client that their snake has moved and grown/shrunk
  });
}

function checkCollisions(diff) {
  const players = Object.keys(_players).map(k => _players[k])

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const head = player.pos[0];
    for (let j = 0; j < players.length; j++) {
      if (i == j)
        continue

      const other = players[j]
      const tail = other.pos
      for (let k = 0; k < tail.length; k++) {
        const r = player.radius + other.radius;
        if (squaredDistance(head, tail[k]) < r*r) {
          dead.push(player)
          continue;
        }
      }
    }

    Object.keys(_food).forEach(id => {
      const r = player.radius + 2
      if (squaredDistance(head, _food[id]) < r*r) {
        player.mass++
        delete _food[id]
        diff.push({
          id,
          pos: false,
        })
      }
    })
  }
}

function sendState(diff) {
  var json = JSON.stringify({
    players: _players,
    diff,
  });

  Object.keys(_connections)
    .map(k => _connections[k])
    .forEach(x => x.send(json))
}

function squaredDistance([x1, y1], [x2, y2]) {
  var dy = y2-y1
  var dx = x2-x1

  return dy*dy + dx*dx;
}

//PER CONNECTION
wss.on('connection', function connection(ws) {
  var myid = ++nextid;

  function cleanup() {
    delete _players[myid];
    delete _connections[myid];
  }

  var player = {
    id: myid,
    pos: [[400,400], [300, 300]],
    len: 2,
    dir: 1,
    radius: 3,
    mass: 1,
  }

  var connection = {
    send(msg) {
      ws.send(msg, err => err && cleanup())
    }
  }

  _players[myid] = player;
  _connections[myid] = connection
  connection.send(JSON.stringify({
    id: myid,
    state: _players,
    food: _food,
  }))

  //when we connect... we make a function + bind it as the handler for that websocket
  ws.on('message', function incoming(message) {
    var dir = parseInt(message);
    //TODO: Convert this to some nice structure to not utilize magic numbers.
    if (dir > 3 || dir < 0) {
      // PLEASE STOP CHEATING.
    }

    player.dir = dir;

    //Object.keys(players).map(k => players[k]).filter(x => x !== player).forEach(x => x.ws.send());
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
