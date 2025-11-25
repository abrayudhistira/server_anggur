const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
                username: usernameTrim,
                password: hashPassword,
                role: role || 'admin',
            };
            const registerUser = await db.users.create(userPayload, { transaction: trans });

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

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username dan password kosong.' });
        }
        const foundUser = await db.users.findOne({ where: { username } });
        if (!foundUser) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, foundUser.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({
            id: foundUser.id,
            role: foundUser.role
        },
            process.env.JWT_SECRET,
            { expiresIn: '1d' });
        res.json({
            message: 'Login successful',
            token,
            user:
            {
                id: foundUser.userid,
                username: foundUser.username,
                role: foundUser.role,
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

exports.resetPassword = async (req, res) => {
    const { username, newPassword } = req.body;

    // Validasi Find User
    if (!username || !newPassword) {
        return res.status(400).json({ message: 'Nilai Username dan password Invalid.' });
    }

    const trans = await db.sequelize.transaction(); // Mulai transaksi
    try {
        let saltRounds = parseInt(process.env.ROUND, 10);

        // Validasi saltRounds
        if (isNaN(saltRounds) || saltRounds < 4 || saltRounds > 31) {
            console.error('Invalid or missing ROUND environment variable. Defaulting to 10.');
            saltRounds = 10;
        }

        const hashPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password user
        const updated = await db.users.update(
            { password: hashPassword },
            { where: { username }, transaction: trans }
        );

        if (updated[0] === 0) {
            await trans.rollback();
            return res.status(404).json({ message: 'User tidak ditemukan.' });
        }

        await trans.commit(); // Commit jika berhasil
        return res.status(200).json({ message: 'Password berhasil direset.' });
    } catch (errTx) {
        await trans.rollback(); // Rollback jika terjadi error
        console.error('Transaction error in resetPassword:', errTx);
        const errorMsg = errTx && errTx.message ? errTx.message : 'Gagal mereset password (transaksi dibatalkan).';
        return res.status(500).json({ message: 'Rollback', error: errorMsg });
    }
};



exports.updateRole = async (req, res) => {
    const { username, newRole } = req.body;

    if (!username || !newRole) {
        return res.status(400).json({ message: 'Nilai Username dan role Invalid.' });
    }

    const trans = await db.sequelize.transaction();
    try {
        // Cek user dulu
        const user = await db.users.findOne({ where: { username } });

        if (!user) {
            await trans.rollback();
            return res.status(404).json({ message: 'User tidak ditemukan.' });
        }

        // Jika role sudah sama, tetap return success
        if (user.role === newRole) {
            await trans.commit();
            return res.status(200).json({ message: 'Role sudah sama, tidak ada perubahan.' });
        }

        // Update role
        await db.users.update(
            { role: newRole },
            { where: { username }, transaction: trans }
        );

        await trans.commit();
        return res.status(200).json({ message: 'Role berhasil diupdate.' });

    } catch (errTx) {
        await trans.rollback();
        return res.status(500).json({ message: 'Rollback', error: errTx.message });
    }
};


exports.updateUsername = async (req, res) => {
    const { username, newUsername } = req.body;

    if (!username || !newUsername) {
        return res.status(400).json({ message: 'Username lama dan username baru wajib diisi.' });
    }

    const trans = await db.sequelize.transaction();
    try {
        const user = await db.users.findOne({
            where: { username },
            transaction: trans
        });

        if (!user) {
            await trans.rollback();
            return res.status(404).json({ message: 'User tidak ditemukan.' });
        }

        const exist = await db.users.findOne({
            where: { username: newUsername },
            transaction: trans
        });

        if (exist) {
            await trans.rollback();
            return res.status(409).json({ message: 'Username baru sudah dipakai.' });
        }

        await db.users.update(
            { username: newUsername },
            { where: { username }, transaction: trans }
        );

        await trans.commit();
        return res.status(200).json({ message: 'Username berhasil diperbarui.' });

    } catch (errTx) {
        await trans.rollback();
        console.error('Transaction error in updateUsername:', errTx);
        return res.status(500).json({
            message: 'Rollback',
            error: errTx.message || 'Gagal update username.'
        });
    }
};


exports.deleteAccount = async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ message: 'Username wajib diisi.' });
    }

    const trans = await db.sequelize.transaction();
    try {
        const deleted = await db.users.destroy({
            where: { username },
            transaction: trans
        });

        if (deleted === 0) {
            await trans.rollback();
            return res.status(404).json({ message: 'User tidak ditemukan.' });
        }

        await trans.commit();
        return res.status(200).json({ message: 'Akun berhasil dihapus.' });

    } catch (errTx) {
        await trans.rollback();
        console.error('Transaction error in deleteAccount:', errTx);
        return res.status(500).json({
            message: 'Rollback',
            error: errTx.message || 'Gagal menghapus akun.'
        });
    }
};


exports.getAllUsers = async (req, res) => {
    const trans = await db.sequelize.transaction(); // Mulai transaksi

    try {
        const users = await db.users.findAll({
            attributes: ["id", "username", "role"],  // Jangan kirim password!
            transaction: trans
        });

        await trans.commit(); // Commit transaksi

        return res.status(200).json({
            message: "Daftar user berhasil diambil.",
            users
        });

    } catch (errTx) {
        await trans.rollback(); // Rollback jika error

        console.error("Transaction error in getAllUsers:", errTx);
        const errorMsg = errTx && errTx.message
            ? errTx.message
            : "Gagal mengambil daftar user (transaksi dibatalkan).";

        return res.status(500).json({
            message: "Rollback",
            error: errorMsg
        });
    }
};
