var async = require('async')
var cclog = require('cclog')
var util = require('./util')

var LEVELDB_PATH = process.env.LEVELDB_PATH
if(!LEVELDB_PATH) {
    console.log('usage: LEVELDB_PATH=/path/to/leveldb_data node server.js')
    process.exit(1)
}

var db = module.exports = require('levelup')(LEVELDB_PATH, {
        createIfMissing: true,
        keyEncoding: 'binary',
        valueEncoding:'binary'
})

db.getUInt32 = function getUInt32(key, callback) {
    this.get(key, function(err, seqBuff) {
            if(err) {
                console.log(err)
                if(err.notFound) {
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

db.putUInt32 = function putUInt32(key, value, callback) {
    var buff = new Buffer(4)
    buff.writeUInt32BE(value, 0)
    this.put(key, buff, callback)
}

db.incr = function levelIncr(key, callback) {
    db.getUInt32(key, function(err, value) {
            if(err) return callback(err)
            if(value == null) value =0;
            ++value;
            db.putUInt32(key, value, function(err) {
                    if(err) return callback(err)
                    callback(null, value)
            })
    })
}

db.putTS = function putTS(key, value, callback) {
    this.put(util.makeTSKey(key), value, callback)
}

db.range = function range(opt, callback) {
    var _err = null;
    var results = [];
    db.createReadStream(opt)
      .on('data', function(data) {
              results.push(data)
      })
      .on('error', function(err) {
              _err = err 
      })
      .on('close', function() {
              console.log('Stream closed')
      })
      .on('end', function() {
              console.log('Stream closed')
              callback(_err, results)
      })
      ;
}

db.mget = function mget(keys, callback) {
    this.batch(keys.map(function(key) {
                return {type:'get', key:key}
    }), callback)
}
