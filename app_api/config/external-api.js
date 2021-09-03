var request = require('requestretry');

var baseURL = {1: 'https://ucibio.pt/api',
               2: 'https://www.requimte.pt/laqv/api'};
/*if (process.env.NODE_ENV === 'production') {
    baseURL = {1: 'https://www.requimte.pt/ucibio/api',
               2: 'https://www.requimte.pt/laqv/api'};;
}
*/

var sendJSONResponse = function (res, status, content) {
    res.status(status);
    res.json(content);
};

exports.baseURL = baseURL;

var RETRIABLE_ERRORS = ['ECONNRESET', 'ENOTFOUND', 'ESOCKETTIMEDOUT', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'EPIPE', 'EAI_AGAIN'];
var _ = require('lodash');

function retryBodyOrHTTPOrNetwork(err, response, body) {
    // retry the request if: 1 - network error, 2 - HTTP error, 3 - body does not parse to JSON
    // the network and http parts where taken from requestretry code.
    var network_err = err && _.includes(RETRIABLE_ERRORS, err.code);
    var http_err = (response && 500 <= response.statusCode && response.statusCode < 600);
    var body_err;
    if (body === undefined || body === null) return true; // body error
    if (body.length > 0 && body[1] === '<') return true; // body error
    try {
        body = JSON.parse(body);
        body_err = false;
    } catch (error) {
        body_err = true;
    }
    return network_err || http_err || body_err;
}

function getSlotBackoff(attempts,slot) {
    timeDelay = slot * 300 + attempts * 1000 + Math.floor(Math.random() * 500);
    return timeDelay;
}

function slotBackoffStrategy(slot) {
    let attempts = 0;
    return () => {
        attempts += 1;
        return getSlotBackoff(attempts,slot);
    };
}

var contact = function (baseURL, operation, entityType, entityID,
                        errorMessage, errorIDs, slot) {
    // Note: request is asynchronous !
    // errorIDs are the IDs associated with the request being done
    // (might give additional information besides entityID)
    if (slot === undefined) {
        slot = 1;
    }
    request({
            url: baseURL + '/' + operation + '/' + entityType + '/' + entityID,
            maxAttempts: 5,
            delayStrategy: slotBackoffStrategy(slot),
            retryStrategy: retryBodyOrHTTPOrNetwork
        }, function (error, response, body) {
            if (body !== undefined) {
                if (body.length > 0) {
                    try {
                        body = JSON.parse(body);
                    }
                    catch (err) {
                        console.log(errorMessage, errorIDs);
                        //console.log('error slot:', slot);
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
        });
};

var contactPURE = function (req, res, baseURL, version, apiKey, entity,
                            entityID, entityData, q,
                            offset, size, dataList) {
    let qs = {
           "apiKey": apiKey,
           "offset": offset,
           "size": size,
    };
    if (q !== undefined) {
        qs['q'] = q;
    }
    let url = '';
    if (entityData === undefined && entityID === undefined) {
        url = baseURL + '/' + version + '/' + entity;
    } else if (entityData === undefined) {
        url = baseURL + '/' + version + '/' + entity + '/' + entityID;
    } else {
        url = baseURL + '/' + version + '/' + entity + '/' + entityID + '/' + entityData;
    }

    request({
        url: url,
        headers: { "Accept": "application/json" },
        qs: qs,
        maxAttempts: 5,
        retryDelay: 1000,
        retryStrategy: retryBodyOrHTTPOrNetwork
    },
    function (error, response, body) {
        if (body !== undefined) {
            if (body.length > 0) {
                try {
                    body = JSON.parse(body);
                    dataList = dataList.concat(body.items);
                    if (offset + size < body.count) {
                        offset = offset + size;
                        contactPURE(req, res,
                            process.env.PURE_BASE_URL,
                            process.env.PURE_VERSION,
                            process.env.PURE_API_KEY,
                            'persons',
                            entityID,
                            'research-outputs',
                            undefined,
                            offset,
                            size,
                            dataList
                        )
                    } else {
                        sendJSONResponse(res, 200, dataList);
                        return;
                    }
                }
                catch (err) {
                    console.log('error response:', err);
                    body = { 'statusCode': 500, 'error': err };
                    sendJSONResponse(res, 500, body);
                    return;
                }
            } else {
                body = { 'statusCode': 503 };
                sendJSONResponse(res, 503, body);
                return;
            }
        } else {
            body = { 'statusCode': 503 };
            sendJSONResponse(res, 503, body);
            return;
        }
    });
};

exports.contact = contact;

exports.contactCreateOrUpdate = function (baseURL, entityType, entityID,
                                         errorMessage, errorIDs, slot) {
    if (slot === undefined) {
        slot = 1;
    }
    request({
            url: baseURL + '/' + 'create' + '/' + entityType + '/' + entityID,
            maxAttempts: 5,
            delayStrategy: slotBackoffStrategy(slot),
            retryStrategy: retryBodyOrHTTPOrNetwork
        }, function (error, response, body) {
            if (body !== undefined) {
                if (body.length > 0) {
                    try {
                        body = JSON.parse(body);
                    }
                    catch (err) {
                        console.log(errorMessage, errorIDs);
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
                contact(baseURL, 'update', entityType, entityID, errorMessage + '- update', errorIDs, slot);
            }
        });
};

exports.contactPURE = contactPURE;




