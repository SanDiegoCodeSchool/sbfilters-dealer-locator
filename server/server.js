const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const fileUpload = require('express-fileupload');
const dotenv = require('dotenv').config();
const cron = require('node-cron');
const axios = require('axios');
f = require('util').format;

const updateDealers = require('./updateDealers');
const requestDealers = require('./requestDealers');
const createDealers = require('./createDealers');

// create the express server
const app = express();

//local hosted Mongo connection for testing: true for local, false for live
let local = process.env.IS_LOCAL === 'false' ? false : true;
console.log(local);

// middleware
app.use(fileUpload({createParentPath: true}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


app.use(morgan("dev"));
app.use(express.static('src'));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
        return res.status(200).json({});
    }
    next();
});

app.get('/',function(req,res){
    console.log('someone is trying to get the root...');
    res.status(200)
});

app.get('/createDealers', async (req , res) => {
    createDealers(local);
    res.status(200).send("Finding or creating DB entry");
});

app.get('/update', async (req , res) => {
    updateDealers(local);
    res.status(200).send("Updating DB with new data.");
});

app.get('/dealers', async (req, res) => {
    const n = parseFloat(req.query.n);
    const s = parseFloat(req.query.s);
    const e = parseFloat(req.query.e);
    const w = parseFloat(req.query.w);
    console.log("Retreiving dealers from the DB");
    const dealerData = await requestDealers(n, s, e, w, local);
    res.status(200).send(dealerData);
});

app.get('/places', async (req, res) => {
    let input = req.query.i;
    //this url is currently only requesting the locations name and geometry(lat/lng), there are more fields avaiable should those be necessary in the future for more robust searching.
    let placesURL =  `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?key=${process.env.GOOGLE_CLOUD_API_KEY}&input=${input}&inputtype=textquery&fields=name,geometry`;
    try {
        let placesData =  await axios.get(placesURL);
        //if there are results
        if (placesData.data.candidates.length != 0) {
            let placeName =  placesData.data.candidates[0].name;
            let placeCoord = placesData.data.candidates[0].geometry; 

            res.status(200).send({
                name: placeName,
                coords: placeCoord
            });
        } else {
            //if there are no search results returned from the API
            res.status(200).send({
                name: "none found",
                coords: {
                    lat: 0,
                    lng: 0
                }
            })
        }

    }catch (err) {
        console.log(`Error: `, err)
    }
})

//node-cron is timezone UTC 7h+ from PST, midnight in PST is 7am UTC
cron.schedule('59 6 * * *', () => {
    console.log("running at 11:59pm PST, 6:59am UTC");
    updateDealers(local);
});

module.exports = app;
