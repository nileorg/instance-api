/* global describe before after it */
const expect = require('chai').expect
const io = require('socket.io-client')
const fetch = require('node-fetch')

class Node {
  constructor ({ socket }) {
    this.socket = socket
  }
  init () {
    return new Promise(resolve => {
      this.socket.on('connect', function () {
        resolve()
      })
    })
  }
  close () {
    this.socket.close()
  }
  on (action, callback) {
    this.socket.on(action, (data, fn) => callback(data, fn))
  }
  login ({ authentication }) {
    return new Promise(resolve => {
      this.socket.on('logged', (data) => {
        resolve(data)
      })
      this.socket.emit('login', {
        authentication
      })
    })
  }
  logout ({ authentication }) {
    return new Promise(resolve => {
      this.socket.on('logged_out', data => {
        resolve(data)
      })
      this.socket.emit('logout', {
        authentication: authentication
      })
    })
  }
}

class Client {
  constructor ({ instanceUrl }) {
    this.instanceUrl = instanceUrl
  }
  forward ({ nodeId, action, parameters, authentication }) {
    return fetch(`${this.instanceUrl}/forward`, {
      method: 'POST',
      body: `nodeId=${nodeId}&action=${action}&parameters=${parameters}`,
      headers: new fetch.Headers({ authentication })
    })
  }
}

describe('Testing instance', function () {
  let nodeController
  let node
  let client
  let socket
  let wsServer
  let db
  let http
  let ipfsNode
  // increase test timeout to 10 seconds
  this.timeout(10000)

  before(function (done) {
    const Initializer = require('../src/Initializer')
    const config = require('../instance.config.json')
    new Initializer(config.initializer)
      .getServices()
      .then((services) => {
        wsServer = services.wsServer
        db = services.sqliteDb
        http = services.http
        ipfsNode = services.ipfsNode
        return require('../src/Routes')(services)
      })
      .then((controllers) => {
        nodeController = controllers.node
        client = new Client({ instanceUrl: 'http://localhost:8080' })
        socket = io.connect('http://localhost:3001')
        node = new Node({ socket })
        node.init().then(() => {
          done()
        })
      })
  })

  after(function (done) {
    http.close()
    wsServer.close()
    node.close()
    db.close()
    ipfsNode.stop()
    done()
  })

  describe('Testing', function () {
    it('Should log in existing node', async () => {
      const { status } = await node.login({
        authentication: 'ev8hg1550736689241'
      })
      expect(status).to.be.equal(200)
    })
    it('Should forward http message via ws instance to online node', async () => {
      // Socket is node with id 112, it listens to a test action and replies with "response"
      node.on('test', (data, fn) => {
        fn({
          success: true,
          message: 'test successfull'
        })
      })
      // This is the client calling the instance forward API, calling the test action on node with id 112
      const res = await client.forward({
        nodeId: 112,
        action: 'test',
        parameters: 'hello',
        'authentication': 'NZmTj1550736689151'
      })
      const data = await res.json()
      expect(data.success).to.be.equal(true)
    })
    it('Should not log in non-existing node', async () => {
      const { status } = await node.logout({
        'authentication': 'fakeid'
      })
      expect(status).to.be.equal(401)
    })
    it('Should forward http message via ws instance to offline node', async () => {
      const res = await client.forward({
        nodeId: 113,
        action: 'test',
        parameters: 'hello',
        'authentication': 'NZmTj1550736689151'
      })
      const data = await res.json()
      expect(data.success).to.be.equal(true)
    })
    it('Should not log in non-existing node', async () => {
      const { status } = await node.logout({
        'authentication': 'fakeid'
      })
      expect(status).to.be.equal(401)
    })
    /*     it('Should handle connection lost', function (done) {
      console.log(node.online.length)
      socket.disconnect()
      setTimeout(() => console.log(node.online.length), 100)
    }) */
    it('Should logout', async () => {
      const onlineBeforeLogout = nodeController.online.length
      const { status } = await node.logout({
        'authentication': 'ev8hg1550736689241'
      })
      expect(status).to.be.equal(200)
      expect(nodeController.online.length).to.be.equal(onlineBeforeLogout - 1)
    })
  })
})
