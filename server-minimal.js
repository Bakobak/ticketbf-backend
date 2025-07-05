const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./src/config/database');
const User = require('./src/models/User');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de base
app.use(cors());
app.use(express.json());

// Route d'accueil
app.get('/', (req, res) => {
  res.json({
    message: '🎟️ TicketBF - Plateforme de billetterie du Burkina Faso',
    status: 'actif',
    version: '1.0.0'
  });
});

// Test de santé
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

// Villes du Burkina Faso
app.get('/api/cities', (req, res) => {
  const cities = ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Ouahigouya', 'Banfora', 'Kaya'];
  res.json({
    success: true,
    data: { cities }
  });
});

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à PostgreSQL réussie');
    
    await sequelize.sync();
    console.log('✅ Modèles synchronisés');
    
    app.listen(PORT, () => {
      console.log(`🚀 TicketBF démarré sur le port ${PORT}`);
      console.log(`🌐 Accédez à: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
};

startServer();