var bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
var config = require('../instance.config.json')
const Db = require('./Db')
const IpfsDdbms = require('./ddbms/Ipfs')
const ClientController = require('./controllers/ClientController')
const NodeController = require('./controllers/NodeController')

const respond = (res, response) => {
  res.writeHead(response.status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(response.body || {}))
}
module.exports = async ({ wsServer, dispatcher, sqliteDb, ipfsNode }) => {
  const db = new Db(sqliteDb)
  const client = new ClientController(db)
  const ddbms = {
    ipfs: new IpfsDdbms(ipfsNode)
  }
  const node = new NodeController(db, ddbms)

  /**
   * Handle CORS requests
  */
  dispatcher.beforeFilter(/\//, function (req, res, chain) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE')
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Headers', 'authentication')
      return res.end()
    } else {
      chain.next(req, res, chain)
    }
  })

  /**
   * @api {post} /clients Create a client
   * @apiHeader {String} authentication Client's unique token
   * @apiVersion 0.0.1
   * @apiName CreateClient
   * @apiGroup Client
   * @apiPermission none
  */
  dispatcher.onPost('/clients', async (req, res) => {
    const parameters = {
      name: req.params.name,
      location: req.params.location,
      authentication: req.headers.authentication
    }
    const response = await client.create(parameters)
    respond(res, response)
  })

  /**
   * @api {get} /clients Read information about own client
   * @apiHeader {String} authentication Client's unique token
   * @apiVersion 0.0.1
   * @apiName ReadClient
   * @apiGroup Client
   * @apiPermission none
  */
  dispatcher.onGet('/clients', async (req, res) => {
    const parameters = {
      authentication: req.headers.authentication
    }
    const response = await client.read(parameters)
    respond(res, response)
  })

  /**
   * @api {put} /clients Update own client
   * @apiHeader {String} authentication Client's unique token
   * @apiVersion 0.0.1
   * @apiName UpdateClient
   * @apiGroup Client
   * @apiPermission none
  */
  dispatcher.onPut('/clients', async (req, res) => {
    const parameters = {
      name: req.params.name,
      location: req.params.location,
      authentication: req.headers.authentication
    }
    const response = await client.update(parameters)
    respond(res, response)
  })

  /**
   * @api {delete} /clients Delete own client
   * @apiHeader {String} authentication Client's unique token
   * @apiVersion 0.0.1
   * @apiName DeleteClient
   * @apiGroup Client
   * @apiPermission none
  */
  dispatcher.onDelete('/clients', async (req, res) => {
    const parameters = {
      authentication: req.headers.authentication
    }
    const response = await client.delete(parameters)
    respond(res, response)
  })

  /**
   * @api {post} /nodes Create a node
   * @apiHeader {String} authentication Node's unique token
   * @apiVersion 0.0.1
   * @apiName CreateNode
   * @apiGroup Node
   * @apiPermission none
  */
  dispatcher.onPost('/nodes', async (req, res) => {
    const parameters = {
      components: req.params.components,
      name: req.params.name,
      location: req.params.location,
      authentication: req.headers.authentication
    }
    const response = await node.create(parameters)
    respond(res, response)
  })

  /**
   * @api {get} /nodes get a node
   * @apiHeader {String} authentication Node's unique token
   * @apiVersion 0.0.1
   * @apiName readNode
   * @apiGroup Node
   * @apiPermission none
  */
  dispatcher.onGet('/nodes', async (req, res) => {
    const parameters = {
      authentication: req.headers.authentication
    }
    const response = await node.read(parameters)
    respond(res, response)
  })

  /**
   * @api {put} /nodes Update a node
   * @apiHeader {String} authentication Node's unique token
   * @apiVersion 0.0.1
   * @apiName UpdateNode
   * @apiGroup Node
   * @apiPermission none
  */
  dispatcher.onPut('/nodes', async (req, res) => {
    const parameters = {
      components: req.params.components,
      name: req.params.name,
      location: req.params.location,
      authentication: req.headers.authentication
    }
    const response = await node.update(parameters)
    respond(res, response)
  })

  /**
   * @api {delete} /nodes Delete a node
   * @apiHeader {String} authentication Node's unique token
   * @apiVersion 0.0.1
   * @apiName DeleteNode
   * @apiGroup Node
   * @apiPermission none
  */
  dispatcher.onDelete('/nodes', async (req, res) => {
    const parameters = {
      authentication: req.headers.authentication
    }
    const response = await node.delete(parameters)
    respond(res, response)
  })

  // Handle websocket connections
  wsServer.on('connection', socket => {
    // Login node
    socket.on('login', async data => {
      const parameters = {
        authentication: data.authentication,
        sender: socket.id
      }
      const response = await node.login(parameters)
      wsServer.to(socket.id).emit('logged', response)
    })
    // Logout node
    socket.on('logout', async data => {
      const parameters = {
        authentication: data.authentication,
        sender: socket.id
      }
      const response = await node.logout(parameters)
      wsServer.to(socket.id).emit('logged_out', response)
    })
    socket.on('disconnect', async () => {
      const parameters = {
        sender: socket.id
      }
      node.logout(parameters)
    })
  })

  /**
   * The following middleware is attach on every request except /login
   * Check if in the authentication header contains a jwt token:
   *      - if the token is valid then continue the chain
   *      - if the token is invalid reply with 401
  */
  dispatcher.beforeFilter(/\/admin\/(?!login)/, function (req, res, chain) {
    try {
      var decoded = jwt.verify(req.headers.authentication, config.secret)
      if (decoded) {
        chain.next(req, res, chain)
      } else {
        res.writeHeader(401)
        return res.end()
      }
    } catch (e) {
      res.writeHeader(401)
      return res.end()
    }
  })
  /**
   * @api {post} /admin/login Login admin
   * @apiParam (Request body) {String} username Username
   * @apiParam (Request body) {String} password Password
   * @apiGroup Tasks
   * @apiVersion 0.0.1
   * @apiName LoginAdmin
   * @apiGroup Admin
   * @apiPermission none
   * @apiSuccess {Bool} successful login
   * @apiSuccessExample {json} Success
   *    HTTP/1.1 200 OK
   *    [{
   *      "success": true,
   *    }]
   * @apiErrorExample {json} List error
   *    HTTP/1.1 500 Internal Server Error
  */
  dispatcher.onPost('/admin/login', async function (req, res) {
    const user = config.users.find(user => {
      return req.params.username === user.username
    })
    let success = false
    let token = false
    if (user) {
      success = await bcrypt.compare(req.params.password, user.password)
      if (success) {
        token = jwt.sign({ username: user.username }, config.secret, {
          expiresIn: 86400
        })
      }
    }
    if (!success) {
      res.writeHeader(401)
    }
    return res.end(JSON.stringify({
      success: success,
      token: token
    }))
  })
  /**
   * @api {get} /admin/nodes List all nodes
   * @apiHeader {String} Authentication User's unique token.
   * @apiGroup Tasks
   * @apiVersion 0.0.1
   * @apiName ListNodes
   * @apiGroup Admin
   * @apiPermission none
   * @apiSuccess {Object[]} nodes node's list
   * @apiSuccess {Number} nodes.id node id
   * @apiSuccess {String} node.title Node title
   * @apiSuccessExample {json} Success
   *    HTTP/1.1 200 OK
   *    [{
   *      "id": 1,
   *      "title": "Node 1",
   *      "updated_at": "2016-02-10T15:46:51.778Z",
   *      "created_at": "2016-02-10T15:46:51.778Z"
   *    }]
   * @apiErrorExample {json} List error
   *    HTTP/1.1 500 Internal Server Error
  */
  dispatcher.onGet('/admin/nodes', async function (req, res) {
    const { success, results } = await node.model.get()
    res.end(JSON.stringify({
      success: success,
      nodes: results
    }))
  })

  /**
   * @api {put} /admin/nodes Edit the status of the node
   * @apiHeader {String} Authentication User's unique token.
   * @apiVersion 0.0.1
   * @apiName PutNodes
   * @apiGroup Admin
   * @apiPermission none
   *
   * @apiDescription Edit the status of the node.
   *
   * @apiParam (Request body) {Int} node_id Id of the node.
   * @apiParam (Request body) {Bool} active Id of the node.
   *
  */
  dispatcher.onPut('/admin/nodes', async function (req, res) {
    if (!('node_id' in req.params) || !('active' in req.params)) {
      res.writeHeader(400)
      return res.end(JSON.stringify({
        message: 'Missing fields'
      }))
    }
    const success = await node.model.updateStatus({
      nodeId: req.params.node_id,
      active: req.params.active
    })
    if (success) {
      return res.end(JSON.stringify({
        message: 'Success'
      }))
    } else {
      res.writeHeader(500)
      return res.end(JSON.stringify({
        message: 'Error changing node status'
      }))
    }
  })
  /**
   * @api {delete} /admin/nodes Remove a node
   * @apiHeader {String} Authentication User's unique token.
   * @apiVersion 0.0.1
   * @apiName DeleteNodes
   * @apiGroup Admin
   * @apiParam {id} node_id nodes id
   * @apiSuccessExample {json} Success
   *    HTTP/1.1 204 No Content
   * @apiErrorExample {json} Delete error
   *    HTTP/1.1 500 Internal Server Error
 */
  dispatcher.onDelete('/admin/nodes', async function (req, res) {
    if (!('node_id' in req.params)) {
      res.writeHeader(400)
      return res.end(JSON.stringify({
        message: 'Missing fields'
      }))
    }
    const success = await node.model.delete({
      nodeId: req.params.node_id
    })
    if (success) {
      return res.end(JSON.stringify({
        message: 'Success'
      }))
    } else {
      res.writeHeader(500)
      return res.end(JSON.stringify({
        message: 'Error removing node'
      }))
    }
  })
  /**
   * @api {post} /admin/publish Publish nodes list
   * @apiHeader {String} Authentication User's unique token.
   * @apiVersion 0.0.1
   * @apiName PublishNodes
   * @apiGroup Admin
   * @apiSuccessExample {json} Success
   *    HTTP/1.1 204 No Content
   * @apiErrorExample {json} Delete error
   *    HTTP/1.1 500 Internal Server Error
  */
  dispatcher.onPost('/admin/publish', async function (req, res) {
    const hash = await node.publishNodesList()
    if (hash) {
      return res.end(JSON.stringify({
        message: 'List published successfully',
        hash: hash
      }))
    }
    return res.end(JSON.stringify({
      message: 'Cannot get nodes list'
    }))
  })

  return { node, client }
}
