import http from 'http';
import path from 'path';
import Koa from 'koa';
import sockjs from 'sockjs';
import { Ding } from './dining';
const koaStatic = require('koa-static');

const app = new Koa();
const sockServer = sockjs.createServer();
const ding = new Ding()

sockServer.on('connection', function (conn) {
  conn.on('close', function () {
    ding.removeCustomer(conn.id)
  });

  conn.on('data', function (message) {
    let item = JSON.parse(message)
    ding.handMessage(item, conn)
  });
});

app.use(koaStatic(path.resolve(__dirname, '../test')));

const server = http.createServer(app.callback());
sockServer.installHandlers(server, { prefix:'/socket' });
server.listen(3003, function () {
  var addr = server.address();
  var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  console.log('start', 'Listening at ' + bind);
});

