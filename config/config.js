require("dotenv").config();

module.exports = {
    db: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
    },
    server: {
        port: process.env.PORT || 8080,
    },
    jwtSecret: process.env.JWT_SECRET,
};
