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

// Route de base
app.get('/', (req, res) => {
  res.json({ message: 'TicketBF API v1.0', status: 'OK' });
});

// Inscription
app.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    const user = await User.create({
      email, password, firstName, lastName
    });
    
    res.json({
      success: true,
      message: 'Utilisateur créé',
      user: { id: user.id, email: user.email, firstName: user.firstName }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Test de la DB
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'DB OK' });
  } catch (error) {
    res.status(500).json({ status: 'DB Error', error: error.message });
  }
});

const start = async () => {
  try {
    await sequelize.sync();
    console.log('✅ DB connectée');
    app.listen(PORT, () => console.log(`🚀 Serveur sur port ${PORT}`));
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
};

start();