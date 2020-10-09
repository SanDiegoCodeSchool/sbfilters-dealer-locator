let map, dealers;
let inc = 0;
const sanDiego = { lat: 32.715736, lng: -117.161087 };
const detroit = { lat: 42.3314, lng: -83.0458 };
//location to use if User denies persmission to browser for location or browser is super old
const defaultLocation = sanDiego;
//how far to zoom the map in when it loads, 0 is whole world, 12 is most of a large city, 20 is a couple hundred feet wide
const zoomLevel = 12;
//how may seconds to wait to place the markers after the map loads, move up if page loads crazy slow so that map exists when you try to drop pins
const delayAfterMapLoad = 2000;
//single place to update base URL for server to connect DB
const baseURLofServer = 'https://d444240d8d12.ngrok.io';

$(document).ready(async ()=> {
    console.log(`Dom Loaded`)
    // let scriptExists = await makeScript();
    // console.log(scriptExists);

    let userLocation = await getLocation();
    //make sure script had time to build
    setTimeout(() => {
        console.log(`creating map`)
        pullUpNewMap(userLocation);
    }, delayAfterMapLoad + 2000); 
});

// const makeScript = async () => {
//     let peanutButter = await fetch('/fiddleSticks');
//     let jelly = await peanutButter.json();
//     let pbj = jelly.key;

//     let mapScript = document.createElement('script');
//     mapScript.type = 'text/javascript';
//     mapScript.src = `https://maps.googleapis.com/maps/api/js?key=${pbj}&libraries=&v=weekly`;    
//     document.getElementsByTagName('head')[0].appendChild(mapScript);

//     return true;
// }

const pullUpNewMap = async (location) => {
    await initMap(location);
    setTimeout(placeMarkers, delayAfterMapLoad);
    map.addListener("dragend", function() {
        console.log(`Dragged, resetting markers`);
        setTimeout(placeMarkers, delayAfterMapLoad);
    })
}

const initMap = (coords=null) => {
    if (coords != null) {
        //if browser can get user coordinates and theyre passed in by the argument
        console.log("User Location Map");
        map = new google.maps.Map(document.getElementById("map"), {
            center: { lat: coords.lat, lng: coords.lng },
            zoom: zoomLevel,
        });
    } else {
        // extra redundency to have a default location if no coords are passed in, pulls up map centered on default location
        console.log("Default Location Map");
        map = new google.maps.Map(document.getElementById("map"), {
            center: defaultLocation,
            zoom: zoomLevel,
        });
    }
};

const getLocation = async () => {
    let userLocation = new Promise((resolve, reject) => {
            //check if the user has denied location permission if so send the default location
            navigator.permissions.query({name: 'geolocation'}).then((permission) => {
                if (permission.state == 'denied') {
                    console.log("Geolocation is not supported by this browser or has been denied permission by the user.");
                    resolve(defaultLocation);
                } else {
                    //if the user locaiton comes back send that
                    try{
                        navigator.geolocation.getCurrentPosition(async (position) => {
                            let userCoords = {
                                lat: position.coords.latitude,
                                lng: position.coords.longitude
                            }
                            resolve(userCoords);
                        });
                    } catch (err) {
                        //if getting the user location fails use the default
                        console.log(`Error getting user Location: `, err);
                        console.log(`Using defalut location`);
                        resolve(defaultLocation);
                    }
                }
            })
    });
    console.log(await userLocation);
    return await userLocation;
};

const getNewBounds = () => {
    let bounds = map.getBounds();
    let boundsArr = bounds.toString().replace(/[()]/g, "").split(',');
    let north = parseFloat(boundsArr[2]);
    let west = parseFloat(boundsArr[1]);
    let south = parseFloat(boundsArr[0]);
    let east = parseFloat(boundsArr[3]);

    return {
        north: north, 
        south: south, 
        east: east, 
        west: west
    };
};

const getNewCenter = () => {
    //returns String right now, maybe make it refurn numbers? 
    let rawCenter = map.getCenter();
    let center = new google.maps.LatLng(rawCenter.lat(), rawCenter.lng());
    return center.toString();
};

const getAllDealers = async () => {
    try {
        let rawDealers = await fetch(`/dealers`)
        let dealers = await rawDealers.json();
        return dealers;
    } catch (err) {
        console.log(`Error fetching from server route: `, err);
    }
    return [];
}

const getLocalDealers = async (bounds) => {
    console.log(`getLocalDealers location: `, bounds.west);
    try {
        let rawDealers = await fetch(`/dealers?n=${bounds.north}&s=${bounds.south}&e=${bounds.east}&w=${bounds.west}`)
        let dealers = await rawDealers.json();
        return dealers;
    } catch (err) {
        console.log(`Error fetching from server route: `, err);
    }
    return [];
}

const infoContent = (dealer) => {
    if (dealer.address2 != ""){
        return( `<div class="headContent">` +
        `<h1 class='firstHeading' class='firstHeading'>${dealer.name}</h1>` +
        `<div class='bodyContent'>` +
        `<p><b>Address:</b></p> ` +
        `<p>${dealer.address}</br>${dealer.address2}</br>${dealer.city}</br>${dealer.country} ${dealer.postal}</p>` +
        `<p><b>Phone: </b></p>` +
        `<p>${dealer.phone}</p> ` + 
        `<a href='${dealer.web}'><b?Website: </b>${dealer.web}</a> ` +
        `</div>` +
        `</div>`);
    } else {
        return( `<div class="headContent">` +
        `<h1 class='firstHeading' class='firstHeading'>${dealer.name}</h1>` +
        `<div class='bodyContent'>` +
        `<p><b>Address:</b></br>${dealer.address}</br>${dealer.city}</br>${dealer.country} ${dealer.postal}</p>` +
        `<p><b>Phone: </b></br>${dealer.phone}</p> ` + 
        `<p><b>Website: </b></br><a href='${dealer.web}'>${dealer.web}</a></p> ` +
        `</div>` +
        `</div>`);
    }
};

const placeMarkers = async () => {
    let mapBounds = await getNewBounds();
    const localDealers = await getLocalDealers(mapBounds);

    for (let i = 0; i < localDealers.length; i++) {
        //create the info card popup for each dealer
        const infoWindow = new google.maps.InfoWindow({content: infoContent(localDealers[i])})
        let dealerPos = {lat: parseFloat(localDealers[i].lat), lng: parseFloat(localDealers[i].lng)};
        //make a marker pin for each dealer
        let dealerMarker = new google.maps.Marker({position: dealerPos, map: map});
        //attach the card poput to the click of each marker
        dealerMarker.addListener('click', () => {
            infoWindow.open(map, dealerMarker);
        })
    }
}

document.getElementById('testButton').addEventListener('click', async (event) => {
    console.log('clicked');
    const myHouse = {lat: 32.722124799999996, lng: -117.09317120000001};
    let houseMarker = new google.maps.Marker({position: myHouse, map: map});

})

// document.getElementById('search-button').addEventListener('click', async (event) => {
//     console.log('clicked');
    
//     let userInput = document.getElementById('user-input').value;
//     let userSearchValue = encodeURI(userInput);
//     //Use google places API for real searching? 
    
//     fetch(`/places?i=${userSearchValue}`)
//     .then((res) => res.json())
//     .then((data) => {
//         console.log(`placesData: `,  data);
//     })
//     .catch(err => console.log(`FetchError: `. err))

//     //re-initialize map with new location (location needs to be {lat, lng})
//     // pullUpNewMap(detroit);
// })

