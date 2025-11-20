require('dotenv').config();
const env = process.env.NODE_ENV;
const { Sequelize, DataTypes } = require('sequelize');
const config = require('./config.js')[env];

// Import fungsi initModels
const initModels = require('../models/init-models'); // <--- Path ke init-models.js Anda

// Buat instance Sequelize (koneksi database)
const sequelize = new Sequelize(config.database, config.username, config.password, config);

const db = {};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Panggil initModels untuk menginisialisasi semua model dan asosiasi
const models = initModels(sequelize);

// Masukkan semua model yang sudah diinisialisasi ke objek db
Object.keys(models).forEach(modelName => {
    db[modelName] = models[modelName];
});

// Fungsi untuk menghubungkan dan menyinkronkan database
db.connectAndSync = async () => {
    try {
        await sequelize.authenticate();
        console.log('Koneksi database berhasil dibuat.');
        // Sinkronkan semua model dengan database
        // Gunakan `alter: true` di pengembangan untuk memperbarui skema tanpa kehilangan data (jika memungkinkan)
        // Hati-hati dengan `force: true` di production karena akan menghapus semua tabel dan data!
        await sequelize.sync({ alter: true });
        console.log('Model database berhasil disinkronkan.');
    } catch (error) {
        console.error('Tidak dapat terhubung atau menyinkronkan database:', error);
        process.exit(1); // Keluar dari aplikasi jika ada masalah database yang kritis
    }
};

module.exports = db; // Ekspor objek db lengkap