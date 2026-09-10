const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, "..", "..", "data", "app.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON;");
db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

// Thin helpers over node:sqlite's prepared-statement API, plus snake_case ->
// camelCase mapping so route handlers deal in normal JS object shapes.
function toCamel(row) {
  if (!row) return row;
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = value;
  }
  return out;
}

function get(sql, params = []) {
  return toCamel(db.prepare(sql).get(...params));
}

function all(sql, params = []) {
  return db.prepare(sql).all(...params).map(toCamel);
}

function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}

function transaction(fn) {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

module.exports = { db, get, all, run, transaction };
