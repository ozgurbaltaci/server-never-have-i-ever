const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.SERVER_USER,
  password: process.env.SERVER_PASSWORD,
  host: process.env.SERVER_HOST,
  port: process.env.SERVER_PORT,
  database: process.env.SERVER_DATABASE,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;
