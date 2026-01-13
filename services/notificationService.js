const admin = require('firebase-admin');
const db = require('../config/db');

// Inisialisasi Firebase Admin (Pastikan file JSON sudah ada)
const serviceAccount = require("../config/smartgrape-d81ce-firebase-adminsdk-fbsvc-0e4615b2ff.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const notificationService = {
    /**
     * Mengirim notifikasi ke semua user yang memiliki fcm_token
     */
    sendToAllAdmins: async (title, body) => {
        try {
            // Ambil semua user yang memiliki token FCM
            const users = await db.users.findAll({
                where: {
                    fcm_token: { [db.Sequelize.Op.ne]: null }
                },
                attributes: ['fcm_token']
            });

            const tokens = users
                .map(u => u.fcm_token)
                .filter(token => token && token.trim() !== "");

            if (tokens.length === 0) {
                console.log('[FCM] Tidak ada token yang terdaftar di database.');
                return;
            }

            const message = {
                notification: { title, body },
                tokens: tokens,
                // Tambahkan konfigurasi Android agar muncul sebagai High Priority
                android: {
                    priority: 'high', // Penting agar muncul cepat
                    notification: {
                        channelId: 'high_importance_channel', // HARUS SAMA dengan Flutter
                        icon: 'stock_ticker_update',
                        color: '#7e57c2'
                    }
                },
                data: {
                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                    type: "sensor_alert"
                }
            };

            const response = await admin.messaging().sendEachForMulticast(message);
            console.log(`[FCM] Berhasil terkirim: ${response.successCount}, Gagal: ${response.failureCount}`);
            
            // Opsional: Bersihkan token yang sudah expired/tidak valid dari DB
            if (response.failureCount > 0) {
                console.log('[FCM] Ada beberapa token yang sudah tidak valid.');
            }
        } catch (error) {
            console.error('[FCM ERROR]', error);
        }
    }
};

module.exports = notificationService;