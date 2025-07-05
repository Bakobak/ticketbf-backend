const { Sequelize } = require('sequelize');
require('dotenv').config();

console.log('🔍 Test de connexion à la base de données...');
console.log('Host:', process.env.DB_HOST);
console.log('Port:', process.env.DB_PORT);
console.log('Database:', process.env.DB_NAME);
console.log('User:', process.env.DB_USER);

const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    },
    connectTimeout: 60000, // 60 secondes
    requestTimeout: 60000
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 60000, // 60 secondes pour acquérir une connexion
    idle: 10000,
    retry: {
      match: [/ETIMEDOUT/, /EHOSTUNREACH/, /ECONNRESET/, /ECONNREFUSED/, /ETIMEDOUT/],
      max: 3
    }
  },
  logging: console.log
});

const testConnection = async () => {
  try {
    console.log('⏳ Tentative de connexion...');
    await sequelize.authenticate();
    console.log('✅ Connexion réussie à PostgreSQL !');
    console.log('🎉 Votre base de données est accessible !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur de connexion:');
    console.error('Type:', error.name);
    console.error('Message:', error.message);
    if (error.parent) {
      console.error('Détails:', error.parent.message);
    }
    process.exit(1);
  }
};

testConnection();