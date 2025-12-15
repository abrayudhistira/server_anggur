const db = require('../config/db');
require('dotenv').config();
const socketManager = require('../services/socketManager'); 
const logger = require('../services/logger');

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
        log('AUTO_CONTROL', `Mengambil setting mode (${MODE_SETTING_NAME}) dari DB`);
        const modeSetting = await db.setting.findOne({
            where: { namaSetting: MODE_SETTING_NAME }
        });
        log('AUTO_CONTROL', 'Hasil query modeSetting:', modeSetting ? {
          id: modeSetting.id,
          namaSetting: modeSetting.namaSetting,
          status: modeSetting.status,
          updatedAt: modeSetting.updatedAt
        } : null);

        // Jika mode tidak 'Auto', kontrol otomatis diabaikan
        if (!modeSetting || modeSetting.status !== 'Auto') {
            log('AUTO_CONTROL', `Mode bukan 'Auto' (modeSetting=${modeSetting ? modeSetting.status : 'null'}). Mengabaikan kontrol otomatis.`);
            return; 
        }

        // 2. Ambil status valve saat ini
        log('AUTO_CONTROL', `Mengambil setting valve (${VALVE_SETTING_NAME}) dari DB`);
        let valveSetting = await db.setting.findOne({
            where: { namaSetting: VALVE_SETTING_NAME }
        });
        log('AUTO_CONTROL', 'Hasil query valveSetting sebelum inisialisasi:', valveSetting ? {
          id: valveSetting.id,
          namaSetting: valveSetting.namaSetting,
          status: valveSetting.status,
          updatedAt: valveSetting.updatedAt
        } : null);

        // Inisialisasi jika setting valve belum ada
        if (!valveSetting) {
            log('AUTO_CONTROL', 'Setting valve tidak ditemukan. Membuat setting valve dengan status OFF');
            valveSetting = await db.setting.create({
                namaSetting: VALVE_SETTING_NAME,
                status: 'OFF'
            });
            log('AUTO_CONTROL', 'Setting valve baru dibuat:', {
              id: valveSetting.id,
              namaSetting: valveSetting.namaSetting,
              status: valveSetting.status,
              createdAt: valveSetting.createdAt
            });
        }

        let newStatus = valveSetting.status;
        let shouldUpdate = false;

        // 3. Terapkan Logika Kontrol
        log('AUTO_CONTROL', `Mengevaluasi logika kontrol dengan humidity=${humidityValue} dan valveStatusSaatIni=${valveSetting.status}`);
        // Kering: Kelembaban < 400 -> ON
        if (humidityValue < 400 && valveSetting.status === 'OFF') {
            newStatus = 'ON';
            shouldUpdate = true;
            log('AUTO_CONTROL', `Kondisi 'kering' terpenuhi (humidity < 400). Menentukan untuk menyalakan Valve.`);
        } 
        // Basah: Kelembaban > 700 -> OFF
        else if (humidityValue > 500 && valveSetting.status === 'ON') {
            newStatus = 'OFF';
            shouldUpdate = true;
            log('AUTO_CONTROL', `Kondisi 'basah' terpenuhi (humidity > 700). Menentukan untuk mematikan Valve.`);
        } else {
            log('AUTO_CONTROL', 'Tidak ada perubahan status valve yang diperlukan.');
        }

        // 4. Update dan Broadcast jika ada perubahan
        if (shouldUpdate) {
            log('AUTO_CONTROL', `Mengupdate status valve menjadi ${newStatus} di DB (id=${valveSetting.id})`);
            valveSetting.status = newStatus;
            await valveSetting.save();
            log('AUTO_CONTROL', 'Update valve disimpan ke DB:', {
              id: valveSetting.id,
              status: valveSetting.status,
              updatedAt: valveSetting.updatedAt
            });

            const io = socketManager.getIO();
            log('SOCKET', 'Mengirim event setting_update ke clients via socket.io', {
              id: valveSetting.id,
              namaSetting: valveSetting.namaSetting,
              status: valveSetting.status,
              updatedAt: valveSetting.updatedAt
            });
            io.emit('setting_update', {
                id: valveSetting.id,
                namaSetting: valveSetting.namaSetting,
                status: valveSetting.status,
                updatedAt: valveSetting.updatedAt
            });

            log('AUTO_CONTROL', `[Auto Control] Humidity ${humidityValue}. Valve diubah menjadi: ${newStatus}`);
        }

        log('AUTO_CONTROL', 'Selesai pemeriksaan kontrol otomatis.');
    } catch (err) {
        log('ERROR', 'Terjadi kesalahan saat checkAutomaticControl:', { message: err.message, stack: err.stack });
    }
};

exports.postSuhu = async (req, res) => {
    log('IOT', `Menerima POST data dari ${req.ip}`);
    log('IOT', 'Headers diterima:', req.headers);
    log('IOT', 'Body diterima:', req.body);

    const clientSecretKey = req.headers['x-api-key'];    
    const { humidity } = req.body; 
    
    // Validasi API Key
    log('AUTH', 'Memeriksa header X-API-Key');
    if (!clientSecretKey || clientSecretKey !== REQUIRED_SECRET_KEY) {
        log('AUTH', 'Gagal validasi API Key', { providedKey: clientSecretKey ? 'present' : 'missing' });
        return res.status(403).json({ message: 'Akses Ditolak: Header X-API-Key tidak valid.' });
    }
    log('AUTH', 'Validasi API Key berhasil.');

    // Validasi payload humidity
    log('VALIDATION', 'Memeriksa keberadaan field humidity');
    if (humidity === undefined || humidity === null) {
        log('VALIDATION', 'Field humidity tidak disertakan pada body');
        return res.status(400).json({ message: 'Data kelembaban (humidity) wajib disertakan.' });
    }

    const humidityValue = parseFloat(humidity);
    log('VALIDATION', `Parsing nilai humidity -> ${humidity} menjadi ${humidityValue}`);
    if (isNaN(humidityValue)) {
        log('VALIDATION', 'Nilai humidity bukan angka');
        return res.status(400).json({ message: 'Nilai kelembaban harus berupa angka.' });
    }

    try {
        const payload = { humidity: humidityValue };

        log('DB', 'Menyimpan data suhu ke tabel suhu:', payload);
        const newSuhu = await db.suhu.create(payload);
        log('DB', 'Data suhu berhasil disimpan:', {
          id: newSuhu.id,
          humidity: newSuhu.humidity,
          createdAt: newSuhu.createdAt
        });

        // --- Simpan juga ke file log harian (non-blocking) ---
        try {
          const entry = {
            id: newSuhu.id,
            humidity: Number(newSuhu.humidity),
            timestamp: (newSuhu.createdAt instanceof Date) ? newSuhu.createdAt.toISOString() : new Date().toISOString()
          };
          // panggil tanpa await agar tidak menunda response
          logger.appendHumidity(entry).catch(err => {
            log('ERROR', 'appendHumidity gagal:', { message: err.message, stack: err.stack });
          });
          log('LOG', 'Entry ditambahkan ke NDJSON (asinkron):', entry);
        } catch (e) {
          log('ERROR', 'Kesalahan saat mempersiapkan entry log file:', { message: e.message });
        }

        // Jalankan kontrol otomatis (non-blocking)
        try {
          log('AUTO_CONTROL', 'Memanggil checkAutomaticControl (non-blocking)');
          checkAutomaticControl(humidityValue);
        } catch (e) {
          log('ERROR', 'Gagal memanggil checkAutomaticControl:', { message: e.message });
        }

        const io = socketManager.getIO(); 
        log('SOCKET', 'Mengirim event suhu_update ke clients via socket.io', {
          id: newSuhu.id,
          humidity: newSuhu.humidity,
          timestamp: newSuhu.createdAt
        });

        io.emit('suhu_update', {
            id: newSuhu.id,
            humidity: newSuhu.humidity,
            timestamp: newSuhu.createdAt
        });
        
        return res.status(201).json({ 
            message: 'Data suhu berhasil disimpan, disiarkan, dan kontrol otomatis dijalankan.',
            data: { id: newSuhu.id, humidity: newSuhu.humidity }
        });
        
    } catch (err) {
        log('ERROR', 'Database save error:', { message: err.message, stack: err.stack });
        return res.status(500).json({ message: 'Gagal menyimpan data ke database.' });
    }
};
