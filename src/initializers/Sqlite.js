module.exports = class Sqlite {
  constructor (param) {
    this.param = param
  }
  async getService () {
    return new Promise((resolve, reject) => {
      const sqlite3 = require('sqlite3').verbose()
      const sqliteDb = new sqlite3.Database(this.param.path, sqlite3.OPEN_READWRITE, err => {
        if (err) {
          reject(err)
        }
      })
      resolve(sqliteDb)
    })
  }
}
