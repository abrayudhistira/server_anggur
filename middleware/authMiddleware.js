const jwt = require('jsonwebtoken');
const db = require('../config/db'); // 💡 Import db untuk akses BlacklistToken
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

exports.verifyTokenAndRole = (allowedRoles) => async (req, res, next) => { // 💡 Tambahkan 'async'
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Akses Ditolak: Token tidak ditemukan atau format salah.' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
        // --- 1. Cek Daftar Hitam (Blacklist) ---
        const isBlacklisted = await db.blacklist_token.findOne({ 
            where: { token: token } 
        });

        if (isBlacklisted) {
            return res.status(403).json({ message: 'Token ini telah dibatalkan (logged out).' });
        }
        
        // --- 2. Verifikasi JWT ---
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userData = decoded; // Menyimpan data user di request

        // --- 3. Cek Role (Otorisasi) ---
        if (allowedRoles && !allowedRoles.includes(decoded.role)) {
            return res.status(403).json({ message: `Akses Ditolak: Hanya untuk peran ${allowedRoles.join(', ')}.` });
        }
        
        next();
    } catch (err) {
        // Ini menangkap kesalahan verifikasi JWT (expired, invalid signature)
        return res.status(403).json({ message: 'Token tidak valid atau kedaluwarsa.' });
    }
};