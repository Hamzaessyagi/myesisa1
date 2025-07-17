// middlewares/roleCheck.js

module.exports = function roleCheck(allowedRoles = []) {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(401).json({
          success: false,
          message: 'Non autorisé : rôle non trouvé'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Accès interdit : rôle requis (${allowedRoles.join(', ')})`
        });
      }

      next();
    } catch (error) {
      console.error('Erreur roleCheck:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la vérification du rôle'
      });
    }
  };
};
