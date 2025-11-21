const db = require('../config/db');
require('dotenv').config();
const socketManager = require('../services/socketManager'); 

const REQUIRED_SECRET_KEY = process.env.DEVICE_SECRET_KEY;

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

        const io = socketManager.getIO(); 

        io.emit('suhu_update', {
            id: newSuhu.id,
            humidity: newSuhu.humidity,
            timestamp: newSuhu.createdAt // atau waktu lain yang Anda butuhkan
        });

        return res.status(201).json({ 
            message: 'Data suhu berhasil disimpan dan disiarkan.',
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