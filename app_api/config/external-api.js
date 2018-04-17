var request = require('request');

var baseURL = {1: 'https://www.requimte.pt/ucibio/api',
               2: 'https://dev.requimte.pt/laqv/api'};
/*if (process.env.NODE_ENV === 'production') {
    baseURL = {1: 'https://www.requimte.pt/ucibio/api',
               2: 'https://www.requimte.pt/laqv/api'};;
}
*/
exports.baseURL = baseURL;

var contact = function (baseURL, operation, entityType, entityID, errorMessage, errorIDs) {
    // Note: request is asynchronous !
    // errorIDs are the IDs associated with the request being done
    // (might give additional information besides entityID)
    request(baseURL + '/' + operation + '/' + entityType + '/' + entityID,
        function (error, response, body) {
            body = JSON.parse(body);
            if (error !== null) {
                console.log(errorMessage, errorIDs);
                console.log('error:', error);
            }
            if (error === null && body.statusCode !== 200) {
                console.log(errorMessage, errorIDs);
                console.log('body:', body.statusCode);
            }
        });
};

exports.contact = contact;

exports.contactCreateOrUpdate = function (baseURL, entityType, entityID, errorMessage, errorIDs) {
    request(baseURL + '/' + 'create' + '/' + entityType + '/' + entityID,
        function (error, response, body) {
            body = JSON.parse(body);
            if (error !== null) {
                console.log(errorMessage, errorIDs);
                console.log('error:', error);
            }
            if (body.statusCode !== 200) {
                contact(baseURL, 'update', entityType, entityID, errorMessage + '- update', errorIDs);
            }
        });
};




