const mysql = require('mysql2/promise');

async function createDb() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'X@20031018x'
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`travel_assistant_db\`;`);
    console.log('Database travel_assistant_db created or already exists.');
    await connection.end();
  } catch (err) {
    console.error('Error creating database:', err);
    process.exit(1);
  }
}

createDb();