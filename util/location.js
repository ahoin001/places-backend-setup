// Axios used to send requests from our server to another server
const axios = require('axios')
const API_KEY = process.env.GOOGLE_API_KEY
const HttpError = require('../models/http-error')

// async await to consume promise from axios call
async function getCoordinatesFromAdress(adress) {

    // encodeURI is used to convert a string to a url friendly format
    // await consumes promise 
    const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(adress)}&key=${API_KEY}`)

    // Get the data I need from response
    const data = response.data
    // console.log('From Geocode Call +++++++++++++', data)

    if (!data || data.status === 'ZERO_RESULTS') {

        const error = new HttpError('Could not find location for specified adress.', 422);
        throw error;

    }

    // console.log(`RESPONSE DATA FROM GMAP AXIOS######`, data.results[0].geometry.location)

    // Object containing lat and logitude
    const coordinates = data.results[0].geometry.location;

    return coordinates
}

module.exports = getCoordinatesFromAdress
