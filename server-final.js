const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'ticketbf-secret-2025';

// Configuration CORS TRÈS PERMISSIVE pour debug
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['*']
}));

// Middleware pour gérer les requêtes OPTIONS (preflight)
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.sendStatus(200);
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de logging pour debug
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    console.log('Body:', req.body);
    console.log('Headers:', req.headers);
    next();
});

// Base de données en mémoire simple
let users = [
    {
        id: '1',
        name: 'Admin Test',
        email: 'admin@ticketbf.com',
        password: '$2a$10$K8P1vJ2B3Hq9wZxYtNmO7.TQOWxKnzGVsH4P2RQ6Y8zAbCdEfGhIj', // password123
        userType: 'admin',
        isVerified: true,
        createdAt: new Date().toISOString()
    }
];

let events = [
    {
        id: '1',
        name: 'Concert de Floby',
        description: 'Le roi de la musique burkinabè en concert',
        date: '2025-07-15T20:00:00',
        location: 'Palais des Sports de Ouaga',
        price: 5000,
        category: 'concert',
        createdBy: '1',
        createdAt: new Date().toISOString()
    },
    {
        id: '2',
        name: 'Match Étoile Filante vs ASFA',
        description: 'Derby de Ouagadougou',
        date: '2025-07-12T16:00:00',
        location: 'Stade du 4-Août',
        price: 1000,
        category: 'sport',
        createdBy: '1',
        createdAt: new Date().toISOString()
    }
];

// ROUTE 1: PAGE D'ACCUEIL
app.get('/', (req, res) => {
    console.log('GET / appelé');
    res.json({
        message: "🎟️ TicketBF - Plateforme de billetterie du Burkina Faso",
        version: "2.1.0",
        status: "Actif - DEBUG MODE",
        timestamp: new Date().toISOString(),
        users_count: users.length,
        events_count: events.length,
        routes: [
            "GET / - Cette page",
            "GET /health - Test API",
            "GET /cities - Villes BF",
            "POST /register - Inscription",
            "POST /login - Connexion",
            "GET /events - Événements",
            "POST /events - Créer événement"
        ]
    });
});

// ROUTE 2: SANTÉ API
app.get('/health', (req, res) => {
    console.log('GET /health appelé');
    res.json({
        status: 'OK',
        message: 'API fonctionne correctement',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        data: {
            users: users.length,
            events: events.length
        }
    });
});

// ROUTE 3: VILLES
app.get('/cities', (req, res) => {
    console.log('GET /cities appelé');
    const cities = [
        'Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Ouahigouya',
        'Banfora', 'Tenkodogo', 'Kaya', 'Fada N\'Gourma'
    ];
    
    res.json({
        success: true,
        cities: cities,
        count: cities.length
    });
});

// ROUTE 4: INSCRIPTION - VERSION SIMPLE
app.post('/register', async (req, res) => {
    try {
        console.log('POST /register appelé avec:', req.body);
        
        const { name, email, password, userType = 'user' } = req.body;

        // Validation simple
        if (!name || !email || !password) {
            console.log('Validation échouée - champs manquants');
            return res.status(400).json({
                success: false,
                message: 'Nom, email et mot de passe requis',
                received: { name: !!name, email: !!email, password: !!password }
            });
        }

        // Vérifier email unique
        const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existingUser) {
            console.log('Email déjà utilisé:', email);
            return res.status(400).json({
                success: false,
                message: 'Cet email est déjà utilisé'
            });
        }

        // Créer utilisateur sans hash pour debug
        const newUser = {
            id: (users.length + 1).toString(),
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: password, // Pas de hash pour debug
            userType: userType,
            isVerified: true, // Auto-vérifié pour debug
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        console.log('Utilisateur créé:', { id: newUser.id, email: newUser.email });

        // Générer token simple
        const token = jwt.sign(
            { 
                userId: newUser.id, 
                email: newUser.email, 
                userType: newUser.userType 
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Inscription réussie !',
            token: token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                userType: newUser.userType,
                isVerified: newUser.isVerified
            }
        });

    } catch (error) {
        console.error('Erreur inscription:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur: ' + error.message,
            stack: error.stack
        });
    }
});

// ROUTE 5: CONNEXION - VERSION SIMPLE
app.post('/login', async (req, res) => {
    try {
        console.log('POST /login appelé avec:', req.body);
        
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email et mot de passe requis'
            });
        }

        // Trouver utilisateur
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email ou mot de passe incorrect'
            });
        }

        // Vérifier mot de passe (simple pour debug)
        if (user.password !== password) {
            return res.status(401).json({
                success: false,
                message: 'Email ou mot de passe incorrect'
            });
        }

        // Générer token
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                userType: user.userType 
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Connexion réussie !',
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                userType: user.userType,
                isVerified: user.isVerified
            }
        });

    } catch (error) {
        console.error('Erreur connexion:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur: ' + error.message
        });
    }
});

// ROUTE 6: ÉVÉNEMENTS
app.get('/events', (req, res) => {
    console.log('GET /events appelé');
    res.json({
        success: true,
        events: events,
        total: events.length
    });
});

// ROUTE 7: CRÉER ÉVÉNEMENT
app.post('/events', (req, res) => {
    try {
        console.log('POST /events appelé avec:', req.body);
        
        const { name, description, date, location, price, category } = req.body;

        if (!name || !date || !location || !price) {
            return res.status(400).json({
                success: false,
                message: 'Nom, date, lieu et prix requis'
            });
        }

        const newEvent = {
            id: (events.length + 1).toString(),
            name,
            description: description || '',
            date,
            location,
            price: parseFloat(price),
            category: category || 'other',
            createdBy: 'system',
            createdAt: new Date().toISOString()
        };

        events.push(newEvent);

        res.status(201).json({
            success: true,
            message: 'Événement créé !',
            event: newEvent
        });

    } catch (error) {
        console.error('Erreur création événement:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur: ' + error.message
        });
    }
});

// ROUTE 8: LISTE UTILISATEURS (DEBUG)
app.get('/users', (req, res) => {
    console.log('GET /users appelé');
    res.json({
        success: true,
        users: users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            userType: u.userType,
            isVerified: u.isVerified,
            createdAt: u.createdAt
        })),
        total: users.length
    });
});

// Middleware de gestion d'erreurs
app.use((error, req, res, next) => {
    console.error('Erreur non gérée:', error);
    res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: error.message,
        stack: error.stack
    });
});

// Route 404
app.use('*', (req, res) => {
    console.log('Route non trouvée:', req.method, req.path);
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.path} non trouvée`,
        available_routes: [
            'GET /',
            'GET /health',
            'GET /cities',
            'POST /register',
            'POST /login',
            'GET /events',
            'POST /events',
            'GET /users'
        ]
    });
});

// Démarrage serveur
app.listen(PORT, () => {
    console.log(`🚀 TicketBF Backend démarré sur port ${PORT}`);
    console.log(`📱 Frontend: https://main.dlfewnbbygyx.amplifyapp.com`);
    console.log(`🔧 Mode DEBUG activé`);
    console.log(`👥 Utilisateurs: ${users.length}`);
    console.log(`🎪 Événements: ${events.length}`);
    console.log(`📧 Test login: admin@ticketbf.com / password123`);
});

module.exports = app;
