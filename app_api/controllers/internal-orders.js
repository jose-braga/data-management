var moment = require('moment-timezone');
var server = require('../models/server');
var pool = server.pool;
var permissions = require('../config/permissions');
const nodemailer = require('../controllers/emailer');
let transporter = nodemailer.transporter;

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
    var query = "SELECT account_id FROM accounts_people WHERE user_id = ?";
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
                    callbackOptions.accountID = resQuery[0].account_id;
                    return callback(req, res, next, callbackOptions);
                } else if (resQuery.length > 1) {
                    sendJSONResponse(res, 403, {
                        "status": "error",
                        "statusCode": 403,
                        "message": "This user belongs to several accounts."
                    });
                    return;
                } else {
                    if (err) {
                        sendJSONResponse(res, 403, { "status": "error", 
                            "statusCode": 403, 
                            "message":  "You are not authorized to access this resource"});
                        return;
                    }
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
        + ' WHERE items.visible = ?';
    var places = [1]; //only visible items
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
                return getItemCategories(req, res, next, resQuery, 0, options);
                
            });
    });
}

var getItemCategories = function (req, res, next, rows, i, options) {
    var query = 'SELECT items_categories.*, list_categories.name_en, list_categories.name_pt,' 
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
    // ?????TODO: first we have to check if quantities in currently stock

    let data = req.body;
    let datetime = momentToDate(moment(), undefined, 'YYYY-MM-DD HH:mm:ss');
    var query = 'INSERT INTO orders (datetime, account_id, user_ordered_id, total_cost)'
        + ' VALUES (?, ?, ?, ?)';
    var places = [datetime, options.accountID, options.userID, data.totalCost];
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
        query = 'INSERT INTO items_orders (item_id, order_id, quantity, cost)'
            + ' VALUES (?, ?, ?, ?)';
        places = [cart[i].id, options.orderID, 
                parseInt(cart[i].amount_to_order, 10), 
                parseFloat(cart[i].cost_truncated)];
    } else {
        query = 'INSERT INTO items_orders (item_id, order_id, quantity_decimal, cost)'
            + ' VALUES (?, ?, ?, ?)';
        places = [cart[i].id, options.orderID,
                parseFloat(cart[i].amount_to_order),
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
                if (i + 1 < cart.length) {
                    return updateStockRequestsLevels(req, res, next, options, i + 1);
                } else {
                    return writeStockHistory(req, res, next, options, 0);
                }
            });
    });
};

var writeStockHistory = function (req, res, next, options, i) {
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
        cart[i].quantity_in_requests_decimal,
        cart[i].quantity_in_stock,
        cart[i].quantity_in_requests,
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
                    return sendEmailStockManager(req, res, next, options);

                }
            });
    });
};

var sendEmailStockManager = function (req, res, next, options) {
    //var recipients = req.body.personal_email;
    let mailOptions = {
        from: '"Admin" <admin@laqv-ucibio.info>', // sender address
        to: 'josecbraga@gmail.com', // list of receivers (comma-separated)
        subject: 'An user placed order nr: ' + options.orderID, // Subject line
        text: 'Hi ,\n\n' +
            'Head to https://laqv-ucibio.info/internal-orders and validate this order.\n\n' +
            'Best regards,\nAdmin',
    };
    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Message to %s not sent due to error below.', 'Stock Manager');
            console.log(error);
            sendJSONResponse(res, 500,
                {
                    "status": "error", "statusCode": 500, "message": "Order created but mail not sent."
                });
            return;
        }
        console.log('Message %s was sent to person %s with response: %s', info.messageId, 'Stock Manager', info.response);
        sendJSONResponse(res, 200,
            {
                "status": "success", "statusCode": 200, "message": "Order created and mail sent"
            });
    });
    return;
};

var makeUserOrdersQuery = function (req, res, next, options) {
    var query = 'SELECT orders.id AS order_id, orders.datetime, orders.user_ordered_id,' 
        + ' orders.account_id, orders.total_cost,'
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
    var query = 'SELECT items_orders.quantity, items_orders.quantity_decimal, items_orders.cost,'
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

module.exports.getUserOrders = function (req, res, next) {
    // Actually we will be getting orders from the account user is associated with
    checksOrderPermissions(req, res, next, makeUserOrdersQuery, {});
};

module.exports.getInventory = function (req, res, next) {
    checksOrderPermissions(req, res, next, makeInventoryItemQuery, {});
};

module.exports.makeOrder = function (req, res, next) {
    checksOrderPermissions(req, res, next, startOrderProcedure, {});
};