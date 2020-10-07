let map, dealers;
let inc = 0;


$(document).ready(()=> {
    console.log(`Dom Loaded`)
    getLocation();
});

const initMap = (coords=null) => {
    if (coords != null) {
        //if browser can get user coordinates and theyre passed in by the argument
        console.log("User Location Map");
        map = new google.maps.Map(document.getElementById("map"), {
            center: { lat: coords.lat, lng: coords.lng },
            zoom: 15,
        });
    } else {
        //if not pull up map centered on San Diego
        console.log("Default Location Map");
        const sanDiego = { lat: 32.715736, lng: -117.161087 };
        map = new google.maps.Map(document.getElementById("map"), {
            center: sanDiego,
            zoom: 12,
        });
    }
};

const getLocation = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            //if the user locaiton comes back call map init function passing in coords
            let userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            }
            console.log(userLocation);
            initMap(userLocation);
        });
    } else {
        //if not call it to use the default
        console.log("Geolocation is not supported by this browser.");
        initMap();
    }
};

const getDealers = async () => {
    let dealers = await fetch('/dealers')
        .then(response => response.json())
        .then((data)=> {
            // console.log(`json data: `, data);
            return data;
        }).catch((err)=> {
            console.log(`Data fetch error: `, err)
        });

    return dealers;
}

document.getElementById('testButton').addEventListener('click', async (event) => {
    console.log('clicked');
    const myHouse = {lat: 32.722124799999996, lng: -117.09317120000001};
    let houseMarker = new google.maps.Marker({position: myHouse, map: map});
    let dbDealers = await getDealers();
    console.log(`dbDealers: `, dbDealers);
    for (let i = 0; i < 5; i++) {
        console.log(`each dealer: `, dbDealers[i]);
        let dealerPos = {lat: parseFloat(dbDealers[i].lat), lng: parseFloat(dbDealers[i].lng)};
        let dealerMarker = new google.maps.Marker({position: dealerPos, map: map})
        //puts pins on map, need to sort DB query based on map bounds, need ot find map bounds. 
    }
    
})
