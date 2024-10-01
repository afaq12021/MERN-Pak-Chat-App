const jwt = require("jsonwebtoken");

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: "30d",  // Corrected "expireIn" to "expiresIn"
    });
};

module.exports = generateToken;
