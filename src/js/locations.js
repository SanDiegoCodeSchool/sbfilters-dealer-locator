let map, dealers, lastMapSearchArea;
let firstRender = true;
const sanDiego = { lat: 32.715736, lng: -117.161087 };
const detroit = { lat: 42.3314, lng: -83.0458 };
const SBHeadquarters = { lat: 34.062383, lng: -117.468727 };
//location to use if User denies persmission to browser for location or browser is super old
const defaultLocation = SBHeadquarters;
//how far to zoom the map in when it loads, 0 is whole world, 12 is most of a large city, 20 is a couple hundred feet wide
const zoomLevel = 12;

//single place to update base URL for server to connect DB (empty for local)
// const baseURLofServer = 'https://ec2-100-26-191-112.compute-1.amazonaws.com:3000';
// const baseURLofServer = 'https://d444240d8d12.ngrok.io';
const baseURLofServer = '';


$(document).ready(async ()=> {
    console.log(`Dom Loaded`)
    let userLocation = await getLocation();
    pullUpNewMap(userLocation);
});

const pullUpNewMap = async (location) => {
    await initMap(location);

    //listener for each drag that checks the boundaries. 
    map.addListener("dragend", () => {
        compareNewBounds();
    })

    //listener for each zoom change that checks boundaries. 
    map.addListener("zoom_changed", () => {
        compareNewBounds();
    })
    
    //wait for map to exist to place markers and hit DB, this only exists once and is removed (this bounds_changed event can be used in the future if the zoom and drag events don't cover everything but it fires about 100times a second and could potentially hit the DB A LOT  )
    google.maps.event.addListenerOnce(map, "bounds_changed", (function(map) {
        return function(evt) {
            console.log("single listen to placeBoubnds")
            placeMarkers();
        }
    })(map));
};

const expandedBounds = async (baseBounds) => {
    const height = baseBounds.north - baseBounds.south;
    const width = baseBounds.east - baseBounds.west;
    const expandedBounds = {
        north: baseBounds.north + height,
        south: baseBounds.south - height,
        east: baseBounds.east + width,
        west: baseBounds.west - width
    }

    return expandedBounds;
};

const initMap = async (coords=null) => {
    if (coords != null) {
        //if browser can get user coordinates and theyre passed in by the argument
        console.log("User Location Map");
        map = await new google.maps.Map(document.getElementById("map"), {
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
            //check users location permissions
            navigator.permissions.query({name: 'geolocation'}).then((permission) => {
                if (permission.state == 'prompt'){
                    //runs if the permnission has not been received form user yet, this tries to access location giving the user the popup
                    useBrowserLocation();
                    //this function waits for the user to respond 
                    permission.onchange = (e)=> {
                        if (e.type == "change") {
                            useBrowserLocation();
                        }
                    }
                } else {
                    //this runs if the user has already answered their permissions
                    useBrowserLocation();
                }

                function useBrowserLocation () {
                    if (permission.state == 'denied') {
                        console.warn("Geolocation is not supported by this browser or has been denied permission by the user, using defalut map location.");
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
                            console.error(`Error getting user Location: `, err);
                            console.warn(`Using defalut location`);
                            resolve(defaultLocation);
                        }
                    };
                }
            });


    });
    return await userLocation;
};

const getNewBounds = () => {
    let bounds = map.getBounds();
    let boundsArr = bounds.toString().replace(/[()]/g, "").split(',');
    let north = parseFloat(boundsArr[2]);
    let west = parseFloat(boundsArr[1]);
    let south = parseFloat(boundsArr[0]);
    let east = parseFloat(boundsArr[3]);

    let boundsObj = {
        north: north, 
        south: south, 
        east: east, 
        west: west
    };

    return boundsObj;
};

const getNewCenter = () => {
    //returns String right now, maybe make it return numbers? 
    let rawCenter = map.getCenter();
    let center = new google.maps.LatLng(rawCenter.lat(), rawCenter.lng());
    return center.toString();
};

const getAllDealers = async () => {
    try {
        let rawDealers = await fetch(`${baseURLofServer}/dealers`)
        let dealers = await rawDealers.json();
        return dealers;
    } catch (err) {
        console.error(`Error fetching from server route: `, err);
    }
    return [];
};

const getLocalDealers = async (bounds) => {
    try {
        let rawDealers = await fetch(`${baseURLofServer}/dealers?n=${bounds.north}&s=${bounds.south}&e=${bounds.east}&w=${bounds.west}`)
        let dealers = await rawDealers.json();
        return dealers;
    } catch (err) {
        console.error(`Error fetching from server route: `, err);
    }
    return [];
};

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

const compareNewBounds = async () => {
    let mapBounds = await getNewBounds();

    if (mapBounds.north > lastMapSearchArea.north || mapBounds.south < lastMapSearchArea.south || mapBounds.east > lastMapSearchArea.east || mapBounds.west < lastMapSearchArea.west) {
        //compares new bounds and old search area, if the bounds contain anything outside the previous search area get new dealers, place new pins etc.. 
        console.log("placing new dealer markers")
        placeMarkers();
    } else {
        //if the new map bounds are NOT outside the previous search area then don't bother hitting the DB again and re-placing markers
        console.warn("Current Map Bounds are inside the previous search area, no need to place new markers");
    }
};

const placeMarkers = async () => {
    let mapBounds = await getNewBounds();
    let searchArea = await expandedBounds(mapBounds);
    const localDealers = await getLocalDealers(searchArea);

    console.log("new Markers comingin hot.")
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
    lastMapSearchArea = searchArea; 
};

document.getElementById('testButton').addEventListener('click', async (event) => {
    console.log('clicked');
    const myHouse = {lat: 32.722124799999996, lng: -117.09317120000001};
    let houseMarker = new google.maps.Marker({position: myHouse, map: map});

});


//This is here incase we want to turn on the Google Places API at some point
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

