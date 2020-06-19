// installed modules
const express = require("express");
const bodyParser = require("body-parser");
const path = require('path');
const fileUpload = require('express-fileupload');
const axios = require('axios');
// const crypto = require('crypto');


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
    const {id, bill_email, bill_fname, bill_lname, bill_addr1, bill_city, bill_state, bill_zip, bill_cntry, formatted_total, orderdate, items} = req.body;
    
    const formattedItems = items.map((item) => {
        const {sku, name, price} = item;
        let nameCleanedforURL = name.replace(/[, ]+/g, "-").replace(/[.]+/g, "").trim().toLowerCase();

        const eachItemObj = {
            "productId": sku,
            "productBrand": "SB Tanks",
            "productDescription": name,
            "productTitle": name,
            "productImageUrl": "",
            "productPrice": `$${price}`,
            "productType": "",
            //this will need to be swapped for the live site
            "productUrl": `http://dev.sbtanks.com/${nameCleanedforURL}`
        }
        return eachItemObj;
    })

    const stampedSettings = {
        "url": `https://stamped.io/api/v2/${process.env.STAMPED_STORE_HASH}/survey/reviews/bulk`,
        "method": "POST",
        'headers': {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${process.env.STAMPED_PUBLIC_KEY}:${process.env.STAMPED_PRIVATE_KEY}`
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

    try {
        let stampedResult = await axios(stampedSettings);
        console.log(`Stamped Post Result: `, stampedResult.data);
        if (stampedResult.data.length == 0) {
            console.log('Successful stamped post, unsuccessful email generation, most likely a duplicate order number.')
        }
    } catch (err) {
        console.log(`Error with stmaped post: ${err}`);
    }
});

module.exports = app;
