require('dotenv').config(); // Pastikan dotenv dimuat untuk membaca variabel dari .env

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql', // Sesuaikan dengan database Anda: 'mysql', 'postgres', 'sqlite', 'mssql'
    logging: false // Atur ke true untuk melihat query SQL di konsol
  },
  // Anda bisa menambahkan konfigurasi untuk lingkungan 'production' atau 'test' di sini
};