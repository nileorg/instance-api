const Httpdispatcher = require('httpdispatcher')
const dispatcher = new Httpdispatcher()
const handleRequest = (request, response) => {
  try {
    dispatcher.dispatch(request, response)
  } catch (err) {
    console.log(err)
  }
}
const server = require('http').createServer(handleRequest)
const wsServer = require('socket.io')(server)

const PORT = 8080

server.listen(PORT)

const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const dbPath = path.resolve(__dirname, '../var/instance.db')
const sqliteDb = new sqlite3.Database(dbPath)
const Db = require('./Db')

const ClientController = require('./controllers/ClientController')
const NodeController = require('./controllers/NodeController')

const db = new Db(sqliteDb)
const IpfsDdbms = require('./ddbms/Ipfs')

const IPFS = require('ipfs')
let ipfsNode = new IPFS({
  silent: true,
  repo: 'var/instance',
  config: {
    Addresses: {
      Swarm: ['/ip4/0.0.0.0/tcp/0']
    }
  }
})

const ddbms = {
  ipfs: new IpfsDdbms(ipfsNode)
}
const client = new ClientController(db)
const node = new NodeController(db, ddbms)

const handleHttp = (controller, method) => {
  return async (req, res) => {
    const parameters = {
      parameters: req.params,
      authentication: req.headers.authentication
    }
    const response = await controller[method].bind(controller)(parameters)
    res.writeHead(response.status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(response.body || {}))
  }
}

const handleWs = (socket, controller, method) => {
  return async data => {
    const parameters = {
      parameters: data.parameters,
      authentication: data.authentication,
      sender: socket.id
    }
    const response = await controller[method].bind(controller)(parameters)
    console.log(response)
  }
}

dispatcher.onPost('/clients', handleHttp(client, 'create'))
dispatcher.onGet('/clients', handleHttp(client, 'read'))
dispatcher.onPut('/clients', handleHttp(client, 'update'))
dispatcher.onDelete('/clients', handleHttp(client, 'delete'))

dispatcher.onPost('/nodes', handleHttp(node, 'create'))
// dispatcher.onGet('/nodes', handleHttp(node, 'read'))
dispatcher.onPut('/nodes', handleHttp(node, 'update'))
dispatcher.onDelete('/nodes', handleHttp(node, 'delete'))
wsServer.on('connection', socket => {
  socket.on('login', handleWs(socket, node, 'login'))
  socket.on('logout', handleWs(socket, node, 'logout'))
})
