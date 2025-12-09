// File: backend_anggur/simulasi_final.js
const io = require("socket.io-client");

// Konfigurasi sesuai .env Anda
const BACKEND_URL = "http://localhost:3000";
const MY_SECRET_KEY = "T4K3IFJ4W5A0UL4U99BY"; // <--- SAMA DENGAN .ENV

console.log("--- SIMULASI FINAL (DEVICE) ---");
console.log(`Target: ${BACKEND_URL}`);
console.log(`Key   : ${MY_SECRET_KEY}`);

const socket = io(BACKEND_URL, {
    query: { secret_key: MY_SECRET_KEY } // Login sebagai Device
});

socket.on("connect", () => {
    console.log(">> ✅ ALAT TERHUBUNG! Mengirim data...");

    setInterval(() => {
        // Data Random
        const data = {
            humidity: (Math.random() * 100).toFixed(0), // 0-100%
            suhu: (25 + Math.random() * 5).toFixed(1)   // 25-30C
        };
        
        console.log(`>> Mengirim: ${JSON.stringify(data)}`);
        
        // Emit ke Backend (nanti Backend akan broadcast ke Frontend)
        socket.emit('suhu_update', data); 
    }, 1000); 
});

socket.on("connect_error", (err) => {
    console.log(">> ❌ Gagal Konek:", err.message);
});

socket.on("disconnect", () => console.log(">> Terputus"));