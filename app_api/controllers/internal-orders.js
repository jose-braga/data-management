var moment = require('moment-timezone');
var server = require('../models/server');
var pool = server.pool;
var permissions = require('../config/permissions');
const nodemailer = require('../controllers/emailer');
let transporter = nodemailer.transporter;
let recipients = nodemailer.emailRecipients.orders;

var sendJSONResponse = function (res, status, content) {
    res.status(status);
    res.json(content);
};

function momentToDate(timedate, timezone, timeformat) {
    if (timezone === undefined) {
        timezone = 'Europe/Lisbon';
    }
    if (timeformat === undefined) {
        timeformat = 'YYYY-MM-DD';
    }
    return timedate !== null ? moment.tz(timedate, timezone).format(timeformat) : null;
}

var checksOrderPermissions = function (req, res, next, callback, callbackOptions) {
    var userID = req.params.userID;
    if (parseInt(userID,10) === req.payload.userID) {
        // if user is who he says he is
        var query = 'SELECT accounts_people.account_id, emails.email'
            + ' FROM accounts_people'
            + ' JOIN accounts ON accounts.id = accounts_people.account_id'
            + ' JOIN people ON people.user_id = accounts_people.user_id'
            + ' LEFT JOIN emails ON emails.person_id = people.id'
            + ' WHERE accounts_people.user_id = ? AND accounts.active = 1;';
        var places = [userID];
        pool.getConnection(function (err, connection) {
            if (err) {
                sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                return;
            }
            // Use the connection
            connection.query(query, places,
                function (err, resQuery) {
                    // And done with the connection.
                    connection.release();
                    if (err) {
                        sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                        return;
                    }
                    if (resQuery.length === 1
                        && resQuery[0].account_id !== null
                        && resQuery[0].account_id !== undefined) {
                        callbackOptions.userID = userID;
                        callbackOptions.userEmail = resQuery[0].email;
                        callbackOptions.accountID = resQuery[0].account_id;
                        return callback(req, res, next, callbackOptions);
                    } else if (resQuery.length > 1) {
                        console.log(resQuery)
                        // TODO: if necessary, a user might belong to more than 1 account
                        sendJSONResponse(res, 403, {
                            "status": "error",
                            "statusCode": 403,
                            "message": "This user belongs to several accounts."
                        });
                        return;
                    } else {
                        sendJSONResponse(res, 403, {
                            "status": "error",
                            "statusCode": 403,
                            "message": "You are not authorized to access this resource"
                        });
                        return;
                    }
                });
        });

    } else {
        sendJSONResponse(res, 403, {
            "status": "error",
            "statusCode": 403,
            "message": "User mismatches JWT token. You are not authorized to access this resource."
        });
        return;

    }
    
};

var checkManagementPermissions = function (req, res, next, callback, callbackOptions) {
    var userID = req.params.userID;
    var query = 'SELECT *'
        + ' FROM stock_managers'
        + ' WHERE user_id = ?;';
    var places = [userID];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                if (resQuery.length === 1
                    && resQuery[0].id !== null
                    && resQuery[0].id !== undefined) {
                    callbackOptions.userID = userID;
                    callbackOptions.stockAuthorization = true;                    
                } else {
                    callbackOptions.stockAuthorization = false;

                }
                return checkManagementPermissionsFinancial(req, res, next, callback, callbackOptions);
            });
    });
};

var checkManagementPermissionsFinancial = function (req, res, next, callback, callbackOptions) {
    var userID = req.params.userID;
    var query = 'SELECT *'
        + ' FROM account_managers'
        + ' WHERE user_id = ?;';
    var places = [userID];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                if (resQuery.length === 1
                    && resQuery[0].id !== null
                    && resQuery[0].id !== undefined) {
                    callbackOptions.financialAuthorization = true;
                } else {
                    callbackOptions.financialAuthorization = false;
                }
                if (callback !== undefined) {
                    if (callbackOptions.stockAuthorization || callbackOptions.financialAuthorization) {
                        // each calback will check if the user has the appropriate permissions
                        return callback(req, res, next, callbackOptions);
                    } else {
                        sendJSONResponse(res, 403, {
                            "status": "error",
                            "statusCode": 403,
                            "message": "You are not authorized to access this resource"
                        });
                        return;
                    }
                } else {
                    sendJSONResponse(res, 200,
                        {
                            "status": "success", "statusCode": 200, 
                            "result": {
                                stockAuthorization: callbackOptions.stockAuthorization,
                                financialAuthorization: callbackOptions.financialAuthorization,
                            }
                        });
                    return;
                }
            });
    });
};

var makeInventoryItemQuery = function (req, res, next, options) {
    var query = 'SELECT items.*,'
        + ' quantity_types.name_plural_en AS unit_plural_en, quantity_types.name_singular_en  AS unit_singular_en,'
        + ' quantity_types.name_plural_pt AS unit_plural_pt, quantity_types.name_singular_pt AS unit_singular_pt,'
        + ' quantity_types.decimal,'
        + ' stock.id AS stock_id, stock.quantity_in_stock_decimal, stock.quantity_in_requests_decimal,'
        + ' stock.quantity_in_stock, stock.quantity_in_requests, stock.status_id,'
        + ' stock_item_statuses.name_en AS status_en, stock_item_statuses.name_pt AS status_pt,'
        + ' stock_item_statuses.description_en AS status_description_en, stock_item_statuses.description_pt AS status_description_pt'
        + ' FROM items'
        +   ' LEFT JOIN quantity_types ON quantity_types.id = items.quantity_type_id'
        +   ' LEFT JOIN stock ON stock.item_id = items.id'
        +   ' LEFT JOIN stock_item_statuses ON stock_item_statuses.id = stock.status_id'
        + ' WHERE items.visible = ? AND stock.deleted = ?;';
    var places = [1,0]; //only visible and non-deleted stock items
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                if (resQuery.length > 0) {
                    return getItemCategories(req, res, next, resQuery, 0, options);
                } else {
                    sendJSONResponse(res, 200,
                        {
                            "status": "success", "statusCode": 200, "count": 0,
                            "result": {"account_info": options, "inventory": []}
                        });
                    return;
                }
            });
    });
};
var makeManagerInventoryItemQuery = function (req, res, next, options) {
    if (options.stockAuthorization) {
        var query = 'SELECT items.*,'
            + ' quantity_types.name_plural_en AS unit_plural_en, quantity_types.name_singular_en  AS unit_singular_en,'
            + ' quantity_types.name_plural_pt AS unit_plural_pt, quantity_types.name_singular_pt AS unit_singular_pt,'
            + ' quantity_types.decimal,'
            + ' stock.id AS stock_id, stock.quantity_in_stock_decimal, stock.quantity_in_requests_decimal,'
            + ' stock.quantity_in_stock, stock.quantity_in_requests, stock.status_id,'
            + ' stock_item_statuses.name_en AS status_en, stock_item_statuses.name_pt AS status_pt,'
            + ' stock_item_statuses.description_en AS status_description_en, stock_item_statuses.description_pt AS status_description_pt'
            + ' FROM items'
            + ' LEFT JOIN quantity_types ON quantity_types.id = items.quantity_type_id'
            + ' LEFT JOIN stock ON stock.item_id = items.id'
            + ' LEFT JOIN stock_item_statuses ON stock_item_statuses.id = stock.status_id'
            + ' WHERE stock.deleted = ?;';
        var places = [0]; //only non-deleted items
        pool.getConnection(function (err, connection) {
            if (err) {
                sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                return;
            }
            // Use the connection
            connection.query(query, places,
                function (err, resQuery) {
                    // And done with the connection.
                    connection.release();
                    if (err) {
                        sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                        return;
                    }
                    if (resQuery.length  > 0) {
                        return getItemCategories(req, res, next, resQuery, 0, options);
                    } else {
                        sendJSONResponse(res, 200,
                            {
                                "status": "success", "statusCode": 200, "count": 0,
                                "result": { "account_info": options, "inventory": [] }
                            });
                        return;
                    }                    
                });
        });
    } else {
        sendJSONResponse(res, 403, {
            "status": "error",
            "statusCode": 403,
            "message": "You are not authorized to access this resource"
        });
        return;
    }    
};


var updateManagememtInventoryQuery = function (req, res, next, options) {
    options.delete = req.body.delete;
    options.update = req.body.update;
    options.create = req.body.create;
    options.datetime = momentToDate(moment(), undefined, 'YYYY-MM-DD HH:mm:ss');
    if (options.stockAuthorization) {
        if (options.delete.length > 0) {
            return deleteStockItem(req, res, next, options, 0);
        } else if (options.update.length > 0) {
            return updateStockItem(req, res, next, options, 0);
        } else if (options.create.length > 0) {
            return createStockItem(req, res, next, options, 0);
        } else {
            sendJSONResponse(res, 200,
                {
                    "status": "success", "statusCode": 200,
                    "message": "No changes."
                });
            return;
        }
    } else {
        // not authorized
        sendJSONResponse(res, 403, {
            "status": "error",
            "statusCode": 403,
            "message": "You are not authorized to change these resources"
        });
        return;
    }
};
var deleteStockItem = function (req, res, next, options, i) {
    let items = options.delete;
    // there should be at least 1 order item
    let query;
    let places;
    query = 'UPDATE stock SET deleted = 1 WHERE id = ?;';
    places = [items[i].stock_id];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                if (i + 1 < items.length) {
                    return deleteStockItem(req, res, next, options, i + 1);
                } else {
                    return writeStockItemHistory(req, res, next, options, 0, 'delete');
                }
                
            });
    });
};
var updateStockItem = function (req, res, next, options, i) {
    let items = options.update;
    // there should be at least 1 order item
    let query;
    let places;
    query = 'UPDATE items' 
            + ' SET name_en = ?,'
            + ' brand = ?,'
            + ' reference = ?,'
            + ' quantity_type_id = ?,'
            + ' current_unit_price = ?,'
            + ' tax = ?,'
            + ' visible = ?'
            + ' WHERE id = ?;';
    query = query + 'UPDATE stock'
            + ' SET quantity_in_stock_decimal = ?,'
            + ' quantity_in_stock = ?,'
            + ' status_id = ?'
            + ' WHERE id = ?;';
    places = [
        items[i].name_en,
        items[i].brand,
        items[i].reference,
        items[i].quantity_type_id,
        items[i].current_unit_price,
        items[i].tax,
        items[i].visible,
        items[i].id,
        items[i].quantity_in_stock_decimal,
        items[i].quantity_in_stock,
        items[i].status_id,
        items[i].stock_id
    ];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                return updateItemCategories(req, res, next, options, i, 'update');                
            });
    });
};
var createStockItem = function (req, res, next, options, i) {
    let items = options.create;
    // there should be at least 1 order item
    let query;
    let places;
    query = 'INSERT INTO items'
        + ' (name_en, brand, reference, quantity_type_id, current_unit_price, tax, visible)'
        + ' VALUES (?,?,?,?,?,?,?)';
    places = [
        items[i].name_en,
        items[i].brand,
        items[i].reference,
        items[i].quantity_type_id,
        items[i].current_unit_price,
        items[i].tax,
        items[i].visible
    ];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                let itemID = resQuery.insertId;
                if (i === 0) {
                    options.itemID = [itemID];
                } else {
                    options.itemID.push(itemID);
                }
                return updateItemCategories(req, res, next, options, i, 'create');
            });
    });
};
var createStockItemStock = function (req, res, next, options, i) {
    let items = options.create;
    // there should be at least 1 order item
    let query;
    let places;
    if (items[i].decimal === 1) {
        query = 'INSERT INTO stock'
            + ' (item_id, quantity_in_stock_decimal, quantity_in_requests_decimal, status_id, deleted)'
            + ' VALUES (?,?,?,?,?)';
        places = [
            items[i].id,
            items[i].quantity_in_stock_decimal,
            items[i].quantity_in_requests_decimal,
            items[i].status_id,
            0
        ];
    } else {
        query = 'INSERT INTO stock'
            + ' (item_id, quantity_in_stock, quantity_in_requests, status_id, deleted)'
            + ' VALUES (?,?,?,?,?)';
        places = [
            items[i].id,
            items[i].quantity_in_stock,
            items[i].quantity_in_requests,
            items[i].status_id,
            0
        ];
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                let stockID = resQuery.insertId;
                if (i === 0) {
                    options.stockID = [stockID];
                } else {
                    options.stockID.push(stockID);
                }
                return insertCostHistory(req, res, next, options, i, 'create');
            });
    });
};
var updateItemCategories = function (req, res, next, options, i, operation) {
    let items;
    if (operation === 'update') {
        items = options.update;
    } else if (operation === 'create') {
        items = options.create;
        items[i].id = options.itemID[i];
    }
    if (items[i].item_categories.length > 0) {
        let query;
        let places;
        // first delete previous entries
        query = 'DELETE FROM items_categories WHERE item_id = ?;';
        places = [items[i].id];
        // then insert new ones
        query = query + 'INSERT INTO items_categories (item_id, category_id)'
            + ' VALUES ';
        for (let el in items[i].item_categories) {
            query = query + '(?,?)';
            if (el < items[i].item_categories.length - 1) {
                query = query + ', ';
            } else {
                query = query + ';';
            }
            places.push(items[i].id, items[i].item_categories[el].id);
        }
        pool.getConnection(function (err, connection) {
            if (err) {
                sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                return;
            }
            // Use the connection
            connection.query(query, places,
                function (err, resQuery) {
                    // And done with the connection.
                    connection.release();
                    if (err) {
                        sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                        return;
                    }
                    if (operation === 'update') {
                        if (items[i].changedMoney) {
                            return insertCostHistory(req, res, next, options, i, 'update');
                        } else if (i + 1 < items.length) {
                            return updateStockItem(req, res, next, options, i + 1);
                        } else {
                            return writeStockItemHistory(req, res, next, options, 0, 'update');
                        }
                    } else if (operation === 'create') {
                        return createStockItemStock(req, res, next, options, i);
                    }                    
                });
        });
    } else {
        if (operation === 'update') {
            if (items[i].changedMoney) {
                return insertCostHistory(req, res, next, options, i, 'update');
            } else if (i + 1 < items.length) {
                return updateStockItem(req, res, next, options, i + 1);
            } else {
                return writeStockItemHistory(req, res, next, options, 0, 'update');
            }
        } else if (operation === 'create') {
            return createStockItemStock(req, res, next, options, i);
        }
    }
};
var insertCostHistory = function (req, res, next, options, i, operation) {
    let items;
    if (operation === 'update') {
        items = options.update;
    } else if (operation === 'create') {
        items = options.create;
        items[i].id = options.itemID[i];
    }
    let query;
    let places;
    query = 'INSERT INTO items_unit_prices_history'
        + ' (item_id, price, tax, timestamp)'
        + ' VALUES (?,?,?,?);';
    places = [
        items[i].id,
        items[i].current_unit_price,
        items[i].tax,
        options.datetime
    ];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                if (i + 1 < items.length) {
                    if (operation === 'update') {
                        return updateStockItem(req, res, next, options, i + 1);
                    } else if (operation === 'create') {
                        return createStockItem(req, res, next, options, i + 1);
                    }
                } else {
                    if (operation === 'update') {
                        return writeStockItemHistory(req, res, next, options, 0, 'update');
                    } else if (operation === 'create') {
                        return writeStockItemHistory(req, res, next, options, 0, 'create');
                    }
                }
            });
    });
};
var writeStockItemHistory = function (req, res, next, options, i, operation) {
    let items;
    let charOperation;
    if (operation === 'delete') {
        items = options.delete;
        charOperation = 'D';
    } else if (operation === 'update') {
        items = options.update;
        charOperation = 'U';
    } else if (operation === 'create') {
        items = options.create;
        items[i].id = options.itemID[i];
        items[i].stock_id = options.stockID[i];
        charOperation = 'C';
    }
    let query;
    let places;
    query = 'INSERT INTO stock_history'
        + ' (stock_id, item_id, quantity_in_stock_decimal, quantity_in_requests_decimal,'
        + ' quantity_in_stock, quantity_in_requests, status_id, operation, timestamp)'
        + ' VALUES (?,?,?,?,?,?,?,?,?);';
    places = [
        items[i].stock_id,
        items[i].id,
        items[i].quantity_in_stock_decimal,
        items[i].quantity_in_requests_decimal,
        items[i].quantity_in_stock,
        items[i].quantity_in_requests,
        items[i].status_id,
        charOperation,
        options.datetime
    ];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                if (i + 1 < items.length) {
                    if (operation === 'delete') {
                        return writeStockItemHistory(req, res, next, options, i + 1, 'delete');
                    } else if (operation === 'update') {
                        return writeStockItemHistory(req, res, next, options, i + 1, 'update');
                    } else if (operation === 'create') {
                        return writeStockItemHistory(req, res, next, options, i + 1, 'create');
                    }
                } else {
                    if (operation === 'delete') {
                        if (options.update.length > 0) {
                            return updateStockItem(req, res, next, options, 0);
                        } else if (options.create.length > 0) {
                            return createStockItem(req, res, next, options, 0);
                        } else {
                            sendJSONResponse(res, 200,
                                {
                                    "status": "success", "statusCode": 200,
                                    "message": "All changes were made."
                                });
                            return;
                        }                            
                    } else if (operation === 'update') {
                        if (options.create.length > 0) {
                            return createStockItem(req, res, next, options, 0);
                        } else {
                            sendJSONResponse(res, 200,
                                {
                                    "status": "success", "statusCode": 200,
                                    "message": "All changes were made."
                                });
                            return;
                        }
                    } else if (operation === 'create') {
                        sendJSONResponse(res, 200,
                            {
                                "status": "success", "statusCode": 200,
                                "message": "All changes were made."
                            });
                        return;                        
                    }                    
                }
            });
    });
};


var makeManagerOrdersQuery = function (req, res, next, options) {
    // afterwards we pick items information for each order, order status
    var query = 'SELECT orders.*,'
        + ' people.id AS person_id, people.colloquial_name, emails.email,'
        + ' accounts.id AS account_id, accounts.name_en as account_name_en, accounts.name_pt as account_name_pt,'
        + ' cost_centers_orders.id AS cost_center_id, cost_centers_orders.name_en AS cost_center_name_en, cost_centers_orders.name_pt AS cost_center_name_pt'
        + ' FROM orders'
        + ' LEFT JOIN accounts ON accounts.id = orders.account_id'
        + ' LEFT JOIN cost_centers_orders ON cost_centers_orders.id = accounts.cost_center_id'
        + ' LEFT JOIN users ON users.id = orders.user_ordered_id'
        + ' LEFT JOIN people ON people.user_id = users.id'
        + ' LEFT JOIN emails ON emails.person_id = people.id'
        + ' WHERE DATE_SUB(CURDATE(),INTERVAL 90 DAY) <= DATE(orders.datetime);';

    var places = [1, 0]; //only visible and non-deleted stock items
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                if (resQuery.length > 0) {
                    return getManagerOrderItems(req, res, next, resQuery, 0, options);
                } else {
                    sendJSONResponse(res, 200,
                        {
                            "status": "success", "statusCode": 200, "count": 0,
                            "result": []
                        });
                    return;                    
                }
            });
    });
};
var getManagerOrderItems = function (req, res, next, rows, i, options) {
    var query = 'SELECT items_orders.*,'
        + ' items.name_en AS item_name_en, items.name_pt AS item_name_pt,'
        + ' items.brand, items.reference, items.quantity_type_id,'
        + ' quantity_types.name_plural_en AS unit_plural_en, quantity_types.name_plural_pt AS unit_plural_pt,'
        + ' quantity_types.name_singular_en AS unit_singular_en, quantity_types.name_singular_pt AS unit_singular_pt,'
        + ' quantity_types.decimal,'
        + ' stock.quantity_in_stock_decimal, stock.quantity_in_stock,'
        + ' stock.quantity_in_requests_decimal, stock.quantity_in_requests, stock.status_id AS stock_item_status_id,'
        + ' stock_item_statuses.name_en AS stock_item_status_en, stock_item_statuses.name_pt AS stock_item_status_pt'
        + ' FROM items_orders'
        + ' LEFT JOIN items ON items.id = items_orders.item_id'
        + ' JOIN quantity_types ON quantity_types.id = items.quantity_type_id'
        + ' JOIN stock ON stock.item_id = items.id'
        + ' JOIN stock_item_statuses ON stock_item_statuses.id = stock.status_id'
        + ' WHERE items_orders.order_id = ?;';
    var places = [rows[i].id];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                rows[i].order_items = resQuery;
                if (i + 1 < rows.length) {
                    return getManagerOrderItems(req, res, next, rows, i + 1, options);
                } else {
                    return getManagerOrderStatus(req, res, next, rows, 0, options)
                }
            });
    });
};
var getManagerOrderStatus = function (req, res, next, rows, i, options) {
    var query = 'SELECT order_status_track.*,'
        + ' order_statuses.name_en, order_statuses.name_pt'
        + ' FROM order_status_track'
        + ' LEFT JOIN order_statuses ON order_statuses.id = order_status_track.order_status_id'
        + ' WHERE order_status_track.order_id = ?;';
    var places = [rows[i].id];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                let lastStatus = '';
                let indLast = 0;
                for (let el in resQuery) {
                    if (lastStatus.length === 0 || resQuery[el].datetime > lastStatus) {
                        lastStatus = resQuery[el].datetime;
                        indLast = el;
                    }
                }
                rows[i].last_status = resQuery[indLast];
                rows[i].order_status = resQuery;
                if (i + 1 < rows.length) {
                    return getManagerOrderStatus(req, res, next, rows, i + 1, options);
                } else {
                    return getManagerOrderFinances(req, res, next, rows, 0, options)
                }
            });
    });
};
var getManagerOrderFinances = function (req, res, next, rows, i, options) {
    var query = 'SELECT *'
        + ' FROM account_finances'
        + ' WHERE account_id = ? AND year = ?;';
    var places = [rows[i].account_id, parseInt(momentToDate(rows[i].datetime,undefined, 'YYYY'),10)];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                // we are asking only for the finances of specific year
                if (resQuery.length > 0) {
                    // anyway there should be only one row for this year
                    rows[i].order_finances = resQuery[0];
                } else {
                    sendJSONResponse(res, 403, {
                        "status": "error",
                        "statusCode": 403,
                        "message": "No financial information for order: " + rows[i],
                    });
                    return;
                }                 
                if (i + 1 < rows.length) {
                    return getManagerOrderFinances(req, res, next, rows, i + 1, options);
                } else {
                    sendJSONResponse(res, 200,
                        {
                            "status": "success", "statusCode": 200, "count": rows.length,
                            "result": rows
                        });
                    return;
                }
            });
    });
};

var makeUpdateManagerOrdersQuery = function (req, res, next, options) {
    options.datetime = momentToDate(moment(), undefined, 'YYYY-MM-DD HH:mm:ss');
    let order = req.body;
    // order item quantiy is changed (and its cost)
    // total cost of order is changed
    // account finances are changed
    // account finances history is changed
    // stock is changed
    // stock history is changed
    // only pending orders are changed!!!!
    var query = 'UPDATE orders'
        + ' SET total_cost = ?,'
        + ' total_cost_tax = ?'
        + ' WHERE id = ?;';
    var places = [
            order.total_cost,
            order.total_cost_tax,
            req.params.orderID];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                return updateManagerOrderItems(req, res, next, 0, options);
            });
    });
};
var updateManagerOrderItems = function (req, res, next, i, options) {
    let order = req.body;
    let item = order.order_items[i];

    if (item.changed_by_manager === 1) {
        var query = 'UPDATE items_orders'
            + ' SET quantity = ?,'
            + ' quantity_decimal = ?,'
            + ' cost = ?,'
            + ' cost_tax = ?,'
            + ' changed_by_manager = ?,'
            + ' change_reason = ?'
            + ' WHERE id = ?;';
        var places = [
            item.quantity,
            item.quantity_decimal,
            item.cost,
            item.cost_tax,
            item.changed_by_manager,
            item.change_reason,
            item.id
        ];
        pool.getConnection(function (err, connection) {
            if (err) {
                sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                return;
            }
            // Use the connection
            connection.query(query, places,
                function (err, resQuery) {
                    // And done with the connection.
                    connection.release();
                    if (err) {
                        sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                        return;
                    }
                    if (i + 1 < order.order_items.length) {
                        return updateManagerOrderItems(req, res, next, i + 1, options);
                    } else {
                        return updateManagerAccountFinancesOrder(req, res, next, options);
                    }
                });
        });
    } else if (i + 1 < order.order_items.length){
        return updateManagerOrderItems(req, res, next, i + 1, options);
    } else {
        return updateManagerAccountFinancesOrder(req, res, next, options);
    }
};
var updateManagerAccountFinancesOrder = function (req, res, next, options) {
    let order = req.body;
    let finances = order.order_finances;
    
    var query = 'UPDATE account_finances'
        + ' SET amount_requests = ?,'
        + ' amount_requests_tax = ?'
        + ' WHERE id = ?;';
    var places = [
        finances.amount_requests,
        finances.amount_requests_tax,
        finances.id
    ];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                return updateManagerAccountFinancesHistoryOrder(req, res, next, options);
            });
    });
};
var updateManagerAccountFinancesHistoryOrder = function (req, res, next, options) {
    let order = req.body;
    let finances = order.order_finances;

    var query = 'INSERT INTO account_finances_history'
        + ' (account_finance_id, account_id, initial_amount,'
        + ' current_amount, amount_requests,'
        + ' current_amount_tax, amount_requests_tax, year, datetime)'
        + ' VALUES (?,?,?,?,?,?,?,?,?);';
    var places = [
        finances.id,
        finances.account_id,
        finances.initial_amount,
        finances.current_amount,
        finances.amount_requests,
        finances.current_amount_tax,
        finances.amount_requests_tax,
        finances.year,
        options.datetime
    ];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                return updateManagerStockOrder(req, res, next, 0, options);
            });
    });
};
var updateManagerStockOrder = function (req, res, next, i, options) {
    let order = req.body;
    let item = order.order_items[i];
    var query;
    var places;

    if (item.changed_by_manager === 1) {
        if (item.decimal === 0) {
            query = 'UPDATE stock'
                + ' SET quantity_in_requests = quantity_in_requests + ?'
                + ' WHERE item_id = ?;';
            places = [
                item.quantity - item.original_quantity,
                item.item_id
            ];
        } else {
            query = 'UPDATE stock'
                + ' SET quantity_in_requests_decimal = quantity_in_requests_decimal + ?'
                + ' WHERE item_id = ?;';
            places = [
                item.quantity_decimal - item.original_quantity_decimal,
                item.item_id
            ];

        }
        
        pool.getConnection(function (err, connection) {
            if (err) {
                sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                return;
            }
            // Use the connection
            connection.query(query, places,
                function (err, resQuery) {
                    // And done with the connection.
                    connection.release();
                    if (err) {
                        sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                        return;
                    }
                    return getManagerStockUpdatedLevelsOrder(req, res, next, i, options);
                });
        });
    } else if (i + 1 < order.order_items.length) {
        return updateManagerStockOrder(req, res, next, i + 1, options);
    } else {
        sendJSONResponse(res, 200,
            {
                "status": "success",
                "statusCode": 200,
                "message": "Order updated by manager."
            });
        return; 
    }
};
var getManagerStockUpdatedLevelsOrder = function (req, res, next, i, options) {
    let order = req.body;
    let item = order.order_items[i];
    let query;
    let places;
    query = 'SELECT id AS stock_id, quantity_in_requests, quantity_in_requests_decimal'
        + ' FROM stock'
        + ' WHERE item_id = ?;';
    places = [item.item_id];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                // there should be only 1 value per request
                options.updatedStockValues = resQuery[0];
                return updateManagerStockHistoryOrder(req, res, next, i, options);
            });
    });
};
var updateManagerStockHistoryOrder = function (req, res, next, i, options) {
    let order = req.body;
    let item = order.order_items[i];
    let query;
    let places;
    if (item.decimal === 0) {
        query = 'INSERT INTO stock_history'
            + ' (stock_id, item_id,'
            + ' quantity_in_stock, quantity_in_requests, status_id, operation, timestamp)'
            + ' VALUES (?, ?, ?, ?, ?, ?, ?)';
        places = [
            options.updatedStockValues.stock_id,
            item.item_id,
            item.quantity_in_stock,
            options.updatedStockValues.quantity_in_requests,
            item.stock_item_status_id,
            'U',
            options.datetime];
    } else {
        query = 'INSERT INTO stock_history'
            + ' (stock_id, item_id, quantity_in_stock_decimal, quantity_in_requests_decimal,'
            + ' status_id, operation, timestamp)'
            + ' VALUES (?, ?, ?, ?, ?, ?, ?)';
        places = [
            options.updatedStockValues.stock_id,
            item.item_id,
            item.quantity_in_stock_decimal,
            options.updatedStockValues.quantity_in_requests_decimal,
            item.stock_item_status_id,
            'U',
            options.datetime];
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                if (i + 1 < order.order_items.length) {
                    return updateManagerStockOrder(req, res, next, i + 1, options);
                } else {
                    sendJSONResponse(res, 200,
                        {
                            "status": "success",
                            "statusCode": 200,
                            "message": "Order updated by manager."
                        });
                    return;
                }
            });
    });
};

var makeApproveManagerOrdersQuery = function (req, res, next, options) {
    options.datetime = momentToDate(moment(), undefined, 'YYYY-MM-DD HH:mm:ss');
    let order = req.body;
    options.userEmail = order.email;
    let query = 'INSERT INTO order_status_track (order_id, order_status_id, datetime)'
                + ' VALUES (?,?,?);';
    let places = [order.id, 2, options.datetime]; // 2 = approved status id
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                options.current_status_order = 'approve';
                return sendEmailUserUpdateStatus(req, res, next, options);
            });
    });

};
var makeRejectManagerOrdersQuery = function (req, res, next, options) { 
    // remove from pending requests amounts and from account finances
    options.datetime = momentToDate(moment(), undefined, 'YYYY-MM-DD HH:mm:ss');
    let order = req.body;
    options.userEmail = order.email;
    let query = 'INSERT INTO order_status_track' 
                + ' (order_id, order_status_id, datetime)'
                + ' VALUES (?,?,?);';
    let places = [order.id, 4, options.datetime]; // 4 = rejected status id
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                options.current_status_order = 'reject';
                return moveQuantitiesWithinStock(req, res, next, 0, options);
            });
    });

};
var makeDeliveredManagerOrdersQuery = function (req, res, next, options) { 
    // ??? a delivered(=closed) order affects cost centers also ???

    options.datetime = momentToDate(moment(), undefined, 'YYYY-MM-DD HH:mm:ss');
    let order = req.body;
    options.userEmail = order.email;
    let query = 'INSERT INTO order_status_track (order_id, order_status_id, datetime)'
        + ' VALUES (?,?,?);';
    let places = [order.id, 3, options.datetime]; // 3 = delivered(=closed) status id
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                options.current_status_order = 'delivered';
                return moveQuantitiesWithinStock(req, res, next, 0, options);
            });
    });
};
var moveQuantitiesWithinStock = function (req, res, next, i, options) {
    let order = req.body;
    let item = order.order_items[i];
    var query;
    var places;

    if (options.current_status_order === 'reject') {
        if (item.decimal === 0) {
            query = 'UPDATE stock'
                + ' SET quantity_in_requests = quantity_in_requests - ?'
                + ' WHERE item_id = ?;';
            places = [
                item.quantity,
                item.item_id
            ];
        } else {
            query = 'UPDATE stock'
                + ' SET quantity_in_requests_decimal = quantity_in_requests_decimal - ?'
                + ' WHERE item_id = ?;';
            places = [
                item.quantity_decimal,
                item.item_id
            ];
        }
    } else {
        if (item.decimal === 0) {
            query = 'UPDATE stock'
                + ' SET quantity_in_requests = quantity_in_requests - ?,'
                + ' quantity_in_stock = quantity_in_stock - ?'
                + ' WHERE item_id = ?;';
            places = [
                item.quantity,
                item.quantity,
                item.item_id
            ];
        } else {
            query = 'UPDATE stock'
                + ' SET quantity_in_requests_decimal = quantity_in_requests_decimal - ?,'
                + ' quantity_in_stock_decimal = quantity_in_stock_decimal - ?'
                + ' WHERE item_id = ?;';
            places = [
                item.quantity_decimal,
                item.quantity_decimal,
                item.item_id
            ];
        }
    }    
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                return getManagerNewQuantitiesStock(req, res, next, i, options, moveQuantitiesWithinStockHistory);
            });
    });

};
var getManagerNewQuantitiesStock = function (req, res, next, i, options, callback) {
    let order = req.body;
    let item = order.order_items[i];
    let query;
    let places;
    query = 'SELECT id AS stock_id, quantity_in_requests, quantity_in_requests_decimal'
        + ' FROM stock'
        + ' WHERE item_id = ?;';
    places = [item.item_id];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                // there should be only 1 value per request
                options.updatedStockValues = resQuery[0];
                return callback(req, res, next, i, options);
            });
    });
};
var moveQuantitiesWithinStockHistory = function (req, res, next, i, options) {
    let order = req.body;
    let item = order.order_items[i];
    let query;
    let places;

    if (item.decimal === 0) {
        query = 'INSERT INTO stock_history'
            + ' (stock_id, item_id,'
            + ' quantity_in_stock, quantity_in_requests, status_id, operation, timestamp)'
            + ' VALUES (?, ?, ?, ?, ?, ?, ?)';
        places = [
            options.updatedStockValues.stock_id,
            item.item_id,
            item.quantity_in_stock,
            options.updatedStockValues.quantity_in_requests,
            item.stock_item_status_id,
            'U',
            options.datetime];
    } else {
        query = 'INSERT INTO stock_history'
            + ' (stock_id, item_id, quantity_in_stock_decimal, quantity_in_requests_decimal,'
            + ' status_id, operation, timestamp)'
            + ' VALUES (?, ?, ?, ?, ?, ?, ?)';
        places = [
            options.updatedStockValues.stock_id,
            item.item_id,
            item.quantity_in_stock_decimal,
            options.updatedStockValues.quantity_in_requests_decimal,
            item.stock_item_status_id,
            'U',
            options.datetime];
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                if (i + 1 < order.order_items.length) {
                    return moveQuantitiesWithinStock(req, res, next, i + 1, options);
                } else {
                    return moveAmountsWithinFinances(req, res, next, options);
                }
            });
    });
};
var moveAmountsWithinFinances = function (req, res, next, options) {
    let order = req.body;
    let finances = order.order_finances;
    var query;
    var places;
    
    if (options.current_status_order === 'reject') {
        query = 'UPDATE account_finances'
            + ' SET amount_requests = amount_requests - ?,'
            + ' amount_requests_tax = amount_requests_tax - ?'
            + ' WHERE id = ?;';
        places = [
            order.total_cost,
            order.total_cost_tax,
            finances.id
        ];
    } else {
        query = 'UPDATE account_finances'
            + ' SET amount_requests = amount_requests - ?,'
            + ' current_amount = current_amount - ?,'
            + ' amount_requests_tax = amount_requests_tax - ?,'
            + ' current_amount_tax = current_amount_tax - ?'
            + ' WHERE id = ?;';
        places = [
            order.total_cost,
            order.total_cost,
            order.total_cost_tax,
            order.total_cost_tax,
            finances.id
        ];
    }    
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                return moveAmountsWithinFinancesHistory(req, res, next, options);
            });
    });

};
var moveAmountsWithinFinancesHistory = function (req, res, next, options) {
    let order = req.body;
    let finances = order.order_finances;
    var query;
    var places;

    if (options.current_status_order === 'reject') {
        query = 'INSERT INTO account_finances_history'
            + ' (account_finance_id, account_id, initial_amount,'
            + ' current_amount, amount_requests,'
            + ' current_amount_tax, amount_requests_tax, year, datetime)'
            + ' VALUES (?,?,?,?,?,?,?,?,?);';
        places = [
            finances.id,
            finances.account_id,
            finances.initial_amount,
            finances.current_amount,
            finances.amount_requests - order.total_cost,
            finances.current_amount_tax,
            finances.amount_requests_tax - order.total_cost_tax,
            finances.year,
            options.datetime
        ];
    } else {
        query = 'INSERT INTO account_finances_history'
            + ' (account_finance_id, account_id, initial_amount,'
            + ' current_amount, amount_requests,'
            + ' current_amount_tax, amount_requests_tax, year, datetime)'
            + ' VALUES (?,?,?,?,?,?,?,?,?);';
        places = [
            finances.id,
            finances.account_id,
            finances.initial_amount,
            finances.current_amount - order.total_cost,
            finances.amount_requests - order.total_cost,
            finances.current_amount_tax - order.total_cost_tax,
            finances.amount_requests_tax - order.total_cost_tax,
            finances.year,
            options.datetime
        ];
    }

    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                return sendEmailUserUpdateStatus(req, res, next, options);
            });
    });
};
var sendEmailUserUpdateStatus = function (req, res, next, options) {
    let order = req.body;
    let mailOptions;
    if (options.userEmail !== undefined && options.userEmail !== null) {
        if (options.current_status_order === 'approve') {
            //to: options.userEmail,
            mailOptions = {
                from: '"Admin" <admin@laqv-ucibio.info>', // sender address
                to: options.userEmail, // list of receivers (comma-separated)
                subject: 'Manager approved order nr: ' + order.id, // Subject line
                text: 'Hi,\n\n' +
                    'Order was validated, wait for its delivery.\n\n' +
                    'Best regards,\nAdmin',
            };
            // send mail with defined transport object
            sendJSONResponse(res, 200,
                {
                    "status": "success", "statusCode": 200, "message": "Order approved."
                });
        } else if (options.current_status_order === 'reject') {
            //to: options.userEmail,
            mailOptions = {
                from: '"Admin" <admin@laqv-ucibio.info>', // sender address
                to: options.userEmail, // list of receivers (comma-separated)
                subject: 'Manager refused order nr: ' + order.id, // Subject line
                text: 'Hi,\n\n' +
                    'Order was refused, contact manager for further details.\n\n' +
                    'Best regards,\nAdmin',
            };
            // send mail with defined transport object
            sendJSONResponse(res, 200,
                {
                    "status": "success", "statusCode": 200, "message": "Order rejected."
                });
        } else if (options.current_status_order === 'delivered') {
            //to: options.userEmail,
            mailOptions = {
                from: '"Admin" <admin@laqv-ucibio.info>', // sender address
                to: options.userEmail, // list of receivers (comma-separated)
                subject: 'Order nr: ' + order.id + ' was delivered', // Subject line
                text: 'Hi,\n\n' +
                    'Order was delivered, so its status was changed to \'Finished\'.\n\n' +
                    'Best regards,\nAdmin',
            };
            // send mail with defined transport object
            sendJSONResponse(res, 200,
                {
                    "status": "success", "statusCode": 200, "message": "Order was delivered."
                });

        }
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error: Order ID: %s. Message to %s not sent due to error below.',
                    order.id, 'user');
                console.log(error);
            }
            console.log('OK! Order ID: %s. Message %s was sent to requester with response: %s',
                order.id, info.messageId, info.response);
        });
        return;

    } else {
        if (options.current_status_order === 'approve') {
            sendJSONResponse(res, 200,
                {
                    "status": "success", "statusCode": 200, "message": "Order approved."
                });
        } else if (options.current_status_order === 'reject') {
            sendJSONResponse(res, 200,
                {
                    "status": "success", "statusCode": 200, "message": "Order rejected."
                });
        } else if (options.current_status_order === 'delivered') {
            sendJSONResponse(res, 200,
                {
                    "status": "success", "statusCode": 200, "message": "Order was delivered."
                });
        }
        return;
    }    
};


var getItemCategories = function (req, res, next, rows, i, options) {
    var query = 'SELECT items_categories.id AS items_categories_id, items_categories.category_id AS id,'
                + ' list_categories.name_en, list_categories.name_pt,' 
                + ' list_categories.description_en, list_categories.description_pt'
                + ' FROM items_categories'
                + ' JOIN list_categories ON list_categories.id = items_categories.category_id'
                + ' WHERE items_categories.item_id = ?;';
    var places = [rows[i].id];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                rows[i].item_categories = resQuery;
                
                if (i + 1 < rows.length) {
                    return getItemCategories(req, res, next, rows, i + 1, options);
                } else {
                    sendJSONResponse(res, 200,
                        {
                            "status": "success", "statusCode": 200, "count": rows.length,
                            "result": { "account_info": options, "inventory": rows}
                        });
                    return;
                }
            });
    });    
};

var startOrderProcedure = function (req, res, next, options) {
    let data = req.body;
    let datetime = momentToDate(moment(), undefined, 'YYYY-MM-DD HH:mm:ss');
    var query = 'INSERT INTO orders (datetime, account_id, user_ordered_id, total_cost, total_cost_tax)'
        + ' VALUES (?,?,?,?,?)';
    var places = [datetime, 
        options.accountID, 
        options.userID, 
        data.totalCostNoTax,
        data.totalCost];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                let orderID = resQuery.insertId;
                options.orderID = orderID;
                options.orderTime = datetime;
                return writeOrderItems(req, res, next, options, 0);
            });
    });
};

var writeOrderItems = function (req, res, next, options, i) {
    let data = req.body;
    let cart = data.cart;
    // there should be at least 1 order item
    let query;
    let places;
    if (cart[i].decimal === 0) {
        query = 'INSERT INTO items_orders (item_id, order_id, quantity, cost, cost_tax)'
            + ' VALUES (?,?,?,?,?)';
        places = [
                cart[i].id, 
                options.orderID, 
                parseInt(cart[i].amount_to_order, 10), 
                parseFloat(cart[i].cost_truncated_no_tax),
                parseFloat(cart[i].cost_truncated)
            ];
    } else {
        query = 'INSERT INTO items_orders (item_id, order_id, quantity_decimal, cost, cost_tax)'
            + ' VALUES (?,?,?,?,?)';
        places = [
                cart[i].id, 
                options.orderID,
                parseFloat(cart[i].amount_to_order),
                parseFloat(cart[i].cost_truncated_no_tax),
                parseFloat(cart[i].cost_truncated)];
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                if (i + 1 < cart.length) {
                    return writeOrderItems(req, res, next, options, i+1);
                } else {
                    return writeInitialOrderStatus(req, res, next, options);

                }
            });
    });    
};

var writeInitialOrderStatus = function (req, res, next, options) {
    let query = 'INSERT INTO order_status_track (order_id, order_status_id, datetime)'
        + ' VALUES (?, ?, ?)';
    // 1 is the initial order status
    let places = [options.orderID, 1, options.orderTime];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                return updateStockRequestsLevels(req, res, next, options, 0);
            });
    });
};

var updateStockRequestsLevels = function (req, res, next, options, i) {
    let data = req.body;
    let cart = data.cart;
    // there should be at least 1 order item
    let query;
    let places;
    if (cart[i].decimal === 0) {
        query = 'UPDATE stock'
                + ' SET quantity_in_requests = quantity_in_requests + ?'
                + ' WHERE id = ?;';
        places = [
            parseInt(cart[i].amount_to_order, 10),
            cart[i].stock_id];
    } else {
        query = 'UPDATE stock'
            + ' SET quantity_in_requests_decimal = quantity_in_requests_decimal + ?'
            + ' WHERE id = ?;';
        places = [
            parseFloat(cart[i].amount_to_order),
            cart[i].stock_id];
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                if (i === 0) {
                    options.updatedStockValues = []
                }
                return getStockRequestsLevelsUpdatedValue(req, res, next, options, i);
            });
    });
};

var getStockRequestsLevelsUpdatedValue = function (req, res, next, options, i) {
    let data = req.body;
    let cart = data.cart;
    // there should be at least 1 order item
    let query;
    let places;
    query = 'SELECT quantity_in_requests, quantity_in_requests_decimal'
        + ' FROM stock'
        + ' WHERE id = ?;';
    places = [cart[i].stock_id];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                // there should be only 1 value per request
                options.updatedStockValues.push(resQuery[0])
                if (i + 1 < cart.length) {
                    return updateStockRequestsLevels(req, res, next, options, i + 1);
                } else {
                    return writeStockHistory(req, res, next, options, 0);
                }
            });
    });
};

var writeStockHistory = function (req, res, next, options, i) {
    // this function is used when user makes orders
    let data = req.body;
    let cart = data.cart;
    // there should be at least 1 order item
    let query;
    let places;
    query = 'INSERT INTO stock_history'
        + ' (stock_id, item_id, quantity_in_stock_decimal, quantity_in_requests_decimal,'
        + ' quantity_in_stock, quantity_in_requests, status_id, timestamp)'
        + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    places = [
        cart[i].stock_id,
        cart[i].id,
        cart[i].quantity_in_stock_decimal,
        options.updatedStockValues[i].quantity_in_requests_decimal,
        cart[i].quantity_in_stock,
        options.updatedStockValues[i].quantity_in_requests,
        cart[i].status_id,
        options.orderTime];    
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                if (i + 1 < cart.length) {
                    return writeStockHistory(req, res, next, options, i + 1);
                } else {
                    return updateAccountFinances(req, res, next, options);
                }
            });
    });
};

var updateAccountFinances = function (req, res, next, options) {
    let data = req.body;
    if (data.currentFinances !== null && data.currentFinances !== undefined) {
        var query = 'UPDATE account_finances'
            + ' SET amount_requests = amount_requests + ?,'
            + ' amount_requests_tax = amount_requests_tax + ?'
            + ' WHERE id = ?';
        var places = [
            data.totalCostNoTax,
            data.totalCost,
            data.currentFinances.id];
        pool.getConnection(function (err, connection) {
            if (err) {
                sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                return;
            }
            // Use the connection
            connection.query(query, places,
                function (err, resQuery) {
                    // And done with the connection.
                    connection.release();
                    if (err) {
                        sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                        return;
                    }
                    return getAccountFinancesUpdatedValue(req, res, next, options);
                });
        });

    } else {
        sendJSONResponse(res, 403, {
            "status": "error",
            "statusCode": 403,
            "message": "No financial information."
        });
        return;
    }
};
var getAccountFinancesUpdatedValue = function (req, res, next, options) {
    let data = req.body;  
    var query = 'SELECT amount_requests, amount_requests_tax FROM account_finances'
                + ' WHERE id = ?;';
    var places = [data.currentFinances.id];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                // there should be only 1 value
                options.amountRequestsNoTaxUpdate = resQuery[0].amount_requests;
                options.amountRequestsUpdate = resQuery[0].amount_requests_tax;
                return writeAccountFinancesHistory(req, res, next, options);
            });
    });
};

var writeAccountFinancesHistory = function (req, res, next, options) {
    let data = req.body;
    var query = 'INSERT INTO account_finances_history'
        + ' (account_finance_id, account_id, initial_amount,'
        + ' current_amount, amount_requests,' 
        + ' current_amount_tax, amount_requests_tax, year, datetime)'
        + ' VALUES (?,?,?,?,?,?,?,?,?);';
    var places = [
            data.currentFinances.id, 
            data.currentFinances.account_id,
            data.currentFinances.initial_amount,
            data.currentFinances.current_amount,
            options.amountRequestsNoTaxUpdate,
            data.currentFinances.current_amount_tax,
            options.amountRequestsUpdate,
            data.currentFinances.year,
            options.orderTime
        ];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                return sendEmailStockManager(req, res, next, options);;
            });
    });
};

var sendEmailStockManager = function (req, res, next, options) {
    let mailOptions = {
        from: '"Admin" <admin@laqv-ucibio.info>', // sender address
        to: recipients.stock_manager, // list of receivers (comma-separated)
        subject: 'A user placed order nr: ' + options.orderID, // Subject line
        text: 'Hi ,\n\n' +
            'Head to https://laqv-ucibio.info/internal-orders and validate this order.\n\n' +
            'Best regards,\nAdmin',
    };
    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error: Order ID: %s. Message to %s not sent due to error below.', 
                            options.orderID, 'Stock Manager');
            console.log(error);
        }
        console.log('OK! Order ID: %s. Message %s was sent to %s with response: %s', 
                    options.orderID, info.messageId, 'Stock Manager', info.response);
    });
    return sendEmailUser(req, res, next, options);
};

var sendEmailUser = function (req, res, next, options) {
    //to: options.userEmail,
    if (options.userEmail !== undefined && options.userEmail !== null) {
        let mailOptions = {
            from: '"Admin" <admin@laqv-ucibio.info>', // sender address
            to: options.userEmail, // list of receivers (comma-separated)
            subject: 'Successfully placed order nr: ' + options.orderID, // Subject line
            text: 'Hi ,\n\n' +
                'You successfully placed this order. Note that all orders require validation by stock manager.\n\n' +
                'Best regards,\nAdmin',
        };
        // send mail with defined transport object
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error: Order ID: %s. Message to %s not sent due to error below.', 
                                options.orderID, 'user');
                console.log(error);
            }
            console.log('OK! Order ID: %s. Message %s was sent to requester with response: %s', 
                            options.orderID, info.messageId, info.response);
        });
    }
    sendJSONResponse(res, 200,
        {
            "status": "success", "statusCode": 200, "message": "Order created."
        });
    return;
};


var makeUserOrdersQuery = function (req, res, next, options) {
    var query = 'SELECT orders.id AS order_id, orders.datetime, orders.user_ordered_id,' 
        + ' orders.account_id, orders.total_cost, orders.total_cost_tax,'
        + ' people.colloquial_name AS user_ordered_name'
        + ' FROM orders'
        + ' JOIN users ON users.id = orders.user_ordered_id'
        + ' JOIN people ON people.user_id = users.id'
        + ' WHERE orders.account_id = ?;';
    var places = [options.accountID];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                if (resQuery.length > 0) {
                    return getOrderStatus(req, res, next, options, resQuery, 0);
                } else {
                    sendJSONResponse(res, 200,
                        {
                            "status": "success", "statusCode": 200, "count": 0,
                            "result": []
                        });
                    return;   

                }
                
            });
    });
}

var getOrderStatus = function (req, res, next, options, rows, i) {
    var query = 'SELECT order_status_track.*,'
        + ' order_statuses.name_en, order_statuses.description_en,'
        + ' order_statuses.name_pt, order_statuses.description_pt'
        + ' FROM order_status_track'
        + ' JOIN order_statuses ON order_statuses.id = order_status_track.order_status_id'
        + ' WHERE order_status_track.order_id = ?';

    var places = [rows[i].order_id];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                let lastStatus = '';
                let indLast = 0;
                for (let el in resQuery) {
                    if (lastStatus.length === 0 || resQuery[el].datetime > lastStatus) {
                        lastStatus = resQuery[el].datetime;
                        indLast = el;
                    }
                }
                rows[i].last_status = resQuery[indLast];
                rows[i].statuses = resQuery;
                if (i + 1 < rows.length) {
                    return getOrderStatus(req, res, next, options, rows, i + 1);
                } else {
                    return getOrderDetailsInfo(req, res, next, options, rows, 0);
                }
            });
    });
};

var getOrderDetailsInfo = function (req, res, next, options, rows, i) {
    var query = 'SELECT items_orders.quantity, items_orders.quantity_decimal, items_orders.cost, items_orders.cost_tax,'
        + ' items.*,'
        + ' quantity_types.name_plural_en AS unit_plural_en, quantity_types.name_singular_en AS unit_singular_en,'
        + ' quantity_types.name_plural_pt AS unit_plural_pt, quantity_types.name_singular_pt AS unit_singular_pt,'
        + ' quantity_types.decimal'
        + ' FROM items_orders'
        + ' JOIN items ON items.id = items_orders.item_id'
        + ' LEFT JOIN quantity_types ON quantity_types.id = items.quantity_type_id'
        + ' WHERE items_orders.order_id = ?';

    var places = [rows[i].order_id];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                rows[i].items = resQuery;
                if (i + 1 < rows.length) {
                    return getOrderDetailsInfo(req, res, next, options, rows, i + 1);
                } else {
                    sendJSONResponse(res, 200,
                        {
                            "status": "success", "statusCode": 200, "count": rows.length,
                            "result": rows
                        });
                    return;   
                }
            });
    });
    
};

var makeUserAccountsQuery = function (req, res, next, options) {
    // then I have to add account_finances
    var query = 'SELECT accounts_people.user_id, accounts_people.account_id,'
        + ' accounts.name_en AS account_name_en, accounts.name_pt AS account_name_pt,'
        + ' cost_centers_orders.name_en AS cost_center_name_en, cost_centers_orders.name_pt AS cost_center_name_pt'
        + ' FROM accounts_people'
        + ' JOIN accounts ON accounts.id = accounts_people.account_id' 
        + ' JOIN cost_centers_orders ON cost_centers_orders.id = accounts.cost_center_id'
        + ' WHERE accounts_people.user_id = ?;';
    var places = [options.userID];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                // could a user belong to more than 1 account???
                if (resQuery.length > 0) {
                    return getAccountFinances(req, res, next, options, resQuery, 0);
                } else {
                    sendJSONResponse(res, 403, {
                        "status": "error",
                        "statusCode": 403,
                        "message": "This user didn't belong to any account."
                    });
                    return;
                }
            });
    });
};

var getAccountFinances = function (req, res, next, options, rows, i) {
    var query = 'SELECT *'
        + ' FROM account_finances'
        + ' WHERE account_id = ?;';

    var places = [rows[i].account_id];
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        // Use the connection
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                    return;
                }
                rows[i].account_finances = resQuery;
                if (i + 1 < rows.length) {
                    return getAccountFinances(req, res, next, options, rows, i + 1);
                } else {
                    sendJSONResponse(res, 200,
                        {
                            "status": "success", "statusCode": 200, "count": rows.length,
                            "result": rows
                        });
                    return;
                }
            });
    });

};

module.exports.getUserAccounts = function (req, res, next) {
    // Actually we will be getting orders from the account user is associated with
    checksOrderPermissions(req, res, next, makeUserAccountsQuery, {});
};

module.exports.getUserOrders = function (req, res, next) {
    // Actually we will be getting orders from the account user is associated with
    checksOrderPermissions(req, res, next, makeUserOrdersQuery, {});
};

module.exports.getInventory = function (req, res, next) {
    checksOrderPermissions(req, res, next, makeInventoryItemQuery, {});
};

module.exports.getManagementPermissions = function (req, res, next) {
    checkManagementPermissions(req, res, next, undefined, {});
};

module.exports.getManagementInventory = function (req, res, next) {
    checkManagementPermissions(req, res, next, makeManagerInventoryItemQuery, {});
};

module.exports.updateManagementInventory = function (req, res, next) {
    checkManagementPermissions(req, res, next, updateManagememtInventoryQuery, {});
};

module.exports.getManagementOrders = function (req, res, next) {
    checkManagementPermissions(req, res, next, makeManagerOrdersQuery, {});
};

module.exports.updateManagementOrder = function (req, res, next) {
    checkManagementPermissions(req, res, next, makeUpdateManagerOrdersQuery, {});
};

module.exports.approveManagementOrder = function (req, res, next) {
    checkManagementPermissions(req, res, next, makeApproveManagerOrdersQuery, {});
};
module.exports.rejectManagementOrder = function (req, res, next) {
    checkManagementPermissions(req, res, next, makeRejectManagerOrdersQuery, {});
};
module.exports.deliveredManagementOrder = function (req, res, next) {
    checkManagementPermissions(req, res, next, makeDeliveredManagerOrdersQuery, {});
};

module.exports.makeOrder = function (req, res, next) {
    checksOrderPermissions(req, res, next, startOrderProcedure, {});
};