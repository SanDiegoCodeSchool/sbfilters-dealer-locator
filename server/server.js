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

cron.schedule('59 23 * * *', () => {
    console.log("running at 11:59pm");
    updateDealers();
}, {
    scheduled: true,
    timezone: "America/Los_Angeles"
});

cron.schedule('10 19 * * *', () => {
    console.log("running at 10:19pm");
    updateDealers();
}, {
    scheduled: true,
    timezone: "America/Los_Angeles"
})


module.exports = app;
