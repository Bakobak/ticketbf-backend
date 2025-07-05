const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Importer la configuration de la base de données
const sequelize = require('./src/config/database');

// Importer les routes
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de sécurité
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes de base
app.get('/', (req, res) => {
  res.json({
    message: '🎟️ Bienvenue sur TicketBF - Plateforme de billetterie du Burkina Faso',
    version: '1.0.0',
    status: 'actif',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      events: '/api/events (bientôt)',
      tickets: '/api/tickets (bientôt)'
    }
  });
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Route de test de la base de données
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

// Middleware de gestion d'erreur
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route non trouvée',
    requestedPath: req.originalUrl
  });
});

// Démarrage du serveur
const startServer = async () => {
  try {
    // Test de connexion à la base de données
    await sequelize.authenticate();
    console.log('✅ Connexion à PostgreSQL réussie');
    
    // Synchronisation des modèles
    await sequelize.sync();
    console.log('✅ Modèles de base de données synchronisés');
    
    // Démarrage du serveur
    app.listen(PORT, () => {
      console.log(`🚀 Serveur TicketBF démarré sur le port ${PORT}`);
      console.log(`🌐 Accédez à: http://localhost:${PORT}`);
      console.log(`🔍 Test de santé: http://localhost:${PORT}/api/health`);
      console.log(`🇧🇫 TicketBF - Burkina Faso Ticketing Platform`);
    });
  } catch (error) {
    console.error('❌ Erreur de démarrage du serveur:', error);
    process.exit(1);
  }
};

startServer();