# Google Maps JS API / Dealer Location 

This is a local version of the code that will be broken up into a separate front end HTML/JS file and node server that will get hosted on AWS attached to a DocumentDB/Mongo instance. 

The server has 2 separate functionalities. 

1. On a cronjob to run everytnight at 11:59pm PST to FTP into a MIVA instance and retreive a JSON file of all of their dealers, compare that to the current DB entry of all of their dealers, update any new ones and re-save that back into the DB. 

2. Have a route available for the Front End HTML/JS (```src/index.html``` and ```src/js/locations.js```) that will ultimately be hosted on a MIVA instance to hit to request dealers from the DB based on location boundaries fed in as lat/lng. 

### To run this locally: 

1. Have a mongo instance running
2. ```npm install```
3. Set the ```requestDealers.js``` variable ```local``` to true to use the local mongo connection
4. Set the ```locations.js``` variable ```baseURLofServer``` to ```''``` so that the server route requests are relative.
5. Pull it up and enjoy. 

### To run this in production:
##### This repo has both the front and back ends together, for production the front end HTML, CSS and locations.js files will be separate from the server and will treate it like an API. 

1. Put the page contents and appropriate google script import on the Miva merchant page where you want the map to appear. 
2. Make sure that the variable ```baseURLofServer``` is the location of where the server is hosted, this can be the production instance wherever it is hosted or an ngrok address for testing the MIVA half without testing the live DB's connection
3. take the full contents of ```locations.js``` and put it into the MIVA instances ```themes.js``` file under the appropriate ```jsPAGE: function{}``` section where ```PAGE``` is the page code for the page you put the index.html content on. 
4. If testing against a local version throuhg ngrok leave the ```requestDealers.js``` variable ```local``` true
5. if connecting to the live DB make sure that the ```requestDealers.js``` variable  ```local``` is false.
6. Upload the node server to the location where it will be hosted (Most likely the AWS Ec2 isntance) ensuring the Mongo commection info is correct for the live DB. 

#### Notes for Front Eend: 

* the locations.js file has a few variables up top that allow for single places to change some of the map defaults. 
  * ```defaultLocation``` is the location to use if the user denies permission to access their location, it is currently set to teh center of the US
  * ```zoomLevel``` is how close/far to have the map be zoomed in when it loads. 0 is whole Earth, 12 is most of San Diego and 20 is about half a block. 
  * ```baseURLofServer``` is where the server that interacts with the DB is hosted. Use ```''``` for local the ngrok url for testing MIVA against your local DB and the live Ec2 URL for the live version. 
  * For the marker cluster functionality to work the 2 css rules need to be added to the MIVA instance for the shadows theme to not pick up the ARIA-hidden property and make them invisible. ALSO the images file needs needs to be loaded into miva and the file path needs to be updated in what is ```locations.js``` here and is ```themes.js``` in Miva. 
  * The icon images for the map clustering are here locally as ```src/css/savedFiles/images``` the filepath in the code needs to be ```src/css/savedFiles/images/m```  or as it is in Miva currently as:
  ```let baseUrl = document.location.origin;```
  ```${baseUrl}/mm5/themes/shadows/ui/js/images/m```
  The /m is necessary. 


  #### Notes for Server Deployment:
  * The correct MongoDB connection URL needs to be placed in the ```.env``` and any other connection credentials that are necessary beyond the URL will need to be placed in ```createDealers.js```, ```requestDealers.js``` and ```updateDealers.js```. 
  * The route ```/update``` should seed the DB with data if it doesn't find any to begin with, in the event that that fails or is prvented by a setting of the MongoDB instance this conencts to the route ```/seedDB``` can be called to seed the database, it checks if the dealers entry exists before it seeds with fresh data and bails out if it already exists so it can be called willy nilly with no consequences. 
  * The live google cloud API key for the Places API needs to be put in the ```.env```