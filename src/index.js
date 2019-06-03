const Initializer = require('./Initializer')
var config = require('../instance.config.json')

new Initializer(config.initializer)
  .getServices()
  .then((services) => require('./Routes')(services))
