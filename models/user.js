const mongoose = require('mongoose')
const Schema = mongoose.Schema

const uniqueValidator = require('mongoose-unique-validator')

const userSchema = new Schema({

    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true     // Makes it quicker to query when requesting email
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    image: {
        type: String,
        required: true,
    },
    // User can have multiple places so this is an array of places, each reffering to a unique place
    places: [
        {
            type: mongoose.Types.ObjectId,
            required: true,
            ref: "Place" // Establishes connection between current schema and User schema
        }
    ]

})

// Add validator package to schema 
userSchema.plugin(uniqueValidator)

module.exports = mongoose.model('User', userSchema)
