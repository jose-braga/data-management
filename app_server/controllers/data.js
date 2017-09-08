/* GET Person page */
module.exports.person = function(req, res, next) {
    res.render('person', 
        {
            title: 'UCIBIO and LAQV management tools', 
            toolbar: 'Edit your personal data'
        });
};

/* GET Team page */
module.exports.team = function(req, res, next) {
    res.render('team', 
        {
            title: 'UCIBIO and LAQV management tools', 
            toolbar: 'Check team members and used spaces'
        });
};

/* GET Unit page */
module.exports.unit = function(req, res, next) {
    res.render('unit', 
        {
            title: 'UCIBIO and LAQV management tools', 
            toolbar: 'Labs and groups belonging to unit'
        });
};

/* GET Admin page */
module.exports.admin = function(req, res, next) {
    res.render('admin', 
        {
            title: 'UCIBIO and LAQV management tools', 
            toolbar: 'Special features available only to admin'
        });
};