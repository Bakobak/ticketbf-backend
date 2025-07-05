const express = require('express');
const { register, login, getProfile, getCities } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Routes publiques
router.post('/register', register);
router.post('/login', login);
router.get('/cities', getCities);

// Routes protégées
router.get('/profile', authenticateToken, getProfile);

// Route de test pour vérifier l'authentification
router.get('/test', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Authentification réussie !',
    data: {
      userId: req.userId,
      user: req.user.toJSON()
    }
  });
});

module.exports = router;