const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

let sequelize;

if (process.env.DB_DIALECT === 'mysql') {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'mysql',
      logging: false, // Set to console.log to see SQL queries
      define: {
        timestamps: true,
        underscored: true
      }
    }
  );
} else {
  // Fallback to SQLite (not used now but kept for reference)
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    logging: false,
    define: {
      timestamps: true,
      underscored: true
    }
  });
}

module.exports = sequelize;