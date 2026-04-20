const sequelize = require('./src/config/database');
(async()=>{
  const [rows] = await sequelize.query("SELECT id, title, LEFT(content,120) as content, images FROM posts WHERE user_id=1001 AND images IS NOT NULL AND images!='' AND images!='[]' LIMIT 5");
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
