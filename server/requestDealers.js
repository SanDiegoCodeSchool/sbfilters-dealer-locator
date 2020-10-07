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

const requestDealers = async () => {
    //Specify the Amazon DocumentDB cert
    // const ca = [fs.readFileSync(path.join(__dirname + '/../savedFiles/rds-combined-ca-bundle.pem'), 'utf8')];
    // const MongoClient = require('mongodb').MongoClient;
    // const url = `mongodb://${process.env.DOCUMENT_USER}:${process.env.DOCUMENT_PASSWORD}@${process.env.DOCUMENT_URL}/?ssl=true&ssl_ca_certs=rds-combined-ca-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false`;
    
    // const client = new MongoClient(url, { 
    //     sslValidate: true,
    //     sslCA: ca,
    //     useNewUrlParser: true,
    //     useUnifiedTopology: true
    // }); 
    // const dbName = 'sbdealers';

    //Local hosted mongo connection
    const MongoClient = require('mongodb').MongoClient;
    const assert = require('assert');
    const url = 'mongodb://localhost:27017';
    const dbName = 'sbdealers';
    
    const client = new MongoClient(url, { useUnifiedTopology: true });  

    //will pull all DB data, probably needs argument. 
    const getData = async (  ) => {
        let dealers;
        let outerPromise = () => {
            return new Promise((res, rej) => {
                client.connect(async (err, client) => {
                    if (err) console.log(`Get data Connect Error: `, err);
                    console.log("Connected to DB to Get Data");
                    const db = client.db(dbName);
                    const col = db.collection('dealers');

                    let myPromise = () => {
                        return new Promise((resolve, reject) => {
                            col.findOne({name: "dealerJson"}, (err, res) => {
                                if (err) {
                                    console.log(`Find Error: `, err);
                                    reject(err);
                                };
                
                                if (res == null) {
                                    console.log(`Couldn't find dealer Data`);
                                    let dbDealers = [];
                                    resolve(dbDealers);
                                } else {
                                    console.log("Found dealer data, sending up")
                                    const dbDealers = res.data;
                                    resolve(dbDealers);
                                }
                            })
                        })
                    }
                    dealers = await myPromise();
                    res(dealers);
                });
            })
        }
        let dealerData = await outerPromise();
        return dealerData;
    };
    let finalData = await getData();
    console.log(`getData(); `, finalData[0]);
    return finalData;
};

module.exports = requestDealers;