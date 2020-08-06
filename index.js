const http = require('http');
const Koa = require('koa');
const sockjs = require('sockjs');
const static = require('koa-static');

const app = new Koa();
const sockServer = sockjs.createServer();
const clients = {}; // 连接的客户端
const rooms = {
  // roomId: {
  //   foodList,
  //   users: []
  // }
}

function createFoodList() {
  return [
    {id: '01', name: '鹌鹑蛋', price: 28.00, img: './imgs/dish-anchundan.png', orderNum: 0},
    {id: '02', name: '红苕粉', price: 12.00, img: './imgs/dish-hongshufen.png', orderNum: 0},
    {id: '03', name: '黄喉', price: 32.00, img: './imgs/dish-huanghou.png', orderNum: 0},
    {id: '04', name: '郡花', price: 38.00, img: './imgs/dish-junhua.png', orderNum: 0},
    {id: '05', name: '嫩牛肉', price: 32.00, img: './imgs/dish-nenniurou.png', orderNum: 0},
    {id: '06', name: '千层肚', price: 28.00, img: './imgs/dish-qiancengdu.png', orderNum: 0}
  ]
}

function orderFood(operate, id, list) {
  for (let i = 0; i < list.length; i++) {
    let item = list[i]
    if (item.id === id) {
      if (operate === 'add') {
        item.orderNum++
      }
      if (operate === 'del' && item.orderNum > 0) {
        item.orderNum--
      }
      break;
    }
  }
}

sockServer.on('connection', function (conn) {
  console.log('connection: ' + conn.id);
  clients[conn.id] = {
    id: conn.id,
    con: conn,
  };
  conn.on('close', function () {
    console.log('close ' + conn.id);
    let roomId = clients[conn.id].roomId
    rooms[roomId].users = rooms[roomId].users.filter(id => id !== conn.id)
    delete clients[conn.id]
  });

  conn.on('data', function (message) {
    let item = JSON.parse(message)
    switch (item.type) {
      // 用户连接
      case 'open':
        clients[conn.id].roomId = item.roomId
        if (rooms[item.roomId]) {
          rooms[item.roomId].users.push(conn.id)
        } else {
          rooms[item.roomId] = {
            users: [conn.id],
            foodList: createFoodList()
          }
        }
        conn.write(JSON.stringify({type: 'init', foodList: rooms[item.roomId].foodList}))
      break;
      // 用户点单
      case 'order':
        let roomId = clients[conn.id].roomId
        orderFood(item.operate, item.id, rooms[roomId].foodList)
        rooms[roomId].users.filter(id => id !== conn.id).forEach(id => {
          clients[id].con.write(JSON.stringify(item))
        })
      break;
    }
  });
});

app.use(static(__dirname + '/test'));

const server = http.createServer(app.callback());
sockServer.installHandlers(server, { prefix:'/socket' });
server.listen(3003, function () {
  var addr = server.address();
  var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  console.log('start', 'Listening at ' + bind);
});

