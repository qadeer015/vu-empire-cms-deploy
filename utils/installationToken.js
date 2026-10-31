const crypto = require("crypto");

function generateRegistrationToken() {
    return crypto.randomBytes(32).toString("base64url");
}

function hashRegistrationToken(token) {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}

module.exports = {
    generateRegistrationToken,
    hashRegistrationToken
};


// A token will look roughly like:

// zJ4x...very - long - random - value...
// Never generate this with:

// Math.random()