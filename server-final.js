const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ticketbf-secret-2025';

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
    next();
});

// Base de données en mémoire simple
let users = [
    {
        id: '1',
        firstName: 'Admin',
        lastName: 'Test',
        email: 'admin@ticketbf.com',
        password: 'password123',
        phone: '+226 XX XX XX XX',
        city: 'Ouagadougou',
        role: 'admin',
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
        status: "Actif - API Corrigée",
        timestamp: new Date().toISOString(),
        users_count: users.length,
        events_count: events.length,
        routes: [
            "GET / - Cette page",
            "GET /api/health - Test API",
            "GET /api/cities - Villes BF",
            "POST /api/auth/register - Inscription",
            "POST /api/auth/login - Connexion",
            "GET /api/events - Événements"
        ]
    });
});

// ROUTE 2: SANTÉ API
app.get('/api/health', (req, res) => {
    console.log('GET /api/health appelé');
    res.json({
        status: 'OK',
        message: 'API TicketBF fonctionne correctement',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        data: {
            users: users.length,
            events: events.length
        }
    });
});

// ROUTE 3: VILLES
app.get('/api/cities', (req, res) => {
    console.log('GET /api/cities appelé');
    const cities = [
        'Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Ouahigouya',
        'Banfora', 'Tenkodogo', 'Kaya', 'Fada N\'Gourma'
    ];
    
    res.json({
        success: true,
        data: { cities: cities },
        count: cities.length
    });
});

// ROUTE 4: INSCRIPTION AMÉLIORÉE
app.post('/api/auth/register', async (req, res) => {
    try {
        console.log('POST /api/auth/register appelé avec:', req.body);
        
        const { 
            firstName, 
            lastName, 
            email, 
            phone, 
            city, 
            password, 
            role, 
            companyName, 
            businessType 
        } = req.body;

        // Validation des champs obligatoires
        if (!firstName || !lastName || !email || !phone || !city || !password) {
            console.log('Validation échouée - champs manquants');
            return res.status(400).json({
                success: false,
                message: 'Tous les champs obligatoires doivent être remplis'
            });
        }

        // Validation du mot de passe
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Le mot de passe doit contenir au moins 6 caractères'
            });
        }

        // Validation email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Veuillez entrer un email valide'
            });
        }

        // Vérifier email unique
        const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existingUser) {
            console.log('Email déjà utilisé:', email);
            return res.status(400).json({
                success: false,
                message: 'Un utilisateur avec cet email existe déjà'
            });
        }

        // Validation spécifique aux promoteurs
        if (role === 'promoter' && (!companyName || !businessType)) {
            return res.status(400).json({
                success: false,
                message: 'Les informations d\'entreprise sont requises pour les promoteurs'
            });
        }

        // Créer utilisateur
        const newUser = {
            id: (users.length + 1).toString(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            city: city.trim(),
            password: password, // En production, hasher le mot de passe
            role: role || 'user',
            companyName: companyName || null,
            businessType: businessType || null,
            isVerified: true, // Auto-vérifié pour debug
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        console.log('Utilisateur créé:', { id: newUser.id, email: newUser.email, role: newUser.role });

        // Générer token
        const token = jwt.sign(
            { 
                userId: newUser.id, 
                email: newUser.email, 
                role: newUser.role 
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: `Bienvenue sur TicketBF, ${firstName} ! Votre compte a été créé avec succès.`,
            data: {
                user: {
                    id: newUser.id,
                    firstName: newUser.firstName,
                    lastName: newUser.lastName,
                    email: newUser.email,
                    phone: newUser.phone,
                    city: newUser.city,
                    role: newUser.role,
                    companyName: newUser.companyName,
                    businessType: newUser.businessType,
                    isVerified: newUser.isVerified
                },
                token: token
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

// ROUTE 5: CONNEXION AMÉLIORÉE
app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('POST /api/auth/login appelé avec:', req.body);
        
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
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: `Bienvenue de retour, ${user.firstName} !`,
            data: {
                user: {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    phone: user.phone,
                    city: user.city,
                    role: user.role,
                    companyName: user.companyName,
                    businessType: user.businessType,
                    isVerified: user.isVerified
                },
                token: token
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

// ROUTE 6: ÉVÉNEMENTS
app.get('/api/events', (req, res) => {
    console.log('GET /api/events appelé');
    res.json({
        success: true,
        data: events,
        total: events.length
    });
});

// ROUTE 7: LISTE UTILISATEURS (DEBUG)
app.get('/api/users', (req, res) => {
    console.log('GET /api/users appelé');
    res.json({
        success: true,
        data: users.map(u => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            role: u.role,
            city: u.city,
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
        error: error.message
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
            'GET /api/health',
            'GET /api/cities',
            'POST /api/auth/register',
            'POST /api/auth/login',
            'GET /api/events',
            'GET /api/users'
        ]
    });
});

// Démarrage serveur
app.listen(PORT, () => {
    console.log(`🚀 TicketBF Backend démarré sur port ${PORT}`);
    console.log(`📱 Frontend: https://main.difewvnbygxxx.amplifyapp.com`);
    console.log(`🔧 Mode DEBUG activé - Routes /api/ corrigées`);
    console.log(`👥 Utilisateurs: ${users.length}`);
    console.log(`🎪 Événements: ${events.length}`);
    console.log(`📧 Test login: admin@ticketbf.com / password123`);
    console.log(`📋 Routes disponibles:`);
    console.log(`   GET /api/health`);
    console.log(`   GET /api/cities`);
    console.log(`   POST /api/auth/register`);
    console.log(`   POST /api/auth/login`);
    console.log(`   GET /api/events`);
});

module.exports = app;
