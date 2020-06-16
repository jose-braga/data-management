var moment = require('moment-timezone');
var server = require('../models/server');
var pool = server.pool;
var permissions = require('../config/permissions');

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

var getPersonPollsQuery = function (req, res) {
    let personID = req.params.personID;
    var query = 'SELECT people_polls.*,'
        + ' polls.title, polls.valid_from, polls.valid_until'
        + ' FROM people_polls'
        + ' JOIN polls ON polls.id = people_polls.poll_id'
        + ' WHERE people_polls.person_id = ? AND people_polls.voted = 0'
        + ' AND ((polls.valid_from IS NULL AND polls.valid_until IS NULL)'
        + '   OR (polls.valid_from <= NOW() AND polls.valid_until IS NULL)'
        + '   OR (polls.valid_from IS NULL AND polls.valid_until >= NOW())'
        + '   OR (polls.valid_from <= NOW() AND polls.valid_until >= NOW()));'
        ;
    var places = [personID];
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
                sendJSONResponse(res, 200,
                    {
                        "status": "success", "statusCode": 200, "count": resQuery.length,
                        "result": resQuery
                    });
                return;
            });
    });
};
var getPersonPollData = function (req, res) {
    let pollID = req.params.pollID;
    var query = 'SELECT polls.id AS poll_id, polls.title,'
        + ' polls.title, polls.valid_from, polls.valid_until'
        + ' FROM polls'
        + ' WHERE id = ?;';
    var places = [pollID];
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
                if (resQuery.length === 1) {
                    // there should be only one row
                    return getPollQuestions(req, res, resQuery[0]);
                } else if (resQuery.length > 1) {
                    // some problem, returning empty data
                    sendJSONResponse(res, 200,
                        {
                            "status": "success", "statusCode": 200, "count": 0,
                            "result": [],
                        });
                    return;
                } else {
                    sendJSONResponse(res, 200,
                        {
                            "status": "success", "statusCode": 200, "count": 0,
                            "result": [],
                        });
                    return;
                }
            });
    });
};
var getPollQuestions = function (req, res, poll) {
    let pollID = req.params.pollID;
    var query = 'SELECT id AS poll_question_id, question, required'
        + ' FROM polls_questions'
        + ' WHERE poll_id = ?;';
    var places = [pollID];
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
                    // there should be at least one question
                    poll.questions = resQuery;
                    return getPollQuestionOptions(req, res, poll, 0);
                } else {
                    // if no question return empty data
                    sendJSONResponse(res, 200,
                        {
                            "status": "success", "statusCode": 200, "count": 0,
                            "result": [],
                        });
                    return;
                }
            });
    });
}
var getPollQuestionOptions = function (req, res, poll, i) {
    let questionID = poll.questions[i].poll_question_id
    var query = 'SELECT id AS poll_question_option_id, `option`'
        + ' FROM polls_question_options'
        + ' WHERE poll_question_id = ?;';
    var places = [questionID];
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
                    // there should be at least one question
                    poll.questions[i].options = resQuery;
                    if (i + 1 < poll.questions.length) {
                        return getPollQuestionOptions(req, res, poll, i + 1);
                    } else {
                        sendJSONResponse(res, 200,
                            {
                                "status": "success", "statusCode": 200, "count": 1,
                                "result": poll,
                            });
                        return;
                    }
                } else {
                    poll.questions[i].options = [];
                    if (i + 1 < poll.questions.length) {
                        return getPollQuestionOptions(req, res, poll, i + 1);
                    } else {
                        sendJSONResponse(res, 200,
                            {
                                "status": "success", "statusCode": 200, "count": 1,
                                "result": poll,
                            });
                        return;
                    }
                }
            });
    });
}

var votePollQuery = function (req, res, i) {
    let pollID = req.params.pollID;
    let pollData = req.body;
    let question = pollData.questions[i];
    var query = 'INSERT INTO polls_results '
            + ' (poll_id, poll_question_id, poll_question_option_id)'
            + ' VALUES (?,?,?)'
            ;
    var places = [pollID, question.poll_question_id, question.answer];
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
                if (i + 1 < pollData.questions.length) {
                    return votePollQuery(req, res, i + 1);
                } else {
                    return markAsVoted(req, res);
                }
            });
    });
};

var markAsVoted = function (req, res) {
    let pollID = req.params.pollID;
    let personID = req.params.personID;
    var query = 'UPDATE people_polls'
            + ' SET voted = 1'
            + ' WHERE person_id = ? AND poll_id = ?;'
            ;
    var places = [personID, pollID];
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
                sendJSONResponse(res, 200,
                    {
                        "status": "success", "statusCode": 200,
                        "message": "All done!"
                    });
                return;
            });
    });
};

var checksRequest = function (req, res, callback) {
    let personID = parseInt(req.params.personID, 10);
    if (req.payload && req.payload.personID) {
        if (req.payload.personID === personID) {
            return callback(req, res);
        } else {
            sendJSONResponse(res, 403, { message: 'Only the user himself can vote.' });
        }
    } else {
        sendJSONResponse(res, 403, { message: 'Incorrect payload.' });
    }
};

var checkVoteConditions = function (req, res) {
    let personID = req.params.personID;
    let pollID = parseInt(req.params.pollID, 10);
    var query = 'SELECT people_polls.*,'
        + ' polls.title, polls.valid_from, polls.valid_until'
        + ' FROM people_polls'
        + ' JOIN polls ON polls.id = people_polls.poll_id'
        + ' WHERE people_polls.person_id = ? AND people_polls.voted = 0'
        + ' AND ((polls.valid_from IS NULL AND polls.valid_until IS NULL)'
        + '   OR (polls.valid_from <= NOW() AND polls.valid_until IS NULL)'
        + '   OR (polls.valid_from IS NULL AND polls.valid_until >= NOW())'
        + '   OR (polls.valid_from <= NOW() AND polls.valid_until >= NOW()));'
        ;
    var places = [personID];
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
                let found = false;
                for (let ind in resQuery) {
                    if (resQuery[ind].poll_id === pollID) {
                        found = true;
                        break;
                    }
                }
                if (found) {
                    return votePollQuery(req, res, 0);
                } else {
                    sendJSONResponse(res, 403, { message: 'User already voted or poll closed!' });
                    return;
                }
            });
    });
};

module.exports.getPersonPolls = function (req, res, next) {
    checksRequest(req, res, getPersonPollsQuery);
};
module.exports.getPersonPollQuestions = function (req, res, next) {
    checksRequest(req, res, getPersonPollData);
};
module.exports.votePoll = function (req, res, next) {
    checksRequest(req, res, checkVoteConditions);
};