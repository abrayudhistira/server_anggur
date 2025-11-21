const db = require('../config/db');
const bcrypt = require('bcryptjs');

require('dotenv').config(); 

exports.register = async (req, res) => {
    const {
        username, password, role
    } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ 
            message: 'Username, password, dan role wajib diisi.'
        });
    }

    try {
        const usernameTrim = String(username).trim();

        const existing = await db.users.findOne({ where: { username: usernameTrim } });
        
        if (existing) {
            return res.status(409).json({ message: 'Username sudah terdaftar.' });
        }
        const trans = await db.sequelize.transaction();
        try {
            const saltRounds = parseInt(process.env.ROUND, 10);
            
            // Periksa apakah konversi berhasil dan memiliki nilai yang wajar (opsional)
            if (isNaN(saltRounds) || saltRounds < 4 || saltRounds > 31) {
                console.error('Invalid or missing ROUND environment variable. Defaulting to 10.');
                saltRounds = 10; // Gunakan nilai default yang aman
            }
            const hashPassword = await bcrypt.hash(password, saltRounds);
            const userPayload = {
                username : usernameTrim,
                password : hashPassword,
                role : role || 'admin',
            };
            const registerUser  = await db.users.create(userPayload, { transaction: trans });

            await trans.commit();

            console.log(registerUser);

            return res.status(201).json({ 
                message: 'Pengguna berhasil didaftarkan.', 
            });
        } catch (errTx) {
            await trans.rollback();
            console.error('Transaction error in register:', errTx);
            const errorMsg = errTx && errTx.message ? errTx.message : 'Gagal menyimpan data (transaksi dibatalkan).';
            return res.status(500).json({ message: 'Rollback', error: errorMsg });
            // return res.redirect('/register?error=' + encodeURIComponent(errorMsg));
        }
    } catch (err) {
        console.error('Register error:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
}