const { Pool } = require("pg");
if (process.env.NODE_ENV !== "test") require("dotenv").config({ quiet: true });
const { databaseConfig } = require("./config");
const { logFailure } = require("../operations/logger");
const pool = new Pool({ ...databaseConfig(), connectionTimeoutMillis: 5000, statement_timeout: 15000 });
pool.on("error", (error) => logFailure("database_pool_error", error));
module.exports = pool;
