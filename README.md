# node-levelmail
Node mail server upon leveldb (for test only).

Receive and show all mail to any account @ your domain.

# TODO
webhook.

# Set up your mail DNS

For example, your domain is "myvps.xx", you should add `MX` record for "myvps.xx".

# Install

Login "myvps.xx" and install levelmail on your server.

```
npm install -g levelmail
```

# Run

```
LEVELDB_PATH=/path/to/leveldata LOG_FILE=/path/to/logfile PORT=3000 levelmail
```

Should run as root to listen at SMTP port 25.

Open "http://myvps.xx:3000/"

Now, you can send mail to anyaccount@myvps.xx from any other mail service.

Refreash "http://myvps.xx:3000/", you received the mail.

# LDB API

```
curl -d 'key=foo&value=helloworld' 'localhost:3000/put?key=foo'
curl 'localhost:3000/get?key=foo'
curl 'localhost:3000/ldb/get?key=foo&type=base64'
cat /path/to/test.png | curl --data-binary @- 'localhost:3000/ldb/put?key=test.png'
curl 'localhost:3000/ldb/get?key=test.png&type=png'
cat /path/to/test.png | curl --data-binary @- 'localhost:3000/ldb/put?key=test.png&type=png'
curl 'localhost:3000/ldb/get?key=test.png&type=plain'
```
