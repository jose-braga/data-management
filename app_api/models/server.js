var mysql = require('mysql');

//require('./users');
var pool;
if (process.env.NODE_ENV === 'production') {
  pool  = mysql.createPool({
    connectionLimit : 50,
    multipleStatements: true,
    host            : process.env.DB_HOST,
    port            : process.env.DB_PORT,
    user            : process.env.DB_USER,
    password        : process.env.DB_PASS,
    database        : process.env.DB_DB
  });
} else {
  pool  = mysql.createPool({
    connectionLimit : 50,
    multipleStatements: true,
    host            : process.env.DB_HOST,
    port            : process.env.DB_PORT,
    user            : process.env.DB_USER,
    password        : process.env.DB_PASS,
    database        : process.env.DB_DB
  });
}



exports.pool = pool;