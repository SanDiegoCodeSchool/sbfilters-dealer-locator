# Google Maps JS API / Dealer Location 

This is a local version of the code that will be broken up into a separate front end HTML/JS file and node server that will get hosted on AWS attached to a DocumentDB/Mongo instance. 

The server has 2 separate functionalities. 

1. On a cronjob to run everytnight at 11:59pm PST to FTP into a MIVA instance adn retreive a JSON file of all of their dealers, compare that to the current DB entry of all of their dealers, update any new ones and re-save that back into the DB. 

2. Have a route available for the Front End HTML/JS (src/index.html and src/js/locations.js) that will ultimately be hosted on a MIVA instance to hit to request dealers from the DB based on location boundaries fed in as lat/lng. 

### To run this locally: 

1. Have a mongo instance running
2. npm install
3. Set the requestDealers.js variable 'local' to true to use the local mongo connection
4. Set the locations.js variable 'baseURLofServer' to "" so that the server route requests are relative.
5. Pull it up and enjoy. 

### To run this in production:

1. Put the page contents and appropriate google script import on the Miva merchant page where you want the map to appear. 
2. Make sure that the variable 'baseURLofServer' is the location of where the server is hosted, this can be the production instance wherever it is hosted or an ngrok address for testing the MIVA half without testing the live DB's connection
3. take the full contents of locations.js and put it into the MIVA instances themes.js file under the appropriate ```jsPAGE: function{}``` section where 'PAGE' is the page code for the page you put the index.html content on. 
4. If testing against a local version throuhg ngrok leave the requestDealers.js variable 'local' true
5. if connecting to the live DB make sure that the requestDealers.js variable  'local' is false.
6. Upload the node server to the location where it will be hosted (Most likely the AWS Ec2 isntance) ensuring the Mongo commection info is correct for the live DB. 

##### Notes: 

* the locations.js file has a few variables up top that allow for single places to change some of the map defaults. 
  * ```defaultLocation``` is the location to use if the user denies permission to access their location, it is currently set to S&B headquarters
  * ```zoomLevel``` is how close/far to have the map be zoomed in when it loads. 0 is whole Earth, 12 is most of San Diego and 20 is about half a block. 
  * ```baseURLofServer``` is where the server that interacts with the DB is hosted. Use ```''``` for local the ngrok url for testing MIVA against your local DB and the live Ec2 URL for the live version. 