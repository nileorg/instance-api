const IPFS = require('ipfs')

module.exports = class Ipfs {
  constructor (param) {
    this.param = param
    this.ipfsNode = new IPFS({
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
      this.ipfsNode.on('ready', () => {
        resolve(this.ipfsNode)
      })
    })
  }
}
