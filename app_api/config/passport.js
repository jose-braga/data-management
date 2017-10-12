var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var server = require('../models/server');
var pool = server.pool;
var userModule = require('../models/users');

var sendJSONResponse = function(res, status, content) {
    res.status(status);
    res.json(content);
};

// expose this function to our app using module.exports

// =========================================================================
// passport session setup ==================================================
// =========================================================================
// required for persistent login sessions
// passport needs ability to serialize and unserialize users out of session
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

    // used to deserialize the user
passport.deserializeUser(function(id, done) {
    pool.query("SELECT * FROM users WHERE id = ? ",[id], function(err, rows){
        done(err, rows[0]);
    });
});

// =========================================================================
// LOCAL SIGNUP ============================================================
// =========================================================================
// we are using named strategies since we have one for login and one for signup
// by default, if there was no name, it would just be called 'local'

passport.use(
    'local-signup',
    new LocalStrategy({
        // by default, local strategy uses username and password
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, username, password, done) {
        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        pool.query("SELECT * FROM users WHERE username = ?",[username], function(err, rows) {
            if (err)
                return done(err);
            if (rows.length) {
                return done(null, false,
                console.log('signupMessage - That username is already taken.'));
            } else {
                var newUserMysql = {
                    username: username,
                    password: userModule.hashPassword(password)
                };
                var insertQuery = "INSERT INTO users ( username, password ) values (?,?)";
                pool.query(insertQuery,[newUserMysql.username, newUserMysql.password],function(err, rows) {
                    if (err) {}
                    newUserMysql.id = rows.insertId;
                    return done(null, newUserMysql);
                });
            }
        });
    })
);


// =========================================================================
// LOCAL LOGIN =============================================================
// =========================================================================
// we are using named strategies since we have one for login and one for signup
// by default, if there was no name, it would just be called 'local'

passport.use(
    'local-login',
    new LocalStrategy({
        // by default, local strategy uses username and password
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, username, password, done) { // callback with username and password from our form
        var query = 'SELECT users.id AS user_id, users.username, users.password, users.status AS stat, ' +
            'people.id as person_id, people_institution_city.city_id, ' +
            'people_labs.lab_id ' +
            'FROM users ' +
            'LEFT JOIN people ON people.user_id = users.id ' +
            'LEFT JOIN people_institution_city ON people.id = people_institution_city.person_id ' +
            'LEFT JOIN people_labs ON people.id = people_labs.person_id ' +
            'WHERE users.username = ? AND people.status = 1;';
        var places = [username];
        pool.getConnection(function(err, connection) {
            if (err) {
                return done(err);
            }
            connection.query(query,places,
                function (err, rows) {
                    // And done with the connection.
                    connection.release();
                    if (err) {
                        return done(err);
                    }
                    if (!rows.length) {
                        return done(null, false, { message: 'Incorrect username.' });
                    }
                    // if the user is found but the password is wrong
                    if (!userModule.checkPassword(password, rows[0].password)) {
                        return done(null, false, { message: 'Incorrect password.' });
                    }
                    // all is well, return successful user
                    var row = Object.assign({}, rows[0]);
                    row['lab_id'] = [];
                    for (var indRow in rows) {
                        row['lab_id'].push(rows[indRow]['lab_id']);
                    }
                    return done(null, row);
                }
            );
        });

    })
);

// =========================================================================
// LOCAL Pre-registration ==================================================
// =========================================================================

passport.use(
    'local-prereg',
    new LocalStrategy({
        // by default, local strategy uses username and password
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, username, password, done) { // callback with username and password from our form
        var query = 'SELECT users.id AS user_id, users.username, users.password, users.status AS stat, ' +
            'people.id as person_id, people_institution_city.city_id ' +
            'FROM users ' +
            'LEFT JOIN people ON people.user_id = users.id ' +
            'LEFT JOIN people_institution_city ON people.id = people_institution_city.person_id ' +
            'WHERE users.username = ? AND people.status = 2;';
        var places = [username];
        pool.getConnection(function(err, connection) {
            if (err) {
                return done(err);
            }
            connection.query(query,places,
                function (err, rows) {
                    // And done with the connection.
                    connection.release();
                    if (err) {
                        return done(err);
                    }
                    if (!rows.length) {
                        return done(null, false, { message: 'Incorrect username.' });
                    }
                    // if the user is found but the password is wrong
                    if (!userModule.checkPassword(password, rows[0].password)) {
                        return done(null, false, { message: 'Incorrect password.' });
                    }
                    // all is well, return successful user
                    var row = Object.assign({}, rows[0]);
                    return done(null, row);
                }
            );
        });
    })
);

module.exports = passport;
