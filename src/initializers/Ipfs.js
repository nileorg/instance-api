const IPFS = require('ipfs')

module.exports = class Ipfs {
  constructor (param) {
    this.param = param
    this.ipfsNode = IPFS.create({
      silent: true,
      repo: this.param.path,
      config: {
        Addresses: {
          Swarm: ['/ip4/0.0.0.0/tcp/0']
        }
      }
    })
  }
  async getService () {
    return new Promise((resolve, reject) => {
      resolve(this.ipfsNode)
    })
  }
}
