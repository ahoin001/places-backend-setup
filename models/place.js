const mongoose = require('mongoose')

// Create Schema (Data structure for documents)
// id is automaticallly created by mongodb
const placeSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    location: {
        lat: {
            type: Number,
            required: true
        },
        lng: {
            type: Number,
            required: true
        }
    },
    creator: {

        type: mongoose.Types.ObjectId,
        required: true,
        ref: "User" // Establishes connection between current schema and User schema

    }

})

// arg1 name of collection ( gets converted to plural lowercase 'places')
// arg2 schema for documents to be based off
module.exports = mongoose.model('Place', placeSchema)
