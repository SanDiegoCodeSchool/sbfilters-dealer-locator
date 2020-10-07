import React, { useState, useEffect } from 'react';
// import { HashRouter as Router, Route, Redirect } from 'react-router-dom';
// import { Helmet } from 'react-helmet';

function App() {
    
    useEffect(()=> {
        let map;

        map = new google.maps.Map(document.getElementById("map"), {
            center: { lat: -34.397, lng: 150.644 },
            zoom: 8,
        });
    });

    return (
        <>
            <div id="map"></div>
        </>
    )
};

export default App;
