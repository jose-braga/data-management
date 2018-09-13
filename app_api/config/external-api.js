var request = require('requestretry');

var baseURL = {1: 'https://www.requimte.pt/ucibio/api',
               2: 'https://www.requimte.pt/laqv/api'};
/*if (process.env.NODE_ENV === 'production') {
    baseURL = {1: 'https://www.requimte.pt/ucibio/api',
               2: 'https://www.requimte.pt/laqv/api'};;
}
*/
exports.baseURL = baseURL;

var RETRIABLE_ERRORS = ['ECONNRESET', 'ENOTFOUND', 'ESOCKETTIMEDOUT', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'EPIPE', 'EAI_AGAIN'];
var _ = require('lodash');

function retryBodyOrHTTPOrNetwork(err, response, body) {
    // retry the request if: 1 - network error, 2 - HTTP error, 3 - body does not parse to JSON
    // the network and http parts where taken from requestretry code.
    var network_err = err && _.includes(RETRIABLE_ERRORS, err.code);
    var http_err = (response && 500 <= response.statusCode && response.statusCode < 600);
    var body_err;
    try {
        body = JSON.parse(body);
        body_err = false;
    } catch (error) {
        body_err = true;
    }
    return network_err || http_err || body_err;
}

var contact = function (baseURL, operation, entityType, entityID, errorMessage, errorIDs) {
    // Note: request is asynchronous !
    // errorIDs are the IDs associated with the request being done
    // (might give additional information besides entityID)
    request({
            url: baseURL + '/' + operation + '/' + entityType + '/' + entityID,
            maxAttempts: 5,
            retryDelay: 5000,
            retryStrategy: retryBodyOrHTTPOrNetwork
        }, function (error, response, body) {
            if (body !== undefined) {
                if (body.length >0) {
                    try {
                        body = JSON.parse(body);
                    }
                    catch (err) {
                        console.log('error response:', err);
                        body = {'statusCode': 5000};
                    }
                }  else {
                    body = {'statusCode': 5001};
                }
            } else {
                body = {'statusCode': 5002};
            }
            if (error !== null) {
                console.log(errorMessage, errorIDs);
                console.log('error:', error);
            }
            if (error === null && body.statusCode !== 200) {
                console.log(errorMessage, errorIDs);
                console.log('statusCode:', body.statusCode);
            }
        });
};

exports.contact = contact;

exports.contactCreateOrUpdate = function (baseURL, entityType, entityID, errorMessage, errorIDs) {
    request({
            url: baseURL + '/' + 'create' + '/' + entityType + '/' + entityID,
            maxAttempts: 5,
            retryDelay: 5000,
            retryStrategy: retryBodyOrHTTPOrNetwork
        }, function (error, response, body) {
            if (body !== undefined) {
                if (body.length >0) {
                    try {
                        body = JSON.parse(body);
                    }
                    catch (err) {
                        console.log('error response:', err);
                        body = {'statusCode': 5000};
                    }
                } else {
                    body = {'statusCode': 5001};
                }
            } else {
                body = {'statusCode': 5002};
            }
            if (error !== null) {
                console.log(errorMessage, errorIDs);
                console.log('error:', error);
            }
            if (body.statusCode !== 200) {
                contact(baseURL, 'update', entityType, entityID, errorMessage + '- update', errorIDs);
            }
        });
};




