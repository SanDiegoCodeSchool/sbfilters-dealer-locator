// const bodyParser = require("body-parser");
const path = require('path');
// const fileUpload = require('express-fileupload');
// const dotenv = require('dotenv').config();
// const cron = require('node-cron');
// const ftp = require("basic-ftp");
const fs = require('fs');
f = require('util').format;
// const tunnel = require('tunnel-ssh');

const dealerJson = require('../savedFiles/locations.json');
// const testData = require('../savedFiles/newLocations.json');

const createDealers = async (local) => {
    const MongoClient = require('mongodb').MongoClient;
    let client;
    if (local == true) {
        console.log(`local connection: `, local);
        //Local hosted mongo connection
        const assert = require('assert');
        const url = process.env.MONGODB_URL;
        client = new MongoClient(url, {
            useUnifiedTopology: true
        });  
    } else {
        console.log("using live connection")
        //Specify the Amazon DocumentDB cert
        const ca = [fs.readFileSync(path.join(__dirname + '/../savedFiles/pem/sdcs-sb.pem'), 'utf8')];
        console.log('ca: ', ca);
        const url = `mongodb://${process.env.DOCUMENT_USER}:${process.env.DOCUMENT_PASSWORD}@${process.env.DOCUMENT_URL}/?ssl=true&ssl_ca_certs=rds-combined-ca-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false`;
        const client = new MongoClient(url, { 
            sslValidate: true,
            sslCA: ca,
            useNewUrlParser: true,
            useUnifiedTopology: true
        }); 
    }

    const dbName = 'sbdealers';  

    const insertData = () => {
        client.connect((err, dbclient) => {
            if (err) console.log(`Insert Data Connect Error: `, err);
            console.log("Connected to DB to seed data");
            const db = client.db(dbName);
            const col = db.collection('dealers');

            col.insertOne({name: "dealerJson", data: dealerJson}, (err, res) => {
                if (err) console.log("Insert Error: ", err);
                console.log("inserted document: ", res);
            })
        });   
    };
    

    const checkIfDataAlreadyExists = () => {
        console.log(`first client: `, client);
        client.connect((err, dbclient) => {
            if (err) console.log(`Get data Connect Error: `, err);
            console.log("Connected to DB to Get Data", dbclient);
            const db = dbclient.db(dbName);
            const col = db.collection('dealers');

            col.findOne({name: "dealerJson"}, async (err, res) => {
                if (err) console.log(`Find Error: `, err);
                //if It doesnt exist yet call the function that inserts it for the first time from the original local file of dealer json. 
                if (res == null) {
                    console.log("Data not in the DB yet, seeding DB with data.")
                    insertData();
                } else {
                    //if it does already exist just console log that it already exists and bail. 
                    const dbDealers = res.data;
                    const dealersLength = dbDealers.length;
                    console.log(`Already found ${dealersLength} dealers in DB, no need to re-seed`);
                    }
                }
            )
        });
    };

    checkIfDataAlreadyExists();
    // insertData();

};

module.exports = createDealers;
