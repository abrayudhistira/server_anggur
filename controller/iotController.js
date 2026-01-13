const db = require('../config/db');
require('dotenv').config();
const socketManager = require('../services/socketManager'); 
const logger = require('../services/logger');
const notificationService = require('../services/notificationService');
const REQUIRED_SECRET_KEY = process.env.DEVICE_SECRET_KEY;

const VALVE_SETTING_NAME = 'Valve';
const MODE_SETTING_NAME = 'Valve_Mode';

// Helper log function
const log = (tag, message, obj) => {
  const ts = new Date().toISOString();
  if (obj !== undefined) {
    try {
      console.log(`[${ts}] [${tag}] ${message}`, obj);
    } catch (e) {
      console.log(`[${ts}] [${tag}] ${message} (object could not be stringified)`);
    }
  } else {
    console.log(`[${ts}] [${tag}] ${message}`);
  }
};

const checkAutomaticControl = async (humidityValue) => {
    log('AUTO_CONTROL', `Mulai pemeriksaan kontrol otomatis untuk humidity=${humidityValue}`);

    try {
        // 1. Ambil status mode (Auto/Manual)
        const modeSetting = await db.setting.findOne({
            where: { namaSetting: MODE_SETTING_NAME }
        });

        if (!modeSetting || modeSetting.status !== 'Auto') {
            log('AUTO_CONTROL', `Mode bukan 'Auto'. Mengabaikan kontrol otomatis.`);
            return; 
        }

        // 2. Ambil status valve saat ini
        let valveSetting = await db.setting.findOne({
            where: { namaSetting: VALVE_SETTING_NAME }
        });

        if (!valveSetting) {
            log('AUTO_CONTROL', 'Setting valve tidak ditemukan. Membuat status OFF');
            valveSetting = await db.setting.create({
                namaSetting: VALVE_SETTING_NAME,
                status: 'OFF'
            });
        }

        let newStatus = valveSetting.status;
        let shouldUpdate = false;

        // 3. Terapkan Logika Kontrol
        if (humidityValue < 400 && valveSetting.status === 'OFF') {
            newStatus = 'ON';
            shouldUpdate = true;
        } 
        else if (humidityValue > 500 && valveSetting.status === 'ON') {
            newStatus = 'OFF';
            shouldUpdate = true;
        }

        // 4. Update, Broadcast Socket, dan Kirim Push Notification
        if (shouldUpdate) {
            valveSetting.status = newStatus;
            await valveSetting.save();

            // Broadcast via Socket.io
            const io = socketManager.getIO();
            io.emit('setting_update', {
                id: valveSetting.id,
                namaSetting: valveSetting.namaSetting,
                status: valveSetting.status,
                updatedAt: valveSetting.updatedAt
            });

            // KIRIM NOTIFIKASI FCM
            const title = "SmartGrape - Kontrol Valve";
            const body = newStatus === 'ON' 
                ? `⚠️ Tanah Kering (${humidityValue}H). Valve dinyalakan otomatis.` 
                : `✅ Tanah Cukup Basah (${humidityValue}H). Valve dimatikan.`;

            notificationService.sendToAllAdmins(title, body);

            log('AUTO_CONTROL', `[SUCCESS] Status valve diubah ke ${newStatus} & Notifikasi dikirim.`);
        }

        log('AUTO_CONTROL', 'Selesai pemeriksaan kontrol otomatis.');
    } catch (err) {
        log('ERROR', 'Terjadi kesalahan saat checkAutomaticControl:', { message: err.message });
    }
};

exports.postSuhu = async (req, res) => {
    const clientSecretKey = req.headers['x-api-key'];    
    const { humidity } = req.body; 
    
    if (!clientSecretKey || clientSecretKey !== REQUIRED_SECRET_KEY) {
        return res.status(403).json({ message: 'Akses Ditolak: Header X-API-Key tidak valid.' });
    }

    if (humidity === undefined || humidity === null) {
        return res.status(400).json({ message: 'Data kelembaban (humidity) wajib disertakan.' });
    }

    const humidityValue = parseFloat(humidity);
    if (isNaN(humidityValue)) {
        return res.status(400).json({ message: 'Nilai kelembaban harus berupa angka.' });
    }

    try {
        const payload = { humidity: humidityValue };
        const newSuhu = await db.suhu.create(payload);

        // File log harian (non-blocking)
        const entry = {
            id: newSuhu.id,
            humidity: Number(newSuhu.humidity),
            timestamp: newSuhu.createdAt
        };
        logger.appendHumidity(entry).catch(err => log('ERROR', 'appendHumidity gagal', err));

        // Jalankan kontrol otomatis (non-blocking)
        checkAutomaticControl(humidityValue);

        // Broadcast suhu terbaru ke dashboard via Socket
        const io = socketManager.getIO(); 
        io.emit('suhu_update', {
            id: newSuhu.id,
            humidity: newSuhu.humidity,
            timestamp: newSuhu.createdAt
        });
        
        return res.status(201).json({ 
            message: 'Data berhasil diproses.',
            data: { id: newSuhu.id, humidity: newSuhu.humidity }
        });
        
    } catch (err) {
        log('ERROR', 'Database save error:', err.message);
        return res.status(500).json({ message: 'Gagal menyimpan data.' });
    }
};
