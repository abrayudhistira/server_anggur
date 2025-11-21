require('dotenv').config();
const db = require('../config/db');

module.exports = async function (req, res, next) {
    if (!req.session || !req.session.id) {
        return res.status(403).json({ 
            message: 'Unauthorized' 
        });
    }
    try {
        const user = await db.users.findByPk(req.session.id);
        if (!user) {
            req.session.destroy(err => {
                if (err) console.error('Error destroying session:', err);
                return res.status(403).json({ 
                    message: 'Pengguna tidak ditemukan' 
                });
            });
            return;
        }

        if (user.role === 'superadmin') {
            return next();
        }
        return res.status(403).json({ 
            message: 'Akses Ditolak: Superadmin only' 
        });

        req.user = user.toJSON();
        next();
    } catch (err) {
        console.error(err.message);
        req.session.destroy(err => {
            if (err) console.error('Error destroying session:', err);
            return res.status(403).json({
                message: 'Sesi anda tidak valid, Silahkan login kembali'
            });
        });
    }
};
