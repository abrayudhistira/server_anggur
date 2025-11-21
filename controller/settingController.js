const db = require('../config/db');
const socketManager = require('../services/socketManager');

const SETTING_NAME = 'Valve'

exports.getSettingStatus = async (req, res) => {
    try {
        const setting = await db.setting.findOne({ 
            where: { namaSetting: SETTING_NAME } 
        });

        if (!setting) {
            const initialSetting = await db.setting.create({
                namaSetting: SETTING_NAME,
                status: 'OFF'
            });
            return res.status(200).json({ 
                message: 'Setting berhasil dimuat (Default: OFF).',
                data: initialSetting
            });
        }
        
        return res.status(200).json({ 
            message: 'Setting berhasil dimuat.',
            data: setting
        });
        
    } catch (err) {
        console.error('Error saat mengambil setting:', err);
        return res.status(500).json({ message: 'Gagal mengambil data setting dari database.' });
    }
};

exports.updateSettingStatus = async (req, res) => {
    const { status } = req.body;
    
    if (!status || (status !== 'ON' && status !== 'OFF')) {
        return res.status(400).json({ message: 'Input status tidak valid. Harus "ON" atau "OFF".' });
    }

    try {
        let setting = await db.setting.findOne({ 
            where: { namaSetting: SETTING_NAME } 
        });

        if (!setting) {
             setting = await db.setting.create({
                namaSetting: SETTING_NAME,
                status: status
            });
        } else {
             setting.status = status;
             await setting.save();
        }

        const io = socketManager.getIO(); 

        io.emit('setting_update', {
            id: setting.id,
            namaSetting: setting.namaSetting,
            status: setting.status,
            updatedAt: setting.updatedAt
        });

        return res.status(200).json({ 
            message: `Status berhasil diubah menjadi ${setting.status}.`,
            data: setting
        });
        
    } catch (err) {
        console.error('Error saat update setting:', err);
        return res.status(500).json({ message: 'Gagal memperbarui data setting di database.' });
    }
};