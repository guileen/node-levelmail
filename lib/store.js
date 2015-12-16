var async = require('async')
var cclog = require('cclog')

var LEVELDB_PATH = process.env.LEVELDB_PATH
if(!LEVELDB_PATH) {
    console.log('usage: LEVELDB_PATH=/path/to/leveldb_data node server.js')
    process.exit(1)
}
var leveldown = require('leveldown')(LEVELDB_PATH)
leveldown.open({createIfMissing: true}, function() {
        process.on('exit', function() {
                leveldown.close()
        })

        loadConfigure()
})

function loadConfigure() {
    leveldown.get('mail_config', function() {
    })
}

var K_MSG_SEQ='msgseq'
var K_MSG='msg:'
var K_FROM='from:'
var K_TO='to:'
var K_ACCOUNT_MAIL_COUNT='mcount:'

exports.getUInt32 = getUInt32
exports.putUInt32 = putUInt32
exports.saveMessage = saveMessage
exports.range = range
exports.listMessageTo = listMessageTo
exports.listMessageFrom = listMessageFrom
exports.listAccounts = listAccounts

// --- level common ---
function getUInt32(key, callback) {
    leveldown.get(key, function(err, seqBuff) {
            if(err) {
                if(err.message.indexOf('NotFound') >= 0) {
                    return callback(null, null)
                }
                return callback(err)
            }
            if(seqBuff) {
                callback(null, seqBuff.readUInt32BE(0))
            } else {
                callback(null, null)
            }
    })
}

function putUInt32(key, value, callback) {
    var buff = new Buffer(4)
    buff.writeUInt32BE(value, 0)
    leveldown.put(key, buff, callback)
}

function levelIncr(key, callback) {
    getUInt32(key, function(err, value) {
            if(err) return callback(err)
            if(value == null) value =0;
            ++value;
            putUInt32(key, value, function(err) {
                    if(err) return callback(err)
                    callback(null, value)
            })
    })
}

function makeUInt32Key(prefix, v) {
    var buff = new Buffer(Buffer.byteLength(prefix) + 4)
    buff.write(prefix, 0, 'utf8')
    buff.writeUInt32BE(v, Buffer.byteLength(prefix))
    return buff
}

function makeTSKey(key, ts) {
    var buff = new Buffer(Buffer.byteLength(key) + 8)
    buff.write(key, 0, 'utf8')
    if(ts == undefined) ts = Date.now();
    buff.writeUIntBE(ts, Buffer.byteLength(key), 8)
    return buff
}

function putTS(key, value, callback) {
    leveldown.put(makeTSKey(key), value, callback)
}

function range(startKey, endKey, reverse, limit, callback) {
    console.log('range', startKey, endKey, reverse, limit)
    var iter = leveldown.iterator({
            start: startKey,
            end: endKey,
            reverse: reverse,
            limit: limit
    })
    var results = []
    function done(err) {
        if(err) return callback(err)
        callback(null, results)
    }
    function next() {
        iter.next(function(err, key, value) {
                if(err || !key) {
                    return done(err)
                }
                results.push([key, value])
                next()
        })
    }
    next()
}

function mget(keys, callback) {
    async.map(keys, leveldown.get.bind(leveldown), callback)
}

// ---- message DAO ----
function saveMessage(req, body) {
    cclog.info('Mail from:'+req.from +' to:'+req.to+ ' body:' + body)
    levelIncr(K_MSG_SEQ, function(err, seq) {
            leveldown.put(makeUInt32Key(K_MSG, seq), JSON.stringify({from: req.from, to: req.to, body: body}), cclog.ifError)
            putTS(K_FROM + req.from, seq, cclog.ifError)
            req.to.forEach(function(to) {
                    putTS(K_TO + to, seq, cclog.ifError)
                    levelIncr(K_ACCOUNT_MAIL_COUNT + to, cclog.ifError)
            })
    })
}

function _listMessage(prefix, user, ts, limit, reverse, callback) {
    range(makeTSKey(prefix + user, ts), makeTSKey(prefix + user, reverse ? 0 : 0xffffffffffffffff), reverse, limit, function(err, results) {
            var msgKeys = results.map(function(item) {
                    return makeUInt32Key(K_MSG, item[1] || 0)
            })
            mget(msgKeys, function(err, results) {
                    if(err) return callback(err);
                    callback(null, results.map(function(str) {
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

function listAccounts(from, to, limit, reverse, callback) {
    range(K_ACCOUNT_MAIL_COUNT + from, K_ACCOUNT_MAIL_COUNT + to, reverse, limit, function(err, results) {
            if(err)return callback(err);
            callback(null, results.map(function(item) {
                        return {
                            account: item[0].toString().substring(K_ACCOUNT_MAIL_COUNT.length),
                            count: item[1].readUInt32BE(0)
                        }
            }))
    })
}
