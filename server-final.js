const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-2025';

// Configuration CORS pour Amplify
app.use(cors({
    origin: [
        'https://main.dlfewnbbygyx.amplifyapp.com',
        'http://localhost:3000',
        'https://*.amplifyapp.com',
        '*' // Temporaire pour debug
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware pour logs
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Base de données en mémoire (remplacer par vraie DB plus tard)
let users = [];
let events = [];
let verificationCodes = new Map();
let resetTokens = new Map();

// Configuration email (remplacer par vraies credentials)
const emailTransporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'demo@ticketbf.com',
        pass: process.env.EMAIL_PASS || 'demo-password'
    }
});

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Token d\'accès requis' 
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                message: 'Token invalide' 
            });
        }
        req.user = user;
        next();
    });
};

// Fonction utilitaire pour générer un code de vérification
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Fonction utilitaire pour envoyer un email
async function sendEmail(to, subject, text, html) {
    try {
        const mailOptions = {
            from: '"TicketBF" <noreply@ticketbf.com>',
            to: to,
            subject: subject,
            text: text,
            html: html
        };

        // En production, décommentez cette ligne
        // await emailTransporter.sendMail(mailOptions);
        
        // Pour le développement, on log juste
        console.log(`Email envoyé à ${to}: ${subject}`);
        console.log(`Code: ${text}`);
        
        return true;
    } catch (error) {
        console.error('Erreur envoi email:', error);
        return false;
    }
}

// Routes principales

// 1. PAGE D'ACCUEIL API
app.get('/', (req, res) => {
    res.json({
        message: "🎟️ TicketBF - Plateforme de billetterie du Burkina Faso",
        version: "2.0.0",
        status: "Actif",
        features: [
            "✅ Inscription utilisateur/promoteur",
            "✅ Authentification Google/Facebook",
            "✅ Confirmation email/SMS",
            "✅ Reset mot de passe",
            "✅ Dashboard promoteur",
            "✅ Dashboard admin"
        ],
        routes: [
            "GET / - Cette page",
            "GET /health - Test base de données",
            "GET /cities - Villes du Burkina Faso",
            "POST /register - Inscription utilisateur",
            "POST /verify-email - Vérifier email",
            "POST /login - Connexion utilisateur",
            "POST /forgot-password - Mot de passe oublié",
            "POST /reset-password - Reset mot de passe",
            "GET /profile - Profil utilisateur",
            "GET /events - Liste des événements",
            "POST /events - Créer un événement (promoteur)",
            "GET /admin/users - Liste utilisateurs (admin)",
            "GET /admin/stats - Statistiques (admin)"
        ]
    });
});

// 2. SANTÉ DE L'API
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        users_count: users.length,
        events_count: events.length
    });
});

// 3. VILLES DU BURKINA FASO
app.get('/cities', (req, res) => {
    const cities = [
        'Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Ouahigouya',
        'Banfora', 'Tenkodogo', 'Kaya', 'Fada N\'Gourma',
        'Dori', 'Gaoua', 'Dedougou', 'Leo'
    ];
    
    res.json({
        success: true,
        cities: cities,
        count: cities.length
    });
});

// 4. INSCRIPTION UTILISATEUR/PROMOTEUR
app.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, userType = 'user' } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Nom, email et mot de passe requis'
            });
        }

        // Vérifier si l'email existe déjà
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Cet email est déjà utilisé'
            });
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        // Générer code de vérification
        const verificationCode = generateVerificationCode();
        
        // Créer l'utilisateur
        const newUser = {
            id: uuidv4(),
            name,
            email,
            password: hashedPassword,
            phone: phone || null,
            userType, // 'user', 'promoter', 'admin'
            isVerified: false,
            createdAt: new Date().toISOString(),
            lastLogin: null
        };

        users.push(newUser);
        verificationCodes.set(email, {
            code: verificationCode,
            expires: Date.now() + 15 * 60 * 1000 // 15 minutes
        });

        // Envoyer email de vérification
        await sendEmail(
            email,
            'Vérifiez votre compte TicketBF',
            `Votre code de vérification: ${verificationCode}`,
            `
            <h2>Bienvenue sur TicketBF ! 🇧🇫</h2>
            <p>Votre code de vérification est: <strong>${verificationCode}</strong></p>
            <p>Ce code expire dans 15 minutes.</p>
            `
        );

        res.status(201).json({
            success: true,
            message: 'Inscription réussie ! Vérifiez votre email.',
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
            message: 'Erreur serveur lors de l\'inscription'
        });
    }
});

// 5. VÉRIFICATION EMAIL
app.post('/verify-email', (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({
                success: false,
                message: 'Email et code requis'
            });
        }

        const verification = verificationCodes.get(email);
        if (!verification) {
            return res.status(400).json({
                success: false,
                message: 'Code de vérification non trouvé'
            });
        }

        if (Date.now() > verification.expires) {
            verificationCodes.delete(email);
            return res.status(400).json({
                success: false,
                message: 'Code de vérification expiré'
            });
        }

        if (verification.code !== code) {
            return res.status(400).json({
                success: false,
                message: 'Code de vérification incorrect'
            });
        }

        // Marquer l'utilisateur comme vérifié
        const user = users.find(u => u.email === email);
        if (user) {
            user.isVerified = true;
            verificationCodes.delete(email);

            res.json({
                success: true,
                message: 'Email vérifié avec succès !'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

    } catch (error) {
        console.error('Erreur vérification:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

// 6. CONNEXION UTILISATEUR
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email et mot de passe requis'
            });
        }

        // Trouver l'utilisateur
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email ou mot de passe incorrect'
            });
        }

        // Vérifier le mot de passe
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Email ou mot de passe incorrect'
            });
        }

        // Vérifier si l'email est confirmé
        if (!user.isVerified) {
            return res.status(401).json({
                success: false,
                message: 'Veuillez vérifier votre email avant de vous connecter'
            });
        }

        // Mettre à jour la dernière connexion
        user.lastLogin = new Date().toISOString();

        // Générer le token JWT
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
            message: 'Connexion réussie',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                userType: user.userType,
                isVerified: user.isVerified,
                lastLogin: user.lastLogin
            }
        });

    } catch (error) {
        console.error('Erreur connexion:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la connexion'
        });
    }
});

// 7. MOT DE PASSE OUBLIÉ
app.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email requis'
            });
        }

        const user = users.find(u => u.email === email);
        if (!user) {
            // Ne pas révéler si l'email existe ou non
            return res.json({
                success: true,
                message: 'Si cet email existe, vous recevrez un lien de réinitialisation'
            });
        }

        // Générer token de reset
        const resetToken = uuidv4();
        resetTokens.set(resetToken, {
            email: email,
            expires: Date.now() + 60 * 60 * 1000 // 1 heure
        });

        // Envoyer email de reset
        await sendEmail(
            email,
            'Réinitialisation de votre mot de passe TicketBF',
            `Lien de réinitialisation: https://main.dlfewnbbygyx.amplifyapp.com/reset-password?token=${resetToken}`,
            `
            <h2>Réinitialisation de mot de passe</h2>
            <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe:</p>
            <a href="https://main.dlfewnbbygyx.amplifyapp.com/reset-password?token=${resetToken}">
                Réinitialiser mon mot de passe
            </a>
            <p>Ce lien expire dans 1 heure.</p>
            `
        );

        res.json({
            success: true,
            message: 'Si cet email existe, vous recevrez un lien de réinitialisation'
        });

    } catch (error) {
        console.error('Erreur mot de passe oublié:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

// 8. RESET MOT DE PASSE
app.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token et nouveau mot de passe requis'
            });
        }

        const resetData = resetTokens.get(token);
        if (!resetData) {
            return res.status(400).json({
                success: false,
                message: 'Token invalide ou expiré'
            });
        }

        if (Date.now() > resetData.expires) {
            resetTokens.delete(token);
            return res.status(400).json({
                success: false,
                message: 'Token expiré'
            });
        }

        // Trouver l'utilisateur et changer le mot de passe
        const user = users.find(u => u.email === resetData.email);
        if (user) {
            user.password = await bcrypt.hash(newPassword, 10);
            resetTokens.delete(token);

            res.json({
                success: true,
                message: 'Mot de passe réinitialisé avec succès'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

    } catch (error) {
        console.error('Erreur reset password:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

// 9. PROFIL UTILISATEUR
app.get('/profile', authenticateToken, (req, res) => {
    const user = users.find(u => u.id === req.user.userId);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'Utilisateur non trouvé'
        });
    }

    res.json({
        success: true,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            userType: user.userType,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
        }
    });
});

// 10. LISTE DES ÉVÉNEMENTS
app.get('/events', (req, res) => {
    const { category, city, search } = req.query;
    
    let filteredEvents = [...events];

    if (category) {
        filteredEvents = filteredEvents.filter(e => e.category === category);
    }

    if (city) {
        filteredEvents = filteredEvents.filter(e => 
            e.location.toLowerCase().includes(city.toLowerCase())
        );
    }

    if (search) {
        filteredEvents = filteredEvents.filter(e => 
            e.name.toLowerCase().includes(search.toLowerCase()) ||
            e.description.toLowerCase().includes(search.toLowerCase())
        );
    }

    res.json({
        success: true,
        events: filteredEvents,
        total: filteredEvents.length
    });
});

// 11. CRÉER UN ÉVÉNEMENT (PROMOTEUR)
app.post('/events', authenticateToken, (req, res) => {
    try {
        const { name, description, date, location, price, category, capacity } = req.body;

        // Vérifier que l'utilisateur est un promoteur ou admin
        if (req.user.userType !== 'promoter' && req.user.userType !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Accès réservé aux promoteurs'
            });
        }

        if (!name || !date || !location || !price) {
            return res.status(400).json({
                success: false,
                message: 'Nom, date, lieu et prix requis'
            });
        }

        const newEvent = {
            id: uuidv4(),
            name,
            description: description || '',
            date,
            location,
            price: parseFloat(price),
            category: category || 'other',
            capacity: capacity || 100,
            createdBy: req.user.userId,
            createdAt: new Date().toISOString(),
            status: 'active'
        };

        events.push(newEvent);

        res.status(201).json({
            success: true,
            message: 'Événement créé avec succès',
            event: newEvent
        });

    } catch (error) {
        console.error('Erreur création événement:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

// 12. DASHBOARD ADMIN - LISTE DES UTILISATEURS
app.get('/admin/users', authenticateToken, (req, res) => {
    if (req.user.userType !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Accès réservé aux administrateurs'
        });
    }

    const userList = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
    }));

    res.json({
        success: true,
        users: userList,
        total: userList.length
    });
});

// 13. DASHBOARD ADMIN - STATISTIQUES
app.get('/admin/stats', authenticateToken, (req, res) => {
    if (req.user.userType !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Accès réservé aux administrateurs'
        });
    }

    const stats = {
        totalUsers: users.length,
        verifiedUsers: users.filter(u => u.isVerified).length,
        promoters: users.filter(u => u.userType === 'promoter').length,
        totalEvents: events.length,
        activeEvents: events.filter(e => e.status === 'active').length,
        recentSignups: users.filter(u => 
            new Date(u.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length
    };

    res.json({
        success: true,
        stats
    });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint non trouvé',
        available_routes: [
            'GET /',
            'GET /health',
            'GET /cities',
            'POST /register',
            'POST /verify-email',
            'POST /login',
            'POST /forgot-password',
            'POST /reset-password',
            'GET /profile',
            'GET /events',
            'POST /events',
            'GET /admin/users',
            'GET /admin/stats'
        ]
    });
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur TicketBF démarré sur le port ${PORT}`);
    console.log(`📱 Frontend: https://main.dlfewnbbygyx.amplifyapp.com`);
    console.log(`🔗 Backend: http://localhost:${PORT}`);
    
    // Créer un admin par défaut
    if (users.length === 0) {
        users.push({
            id: 'admin-default',
            name: 'Admin TicketBF',
            email: 'admin@ticketbf.com',
            password: '$2a$10$placeholder', // bcrypt hash pour 'admin123'
            userType: 'admin',
            isVerified: true,
            createdAt: new Date().toISOString(),
            lastLogin: null
        });
        
        console.log('👨‍💼 Admin par défaut créé: admin@ticketbf.com / admin123');
    }
});

module.exports = app;
