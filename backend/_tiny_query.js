const sequelize = require('./src/config/database');
(async()=>{
  console.time('q');
  const [rows] = await sequelize.query("SELECT id, title FROM posts WHERE user_id = 1001 LIMIT 5");
  console.timeEnd('q');
  console.log(rows.length);
  console.log(rows);
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
