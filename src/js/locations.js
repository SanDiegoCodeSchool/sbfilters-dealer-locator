let map, dealers, lastMapSearchArea, markerCluster, markers, alertMarker, globalUserLocation;
let firstRender = true;
let shouldGetDealers = false;
let hasMarkers = false;
const sanDiego = { lat: 32.715736, lng: -117.161087 };
const detroit = { lat: 42.3314, lng: -83.0458 };
const SBHeadquarters = { lat: 34.062383, lng: -117.468727 };
const centerOfUSA = { lat: 39.8283, lng: -98.5785};
//location to use if User denies persmission to browser for location or browser is super old
const defaultLocation = centerOfUSA;
//how far to zoom the map in when it loads, 0 is whole world, 12 is most of a large city, 20 is a couple hundred feet wide
const locationZoomLevel = 12;
const noLocationZoomLevel = 4;
let zoomLevel = 12;

//single place to update base URL for server to connect DB (empty for local)
// const baseURLofServer = 'https://ec2-100-26-191-112.compute-1.amazonaws.com:3000';
// const baseURLofServer = 'https://b0804933ef6e.ngrok.io';
const baseURLofServer = '';


$(document).ready(async ()=> {
    console.log(`Dom Loaded`)
    let initUserLocation = await getLocation();
    globalUserLocation = initUserLocation;
    pullUpNewMap(initUserLocation);
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
    
    //this waits for map to exist to place markers and hit DB, this only exists once and is removed (this bounds_changed event can be used in the future if the zoom and drag events don't cover everything but it fires about 100times a second and could potentially hit the DB A LOT  )
    google.maps.event.addListenerOnce(map, "bounds_changed", (function(map) {
        return async (evt) => {
            shouldGetDealers = await checkZoom();
            console.log(`should get dealers" `, shouldGetDealers);
            if (shouldGetDealers) {
                placeMarkers();

            } else {
                noDealersAlert();
            }
        }
    })(map));
};

const noDealersAlert = async(useAlert = true) => {
    //call this without an argument to place the alert message, and pass false as the argument to remove it. 
    const center = await getNewCenter();
    const contentString =
    '<div id="content">' +
    '<div id="siteNotice">' +
    "</div>" +
    '<h1 id="firstHeading" class="firstHeading">Zoomed too far out!</h1>' +
    '<div id="bodyContent">' +
    "<p>We've got plenty of dealers, too many in fact to load them all zoomed this far out, " +
    "keep zooming in or search to populate the map with our many dealers.</p>" +
    "</div>" +
    "</div>";
    if (useAlert) {
        if (alertMarker){
            alertMarker.setMap(null);
        }
        const infowindow = new google.maps.InfoWindow({
            content: contentString,
        });
        alertMarker = new google.maps.Marker({
            position: center,
            map,
        });
        infowindow.open(map, alertMarker);
        alertMarker.addListener("click", () => {
            infowindow.open(map, alertMarker);
        });
    } else {
        if (alertMarker){
            alertMarker.setMap(null);
        }
    }
}

const checkZoom = async () => {
    const currentBounds = await getNewBounds();
    //disabled for pins functionality FLAG
    // setSearchArea(currentBounds);
    let width = Math.abs(currentBounds.east - currentBounds.west);
    console.log(`width 4 or less for pins: `, width);
    if (width < 4) {
        return true;
    }

    return false;
}

const initMap = async (coords=null) => {
    if (coords != null) {
        //if browser can get user coordinates and theyre passed in by the argument
        console.log("User Location Map");
        map = await new google.maps.Map(document.getElementById("map"), {
            center: { lat: coords.lat, lng: coords.lng },
            zoom: zoomLevel,
        });
    } else {
        // extra redundency to have a default location if no coords are passed in, pulls up map centered on default location, this is not the main place where the default is caught. 
        console.log("Default Location Map");
        map = new google.maps.Map(document.getElementById("map"), {
            center: defaultLocation,
            zoom: zoomLevel,
        });
        lastMapSearchArea = {
            north: 39.8285,
            south: 39.8281,
            west: -98.5787,
            east: -98.5783
        }
    }
};

const getLocation = async () => {
    //this does not use the user permission to base this location request on, thats not supported by mobile or anythign by chrome really.
    if (navigator.geolocation) {
        let userLocation = new Promise((resolve, reject) => {
            try{
                navigator.geolocation.getCurrentPosition(async (position) => {
                    let userCoords = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    }
                    resolve(userCoords);
                }, async (failure) => {
                    console.warn(`Location not suported by browser or denied permission by user, using defalut location`);
                    zoomLevel = noLocationZoomLevel;
                    resolve(defaultLocation);
                    lastMapSearchArea = {
                        north: 39.8285,
                        south: 39.8281,
                        west: -98.5787,
                        east: -98.5783
                    }
                });
            } catch (err) {
                //if getting the user location fails use the default
                console.error(`Error getting user Location: `, err);
                console.warn(`Using defalut location`);
                resolve(defaultLocation);
            }
        });
        return await userLocation;
    } else {
        return defaultLocation;
    }
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

const getNewCenter = () => {
    let rawCenter = map.getCenter();
    let center = new google.maps.LatLng(rawCenter.lat(), rawCenter.lng());
    let centerCoords = {lat: center.lat(), lng: center.lng()};
    return centerCoords;
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
    if (dealer.address2 != "") {
        return ( `<div class="headContent">` +
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
        return ( `<div class="headContent">` +
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
    let shouldPlaceMarkers = await checkZoom();
    console.log(shouldPlaceMarkers);
    if (shouldPlaceMarkers) {
        console.log(`mapBounds: `, mapBounds);
        console.log(`lastMapSearchArea: `, lastMapSearchArea);
        noDealersAlert(false);
        if (mapBounds.north > lastMapSearchArea.north || mapBounds.south < lastMapSearchArea.south || mapBounds.east > lastMapSearchArea.east || mapBounds.west < lastMapSearchArea.west) {
            //compares new bounds and old search area, if the bounds contain anything outside the previous search area get new dealers, place new pins etc.. 
            console.log("placing new dealer markers");
            await noDealersAlert(false);
            placeMarkers();
        } else if (!hasMarkers && shouldPlaceMarkers) {
            console.log(`placing first round of dealer markers`)
            await noDealersAlert(false);
            placeMarkers();
        }else {
            //if the new map bounds are NOT outside the previous search area then don't bother hitting the DB again and re-placing markers
            console.warn("Current Map Bounds are inside the previous search area, no need to place new markers");
        }
    } else {
        noDealersAlert();
    }
};

const sortDealersByProximity  = (dealers, comparisonPoint) => {
    let lat1 = comparisonPoint.lat;
    let lng1 = comparisonPoint.lng;
    const distance = (lat1, lng1, lat2, lng2) => {
        if ((lat1 == lat2) && (lng1 == lng2)) {
            return 0;
        }
        else {
            let radlat1 = Math.PI * lat1/180;
            let radlat2 = Math.PI * lat2/180;
            let theta = lng1-lng2;
            let radtheta = Math.PI * theta/180;
            let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
            if (dist > 1) {
                dist = 1;
            }
            dist = Math.acos(dist);
            dist = dist * 180/Math.PI;
            dist = dist * 60 * 1.1515;
            return dist;
        }
    };

    const compare = ( a, b ) => {
        let distA = a.distance;
        let distB = b.distance;
        let comparison = 0;

        if (distA > distB) {
            comparison = 1; 
        } else if (distA < distB) {
            comparison = -1
        }
        return comparison;
    };

    for( let i = 0; i < dealers.length; i++) {
        let lat2 = dealers[i].lat;
        let lng2 = dealers[i].lng;
        let distancefromCenter = distance(lat1, lng1, lat2, lng2);
        dealers[i].distance = distancefromCenter;
    }

    return dealers.sort(compare);
};

const placeMarkers = async () => {
    let mapBounds = await getNewBounds();
    let searchArea = await expandedBounds(mapBounds);
    let center = getNewCenter();
    const localDealers = await getLocalDealers(searchArea);
    const sortedDealers = await sortDealersByProximity(localDealers, center);
    populateList(sortedDealers);

    if (markerCluster) {    
        console.log(`Removing Existing Markers`)
        markerCluster.clearMarkers();
        markers = [];
    }

    console.log("New Markers Coming In Hot.")
    
    markers = sortedDealers.map((dealer, i) => {
        const infoWindow = new google.maps.InfoWindow({content: infoContent(dealer)})
        let dealerPos = {lat: parseFloat(dealer.lat), lng: parseFloat(dealer.lng)};
        let dealerMarker = new google.maps.Marker({
            position: dealerPos,
            label: ( i + 1 ).toString()
        })
        dealerMarker.addListener('click', () => {
            infoWindow.open(map, dealerMarker);
        })
        //extending marker click event to list item div. 
        let listItem = document.getElementById(`list-item-${i + 1}`);
        listItem.addEventListener('click', () => {
            infoWindow.open(map, dealerMarker);
            console.log(`dealers info: `, dealer);
            map.setCenter({lat: Number(dealer.lat), lng: Number(dealer.lng)});
            map.setZoom(12);
        })
        return dealerMarker;
    })

    //local image path
    let imagePath = '../css/savedFiles/images/m';

    //Miva imagePath
    // let baseUrl = document.location.origin;
    // let imagePath = `${baseUrl}/mm5/themes/shadows/ui/js/images/m`;

    markerCluster = new MarkerClusterer(map, markers, {
        imagePath: imagePath
    });
    hasMarkers = true;
    setSearchArea(mapBounds); 
};

const setSearchArea = async (bounds) => {
    let searchArea = await expandedBounds(bounds);

    lastMapSearchArea = searchArea;
}

const populateList = (dealers) => {
    let fullList = document.getElementById("list");
    while(fullList.firstChild) fullList.removeChild(fullList.firstChild);

    dealers.forEach((dealer, i) => {
        let listItem = document.createElement('div');
        let listNumberTitleContainer = document.createElement('div');
        let listItemIndex = document.createElement('h4');
        let listItemTitle = document.createElement('h4');
        let listItemPhone = document.createElement('p');
        let listItemURL = document.createElement('p');
    
        listItem.classList.add('list-item');
        listItem.setAttribute('id', `list-item-${(i + 1)}`)
        listNumberTitleContainer.classList.add('number-title');
        listItemIndex.classList.add('dealer-index');
        listItemTitle.classList.add('dealer-title');
        listItemPhone.classList.add('dealer-phone');
        listItemURL.classList.add('dealer-url');

        listItemIndex.innerHTML = (i + 1).toString();
        listItemTitle.innerHTML = dealer.name;
        listItemPhone.innerHTML = dealer.phone;
        listItemURL.innerHTML = dealer.web;

        listItem.appendChild(listNumberTitleContainer);
        listNumberTitleContainer.appendChild(listItemIndex);
        listNumberTitleContainer.appendChild(listItemTitle);
        listItem.appendChild(listItemPhone);
        listItem.appendChild(listItemURL);

        fullList.appendChild(listItem);
    });
};

const recenterMapWithUserLocation = async () => {
    let userPermissions = await navigator.permissions.query({name: 'geolocation'});
    
    //checking both for user permission denied as well as if the globally stored location is the same as the default lodation
    if (userPermissions.state == 'denied' || globalUserLocation.lat == defaultLocation.lat) {
        //So far this is the best that can be done, if the location is denied there is ZERO way to re-ask for it. 
        window.alert("You have denied permission to use your location, if you want you can allow it in your browsers settings or search by location");
    } else {
        map.setCenter(globalUserLocation);
        map.setZoom(12);
    }
};

const recenterMapWithSearch = async (coords) => {
    map.setCenter(coords);
    map.setZoom(12);
};

document.getElementById('recenter').addEventListener('click', async (event) => {
    console.log('clicked');
    recenterMapWithUserLocation();
});

document.getElementById('testButton').addEventListener('click', async (event) => {
    console.log('clicked');
    // const myHouse = {lat: 32.722124799999996, lng: -117.09317120000001};
    // let houseMarker = new google.maps.Marker({position: myHouse, map: map});
    let userPermissions = await navigator.permissions.query({name: 'geolocation'});
    console.log(userPermissions);

});

document.getElementById('search-button').addEventListener('click', async (event) => {
    console.log('clicked');
    
    let userInput = document.getElementById('user-input').value;
    let userSearchValue = encodeURI(userInput);
    
    fetch(`${baseURLofServer}/places?i=${userSearchValue}`)
        .then((res) => res.json())
        .then((data) => {
            if (data.name === "none found") {
                alert('No search results found, please try searching again.')
            } else {
                console.log(`placesData: `,  data.name);
                console.log(`placesData: `,  data.coords);
                recenterMapWithSearch(data.coords.location);
            }

        })
        .catch(err => console.log(`FetchError: `. err))
})