const db = require('../config/db');
const socketManager = require('../services/socketManager');

// const SETTING_NAME = 'Valve'

const VALVE_SETTING_NAME = 'Valve'; 
const MODE_SETTING_NAME = 'Valve_Mode'; 

const getSettingByName = async (name, defaultStatus) => {
    let setting = await db.setting.findOne({ 
        where: { namaSetting: name } 
    });

    if (!setting) {
        // Buat data awal jika belum ada
        setting = await db.setting.create({
            namaSetting: name,
            status: defaultStatus
        });
    }
    return setting;
};
exports.getAllSettings = async (req, res) => {
    try {
        // Ambil status Valve (default: OFF)
        const valveSetting = await getSettingByName(VALVE_SETTING_NAME, 'OFF');
        
        // Ambil status Mode (default: Manual)
        const modeSetting = await getSettingByName(MODE_SETTING_NAME, 'Manual');
        
        return res.status(200).json({ 
            message: 'Semua setting berhasil dimuat.',
            data: [
                valveSetting.get({ plain: true }), // Konversi Sequelize object ke plain JSON
                modeSetting.get({ plain: true })
            ]
        });
        
    } catch (err) {
        console.error('Error saat mengambil semua setting:', err);
        return res.status(500).json({ message: 'Gagal mengambil data setting dari database.' });
    }
};
exports.updateValveStatus = async (req, res) => {
    const { status } = req.body;
    
    // Validasi input
    if (!status || (status !== 'ON' && status !== 'OFF')) {
        return res.status(400).json({ message: 'Input status Valve tidak valid. Harus "ON" atau "OFF".' });
    }

    try {
        // Cek Mode saat ini. Jika 'Auto', tolak update manual.
        const modeSetting = await db.setting.findOne({ 
            where: { namaSetting: MODE_SETTING_NAME } 
        });

        if (modeSetting && modeSetting.status === 'Auto') {
            return res.status(403).json({ message: 'Akses Ditolak: Valve dalam mode Otomatis. Ubah ke Manual untuk kontrol.' });
        }
        
        // Lanjutkan update jika mode bukan 'Auto' (Manual atau belum diset)
        let valveSetting = await db.setting.findOne({ 
            where: { namaSetting: VALVE_SETTING_NAME } 
        });

        if (!valveSetting) {
             // Jika data belum ada, buat (initial create)
             valveSetting = await db.setting.create({
                namaSetting: VALVE_SETTING_NAME,
                status: status
            });
        } else {
             // Update status
             valveSetting.status = status;
             await valveSetting.save();
        }

        const io = socketManager.getIO(); 

        // Broadcasting data setting yang baru
        io.emit('setting_update', {
            id: valveSetting.id,
            namaSetting: valveSetting.namaSetting,
            status: valveSetting.status,
            updatedAt: valveSetting.updatedAt
        });

        return res.status(200).json({ 
            message: `Status Valve berhasil diubah menjadi ${valveSetting.status}.`,
            data: valveSetting
        });
        
    } catch (err) {
        console.error('Error saat update Valve setting:', err);
        return res.status(500).json({ message: 'Gagal memperbarui data Valve setting di database.' });
    }
};

// --- 3. Update Status Mode (PUT) dan Broadcasting ---
exports.updateModeStatus = async (req, res) => {
    const { status } = req.body;
    
    // Validasi input
    if (!status || (status !== 'Auto' && status !== 'Manual')) {
        return res.status(400).json({ message: 'Input status Mode tidak valid. Harus "Auto" atau "Manual".' });
    }

    try {
        let modeSetting = await db.setting.findOne({ 
            where: { namaSetting: MODE_SETTING_NAME } 
        });

        if (!modeSetting) {
             modeSetting = await db.setting.create({
                namaSetting: MODE_SETTING_NAME,
                status: status
            });
        } else {
             modeSetting.status = status;
             await modeSetting.save();
        }

        const io = socketManager.getIO(); 

        // Broadcasting data setting mode yang baru
        io.emit('setting_update', {
            id: modeSetting.id,
            namaSetting: modeSetting.namaSetting,
            status: modeSetting.status,
            updatedAt: modeSetting.updatedAt
        });

        return res.status(200).json({ 
            message: `Mode Valve berhasil diubah menjadi ${modeSetting.status}.`,
            data: modeSetting
        });
        
    } catch (err) {
        console.error('Error saat update Mode setting:', err);
        return res.status(500).json({ message: 'Gagal memperbarui data Mode setting di database.' });
    }
};