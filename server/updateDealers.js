const path = require('path');
const ftp = require("basic-ftp");
const fs = require('fs');
f = require('util').format;

const dealerJson = require('../savedFiles/locations.json');

const updateDealers = async (local) => {
    const MongoClient = require('mongodb').MongoClient;
    let client;
    if (local == true) {
        console.log(`local connection: `);
        const assert = require('assert');
        const url = process.env.MONGODB_URL;
        client = new MongoClient(url, {
            useUnifiedTopology: true
        });  
    } else {
        console.log(`using live connection`)
        const ca = [fs.readFileSync(path.join(__dirname + '/../savedFiles/pem/sdcs-sb.pem'), 'utf8')];
        const url = `mongodb://${process.env.DOCUMENT_USER}:${process.env.DOCUMENT_PASSWORD}@${process.env.DOCUMENT_URL}/?ssl=true&ssl_ca_certs=rds-combined-ca-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false`;
        client = new MongoClient(url, { 
            sslValidate: true,
            sslCA: ca,
            useNewUrlParser: true,
            useUnifiedTopology: true
        }); 
        console.log(`1: `, client);
    }

    const dbName = 'sbdealers';

    const getDBData = (mivaData) => {
        console.log(`2: `, client);

        client.connect((err, client) => {
            if (err) console.log(`Get data Connect Error: `, err);
            console.log("Connected to DB to Get Data");
            const db = client.db(dbName);
            const col = db.collection('dealers');

            col.findOne({name: "dealerJson"}, (err, res) => {
                if (err) console.log(`Find Error: `, err);
                //if the DB entry doesnt exist yet compare the new Miva dealers to the local JSON data and update it form there, this is a backuk reduncency and will most likely never be true. 
                if (res == null) {
                    const allDealers = compareData(dealerJson, mivaData);
                    if (allDealers.length > dealerJson.length) {
                        const howMany = allDealers.length - dealerJson.length;
                        updateData(allDealers, howMany);
                    } else {
                        console.log("No new dealers to update this round.")
                    }
                } else {
                    //this is what is running most rounds, comparing the DB entry to the Miva data
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
    
//Template site
    // const mivaFtpCredentials = {
    //     host: process.env.TEST_MIVA_HOST,
    //     user: process.env.TEST_MIVA_USER,
    //     password: process.env.TEST_MIVA_PASSWORD,
    // };

//Filters Live
    const secureOptions = {
        rejectUnauthorized: false,
    };

    const mivaFtpCredentials = {
        host: process.env.FILTERS_LIVE_MIVA_HOST,
        user: process.env.FILTERS_LIVE_MIVA_USER,
        password: process.env.FILTERS_LIVE_MIVA_PASSWORD,
        secure: true, 
        secureOptions: secureOptions
    };

    const mivaClient = new ftp.Client();
    mivaClient.ftp.verbose = true;
    const filePathToLocalFile = `${__dirname}/newLocations.json`;
    //Template Site filepath
    const filePathInMiva = `mm5/themes/shadows/custom-styles/testData/newLocations.json`;
    //Filters Filepath
    //const filePathInMiva = ``;
    

    try {
        // await mivaClient.access(mivaFtpCredentials);
        // mivaClient.trackProgress(info => {
        //     console.log("File", info.name)
        //     console.log("Type", info.type)
        //     console.log("Transferred", info.bytes)
        //     console.log("Transferred Overall", info.bytesOverall)
        // })
        // console.log(`List: `, await mivaClient.list(`mm5/themes/shadows/custom-styles/testData`));
        //live miva data
        // await mivaClient.downloadTo(filePathToLocalFile, filePathInMiva);
        // const mivaData = require(filePathToLocalFile);
        //testData
        const mivaData = dealerJson;

        console.log(`Miva Data acquired, updating DB.`);
        
        getDBData(mivaData);
        // mivaClient.close();
    } catch(err) {
        console.log(`Miva Error: `, err);
    }
};

module.exports = updateDealers;
