const { 
  verifyToken, 
  extractTokenFromHeader,
  isTokenExpired 
} = require('../config/jwt');
const User = require('../models/User');

// Middleware d'authentification principal
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'TOKEN_REQUIRED'
      });
    }
    
    // Vérifier si le token est expiré
    if (isTokenExpired(token)) {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    // Vérifier la validité du token
    const decoded = verifyToken(token);
    
    // Vérifier si l'utilisateur existe toujours
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Vérifier si l'utilisateur est actif
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }
    
    // Attacher l'utilisateur à la requête
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.message === 'Token expired') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.message === 'Invalid token') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

// Middleware d'authentification optionnel (ne bloque pas si pas de token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      req.user = null;
      return next();
    }
    
    if (isTokenExpired(token)) {
      req.user = null;
      return next();
    }
    
    const decoded = verifyToken(token);
    const user = await User.findByPk(decoded.id);
    
    if (user && user.is_active) {
      req.user = user;
      req.token = token;
    } else {
      req.user = null;
    }
    
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

// Middleware pour vérifier les rôles
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    // Convertir en tableau si c'est une chaîne
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }
    
    next();
  };
};

// Middleware pour vérifier si l'utilisateur est admin
const requireAdmin = requireRole(['admin']);

// Middleware pour vérifier si l'utilisateur est enseignant
const requireTeacher = requireRole(['teacher']);

// Middleware pour vérifier si l'utilisateur est étudiant
const requireStudent = requireRole(['student']);

// Middleware pour vérifier si l'utilisateur est admin ou enseignant
const requireTeacherOrAdmin = requireRole(['admin', 'teacher']);

// Middleware pour vérifier si l'utilisateur peut accéder à ses propres données
const requireSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  
  const userId = parseInt(req.params.id || req.params.userId);
  
  // Admin peut accéder à tout
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Utilisateur peut accéder à ses propres données
  if (req.user.id === userId) {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'You can only access your own data',
    code: 'ACCESS_DENIED'
  });
};

// Middleware pour vérifier si l'utilisateur peut accéder aux données d'un cours
const requireCourseAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const courseId = parseInt(req.params.courseId);
    
    // Admin peut accéder à tout
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Enseignant peut accéder à ses cours
    if (req.user.role === 'teacher') {
      const Course = require('../models/Course');
      const course = await Course.findOne({
        where: { 
          id: courseId, 
          teacher_id: req.user.id 
        }
      });
      
      if (!course) {
                return res.status(403).json({
          success: false,
          message: 'Access to this course is denied',
          code: 'COURSE_ACCESS_DENIED'
        });
      }

      return next();
    }

    // Étudiant peut accéder à un cours seulement s'il est inscrit
    if (req.user.role === 'student') {
      const Enrollment = require('../models/Enrollment'); // Assurez-vous d'avoir ce modèle
      const enrollment = await Enrollment.findOne({
        where: {
          course_id: courseId,
          student_id: req.user.id
        }
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not enrolled in this course',
          code: 'NOT_ENROLLED'
        });
      }

      return next();
    }

    // Rôle inconnu ou non autorisé
    return res.status(403).json({
      success: false,
      message: 'Access denied: Your role does not permit course access',
      code: 'ROLE_NOT_ALLOWED'
    });
  } catch (error) {
    console.error('Course access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during course access check',
      code: 'SERVER_ERROR'
    });
  }
};

module.exports = {
  authenticate,
  optionalAuth,
  requireAdmin,
  requireTeacher,
  requireStudent,
  requireRole,
  requireTeacherOrAdmin,
  requireSelfOrAdmin,
  requireCourseAccess
};
