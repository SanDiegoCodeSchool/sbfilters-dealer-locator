const express = require("express");
const bodyParser = require("body-parser");
var path = require('path');

const mailer = require("./mailer")

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/',function(req,res){
    console.log('someone is trying to get the root...');
    res.status(200).sendFile(path.join(__dirname + '/../testForm.html'));
});

app.post('/register',function(req,res){
    console.log(req.body);
    mailer(req.body);
    res.status(200).send('message sent');
});

module.exports = app;