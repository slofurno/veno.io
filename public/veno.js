const HWIDTH = 400
const HHEIGHT = 300
const WIDTH = 4000;
const PI = Math.PI
var ws = new WebSocket("ws://" + location.host + "/ws")
ws.onmessage = onmsg;
var screen = document.getElementById("screen")
var ctx = screen.getContext("2d")
ctx.fillStyle="gainsboro"
ctx.fillRect(0, 0, 800, 600)
const mouse = {x:400, y:300}
screen.onmousemove = e => {
  mouse.x = e.layerX
  mouse.y = e.layerY
}

document.onkeydown = keydown;
let heading = 0

function keydown(e) {
  let key = e.key;
  e.preventDefault();

  switch(key) {
    case 'ArrowUp':
      ws.send(0);
      break;
    case 'ArrowLeft':
      ws.send(1);
      break;
    case 'ArrowDown':
      ws.send(2);
      break;
    case 'ArrowRight':
      ws.send(3);
      break;

  }
}

var prevstate = {}
var nextstate = {}
var _food = {}
let myid;

function onmsg({data}) {
  if (myid) {
    const { players, diff } = JSON.parse(data)
    nextstate = players

    diff.forEach(({index, alive}) => {
      if (alive) {
        _food[index] = [index%WIDTH, index/WIDTH|0]
      } else {
        delete _food[index]
      }
    })

  } else {
    const { id, state, food } = JSON.parse(data)
    console.log(state)
    console.log(food)
    _food = {}

    food.forEach(i => _food[i] = [i%WIDTH, i/WIDTH|0])
    myid = id;
    nextstate = state;
  }
}

let me;
function render() {
  requestAnimationFrame(render)
  me = nextstate[myid] ? nextstate[myid] : me
  const [headx, heady] = me.pos[0]
  const [left, top, right, bottom] = [headx - HWIDTH, heady - HHEIGHT, headx + HWIDTH, heady + HHEIGHT]


  ctx.fillStyle="gainsboro"
  ctx.fillRect(0, 0, 800, 600)

  Object.keys(nextstate)
    .map(k => nextstate[k])
    .forEach(({pos, radius, color}) => {
      pos.forEach(([x,y]) => {
        if (x < left || x > right || y < top || y > bottom)
          return
        const worldX = x - headx + HWIDTH
        const worldY = y - heady + HHEIGHT

        ctx.fillStyle = color;
        ctx.fillRect(worldX-radius, worldY-radius, radius*2, radius*2);
      })

    })

    ctx.fillStyle="crimson"
    Object.keys(_food)
      .map(k => _food[k])
      .forEach(([x, y]) => {
        if (x < left || x > right || y < top || y > bottom)
          return
        let radius = 2
        const worldX = x - headx + HWIDTH
        const worldY = y - heady + HHEIGHT
        ctx.fillRect(worldX-radius, worldY-radius, radius*2, radius*2);
      })



}

requestAnimationFrame(render)
