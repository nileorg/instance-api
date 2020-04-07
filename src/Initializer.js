'use strict';

class Initializer {
  constructor (services) {
    /* for (serviceName in services) {
      const serviceInstance = require(`./initializers/${serviceName}`)
      this.httpServer = new serviceInstance(services[serviceName])
    } */

    const HttpServer = require('./initializers/HttpServer')
    this.httpServer = new HttpServer(services.HttpServer)

    const WsServer = require('./initializers/WsServer')
    this.wsServer = new WsServer(services.WsServer)

    const Sqlite = require('./initializers/Sqlite')
    this.sqliteDb = new Sqlite(services.Sqlite)

    const Ipfs = require('./initializers/Ipfs')
    this.ipfsNode = new Ipfs(services.Ipfs)
  }
  async getServices() {
    let { http, dispatcher } = this.httpServer ? await this.httpServer.getService() : null
    let wsServer = this.wsServer ? await this.wsServer.getService() : null
    let sqliteDb = this.sqliteDb ? await this.sqliteDb.getService() : null
    let ipfsNode = this.ipfsNode ? await this.ipfsNode.getService() : null
    return { wsServer, dispatcher, sqliteDb, ipfsNode, http }
  }
}
module.exports = Initializer
