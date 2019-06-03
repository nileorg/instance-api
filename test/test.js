/* global describe before after afterEach it */
const expect = require('chai').expect
const io = require('socket.io-client')

describe('Testing instance', function () {
  let node
  let socket
  let wsServer
  // increase test timeout to 10 seconds
  this.timeout(10000)

  before(function (done) {
    const Initializer = require('../src/Initializer')
    const config = require('../instance.config.json')
    new Initializer(config.initializer)
      .getServices()
      .then((services) => {
        wsServer = services.wsServer
        return require('../src/Routes')(services)
      })
      .then((controllers) => {
        node = controllers.node
        socket = io.connect('http://localhost:3001')
        socket.on('connect', function () {
          done()
        })
      })
  })

  after(function (done) {
    wsServer.close()
    socket.close()
    done()
  })

  describe('Testing', function () {
    afterEach(function (done) {
      socket.removeListener('logged')
      done()
    })
    it('Should log in existing node', done => {
      socket.on('logged', ({ status }) => {
        expect(status).to.be.equal(200)
        done()
      })
      socket.emit('login', {
        authentication: 'ev8hg1550736689241'
      })
    })
    it('Should not log in non-existing node', function (done) {
      socket.on('logged', ({ status }) => {
        expect(status).to.be.equal(401)
        done()
      })
      socket.emit('login', {
        authentication: 'fakeid'
      })
    })
    /*     it('Should handle connection lost', function (done) {
      console.log(node.online.length)
      socket.disconnect()
      setTimeout(() => console.log(node.online.length), 100)
    }) */
    it('Should logout', function (done) {
      const onlineBeforeLogout = node.online.length
      socket.on('logged_out', ({ status }) => {
        expect(status).to.be.equal(200)
        expect(node.online.length).to.be.equal(onlineBeforeLogout - 1)
        done()
      })
      socket.emit('logout', {
        authentication: 'ev8hg1550736689241'
      })
    })
  })
})
