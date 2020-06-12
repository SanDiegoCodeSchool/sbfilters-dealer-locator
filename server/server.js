// installed modules
const express = require("express");
const bodyParser = require("body-parser");
const path = require('path');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const crypto = require('crypto');


const testData = require('../miva-post-raw.json');

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
    res.redirect(301, 'https://www.sbfilters.com/new-dealer?submitted=true')
});

app.post('/miva', async (req, res) => {
    console.log('in the miva route... ');
    // const {id, bill_email, bill_fname, bill_lname, bill_addr1, bill_city, bill_state, bill_zip, bill_cntry, formatted_total, orderdate, items} = req.body;
    const {id, bill_email, bill_fname, bill_lname, bill_addr1, bill_city, bill_state, bill_zip, bill_cntry, formatted_total, orderdate, items} = testData;
    
    const getMivaItem = `<mvt:do file="g.Module_Feature_TUI_JSON" name="l.success" value="JSON_Item_Load(${id})" />`;
    const mivaReqBody = {
        "Store_Code": "sbtanks",
        "Function": getMivaItem 
    }

    const mivaKey2 = 'cyHci6gp1xZ3WOKEd2s0gMELo0wkniSyF/j4Mwt6guY'; //this set is for a looser permission with no HMAC required
    const mivaToken2 = "94f8cdcd2a8146777951eb2130b56021";
    const mivaKey = 'wdBtJPvAzkeVRfUHcEw3TDg4x7XxDJEKHSiEWLe1qcM'; //this set is for the version that requires the HMAC
    const mivaToken = 'f4bc12d967832254b6be80cd0bd3b6ca';

    // const base64Decoded = Buffer.from(mivaKey, 'base64');
    // let hmac = crypto.createHmac('sha256', base64Decoded);   
    // hmac.write(JSON.stringify(mivaReqBody)); // write in to the stream PUT REQ BODY HERE
    // hmac.end();       
    // hash = hmac.read().toString('hex'); // read out hmac digest
    // console.log("bundled HMAC: ", hash);
    
    // //base 64 encode HASH
    // const base64Encoded = Buffer.from(hash).toString('base64');
    // console.log(base64Encoded);

    const mivaSettings = {
        "url": "http://dev.sbtanks.com/mm5/json.mvc",
        "method": "POST",
        'headers': {
            'Content-Type': 'application/json',
            'X-Miva-API-Authorization': `MIVA ${mivaToken2}`,
            'Accept': '*/*',
        },
        "body": JSON.stringify(mivaReqBody),
    };

    try {
        let mivaProdInfo = await axios(mivaSettings);
        console.log(`Miva results: `, mivaProdInfo)

    } catch (e){
        console.log(`Miva error: `, e);
    }

    const formattedItems = items.map((item) => {
        const {sku, name, price} = item;
        
        const eachItemObj = {
            "productId": sku,
            "productBrand": "SB Tanks",
            "productDescription": name,
            "productTitle": name,
            "productImageUrl": "",
            "productPrice": `$${price}`,
            "productType": "",
            "productUrl": ""
        }
        return eachItemObj;
    })

    const stampedSettings = {
        //number after v2 needs to be swapped to the live Stamped account#
        "url": "https://stamped.io/api/v2/135885/survey/reviews/bulk",
        "method": "POST",
        'headers': {
            'Content-Type': 'application/json',
            //and these user:pass need to be swapped out for the live stamped API user:psss
            'Authorization': 'Basic cHVia2V5LU4yWmFycDhKcjVvMDMxZmk5MnFTZWYzRnRmdU9JZjprZXktNjU2M2prSEE1Wm5mMzhDT2k1UDhwODVzTW9GbEMz'
        },
        "data": JSON.stringify(
            [
                {
                    "email": bill_email,
                    "firstName": bill_fname,
                    "lastName": bill_lname,
                    "location": `${bill_addr1} ${bill_city} ${bill_state}, ${bill_zip} ${bill_cntry}`,
                    "orderNumber": id,
                    "orderId": id,
                    "orderCurrencyISO": "USD",
                    "orderTotalPrice": formatted_total,
                    "orderSource": "SB Tanks",
                    "orderDate": orderdate,
                    "dateScheduled": orderdate,
                    "itemsList": formattedItems
                }
            ]
        ),
    };

    
    // try {
    //     let stampedResult = await axios(stampedSettings);
    //     console.log(`Stamped Post Result: `, stampedResult?.data);
    //     if (stampedResult?.data.length == 0) {
    //         console.log('Successful stamped post, unsuccessful email generation, most likely a duplicate order number.')
    //     }
    // } catch (err) {
    //     console.log(`Error with stmaped post: ${err}`);
    // }
});

module.exports = app;
