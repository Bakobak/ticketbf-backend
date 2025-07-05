const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const sequelize = require('./src/config/database');
const User = require('./src/models/UserSimple');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Middleware d'authentification
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    if (!user) throw new Error();
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Accès non autorisé' });
  }
};

// ROUTES DE BASE
app.get('/', (req, res) => {
  res.json({
    message: '🎟️ TicketBF - Plateforme de billetterie du Burkina Faso',
    version: '1.0.0',
    status: 'Actif',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile'
      },
      events: {
        list: 'GET /api/events',
        create: 'POST /api/events',
        details: 'GET /api/events/:id'
      },
      utilities: {
        cities: 'GET /api/cities',
        health: 'GET /api/health'
      }
    }
  });
});

app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'OK',
      database: 'PostgreSQL connecté',
      timestamp: new Date().toISOString(),
      region: 'Burkina Faso'
    });
  } catch (error) {
    res.status(500).json({
      status: 'Erreur',
      error: error.message
    });
  }
});

// ROUTES UTILITAIRES
app.get('/api/cities', (req, res) => {
  const cities = [
    'Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Ouahigouya',
    'Banfora', 'Kaya', 'Tenkodogo', 'Orodara', 'Fada N\'Gourma',
    'Gaoua', 'Dori', 'Kombissiri', 'Manga', 'Réo', 'Yako'
  ];
  res.json({
    success: true,
    data: { cities },
    count: cities.length
  });
});

app.get('/api/categories', (req, res) => {
  const categories = [
    { id: 1, name: 'Concert', icon: '🎵', color: '#FF6B6B' },
    { id: 2, name: 'Théâtre', icon: '🎭', color: '#4ECDC4' },
    { id: 3, name: 'Sport', icon: '⚽', color: '#45B7D1' },
    { id: 4, name: 'Conférence', icon: '🎤', color: '#96CEB4' },
    { id: 5, name: 'Festival', icon: '🎪', color: '#FFEAA7' },
    { id: 6, name: 'FESPACO', icon: '🎬', color: '#DDA0DD' },
    { id: 7, name: 'Événement traditionnel', icon: '🥁', color: '#F0A500' }
  ];
  res.json({
    success: true,
    data: { categories }
  });
});

// AUTHENTIFICATION
app.post('/api/auth/register', async (req, res) => {
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

    const token = jwt.sign(
      { userId: user.id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: `Bienvenue sur TicketBF, ${firstName} ! 🇧🇫`,
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

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    const token = jwt.sign(
      { userId: user.id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: `Bon retour, ${user.firstName} ! 🎟️`,
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
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
      error: error.message
    });
  }
});

app.get('/api/auth/profile', auth, (req, res) => {
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
        createdAt: req.user.createdAt
      }
    }
  });
});

// GESTION DES ÉVÉNEMENTS (simulation)
const mockEvents = [
  {
    id: 1,
    title: 'Festival de Musique de Ouagadougou',
    description: 'Le plus grand festival de musique du Burkina Faso avec des artistes locaux et internationaux.',
    venue: 'Palais des Sports',
    city: 'Ouagadougou',
    eventDate: '2024-08-15T20:00:00Z',
    category: 'Festival',
    price: 15000,
    availableSeats: 500,
    totalSeats: 500,
    image: 'https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=Festival+Ouaga',
    featured: true
  },
  {
    id: 2,
    title: 'FESPACO 2024 - Projection Spéciale',
    description: 'Projection des meilleurs films africains au Festival Panafricain du Cinéma.',
    venue: 'Ciné Burkina',
    city: 'Ouagadougou',
    eventDate: '2024-09-10T19:00:00Z',
    category: 'FESPACO',
    price: 8000,
    availableSeats: 200,
    totalSeats: 200,
    image: 'https://via.placeholder.com/400x300/DDA0DD/FFFFFF?text=FESPACO+2024',
    featured: true
  },
  {
    id: 3,
    title: 'Match Étoile Filante vs Rahimo FC',
    description: 'Match de championnat national au stade municipal de Bobo-Dioulasso.',
    venue: 'Stade Municipal',
    city: 'Bobo-Dioulasso',
    eventDate: '2024-07-20T16:00:00Z',
    category: 'Sport',
    price: 2500,
    availableSeats: 1500,
    totalSeats: 1500,
    image: 'https://via.placeholder.com/400x300/45B7D1/FFFFFF?text=Match+Football',
    featured: false
  },
  {
    id: 4,
    title: 'Conférence Tech Burkina 2024',
    description: 'Conférence sur l\'innovation technologique et l\'entrepreneuriat au Burkina Faso.',
    venue: 'Centre de Conférences Ouaga 2000',
    city: 'Ouagadougou',
    eventDate: '2024-08-05T09:00:00Z',
    category: 'Conférence',
    price: 12000,
    availableSeats: 300,
    totalSeats: 300,
    image: 'https://via.placeholder.com/400x300/96CEB4/FFFFFF?text=Tech+Conference',
    featured: false
  }
];

app.get('/api/events', (req, res) => {
  const { city, category, featured } = req.query;
  
  let filteredEvents = [...mockEvents];
  
  if (city) {
    filteredEvents = filteredEvents.filter(event => 
      event.city.toLowerCase() === city.toLowerCase()
    );
  }
  
  if (category) {
    filteredEvents = filteredEvents.filter(event => 
      event.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  if (featured === 'true') {
    filteredEvents = filteredEvents.filter(event => event.featured);
  }
  
  res.json({
    success: true,
    data: {
      events: filteredEvents,
      count: filteredEvents.length,
      filters: { city, category, featured }
    }
  });
});

app.get('/api/events/:id', (req, res) => {
  const eventId = parseInt(req.params.id);
  const event = mockEvents.find(e => e.id === eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Événement non trouvé'
    });
  }
  
  res.json({
    success: true,
    data: { event }
  });
});

// CRÉATION D'ÉVÉNEMENTS (pour organisateurs)
app.post('/api/events', auth, async (req, res) => {
  try {
    const {
      title, description, venue, city, eventDate,
      category, price, totalSeats
    } = req.body;

    // Validation simple
    if (!title || !venue || !city || !eventDate || !price) {
      return res.status(400).json({
        success: false,
        message: 'Titre, lieu, ville, date et prix requis'
      });
    }

    // Simulation de création d'événement
    const newEvent = {
      id: mockEvents.length + 1,
      title,
      description,
      venue,
      city,
      eventDate,
      category: category || 'Autre',
      price: parseFloat(price),
      totalSeats: parseInt(totalSeats) || 100,
      availableSeats: parseInt(totalSeats) || 100,
      organizerId: req.user.id,
      organizerName: `${req.user.firstName} ${req.user.lastName}`,
      featured: false,
      status: 'draft',
      createdAt: new Date().toISOString()
    };

    mockEvents.push(newEvent);

    res.status(201).json({
      success: true,
      message: 'Événement créé avec succès !',
      data: { event: newEvent }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'événement',
      error: error.message
    });
  }
});

// GESTION DES UTILISATEURS
app.get('/api/users', auth, async (req, res) => {
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
      error: error.message
    });
  }
});

// STATISTIQUES POUR DASHBOARD
app.get('/api/stats', auth, async (req, res) => {
  try {
    const userCount = await User.count();
    const eventCount = mockEvents.length;
    const ticketsSold = mockEvents.reduce((total, event) => 
      total + (event.totalSeats - event.availableSeats), 0
    );
    
    res.json({
      success: true,
      data: {
        users: userCount,
        events: eventCount,
        ticketsSold,
        revenue: ticketsSold * 8500, // Prix moyen
        topCities: ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou'],
        topCategories: ['Festival', 'Concert', 'Sport']
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} non trouvée`,
    availableRoutes: [
      'GET /',
      'GET /api/health',
      'GET /api/cities',
      'GET /api/categories',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/profile',
      'GET /api/events',
      'POST /api/events',
      'GET /api/events/:id'
    ]
  });
});

// Démarrage du serveur
const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion PostgreSQL réussie');
    
    await sequelize.sync();
    console.log('✅ Modèles synchronisés');
    
    app.listen(PORT, () => {
      console.log(`🚀 TicketBF API démarrée sur le port ${PORT}`);
      console.log(`🌐 Accédez à: http://localhost:${PORT}`);
      console.log(`🔍 Documentation: http://localhost:${PORT}/`);
      console.log(`🇧🇫 Plateforme de billetterie du Burkina Faso`);
      console.log(`\n📋 Fonctionnalités disponibles:`);
      console.log(`   • Authentification (inscription/connexion)`);
      console.log(`   • Gestion des événements`);
      console.log(`   • Filtres par ville et catégorie`);
      console.log(`   • API complète pour frontend React`);
    });
  } catch (error) {
    console.error('❌ Erreur de démarrage:', error.message);
    process.exit(1);
  }
};

start();