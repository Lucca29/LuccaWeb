const jwt = require('jsonwebtoken');
const config = require('../config');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token d\'accès requis' 
    });
  }

      jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: 'Token invalide ou expiré' 
      });
    }
    
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Accès administrateur requis' 
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin
}; 