// // dbConfig.js
// const sql = require("mssql");

// const dbConfig = {
//   user: "saraswathi",
//   password: "@%dSCt15",
//   server: "95.216.47.253",
//   database: "YJKTechnologies",
//   options: { encrypt: false }
// };

// module.exports = dbConfig;

const path = require("path");
const dotenv = require("dotenv");

// Load backend/.env
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

module.exports = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: Number(process.env.DB_PORT) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
  },
  requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT) || 300000,
  connectionTimeout: Number(process.env.DB_CONNECTION_TIMEOUT) || 300000,
};