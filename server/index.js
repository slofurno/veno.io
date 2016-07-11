var server = require('http').createServer()
  , url = require('url')
  , WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({ server: server })
  , express = require('express')
  , app = express()
  , port = 4080;

const colors = require('./colors')
//well, what is this ordering??? hello???
//MAIN.JS
var _connections = {}
var _players = {};
var _computers = {};
var nextid = 0;
var nextfood = 0;
var _food = {};
let _foodCount = 0;


var dead = [];
let diff = [];
const WIDTH = 4000;

const _foodBuffer = Buffer.alloc((WIDTH*WIDTH+7)/8);
_foodBuffer.fill(0)
var width = 800;
var height = 600;
var n = 0;

setInterval(() => {
  diff = [];
  let start = Date.now();
  Object.keys(_computers).forEach(k => _computers[k].think())
  addDeadSnake();
  moveSnakes();
  checkCollisions();
  sendState();
  let dt = Date.now() - start;
  if ((n = n+1&63) === 0)
    console.log(dt + "ms");
}, 25)

setInterval(() => {
  addFood();
}, 1000)



function addFood() {
  const len = _foodCount
  if (len <= 50000) {
    var toAdd = 50000 - len;
    for(var i = 0; i < toAdd; i++) {
      _foodCount++;
      var id = nextfood++;
      var foodX = Math.floor(Math.random() * (WIDTH - (WIDTH * .2)));
      var foodY = Math.floor(Math.random() * (WIDTH - (WIDTH * .2)));
      const pos = [foodX, foodY]

      var fi = foodY * WIDTH + foodX
      var offset = fi/8|0
      var bit = fi & 7
      _foodBuffer[offset]=_foodBuffer[offset]|1<<bit

      diff.push({
        index: fi,
        alive: false,
      })
      /*
      _food[id] = pos
      diff.push({
        id,
        pos,
      })
      */
    }
  }
}

function addDeadSnake() {
  if (dead.length > 0) {
     dead.forEach(player => {
       player.pos.forEach(pos => {
         var fi = pos[1] * WIDTH + pos[0]
         var offset = fi/8|0
         var bit = fi&7
         _foodCount++;
         _foodBuffer[offset] ^= 1<<bit
         //_food[id] = deadPos
         diff.push({
           index: fi,
           alive: true,
         })
       })
       delete _players[player.id];
     })
  }

  dead = [];
}

function moveSnakes() {
  Object.keys(_players).map(key => _players[key]).forEach(player => {
    var head = player.pos[0]
    var x = head[0];
    var y = head[1];
    // If we are going up or down, we are only changing direction in the Y Plane, else we change direction in the X Plane.
    if (player.dir == 0)
    {
      y -= 3;
    }
    else if (player.dir == 2) {
      y += 3;
    }
    else if (player.dir == 1) {
      x -= 3;
    }
    else if (player.dir == 3) {
      x += 3;
    }

    if (x >= 0 && x < WIDTH && y >= 0 && y < WIDTH) {
      player.pos.unshift([x, y])
      if (player.pos.length > player.mass) {
        player.pos.pop();
      }
    }

    // Need to communicate to client that their snake has moved and grown/shrunk
  });
}

const bbs = {}

function checkCollisions() {
  const players = Object.keys(_players).map(k => _players[k])

  players.forEach(({pos}) => {
    let xs = pos.map(([x,y]) => x)
    let ys = pos.map(([x,y]) => y)
  })

  next: for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const head = player.pos[0];
    for (let j = 0; j < players.length; j++) {
    let k = i == j ? 8 : 0

      const other = players[j]
      const tail = other.pos
   for (;k < tail.length; k++) {
        const r = player.radius + other.radius;
        if (checkCollision(head, tail[k], 2)) {
          dead.push(player)
          continue next;
        }
      }
    }



    for(let j = -2; j <= 2; j++) {
      for(let i = -2; i <= 2; i++) {
        var fi = (head[1] + j) * WIDTH + head[0] + i

        var offset = fi/8|0
        var bit = fi&7

        if (_foodBuffer[offset] & 1<<bit) {
          player.mass++
          _foodCount--;
          _foodBuffer[offset] ^= 1<<bit

          diff.push({
            index: fi,
            alive: false,
          })
        }
      }
    }







    /*
  Object.keys(_food).forEach(id => {
      const r = player.radius + 2
      if (checkCollision(head, _food[id], r)) {
        player.mass++
        delete _food[id]
        diff.push({
          id,
          pos: false,
        })
      }
    })
    */
  }
}

function sendState() {
  var json = JSON.stringify({
    players: _players,
    diff,
  });

  Object.keys(_connections)
    .map(k => _connections[k])
    .forEach(x => x.send(json))
}

function checkCollision([x1, y1], [x2, y2], r) {
  if ((x1 - x2 > r) || (x1 - x2 < -r) || (y1 - y2 > r) || (y1 - y2 < -r)) {
    return false
  }
  return true
}

function squaredDistance([x1, y1], [x2, y2]) {

  var dy = y2-y1
  var dx = x2-x1

  return dy*dy + dx*dx;
}

function randomInt(n) {
  return Math.random() * n | 0

}

function makeFakePlayer() {
  var myid = ++nextid;
  var player = {
    id: myid,
    pos: [[randomInt(WIDTH),randomInt(WIDTH)], [randomInt(WIDTH), randomInt(WIDTH)]],
    len: 2,
    dir: 1,
    radius: 3,
    mass: 1,
    color: colors[Math.floor(Math.random() * colors.length)]
  }

  player.think = () => {
    if (Math.random() > 0.98) {
      player.dir = (player.dir + 1) % 4
    }
  }

  _players[myid] = player
  _computers[myid] = player
}

for(var i = 0; i < 200; i++) {
  makeFakePlayer();
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
    color: colors[Math.floor(Math.random() * colors.length)]
  }

  const connection = {
    send(msg) {
      ws.send(msg, err => err && cleanup())
    }
  }

  const food = []

  for(var fi = 0; fi < WIDTH*WIDTH; fi++) {

    var offset = fi/8|0
    var bit = fi&7

    if (_foodBuffer[offset] & 1<<bit) {
      food.push(fi)
    }
  }


  _players[myid] = player;
  _connections[myid] = connection
  connection.send(JSON.stringify({
    id: myid,
    state: _players,
    food,
  }))

  //when we connect... we make a function + bind it as the handler for that websocket
  ws.on('message', function incoming(message) {
    var dir = parseInt(message);

    //We don't want the user to be able to do Left -> Right -> Left or they would go backwards onto themselves.
    if (player.dir % 2 == dir % 2) {
      return;
    }

    player.dir = dir;
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
