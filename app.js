const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const session = require("express-session");
const dotenv = require("dotenv");
const jwt = require('jsonwebtoken');
const cors = require('cors'); // <--- 1. Import CORS
const cron = require('node-cron');
const { finalizeYesterday } = require('./services/logger'); // sesuaikan path

const socketManager = require('./services/socketManager'); 

const authRoutes = require("./routes/authRoutes");
const iotRoutes = require("./routes/iotRoutes");
const settingRoutes = require("./routes/settingRoutes");

const app = express();

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!process.env.JWT_SECRET) {
    throw new Error("Secret key is not defined in the environment variables.");
}

// Pastikan port ini SAMA dengan yang dipanggil di Frontend (BACKEND_URL)
// Default saya set ke 3000 agar sesuai dengan frontend Anda sebelumnya
const PORT = process.env.PORT || 5002; 

// <--- 2. KONFIGURASI CORS (SOLUSI FAILED TO FETCH) --->
app.use(cors({
    origin: "*", // Mengizinkan akses dari semua domain (termasuk localhost:3001, dll)
    methods: ["GET", "POST", "PUT", "DELETE"], // Method yang diizinkan
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"] // Header yang diizinkan
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const server = http.createServer(app);
const io = socketManager.init(server);

// --- Middleware Socket.IO ---
io.use((socket, next) => {
    const handshakeData = socket.handshake.query;
    
    // Logika 1: Validasi Klien Perangkat (ESP32)
    if (handshakeData.secret_key) {
        if (handshakeData.secret_key === process.env.DEVICE_SECRET_KEY) {
            // Otentikasi Perangkat Berhasil
            socket.isDevice = true; // Tambahkan flag untuk identifikasi
            console.log('Perangkat terhubung dengan Secret Key.');
            return next();
        } else {
            console.log('Secret Key tidak valid.');
            return next(new Error('Unauthorized - Device Secret Key Invalid'));
        }
    }

    // Logika 2: Validasi Klien Pengguna (Web/Mobile)
    else if (handshakeData.token) {
        try {
            // Lakukan verifikasi JWT di sini
            const user = jwt.verify(handshakeData.token, process.env.JWT_SECRET);
            socket.user = user; // Simpan data pengguna di objek socket
            console.log('Pengguna terhubung dengan JWT.');
            return next();
        } catch (error) {
            console.log('JWT tidak valid atau kadaluarsa.');
            return next(new Error('Unauthorized - JWT Invalid'));
        }
    }

    // Jika tidak ada keduanya
    else {
        return next(new Error('Unauthorized - Missing Key or Token'));
    }
});

app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 2, // 2 jam
        httpOnly: true, // Meningkatkan keamanan
        secure: process.env.NODE_ENV === "development",
    }
  })
);

// --- Routes ---
app.use("/", authRoutes);
app.use("/iot", iotRoutes);
app.use("/setting", settingRoutes);

// --- Socket Connection Event ---
io.on('connection', (socket) => {
    console.log(`Koneksi WS berhasil.`);
    
    socket.emit('welcome', { message: 'Selamat datang, Anda telah terotentikasi!' });
    
    socket.on('disconnect', () => {
        console.log(`Klien terputus.`);
    });
});
cron.schedule('5 0 * * *', async () => {
  try {
    console.log('[cron] finalize yesterday logs start');
    const result = await finalizeYesterday();
    console.log('[cron] finalize result:', result);
  } catch (err) {
    console.error('[cron] finalize error:', err);
  }
});
// --- Server Listen ---
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('WebSocket server is ready.\n\nSelamat Datang Admin Capstone!.\n');
});

module.exports = app;