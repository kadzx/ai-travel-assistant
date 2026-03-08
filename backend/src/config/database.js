const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME || "travel_db",
  process.env.DB_USER || "root",
  process.env.DB_PASS || process.env.DB_PASSWORD || "123456",
  {
    host: process.env.DB_HOST || "localhost",
    dialect: "mysql",
    logging: false, // Set to console.log to see SQL queries
    timezone: "+08:00", // Asia/Shanghai timezone
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
);

module.exports = sequelize;
