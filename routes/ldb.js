var mime = require('mime')
var express = require('express')
var router = express.Router();
var ldb = require('../lib/db')

function parseDataUri(datauri) {
    var m = datauri.match(/data:([^;]*);([^,]*),(.*)/i)
    if(m) {
        return {
            contentType: m[1],
            charset: m[2],
            dataString: m[3],
            data: new Buffer(m[3], m[2])
        }
    }
    return null
}

function makeDataUri(contentType, data) {
    return 'data:'+contentType+';base64,'+data.toString('base64')
}

/**
 * curl /get?key=key&[type=plain]
 * query:
 *      key  required
 *      type json|plain|binary|base64|datauri|png|zip...
 *
 */
router.get('/get', function(req, res, next) {
        // TODO 
        //   var keytype = req.query.keytype
        //   keytype=urlsafe_base64
        var key = req.query.key
        ldb.get(key, function(err, result) {
                if(err) return next(err)
                var type = req.query.type || 'plain'
                console.log('type', type, result.toString('base64'))
                switch(type) {
                  case 'json':
                    res.type('json')
                    res.end(JSON.stringify(result.toString('utf8')))
                    break;
                  case 'plain':
                    res.type('txt')
                    res.end(result.toString('utf8'))
                    break;
                  case 'binary':
                    res.type('bin')
                    res.end(result)
                    break;
                  case 'base64':
                    console.log(type)
                    res.type('txt')
                    res.end(result.toString('base64'))
                    break;
                  case 'datauri':
                    var datauri
                    try{
                        datauri = parseDataUri(result.toString())
                    }catch(e) {
                    }
                    if(datauri) {
                        console.log('datauri', datauri)
                        res.set({
                                'Content-Type': datauri.contentType
                        })
                        res.end(datauri.data)
                    } else {
                        next(new Error('not datauri:' + JSON.stringify(result.toString())))
                    }
                    break
                  default:
                    res.type(type)
                    res.end(result)
                }
        })
})

/**
 * curl -d 'value' /put?key=key
 * curl -d 'key=key&value=value' /put
 * cat file | curl --data-binary @- /put?key=key
 * cat file | curl --data-binary @- /put?key=key&type=(png|image/png|auto)
 */
router.post('/put', function(req, res, next) {
        if(req.body && req.body.key) {
            var key = req.body.key
            console.log('puting by body:<' + key + '><' + req.body.value + '>')
            ldb.put(key, req.body.value, function(err, result) {
                    if(err) return next(err)
                    res.end(result)
            })
            return
        }
        var key = req.query.key
        var type = req.query.type
        type = type && mime.lookup(type == 'auto' ? key : type)
        var buffers = []
        req.on('data', function(buffer) {
                console.log('on data')
                buffers.push(buffer)
        })
        req.on('end', function() {
                console.log('on end')
                var value = Buffer.concat(buffers)
                if(type) {
                    value = makeDataUri(type, value)
                }
            console.log('puting:<' + key + '><' + value + '>')
                ldb.put(key, value, function(err, result) {
                        if(err) return next(err)
                        res.end(result)
                })
        })
})

/**
 * query:
 *    gte:
 *    lte:
 *    reverse:
 *    limit:
 *
 */
router.get('/range', function(req, res, next) {
    var first = true;
    ldb.createReadStream(req.query)
      .on('data', function(data) {
              var row = JSON.stringify({key:data.key.toString('utf8'), value:data.value.toString('utf8')})
              if(first) {
                  res.write('[' + row + '\n')
                  first = false;
              } else {
                  res.write(',' + row + '\n')
              }
      })
      .on('error', function(err) {
              next(err)
      })
      .on('close', function() {
              console.log('Stream closed')
      })
      .on('end', function() {
              console.log('Stream end')
              res.end(']')
      })
})

/**
 * query:
 *    gte:
 *    lte:
 *    reverse:
 *    limit:
 *
 */
router.get('/keys', function(req, res, next) {
    var first = true;
    var opts = req.query
    opts.values = false
    opts.keys = true
    ldb.createReadStream(req.query)
      .on('data', function(data) {
              var row = JSON.stringify(data.toString('utf8'))
              if(first) {
                  res.write('[' + row + '\n')
                  first = false;
              } else {
                  res.write(',' + row + '\n')
              }
      })
      .on('error', function(err) {
              next(err)
      })
      .on('close', function() {
              console.log('Stream closed')
      })
      .on('end', function() {
              console.log('Stream end')
              res.end(']')
      })
})

// TODO Authorize
// TODO del
// TODO mget
// TODO batch

module.exports = router;
