const Node = require('../models/Node')
const Queue = require('../models/Queue')
const randomstring = require('randomstring')

module.exports = class NodeController {
  constructor (db, ddbms) {
    this.db = db
    this.ddbms = ddbms
    this.model = new Node(db)
    this.queue = new Queue(db)
    this.online = []
  }

  async create ({ components, name, location, authentication }) {
    let token = randomstring.generate(5) + Date.now()
    const success = this.model.create({
      token: token,
      components: components,
      information: JSON.stringify({
        name: name,
        location: location
      })
    })
    if (success) {
      const protocolRegex = components.match(/(^\w+:|^)\/\//)
      const ddbms = protocolRegex[0].replace('://', '')
      const componentsHash = components.replace(/(^\w+:|^)\/\//, '')
      this.ddbms[ddbms].save(componentsHash).catch(() => {})
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
  async read ({ authentication }) {
    const { success, results } = await this.isNodeTokenValid(authentication)
    if (success) {
      return {
        status: 200,
        body: { node: results[0] }
      }
    } else {
      return {
        status: 401
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
  async update ({ components, name, location, authentication }) {
    const { success, results } = await this.isNodeTokenValid(authentication)
    if (success && results.length > 0) {
      const node = results[0]
      const success = this.model.update({
        components: components,
        information: JSON.stringify({
          name: name,
          location: location
        }),
        nodeId: node.node_id
      })
      if (success) {
        const updatedOnlineNode = this.online.find(n => n.id === node.node_id)
        if (updatedOnlineNode) {
          updatedOnlineNode.components = components
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
  async delete ({ authentication }) {
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
  async login ({ sender, authentication }) {
    const { success, results } = await this.isNodeTokenValid(authentication)
    const res = results
    if (success && results.length > 0) {
      const node = res[0]
      this.online.push({
        components: node.components,
        id: node.node_id,
        resource: sender
      })
      const { results } = await this.queue.getByRecipientId({ recipientId: node.node_id })
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
        status: 401
      }
    }
  }
  async logout ({ authentication, sender }) {
    if (authentication) {
      const { success, results } = await this.isNodeTokenValid(authentication)
      const res = results
      if (success && results.length > 0) {
        const node = res[0]
        this.online = this.online.filter(n => {
          return !(n.resource === sender)
        })
        return {
          status: 200,
          body: {
            id: node.node_id
          }
        }
      } else {
        return {
          status: 401
        }
      }
    } else {
      this.online = this.online.filter(n => {
        return !(n.resource === sender)
      })
    }
  }
}
