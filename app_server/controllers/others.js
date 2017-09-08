module.exports.angularApp = function(req, res, next){
    res.render('layout', { 
        title: 'Data management @ UCIBIO/LAQV',
        toolbar: 'Edit your personal data'
    });
};