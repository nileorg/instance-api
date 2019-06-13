const Queue = require('../models/Queue')

module.exports = class ForwardController {
  constructor (db, wsServer, nodeController, clientController) {
    this.db = db
    this.wsServer = wsServer
    this.nodeController = nodeController
    this.clientController = clientController
    this.queue = new Queue(this.db)
  }
  async isNodeOnline (nodeId) {
    return this.nodeController.online.find(n => n.id === parseInt(nodeId))
  }
  async onlineNodeForward ({ nodeId, action, parameters, clientId }) {
    const onlineNode = this.nodeController.online.find(n => n.id === parseInt(nodeId))
    if (onlineNode) {
      const wsId = onlineNode.resource
      const forwardAction = action
      const forwardParameters = {
        parameters: parameters,
        clientId
      }
      return new Promise(resolve => {
        this.wsServer.sockets.sockets[wsId].emit(forwardAction, forwardParameters, data => {
          resolve({
            status: 200,
            body: data
          })
        })
      })
    } else {
      return false
    }
  }
  async toNode ({ authentication, nodeId, action, parameters }) {
    const { success, results } = await this.clientController.isClientTokenValid(authentication)
    if (success && results.length > 0) {
      const clientId = results[0].client_id
      if (this.isNodeOnline(nodeId)) {
        const result = await this.onlineNodeForward({
          nodeId: nodeId,
          action: action,
          parameters: parameters,
          clientId: clientId
        })
        return result
      } else {
        return {
          status: 404
        }
      }
    } else {
      return {
        status: 401
      }
    }
  }
}
