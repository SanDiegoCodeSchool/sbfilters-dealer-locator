const express = require("express");
const bodyParser = require("body-parser");
const path = require('path');
const fileUpload = require('express-fileupload');
const dotenv = require('dotenv').config();
const cron = require('node-cron');
const ftp = require("basic-ftp");
const fs = require('fs');
f = require('util').format;
const tunnel = require('tunnel-ssh');

const updateDealers = require('./updateDealers');
const dealerJson = require('../savedFiles/locations.json');
// const testData = require('../savedFiles/newLocations.json');

// create the express server
const app = express();

// middleware
app.use(fileUpload({createParentPath: true}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// route handlers
app.get('/',function(req,res){
    console.log('someone is trying to get the root...');
    res.status(200)
});

app.get('/mongo', async (req , res) => {
    updateDealers();
    res.status(200).send("connected");
});

//node-cron is timezone UTC 7h+ from PST, midnight in PST is 7am UTC
cron.schedule('59 6 * * *', () => {
    console.log("running at 11:59pm PST, 6:59am UTC");
    updateDealers();
});

module.exports = app;
