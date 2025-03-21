module.exports = {
    apps: [
      {
        name: "my-app",        // ชื่อของแอปพลิเคชัน
        script: "./server.js",    // สคริปต์ที่ต้องการให้ PM2 รัน
        instances: "max",      // จำนวน instance ที่ต้องการ (ใช้ "max" เพื่อให้ PM2 ใช้จำนวน core ที่มี)
        autorestart: true,     // ให้ PM2 รีสตาร์ทแอปพลิเคชันเมื่อเกิดข้อผิดพลาด
        watch: true,           // การตั้งค่าให้ PM2 ติดตามไฟล์ในโปรเจกต์และรีสตาร์ทเมื่อมีการเปลี่ยนแปลง
        max_memory_restart: "1G", // ตั้งค่าการรีสตาร์ทเมื่อแอปฯ ใช้ memory เกินขีดจำกัด
        env: {
          NODE_ENV: "development", // กำหนด environment variables สำหรับโหมด development
        },
        env_production: {
          NODE_ENV: "production", // กำหนด environment variables สำหรับโหมด production
        },
      },
    ],
  };
  