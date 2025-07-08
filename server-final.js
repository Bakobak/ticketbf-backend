const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const sequelize = require('./src/config/database');
const User = require('./src/models/UserSimple');

const app = express();
const PORT = 3000;

app.use(cors({
    origin: [
        'https://main.dlfewnbbygyx.amplifyapp.com',
        'http://localhost:3000',
        'https://*.amplifyapp.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Test de santé
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'OK',
      database: 'PostgreSQL connecté',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'Erreur',
      error: error.message
    });
  }
});

// Villes du Burkina Faso
app.get('/cities', (req, res) => {
  const cities = [
    'Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Ouahigouya',
    'Banfora', 'Kaya', 'Tenkodogo', 'Orodara', 'Fada N\'Gourma',
    'Gaoua', 'Dori', 'Kombissiri', 'Manga', 'Réo', 'Yako'
  ];
  res.json({
    success: true,
    data: cities,
    count: cities.length
  });
});

// Inscription
app.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, city } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, mot de passe, prénom et nom requis'
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Un compte avec cet email existe déjà'
      });
    }
    
    const user = await User.create({
      email, password, firstName, lastName, phone, city
    });
    
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({
      success: true,
      message: `Bienvenue sur TicketBF, ${firstName} ! 🇧🇫`,
      user: { 
        id: user.id, 
        email: user.email, 
        firstName: user.firstName, 
        lastName: user.lastName,
        city: user.city
      },
      token
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Connexion
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    const isValid = await user.validatePassword(password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: `Bon retour, ${user.firstName} ! 🎟️`,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        city: user.city
      },
      token
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Middleware d'authentification
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token requis'
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
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token invalide'
    });
  }
};

// Profil utilisateur
app.get('/profile', auth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      phone: req.user.phone,
      city: req.user.city,
      role: req.user.role
    }
  });
});

// Événements simulés
const events = [
  {
    id: 1,
    title: 'Festival de Musique Ouaga',
    description: 'Grand festival avec artistes burkinabè et internationaux',
    city: 'Ouagadougou',
    venue: 'Palais des Sports',
    date: '2024-08-15',
    price: 15000,
    seats: 500
  },
  {
    id: 2,
    title: 'FESPACO 2024',
    description: 'Festival Panafricain du Cinéma et de la Télévision',
    city: 'Ouagadougou',
    venue: 'Ciné Burkina',
    date: '2024-09-10',
    price: 8000,
    seats: 200
  }
];

app.get('/events', (req, res) => {
  const { city } = req.query;
  let filteredEvents = events;
  
  if (city) {
    filteredEvents = events.filter(e => e.city.toLowerCase() === city.toLowerCase());
  }
  
  res.json({
    success: true,
    events: filteredEvents,
    count: filteredEvents.length
  });
});

// Démarrage
const start = async () => {
  try {
    await sequelize.sync();
    console.log('✅ DB PostgreSQL connectée');
    app.listen(PORT, () => {
      console.log(`🚀 TicketBF sur port ${PORT}`);
      console.log(`🌐 Accédez à: http://localhost:${PORT}`);
      console.log(`🇧🇫 Plateforme Burkina Faso opérationnelle !`);
    });
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
};

start();
