const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
const { jwtSecret } = require("../config/config");

const router = express.Router();

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    try {
        const verified = jwt.verify(token, jwtSecret);
        req.user = verified;
        next();
    } catch (err) {
        res.status(401).json({ error: "Invalid token" });
    }
};

// Generate unique user_id (IT-XXXXXX)
const generateUserId = () => {
    return `IT-${Math.floor(100000 + Math.random() * 900000)}`;
};

// Register Endpoint
router.post("/register", async (req, res) => {
    const { email, password, full_name, work_role, role } = req.body;
    
    // Validate role
    const validRoles = ['Administrator', 'Viewer'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role specified" });
    }
    
    try {
        // Check if email already exists
        const [existingUsers] = await db.query("SELECT email FROM users_it WHERE email = ?", [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: "Email already exists" });
        }

        const user_id = generateUserId();
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await db.query(
            "INSERT INTO users_it (user_id, email, password, full_name, work_role, role) VALUES (?, ?, ?, ?, ?, ?)",
            [user_id, email, hashedPassword, full_name, work_role, role]
        );
        
        res.json({ message: "User registered successfully", user_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login Endpoint
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const [users] = await db.query("SELECT * FROM users_it WHERE email = ?", [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }
        
        const token = jwt.sign({ user_id: user.user_id, role: user.role }, jwtSecret, { expiresIn: "1h" });
        res.json({ message: "Login successful", token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Remove the combined exports at the end and just export the router
module.exports = router;
