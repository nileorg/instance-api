module.exports = class WsServer {
  constructor (param) {
    this.param = param
  }
  async getService () {
    return new Promise((resolve, reject) => {
      const wsServer = require('socket.io')(this.param.port)
      resolve(wsServer)
    })
  }
}
