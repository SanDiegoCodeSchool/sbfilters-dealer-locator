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

const updateDealers = async () => {
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

    const insertData = () => {
        client.connect((err, client) => {
            if (err) console.log(`Insert Data Connect Error: `, err);
            console.log("Connected to DB insert");
            const db = client.db(dbName);
            const col = db.collection('dealers');

            col.insertOne({name: "dealerJson", data: dealerJson}, (err, res) => {
                if (err) console.log("Insert Error: ", err);
                console.log("inserted document: ", res);
            })
        });   
    };
    

    const getData = (mivaData) => {
        client.connect((err, client) => {
            if (err) console.log(`Get data Connect Error: `, err);
            console.log("Connected to DB to Get Data");
            const db = client.db(dbName);
            const col = db.collection('dealers');

            col.findOne({name: "dealerJson"}, (err, res) => {
                if (err) console.log(`Find Error: `, err);
                //if It doesnt exist yet compare it to the local JSON data and update it form there. 
                if (res == null) {
                    // insertData();
                    const allDealers = compareData(dealerJson, mivaData);
                    if (allDealers.length > dealerJson.length) {
                        const howMany = allDealers.length - dealerJson.length;
                        updateData(allDealers, howMany);
                    } else {
                        console.log("No new dealers to update this round.")
                    }
                } else {
                    const dbDealers = res.data;
                    const allDealers = compareData(dbDealers, mivaData);
                    if (allDealers.length > dbDealers.length) {
                        const howMany = allDealers.length - dbDealers.length;
                        updateData(allDealers, howMany);
                    } else {
                        console.log("No new dealers to update this round.")
                    }
                }
            })
        });
    };

    const compareData = (dbData, newData) => {
        let newDealers = newData.filter((obj) => {
            return !dbData.some((obj2) => {
                return obj.id == obj2.id;
            })
        });
        
        if (newDealers.length > 0) {
            return [...dbData, ...newDealers];
        } else {
            return dbData;
        }
    };

    const updateData = (updatedData, howMany) => {
        client.connect((err, client) => {
            if (err) console.log(`Update connection Error: `, err);
            console.log("Connected to server update");
            const db = client.db(dbName);
            const col = db.collection('dealers');
            const query = {name: "dealerJson"};
            const newData = {$set: {data: updatedData}};

            col.updateOne(query, newData, (err, res) => {
                if (err) {console.log(`Update error: `, err)};
                if (res.modifiedCount == 1) {
                    console.log(`Updated the DB with ${howMany} new Dealers.`);
                }
            });
        });
    }
    
    const mivaFtpCredentials = {
        host: process.env.MIVA_HOST,
        user: process.env.MIVA_USER,
        password: process.env.MIVA_PASSWORD,
    };

    const mivaClient = new ftp.Client();
    mivaClient.ftp.verbose = true;
    const filePathInMiva = `mm5/themes/shadows/custom-styles/testData/newLocations.json`;
    // const filePathInMiva2 = `mm5/themes/shadows/custom-styles/newLocations.json`;
    const filePathToLocalFile = `${__dirname}/newLocations.json`;

    try {
        await mivaClient.access(mivaFtpCredentials);
        mivaClient.trackProgress(info => {
            console.log("File", info.name)
            console.log("Type", info.type)
            console.log("Transferred", info.bytes)
            console.log("Transferred Overall", info.bytesOverall)
        })
        console.log(`List: `, await mivaClient.list(`mm5/themes/shadows/custom-styles/testData`));
        await mivaClient.downloadTo(filePathToLocalFile, filePathInMiva);
        const mivaData = require(filePathToLocalFile);
        console.log(`Miva Data acquired, updating DB.`);
        getData(mivaData);
        // insertData();
        mivaClient.close();
        // createDB();
    } catch(err) {
        console.log(`Miva Error: `, err);
    }
};

module.exports = updateDealers;
