const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    console.log('Verifying token:', token);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log('Token verified successfully');
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = { verifyToken };
