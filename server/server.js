const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const path = require('path');
const fileUpload = require('express-fileupload');
const dotenv = require('dotenv').config();
const cron = require('node-cron');
const ftp = require("basic-ftp");
const fs = require('fs');
f = require('util').format;
const tunnel = require('tunnel-ssh');

const updateDealers = require('./updateDealers');
const requestDealers = require('./requestDealers');

const dealerJson = require('../savedFiles/locations.json');
// const testData = require('../savedFiles/newLocations.json');

// create the express server
const app = express();

// middleware
app.use(fileUpload({createParentPath: true}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


app.use(morgan("dev"));
app.use(express.static('src'));

// route handlers
app.get('/',function(req,res){
    console.log('someone is trying to get the root...');
    res.status(200)
});

app.get('/update', async (req , res) => {
    updateDealers();
    res.status(200).send("connected");
});

app.get('/dealers', async (req, res) => {
    const n = parseFloat(req.query.n);
    const s = parseFloat(req.query.s);
    const e = parseFloat(req.query.e);
    const w = parseFloat(req.query.w);
    // console.log(`n${n} s${s} e${e} w${w}`)
    console.log("Retreiving dealers from the DB");
    const dealerData = await requestDealers(n, s, e, w);
    res.status(200).send(dealerData);
});

//node-cron is timezone UTC 7h+ from PST, midnight in PST is 7am UTC
cron.schedule('59 6 * * *', () => {
    console.log("running at 11:59pm PST, 6:59am UTC");
    updateDealers();
});

module.exports = app;
