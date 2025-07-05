const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const sequelize = require('./src/config/database');
const User = require('./src/models/User');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Fonction pour générer un token JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Middleware d'authentification
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'accès requis'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    req.userId = decoded.userId;
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token invalide'
    });
  }
};

// Routes publiques
app.get('/', (req, res) => {
  res.json({
    message: '🎟️ TicketBF - Plateforme de billetterie du Burkina Faso',
    status: 'actif',
    version: '1.0.0',
    endpoints: {
      inscription: 'POST /api/auth/register',
      connexion: 'POST /api/auth/login',
      profil: 'GET /api/auth/profile (avec token)',
      villes: 'GET /api/cities'
    }
  });
});

app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'OK',
      database: 'Connecté à PostgreSQL',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'Erreur',
      database: 'Connexion échouée',
      error: error.message
    });
  }
});

app.get('/api/cities', (req, res) => {
  const cities = [
    'Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Ouahigouya', 
    'Banfora', 'Kaya', 'Tenkodogo', 'Orodara', 'Fada N\'Gourma', 
    'Gaoua', 'Dori', 'Kombissiri', 'Manga', 'Réo', 'Yako'
  ];
  res.json({
    success: true,
    data: { cities }
  });
});

// Routes d'authentification
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, city } = req.body;

    // Validation simple
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, mot de passe, prénom et nom requis'
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }

    // Créer le nouvel utilisateur
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone,
      city
    });

    // Générer le token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: `Bienvenue sur TicketBF, ${firstName} ! Votre compte a été créé avec succès.`,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          city: user.city,
          role: user.role
        },
        token
      }
    });

  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription',
      error: error.message
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier le mot de passe
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Générer le token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: `Bienvenue de retour, ${user.firstName} !`,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          city: user.city,
          role: user.role
        },
        token
      }
    });

  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
      error: error.message
    });
  }
});

// Routes protégées
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          phone: req.user.phone,
          city: req.user.city,
          role: req.user.role,
          isVerified: req.user.isVerified,
          createdAt: req.user.createdAt
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil',
      error: error.message
    });
  }
});

// Route pour lister les utilisateurs (pour test)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] }
    });
    
    res.json({
      success: true,
      data: {
        users,
        count: users.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs',
      error: error.message
    });
  }
});

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée',
    requestedPath: req.originalUrl
  });
});

// Démarrage du serveur
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à PostgreSQL réussie');
    
    await sequelize.sync();
    console.log('✅ Modèles de base de données synchronisés');
    
    app.listen(PORT, () => {
      console.log(`🚀 Serveur TicketBF démarré sur le port ${PORT}`);
      console.log(`🌐 Accédez à: http://localhost:${PORT}`);
      console.log(`🔐 Inscription: POST http://localhost:${PORT}/api/auth/register`);
      console.log(`🔑 Connexion: POST http://localhost:${PORT}/api/auth/login`);
      console.log(`👤 Profil: GET http://localhost:${PORT}/api/auth/profile`);
      console.log(`🇧🇫 TicketBF - Burkina Faso Ticketing Platform`);
    });
  } catch (error) {
    console.error('❌ Erreur de démarrage du serveur:', error);
    process.exit(1);
  }
};

startServer();