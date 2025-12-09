// services/socketManager.js
let io;

module.exports = {
  // Fungsi untuk menginisialisasi Socket.IO
  init: httpServer => {
    io = require('socket.io')(httpServer, {
        cors: {
            origin: "*", 
            methods: ["GET", "POST"]
        }
    });
    return io;
  },

  // Fungsi untuk mendapatkan instance io yang sudah terinisialisasi
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  }
};