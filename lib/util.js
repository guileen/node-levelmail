exports.pad = function(num, size) {
    return ('000000000000000000' + num).slice(-size)
}

exports.makeUInt32Key = function makeUInt32Key(prefix, v) {
    var buff = new Buffer(Buffer.byteLength(prefix) + 4)
    buff.write(prefix, 0, 'utf8')
    buff.writeUInt32BE(v, Buffer.byteLength(prefix))
    return buff
}

// key + timestamp 8 byte buffer
exports.makeTSKey = function makeTSKey(key, ts) {
    var buff = new Buffer(Buffer.byteLength(key) + 8)
    buff.write(key, 0, 'utf8')
    if(ts == undefined) ts = Date.now();
    buff.writeUIntBE(ts, Buffer.byteLength(key), 8)
    return buff
}

