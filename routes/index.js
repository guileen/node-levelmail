var express = require('express');
var router = express.Router();
var store = require('../lib/store')

/* GET home page. */
router.get('/', function(req, res, next) {
        var cursor = Number(req.query.cursor)
        if(isNaN(cursor)) {
            cursor = 0xffffffff
        }
        store.listMessageAll(cursor, 0, true, 200, function(err, results) {
                if(err) return next(err)
                console.log('results', results)
                res.render('index', { title: 'Express', messages: results});
        })
});

module.exports = router;
