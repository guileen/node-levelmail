var cclog = require('cclog')
var smtp = require('smtp-protocol')
var store = require('./lib/store')
// ---- server ----
var server = smtp.createServer(function (req) {
        req.on('to', function(to, ack) {
                console.log('on to', to)
                var domain = to.split('@')[1] || 'localhost';
                // if domain == 'localhost' ack.accept()
                // else ack.reject()
                ack.accept()
        })

        req.on('message', function(stream, ack) {
                ack.accept()
                // var buffers = []
                var body = ''
                stream.on('data', function(data) {
                        // buffers.push(data)
                        body += data.toString('utf8')
                })
                stream.on('end', function() {
                        store.saveMessage(req, body)
                })
        })
})

server.listen(9025)

var smtp = require('smtp-protocol');
var fs = require('fs');

smtp.connect('localhost', 9025, function (mail) {
        mail.helo('example.com');
        mail.from('substack@example.com');
        mail.to('root3@example.com');
        mail.data();
        mail.message().end('Hello mail')
        // fs.createReadStream(__dirname + '/server.js').pipe(mail.message());
        mail.quit();
        console.log('done')
        store.listMessageTo('root@example.com', Date.now(), 100, true, function(err, result) {
                console.log('results', result)
        })
        store.listAccounts('', 'z', 100, false, function(err, result) {
                console.log('account', result)
        })
});
