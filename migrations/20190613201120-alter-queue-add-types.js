'use strict'

exports.up = function (db) {
  return db.runSql(`
    ALTER TABLE queue ADD recipient_type TEXT;
    ALTER TABLE queue ADD sender_type TEXT;
  `)
}

exports.down = function (db) {
  return null
}
