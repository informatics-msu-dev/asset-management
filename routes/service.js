const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.FIREBASE_API_KEY);
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.database();

// 📌 ดึงข้อมูลจากทั้ง 4 ตาราง
router.get('/', async (req, res) => {
    try {
        const tables = ["ครุภัณฑ์", "ผู้ใช้งาน", "คำขอแจ้งซ่อม"];
        let results = {};

        for (const table of tables) {
            const snapshot = await db.ref(table).once('value');
            results[table] = snapshot.val() || {};
        }

        res.json(results);
    } catch (error) {
        console.error('🚨 Error fetching data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

module.exports = router;
