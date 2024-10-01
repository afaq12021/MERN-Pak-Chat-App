const jwt = require('jsonwebtoken');
const User = require("../Model/userModel")
const asyncHandler = require("express-async-handler")
const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            console.log("Token:", token); // Check token

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            console.log("Decoded user:", req.user); // Check if req.user is correct
            next();
        } catch (error) {
            console.error("Authorization error:", error); // Log any JWT errors
            res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }
});

module.exports = protect ;

