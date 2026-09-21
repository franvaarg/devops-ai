const { Pool } = require("pg");
require("dotenv").config();
const { databaseConfig } = require("./config");
const pool = new Pool(databaseConfig());
module.exports = pool;
