require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/login");
const assetRoutes = require("./routes/assets");
const userRoutes = require("./routes/users");
const serviceRoutes = require("./routes/service");
const { server } = require("./config/config");

const app = express();

// 🔥 เพิ่มขนาดของ JSON request body (เป็น 50MB หรือมากกว่านั้น)
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

app.use(cors()); // เปิดใช้งาน CORS หลังจากประกาศ app
app.use(express.json()); // ให้แอพสามารถรับ JSON ได้
app.use(express.urlencoded({ extended: true })); // ให้แอพสามารถรับ URL-encoded data ได้

// ใช้งาน route ที่เกี่ยวข้อง
app.use("/api/auth", authRoutes); // /api/auth จะใช้ route ที่กำหนดใน login.js
app.use('/api/equipment', assetRoutes);  // /api/assets จะใช้ route ที่กำหนดใน assets.js
app.use('/api/user', userRoutes);  // /api/users จะใช้ route ที่กำหนดใน users.js
app.use('/api/serviceRepair', serviceRoutes);  // /api/booking จะใช้ route ที่กำหนดใน booking.js

app.listen(server.port, () => {
    console.log(`🚀 Server running on port ${server.port}`);
});
