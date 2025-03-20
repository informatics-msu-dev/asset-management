const express = require('express');
const db = require('../config/database');
const { addToGoogleSheet } = require("./googleSheets");
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();

// ฟังก์ชันช่วยสร้างค่า Equipment
const generateEquipmentValues = ({ startEquipmentNo, quantity, equipment_name, spec, equipment_type, price, date_add, location, type, user_id, exactEquipmentNumbers }) => {
  let values = [];
  let usedNumbers = new Set(); // ใช้ตรวจสอบหมายเลขไม่ให้ซ้ำกัน

  // ฟังก์ชันสุ่มหมายเลขที่ไม่ซ้ำกัน
  const generateUniqueEquipmentId = () => {
    let randomNum;
    do {
      randomNum = Math.floor(1000 + Math.random() * 9000); // สุ่มเลข 4 หลัก (1000-9999)
    } while (usedNumbers.has(randomNum));

    usedNumbers.add(randomNum);
    return `SUP-${Date.now()}-${randomNum}`;
  };

  if (exactEquipmentNumbers && Array.isArray(exactEquipmentNumbers)) {
    values = exactEquipmentNumbers.map(eqNo => [
      eqNo, equipment_name, spec, equipment_type, price, date_add, location, type, user_id
    ]);
  } else if (!startEquipmentNo) {
    // ถ้าไม่มี `startEquipmentNo` ให้สุ่มเลขที่ไม่ซ้ำกัน และใช้ `quantity` เข้า database
    const uniqueId = `SUP-${Date.now()}`; // ใช้ `Date.now()` เป็นรหัสหลัก
    values.push([
      uniqueId, equipment_name, spec, equipment_type, price, date_add, location, type, quantity, user_id
    ]);
  } else {
    // ถ้ามี `startEquipmentNo` ให้คำนวณตามสูตรที่ให้
    values = Array.from({ length: quantity }, (_, i) => [
      `${startEquipmentNo.slice(0, -4)}${(parseInt(startEquipmentNo.slice(-4)) + i).toString().padStart(4, '0')}`,
      equipment_name, spec, equipment_type, price, date_add, location, type, 1, user_id
    ]);
  }

  return values;
};

// เพิ่มข้อมูลหลายรายการ
router.post('/bulk', verifyToken, async (req, res) => {
  try {
    const values = generateEquipmentValues(req.body);
    const query = `INSERT INTO equipments (equipment_id, equipment_name, spec, equipment_type, price, date_add, location, type, quantity, user_id) VALUES ?`;
    const [results] = await db.query(query, [values]);
    res.status(200).json({ message: `${results.affectedRows} equipment added successfully!`, items: values.map(v => v[0]) });
  } catch (err) {
    res.status(500).json({ message: 'Error inserting equipment', error: err.message });
  }
});

// ✅ API สำหรับบันทึกข้อมูลครุภัณฑ์จาก Database ลง Google Sheets
router.post("/updateSheet", verifyToken, async (req, res) => {
  try {
    // Debug logging
    console.log("Starting updateSheet endpoint");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    // Validate request body
    if (!req.body) {
      return res.status(400).json({ 
        message: 'Request body is required'
      });
    }

    // Query without date filtering by default
    let query = 'SELECT equipment_id, equipment_name, spec, equipment_type, price, date_add, location FROM equipments WHERE type = ?';
    const queryParams = ["ครุภัณฑ์"];

    // Only add date filters if dates are provided and are valid
    if (req.body.startDate || req.body.endDate) {
      if (req.body.startDate && req.body.endDate) {
        const startDate = new Date(req.body.startDate);
        const endDate = new Date(req.body.endDate);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return res.status(400).json({ 
            message: 'Invalid date format'
          });
        }

        query += ' AND date_add BETWEEN ? AND ?';
        queryParams.push(req.body.startDate, req.body.endDate);
      } else if (req.body.startDate) {
        const startDate = new Date(req.body.startDate);
        if (isNaN(startDate.getTime())) {
          return res.status(400).json({ 
            message: 'Invalid start date format'
          });
        }
        query += ' AND date_add >= ?';
        queryParams.push(req.body.startDate);
      } else if (req.body.endDate) {
        const endDate = new Date(req.body.endDate);
        if (isNaN(endDate.getTime())) {
          return res.status(400).json({ 
            message: 'Invalid end date format'
          });
        }
        query += ' AND date_add <= ?';
        queryParams.push(req.body.endDate);
      }
    }

    query += ' ORDER BY equipment_id';
    console.log("Final query:", query);
    console.log("Query parameters:", queryParams);

    // Execute query with Promise
    const [results] = await db.query(query, queryParams);
    
    if (!results || results.length === 0) {
      return res.status(404).json({ 
        message: 'ไม่พบข้อมูลครุภัณฑ์ตามเงื่อนไขที่ระบุ'
      });
    }

    console.log(`Found ${results.length} equipment records`);

    // แปลงผลลัพธ์เป็นรูปแบบที่จะส่งไปยัง Google Sheets
    const values = results.map(item => [
      item.equipment_id || "",
      item.equipment_name || "",
      item.spec || "",
      item.equipment_type || "",
      item.price || "",
      item.date_add ? new Date(item.date_add).toLocaleDateString('th-TH') : "",
      item.location || "",
      `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(item.equipment_id || "NO_ID")}`
    ]);

    console.log("Preparing to send to Google Sheets:", values.length, "rows");

    // เพิ่มหรืออัปเดตข้อมูลลงใน Google Sheets
    const result = await addToGoogleSheet(values);
    
    return res.status(200).json({
      message: `ปรับปรุงข้อมูลลง Google Sheets สำเร็จ! เพิ่ม ${result.added} รายการ`,
      count: results.length,
      updated: result.updated,
      added: result.added
    });

  } catch (error) {
    console.error("Error in updateSheet:", error);
    return res.status(500).json({ 
      message: "ไม่สามารถอัปเดตข้อมูลลง Google Sheets", 
      error: error.message 
    });
  }
});

// แสดงข้อมูลทั้งหมด
router.get('/', verifyToken, async (_, res) => {
  try {
    const [results] = await db.query('SELECT * FROM equipments ORDER BY equipment_id');
    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching equipment' });
  }
});

// แสดงข้อมูลทั้งหมด
router.get('/GETequipments', verifyToken, async (_, res) => {
  try {
    const type = "ครุภัณฑ์";
    const [results] = await db.query('SELECT * FROM equipments WHERE type = ? ORDER BY equipment_id', [type]);
    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching equipment', error: err });
  }
});

// แสดงข้อมูลพัสดุทั้งหมด
router.get('/GETsupplies', verifyToken, async (_, res) => {
  try {
    const type = "พัสดุ";
    const [results] = await db.query('SELECT * FROM equipments WHERE type = ? ORDER BY equipment_id', [type]);
    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching equipment', error: err });
  }
});

// ฟังก์ชันลบหรืออัปเดตข้อมูล
const executeQuery = async (query, params, res, successMessage) => {
  try {
    const [results] = await db.query(query, params);
    if (results.affectedRows === 0) return res.status(404).json({ message: 'Equipment not found' });
    res.status(200).json({ message: successMessage });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

// ลบข้อมูล
router.delete('/:equipment_id', verifyToken, (req, res) => {
  executeQuery('DELETE FROM equipments WHERE equipment_id = ?', [req.params.equipment_id], res, 'Equipment deleted successfully');
});

// แก้ไขข้อมูล
router.put('/:equipment_id', verifyToken, (req, res) => {
  const { equipment_id, equipment_name, spec, equipment_type, price, date_add, location, quantity, type, user_id } = req.body;
  const query = `UPDATE equipments SET equipment_id=?, equipment_name=?, spec=?, equipment_type=?, price=?, date_add=?, location=?, quantity=?, type=?, user_id=? WHERE equipment_id=?`;
  executeQuery(query, [equipment_id, equipment_name, spec, equipment_type, price, date_add, location, quantity, type, user_id, req.params.equipment_id], res, 'Equipment updated successfully');
});

router.get('/:equipment_id', verifyToken, async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM equipments WHERE equipment_id = ?', [req.params.equipment_id]);
    
    if (!results || results.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Equipment not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Equipment fetched successfully',
      data: results[0]
    });
  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Database error', 
      error: err.message 
    });
  }
});

// อัปโหลดข้อมูลจากไฟล์ JSON หรือ Excel
router.post('/upload', verifyToken, async (req, res) => {
  try {
    const equipments = req.body;

    if (!Array.isArray(equipments) || equipments.length === 0) {
      return res.status(400).json({ message: 'Invalid data format' });
    }

    const values = equipments.map(item => [
      item['equipment_id'],
      item['equipment_name'],
      item['spec'],
      item['equipment_type'],
      item['price'],
      item['date_add'],
      item['location']
    ]);

    const query = 'INSERT INTO equipments (equipment_id, equipment_name, spec, equipment_type, price, date_add, location) VALUES ?';
    const [results] = await db.query(query, [values]);
    res.status(200).json({ message: `${results.affectedRows} equipment added successfully!` });
  } catch (err) {
    res.status(500).json({ message: 'Error inserting equipments', error: err.message });
  }
});

module.exports = router;
