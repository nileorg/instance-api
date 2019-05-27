const Node = require('../models/Node')
const randomstring = require('randomstring')

module.exports = class NodeController {
  constructor (db, ddbms) {
    this.db = db
    this.ddbms = ddbms
    this.model = new Node(db)
    this.online = []
  }

  async create ({ parameters, authentication }) {
    let token = randomstring.generate(5) + Date.now()
    const success = this.model.create({
      token: token,
      components: parameters.components,
      information: JSON.stringify({
        name: parameters.name,
        location: parameters.location
      })
    })
    if (success) {
      const protocolRegex = parameters.components.match(/(^\w+:|^)\/\//)
      const ddbms = protocolRegex[0].replace('://', '')
      const components = parameters.components.replace(/(^\w+:|^)\/\//, '')
      this.ddbms[ddbms].save(components).catch(() => {})
      const { success, results } = await this.isNodeTokenValid(token)
      if (success) {
        this.publishNodesList()
        return {
          status: 200,
          body: { token: token, id: results[0].node_id }
        }
      } else {
        return {
          status: 500
        }
      }
    } else {
      return {
        status: 404
      }
    }
  }
  isNodeTokenValid (token) {
    return this.model.getByToken({
      token: token
    })
  }
  async publishNodesList () {
    const { success, results } = await this.model.get()
    if (success) {
      let nodesList = results.reduce((object, node) => {
        node.token = null
        node.information1 = JSON.parse(node.information)
        object[node.node_id] = node
        return object
      }, {})
      const hash = await this.ddbms.ipfs.add(nodesList)
      return hash
    } else {
      return false
    }
  }
  async update ({ parameters, authentication }) {
    const { success, results } = await this.isNodeTokenValid(authentication)
    if (success && results.length > 0) {
      const node = results[0]
      const success = this.model.update({
        components: parameters.components,
        information: JSON.stringify({
          name: parameters.name,
          location: parameters.location
        }),
        nodeId: node.node_id
      })
      if (success) {
        const updatedOnlineNode = this.online.find(n => n.id === node.node_id)
        if (updatedOnlineNode) {
          updatedOnlineNode.components = parameters.components
        }
        return {
          status: 200
        }
      } else {
        return {
          status: 500
        }
      }
    } else {
      return {
        status: 404
      }
    }
  }
  async delete ({ parameters, authentication }) {
    const { success, results } = await this.isNodeTokenValid(authentication)
    if (success && results.length > 0) {
      const node = results[0]
      const success = await this.model.delete({
        nodeId: node.node_id
      })
      if (success) {
        return {
          status: 200
        }
      } else {
        return {
          status: 500
        }
      }
    } else {
      return {
        status: 404
      }
    }
  }
  async login ({ sender, parameters, authentication }) {
    const { success, results } = await this.isNodeTokenValid(authentication)
    const res = results
    if (success) {
      const node = res[0]
      this.online.push({
        components: node.components,
        id: node.node_id,
        resource: sender
      })
      const { results } = await this.models.queue.getByRecipientId({ recipientId: node.node_id })
      return {
        status: 200,
        body: {
          components: node.components,
          id: node.node_id,
          queue: results
        }
      }
    } else {
      return {
        status: 500
      }
    }
  }
  logoutNode ({ sender }) {
    this.online = this.online.filter(n => {
      return !(n.resource === sender)
    })
  }
}
