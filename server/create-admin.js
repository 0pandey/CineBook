
require("dotenv").config();

const bcrypt = require("bcrypt");
const db = require("./db");

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password || password.length < 12) {
    throw new Error(
      "กำหนด ADMIN_USERNAME และ ADMIN_PASSWORD (อย่างน้อย 12 ตัวอักษร) ใน .env"
    );
  }

  const hash = await bcrypt.hash(password, 12);

  await db.query(`
    INSERT INTO admin_users (username, password_hash)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)
  `, [username, hash]);

  console.log("Admin account created successfully!");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
