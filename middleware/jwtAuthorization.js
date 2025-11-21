const jwt = require('jsonwebtoken');

require('dotenv').config(); 

const authToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
        message: 'Unauthorized. No token provided.'
        });
    }
    try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(403).json({
     message: 'Forbidden - Invalid or expired token',
    });
  }
};
module.exports = authToken;