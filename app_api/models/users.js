var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');

module.exports.generateJWT =  function (userID, personID, stat, username,labID,cityID) {
    var expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    return jwt.sign({
        userID: userID,
        personID: personID,
        stat: stat,
        username: username,
        labID: labID,
        cityID: cityID,
        exp: parseInt(expiry.getTime()/1000, 10)
    }, process.env.JWT_SECRET);
};

module.exports.generateJWTPreReg =  function (userID, personID, stat, username,cityID) {
    var expiry = new Date();
    expiry.setDate(expiry.getDate() + 1); // pre-registration is valid only for 1 day
    return jwt.sign({
        userID: userID,
        personID: personID,
        stat: stat,
        username: username,
        cityID: cityID,
        base_url: process.env.PATH_PREFIX,
        exp: parseInt(expiry.getTime()/1000, 10)
    }, process.env.JWT_SECRET);
};

module.exports.hashPassword = function(password) {
    var hash = bcrypt.hashSync(password, 10);
    return hash;
};

module.exports.checkPassword = function(password, hash) {
    return bcrypt.compareSync(password, hash);
};