const mysql = require("mysql2/promise");
const { db } = require("./config");

const pool = mysql.createPool({
    host: db.host,
    user: db.user,
    password: db.password,
    database: db.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// ทดสอบการเชื่อมต่อฐานข้อมูล
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log("✅ Connected to MySQL database");
        connection.release(); // คืน Connection กลับไปที่ Pool
    } catch (err) {
        console.error("❌ Database connection failed:", err);
    }
})();

module.exports = pool;
