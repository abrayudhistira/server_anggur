const jwt = require('jsonwebtoken');
const db = require('../config/db'); // 💡 Import db untuk akses BlacklistToken
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

const verifySuperAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Token tidak ditemukan atau format salah." });
        }

        const token = authHeader.split(" ")[1];

        // 1. Verifikasi JWT
        const decoded = jwt.verify(token, JWT_SECRET);

        // 2. Cek role
        if (decoded.role !== "superadmin") {
            return res.status(403).json({ message: "Akses ditolak. Hanya superadmin." });
        }

        req.userData = decoded; // simpan data user untuk controller
        next();

    } catch (err) {
        return res.status(403).json({ message: "Token tidak valid atau kedaluwarsa." });
    }
};

module.exports = verifySuperAdmin;