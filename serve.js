var express = require('express')
var cors = require('cors')
var app = express()

app.use(cors())

app.use(express.static('out'))

app.listen(4000, function () {
  console.log('CORS-enabled web server listening on port 4000')
})
