const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const session = require("express-session");
const dotenv = require("dotenv");
const jwt = require('jsonwebtoken');

const socketManager = require('./services/socketManager'); 

const authRoutes = require("./routes/authRoutes");
const iotRoutes = require("./routes/iotRoutes");

const app = express();

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!process.env.JWT_SECRET) {
        throw new Error("Secret key is not defined in the environment variables.");
    }

const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const server = http.createServer(app);
const io = socketManager.init(server);

io.use((socket, next) => {
    const token = socket.handshake.query.token;
    
    if (!token) {
        return next(new Error('Akses Ditolak: Token otorisasi tidak ditemukan.'));
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        socket.userData = decoded; 
        
        console.log(`[AUTH WS] User ID ${decoded.user_id} Role ${decoded.role} terotentikasi.`);
        next(); 
    } catch (err) {
        return next(new Error('Akses Ditolak: Token tidak valid atau kedaluwarsa.'));
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

app.use("/users", authRoutes);
app.use("/iot", iotRoutes);

io.on('connection', (socket) => {
    console.log(`Koneksi WS berhasil dari User ID: ${socket.userData.user_id}`);
    
    socket.emit('welcome', { message: 'Selamat datang, Anda telah terotentikasi!' });
    
    socket.on('disconnect', () => {
        console.log(`Klien terputus. ID User: ${socket.userData.user_id}`);
    });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('WebSocket server is ready.\n\nSelamat Datang Admin Capstone!.\n');
});

module.exports = app;