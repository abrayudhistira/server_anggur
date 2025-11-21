const db = require('../config/db');
require('dotenv').config();
const socketManager = require('../services/socketManager'); 

const REQUIRED_SECRET_KEY = process.env.DEVICE_SECRET_KEY;

const VALVE_SETTING_NAME = 'Valve';
const MODE_SETTING_NAME = 'Valve_Mode';

const checkAutomaticControl = async (humidityValue) => {
    // 1. Ambil status mode (Auto/Manual)
    const modeSetting = await db.setting.findOne({
        where: { namaSetting: MODE_SETTING_NAME }
    });

    // Jika mode tidak 'Auto', kontrol otomatis diabaikan
    if (!modeSetting || modeSetting.status !== 'Auto') {
        return; 
    }

    // 2. Ambil status valve saat ini
    let valveSetting = await db.setting.findOne({
        where: { namaSetting: VALVE_SETTING_NAME }
    });
    
    // Inisialisasi jika setting valve belum ada
    if (!valveSetting) {
        valveSetting = await db.setting.create({
            namaSetting: VALVE_SETTING_NAME,
            status: 'OFF'
        });
    }

    let newStatus = valveSetting.status;
    let shouldUpdate = false;

    // 3. Terapkan Logika Kontrol
    // Kering: Kelembaban < 400 -> ON
    if (humidityValue < 400 && valveSetting.status === 'OFF') {
        newStatus = 'ON';
        shouldUpdate = true;
    } 
    // Basah: Kelembaban > 700 -> OFF
    else if (humidityValue > 700 && valveSetting.status === 'ON') {
        newStatus = 'OFF';
        shouldUpdate = true;
    }

    // 4. Update dan Broadcast jika ada perubahan
    if (shouldUpdate) {
        valveSetting.status = newStatus;
        await valveSetting.save();

        const io = socketManager.getIO();
        io.emit('setting_update', {
            id: valveSetting.id,
            namaSetting: valveSetting.namaSetting,
            status: valveSetting.status,
            updatedAt: valveSetting.updatedAt
        });

        console.log(`[Auto Control] Suhu ${humidityValue}. Valve diubah menjadi: ${newStatus}`);
    }
};

exports.postSuhu = async (req, res) => {
    const clientSecretKey = req.headers['x-api-key'];    
    const { humidity } = req.body; 
    
    if (!clientSecretKey || clientSecretKey !== REQUIRED_SECRET_KEY) {
        return res.status(403).json({ 
            message: 'Akses Ditolak: Header X-API-Key tidak valid.' 
        });
    }
    if (!humidity) {
        return res.status(400).json({ 
            message: 'Data kelembaban (humidity) wajib disertakan.' 
        });
    }

    const humidityValue = parseFloat(humidity);
    if (isNaN(humidityValue)) {
        return res.status(400).json({ 
            message: 'Nilai kelembaban harus berupa angka.' 
        });
    }

    try {
        const payload = {
            humidity: humidityValue,
        };

        const newSuhu = await db.suhu.create(payload);

        checkAutomaticControl(humidityValue); 

        const io = socketManager.getIO(); 

        io.emit('suhu_update', {
            id: newSuhu.id,
            humidity: newSuhu.humidity,
            timestamp: newSuhu.createdAt // Waktu kapan data disimpan
        });
        
        return res.status(201).json({ 
            message: 'Data suhu berhasil disimpan, disiarkan, dan kontrol otomatis dijalankan.',
            data: {
                id: newSuhu.id,
                humidity: newSuhu.humidity
            }
        });
        
    } catch (err) {
        console.error('Database save error:', err);
        return res.status(500).json({ message: 'Gagal menyimpan data ke database.' });
    }
};