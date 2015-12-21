var db = require('./db')
var util = require('./util')
var async = require('async')
var cclog = require('cclog')

db.on('open', function() {
        db.get('mail_config', function() {
        })
})

var K_MSG_SEQ='msgseq'
var K_MSG='msg:'
var K_FROM='from:'
var K_TO='to:'
var K_ACCOUNT_MAIL_COUNT='mcount:'

exports.saveMessage = saveMessage
exports.listMessageTo = listMessageTo
exports.listMessageFrom = listMessageFrom
exports.listAccounts = listAccounts
exports.listMessageAll = listMessageAll


// ---- message DAO ----
function saveMessage(req, body) {
    cclog.info('Mail from:'+req.from +' to:'+req.to+ ' body:' + body)
    db.incr(K_MSG_SEQ, function(err, seq) {
            db.put(util.makeUInt32Key(K_MSG, seq), JSON.stringify({
                        from: req.from,
                        to: req.to,
                        time: new Date(),
                        body: body
            }), cclog.ifError)
            db.putTS(K_FROM + req.from, seq, cclog.ifError)
            req.to.forEach(function(to) {
                    db.putTS(K_TO + to, seq, cclog.ifError)
                    db.incr(K_ACCOUNT_MAIL_COUNT + to, cclog.ifError)
            })
    })
}

function _listMessage(prefix, user, ts, limit, reverse, callback) {
    db.range({
            start: util.makeTSKey(prefix + user, ts), 
            end: util.makeTSKey(prefix + user, reverse ? 0 : 0xffffffffffffffff), 
            reverse: reverse,
            limit: limit
        }, function(err, results) {
            var msgKeys = results.map(function(item) {
                    return util.makeUInt32Key(K_MSG, item[1] || 0)
            })
            console.log(msgKeys)
            db.mget(msgKeys, function(err, results) {
                    if(err) return callback(err);
                    console.log(results)
                    callback(null, results && results.map(function(str) {
                                return JSON.parse(str)
                    }))
            })
    })
}

function listMessageTo(to, ts, limit, reverse, callback) {
    _listMessage(K_TO, to, ts, limit, reverse, callback)
}

function listMessageFrom(from, ts, limit, reverse, callback) {
    _listMessage(K_FROM, from, ts, limit, reverse, callback)
}

/**
 * @param startAccount e.g. 'a'
 * @param endAccount e.g. 'z'
 * @param limit e.g. 100
 * @param reverse e.g. false
 * @param callback  e.g [{account: 'tom@test.com', count: 100} ...]
 * 
 */
function listAccounts(startAccount, endAccount, limit, reverse, callback) {
    db.range({
            start: K_ACCOUNT_MAIL_COUNT + startAccount,
            end: K_ACCOUNT_MAIL_COUNT + endAccount,
            reverse: reverse,
            limit: limit
        }, function(err, results) {
            if(err)return callback(err);
            callback(null, results.map(function(item) {
                        return {
                            account: item.key.toString().substring(K_ACCOUNT_MAIL_COUNT.length),
                            count: item.value.readUInt32BE(0)
                        }
            }))
    })
}

/**
 *
 */
function listMessageAll(startSeq, toSeq, reverse, limit, callback) {
    db.range({
            start: util.makeUInt32Key(K_MSG, startSeq),
            end: util.makeUInt32Key(K_MSG, toSeq),
            reverse: reverse,
            limit:limit
        }, function(err, results) {
            console.log('results1', results)
            if(err) return callback(err);
            callback(null, results.map(function(item) {
                        return item && {
                            seq: item.key.readUInt32BE(Buffer.byteLength(K_MSG)),
                            message: JSON.parse(item.value.toString('utf-8'))
                        }
            }))
    })
}
