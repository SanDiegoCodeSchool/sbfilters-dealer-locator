// installed modules
const express = require("express");
const bodyParser = require("body-parser");
const path = require('path');
const fileUpload = require('express-fileupload');

// imported from mailer.js
const mailer = require("./mailer")

// create the express server
const app = express();

// middleware
app.use(fileUpload({createParentPath: true}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// route handlers
app.get('/',function(req,res){
    console.log('someone is trying to get the root...');
    res.status(200).sendFile(path.join(__dirname + '/../testForm.html'));
});

app.post('/register',function(req,res){
    mailer(req);
    res.redirect(301, 'https://dev2.sbfilters.com/new-dealer?submitted=true')
});

module.exports = app;