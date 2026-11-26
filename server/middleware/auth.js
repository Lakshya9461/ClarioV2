import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    let token = null;

    // Check httpOnly cookie first
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } 
    // Fallback to Bearer token in headers
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to continue.',
      });
    }

    const secret = process.env.JWT_SECRET || 'clario-secure-jwt-secret-cse-btech-2025-x99';
    const decoded = jwt.verify(token, secret);

    let user = await User.findById(decoded.id).select('-passwordHash');
    if (!user && decoded.role) {
      // In dev mode with in-memory DB restarts, seamlessly find demo account by role
      user = await User.findOne({ role: decoded.role }).select('-passwordHash');
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please log in again.',
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user ? req.user.role : 'unauthenticated'}' is not authorized to access this resource. Required role(s): ${roles.join(', ')}`,
      });
    }
    next();
  };
};
