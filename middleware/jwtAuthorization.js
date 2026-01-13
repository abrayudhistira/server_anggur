const jwt = require('jsonwebtoken');

require('dotenv').config(); 

const authToken = (req, res, next) => {
    console.log("--- Request Masuk ke AuthToken ---");
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.log("Gagal: Token tidak ada");
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Token Valid. User ID:", decoded.id);
        req.user = decoded;
        next();
    } catch (error) {
        console.log("Gagal: Token Invalid", error.message);
        return res.status(403).json({ message: 'Forbidden' });
    }
};
module.exports = authToken;