const express = require('express');
require('dotenv').config();

// Test de base sans les routes pour diagnostiquer
const sequelize = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Route de test simple
app.get('/', (req, res) => {
  res.json({
    message: '🎟️ TicketBF - Test de base',
    status: 'OK'
  });
});

// Test de connexion à la base de données
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

const startServer = async () => {
  try {
    console.log('🧪 Test de connexion à PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ Connexion à PostgreSQL réussie');
    
    app.listen(PORT, () => {
      console.log(`🚀 Serveur de test TicketBF sur le port ${PORT}`);
      console.log(`🌐 Test: http://localhost:${PORT}`);
      console.log(`🔍 Santé DB: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
};

startServer();