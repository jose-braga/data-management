var express = require('express');
var router = express.Router();
var ctrlLogin = require('../controllers/login.js');
var ctrlData = require('../controllers/data.js');
var ctrlOthers = require('../controllers/others.js')

/* GET Login (home) page. */
//router.get('/', ctrlOthers.angularApp);
/*
router.get('/person', ctrlData.person);
router.get('/team', ctrlData.team);
router.get('/unit', ctrlData.unit);
router.get('/admin', ctrlData.admin);
*/
module.exports = router;
