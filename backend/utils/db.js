// Simple JSON-file database using lowdb.
// Good enough for launch / low-to-medium traffic. When you outgrow it,
// swap this file for a real Postgres/MySQL connection - the rest of the
// app only talks to the functions exported here, so nothing else changes.

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const adapter = new FileSync(path.join(__dirname, '..', 'db.json'));
const db = low(adapter);

db.defaults({ users: [], listings: [], orders: [] }).write();

module.exports = db;
