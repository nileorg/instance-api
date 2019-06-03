module.exports = class HttpServer {
  constructor (param) {
    this.param = param
    const handleRequest = (request, response) => {
      try {
        this.dispatcher.dispatch(request, response)
      } catch (err) {
        console.log(err)
      }
    }
    this.server = require('http').createServer(handleRequest)
    const Httpdispatcher = require('httpdispatcher')
    this.dispatcher = new Httpdispatcher()
  }
  async getService () {
    return new Promise((resolve, reject) => {
      this.server.listen(this.param.port, undefined, err => {
        if (err) {
          reject(new Error(`Cannot bind port ${this.param.port}`))
        }
        resolve(this.dispatcher)
      })
    })
  }
}
