const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header with detailed logging
        const authHeader = req.header('Authorization');
        console.log('[Auth] Headers received:', {
            auth: authHeader?.substring(0, 20) + '...',
            method: req.method,
            path: req.path
        });
        
        if (!authHeader?.startsWith('Bearer ')) {
            console.log('[Auth] No valid bearer token');
            return res.status(401).json({ 
                success: false, 
                message: "No valid bearer token" 
            });
        }

        // Clean and verify token
        const token = authHeader.split(' ')[1].trim();
        
        if (!token) {
            console.log('[Auth] Empty token after split');
            return res.status(401).json({ 
                success: false, 
                message: "Empty token" 
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('[Auth] Token decoded:', { 
                userId: decoded.id,
                exp: new Date(decoded.exp * 1000)
            });

            // Get user with lean() for better performance
            const user = await User.findById(decoded.id).lean();
            
            if (!user) {
                console.log(`[Auth] User not found: ${decoded.id}`);
                return res.status(401).json({ 
                    success: false, 
                    message: "User not found" 
                });
            }

            // Set user in request
            req.user = {
                _id: user._id.toString(),
                id: user._id.toString(),
                email: user.email
            };

            next();
        } catch (jwtError) {
            console.error('[Auth] JWT verification failed:', jwtError.message);
            return res.status(401).json({ 
                success: false, 
                message: "Invalid token",
                error: process.env.NODE_ENV === 'development' ? jwtError.message : undefined
            });
        }
    } catch (error) {
        console.error('[Auth] Middleware error:', error);
        res.status(500).json({ 
            success: false, 
            message: "Server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = authMiddleware;
