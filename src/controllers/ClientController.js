const Client = require('../models/Client')
const Queue = require('../models/Queue')
const randomstring = require('randomstring')

module.exports = class ClientController {
  constructor (db) {
    this.db = db
    this.model = new Client(this.db)
    this.queue = new Queue(this.db)
  }
  async create ({ name, location }) {
    let token = randomstring.generate(5) + Date.now()
    const success = await this.model.create({
      token: token,
      information: JSON.stringify({
        name: name,
        location: location
      })
    })
    if (success) {
      const { success, results } = await this.isClientTokenValid(token)
      if (success) {
        return {
          status: 200,
          body: { token: token, id: results[0].client_id }
        }
      } else {
        return { status: 500 }
      }
    } else {
      return { status: 500, body: 'Cannot create client' }
    }
  }
  isClientTokenValid (token) {
    return this.model.getByToken({
      token: token
    })
  }
  async update ({ name, location, authentication }) {
    const { success, results } = await this.isClientTokenValid(authentication)
    if (success) {
      const client = results[0]
      const success = await this.model.update({
        information: JSON.stringify({
          name: name,
          location: location
        }),
        clientId: client.client_id
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
  async delete ({ authentication }) {
    const { success, results } = await this.isClientTokenValid(authentication)
    if (success && results.length > 0) {
      const client = results[0]
      const success = await this.model.delete({
        clientId: client.client_id
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
  async read ({ authentication }) {
    const { success, results } = await this.isClientTokenValid(authentication)
    const res = results
    if (success && results.length > 0) {
      const client = res[0]
      const { results } = await this.queue.getByRecipientId({ recipientId: client.client_id })
      return {
        status: 200,
        body: {
          id: client.client_id,
          information: JSON.parse(client.information),
          queue: results
        }
      }
    } else {
      return {
        status: 401
      }
    }
  }
}
