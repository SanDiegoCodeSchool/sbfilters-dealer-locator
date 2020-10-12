const bodyParser = require("body-parser");
const path = require('path');
const fileUpload = require('express-fileupload');
const dotenv = require('dotenv').config();
const cron = require('node-cron');
const ftp = require("basic-ftp");
const fs = require('fs');
f = require('util').format;
const tunnel = require('tunnel-ssh');

const dealerJson = require('../savedFiles/locations.json');
// const testData = require('../savedFiles/newLocations.json');

//set var to true for local mongo host and false for live connection. 
let local = true;

const requestDealers = async (north, south, east, west) => {
    let client;
    if (local == true) {
        console.log(`local in if: `, local);
        //Local hosted mongo connection
        const MongoClient = require('mongodb').MongoClient;
        const assert = require('assert');
        const url = 'mongodb://localhost:27017';
        // const dbName = 'sbdealers';
        
        client = new MongoClient(url, { useUnifiedTopology: true });  
    } else {
        console.log("using live connection")
        //Specify the Amazon DocumentDB cert
        const ca = [fs.readFileSync(path.join(__dirname + '/../savedFiles/rds-combined-ca-bundle.pem'), 'utf8')];
        const MongoClient = require('mongodb').MongoClient;
        const url = `mongodb://${process.env.DOCUMENT_USER}:${process.env.DOCUMENT_PASSWORD}@${process.env.DOCUMENT_URL}/?ssl=true&ssl_ca_certs=rds-combined-ca-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false`;
        
        client = new MongoClient(url, { 
            sslValidate: true,
            sslCA: ca,
            useNewUrlParser: true,
            useUnifiedTopology: true
        }); 
        // const dbName = 'sbdealers';
    }

    const dbName = 'sbdealers';

    const getData = async ( north, south, east, west ) => {
        let dealers;
        let dbConnectionPromise = () => {
            return new Promise((res, rej) => {
                client.connect(async (err, client) => {
                    if (err) console.error(`Get data Connect Error: `, err);
                    console.log("Connected to DB to Get Data");
                    const db = client.db(dbName);
                    const col = db.collection('dealers');

                    let dataQueryPromise = () => {
                        return new Promise((resolve, reject) => {
                            col.findOne({name: "dealerJson"}, (err, res) => {
                                if (err) {
                                    console.log(`Find Error: `, err);
                                    reject(err);
                                };
                
                                if (res == null) {
                                    console.error(`Couldn't find dealer Data`);
                                    let dbDealers = [];
                                    resolve(dbDealers);
                                } else {
                                    let filterFunc = (dealer, i) => {
                                        let dealerLat = parseFloat(dealer.lat);
                                        let dealerLng = parseFloat(dealer.lng);
                                        if (dealerLat < north && dealerLat > south && dealerLng > west && dealerLng < east) {
                                            return dealer;
                                        }
                                    }

                                    const dbDealers = res.data.filter(filterFunc);  
                                    console.log(`Found ${dbDealers.length} dealers, sending data up.`)                                  
                                    resolve(dbDealers);
                                }
                            })
                        })
                    }
                    dealers = await dataQueryPromise();
                    res(dealers);
                });
            })
        }
        let dealerData = await dbConnectionPromise();
        return dealerData;
    };

    let finalData = {};
    if (north) {
        finalData = await getData(north, south, east, west);
    } else {
        console.log(`No location provided, cannot search DB.`)
    }
    return finalData;
};

module.exports = requestDealers;
