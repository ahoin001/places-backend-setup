// Controller files are intended to hold logic and focus on middleware functions to be used in routes
// ** NOTE throwing error does not work in async tasks, must use next(error) to pass error to next middleware
// ** NOTE post requests bodies must be json stringified so bodyparser in backend can use them 

const mongoose = require('mongoose')
const Place = require('../models/place')
const User = require('../models/user')
const fs = require('fs')

// To check validation from middleware
const { validationResult } = require('express-validator')

// We created this class to not repeat code for creating errors to send to appj.js error handler
const HttpError = require('../models/http-error')

const getCoordinatesFromAdress = require('../util/location')

const createPlace = async (req, res, next) => {

    // 
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(
            new HttpError('Invalid inputs passed, please check your data.', 422)
        );
    }

    const { title, description, address } = req.body;

    // console.log(`ADRESS RECIEVED IN BACK END: `,address)

    let coordinates;
    try {
        coordinates = await getCoordinatesFromAdress(address);
    } catch (error) {
        return next(error);
    }

    console.log(`############ COORDINATES BEING PUT INTO PLACE`, coordinates)

    const createdPlace = new Place({
        title,
        description,
        address,
        location: coordinates,
        image: req.file.path,
        creator: req.userData.userID
    });

    let user;
    try {
        user = await User.findById(req.userData.userID);
    } catch (err) {
        const error = new HttpError(
            'Creating place failed, please try again.',
            500
        );
        return next(error);
    }

    if (!user) {
        const error = new HttpError('Could not find user for provided id.', 404);
        return next(error);
    }

    //   console.log(`@@@@@@@@@@@@@ THE USER CREATING PLACE: `,user);
    console.log(`############# THE PLACE BEING CREATED: `, createdPlace);


    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createdPlace.save({ session: sess });
        user.places.push(createdPlace);
        await user.save({ session: sess });
        await sess.commitTransaction();

    } catch (err) {
        const error = new HttpError(
            'Transaction failed, please try again.',
            500
        );
        return next(error);
    }

    res.status(201).json({ place: createdPlace });
};

const getPlaceById = async (req, res, next) => {

    // Extract parameter from request
    const placeId = req.params.pid // {pid : dynamicParam}
    let place;

    try {
        // static method that can be used directly on constructor
        place = await Place.findById(placeId)

    } catch (err) {

        const error = new HttpError('Something went wrong, could not find a place', 500);
        return next(error)

    }

    // if place could not be found ( place is undefined) return a 404 error
    // throws error that will trigger error handling middleware in app.js
    if (!place) {

        // throw need'nt return because it cancels excecution already
        // Our custom class recieves a custom message and an error code
        const error = new HttpError('Could not find a place for the provided id', 404);

        return next(error)

    }

    // Turn document into normal js object , getters true to add id property to object after toObject() 
    res.json({ place: place.toObject({ getters: true }) })

}

const getPlaceByUserId = async (req, res, next) => {

    const userId = req.params.uid

    let places;

    try {

        // find place that matches property and value 
        // returns an array
        places = await Place.find({ creator: userId })

    } catch (err) {

        const error = new HttpError('Failed to fetch places for this user', 500);
        return next(error)

    }

    // Since find returns array, map through documents to turn each into js object
    res.json({ places: places.map(place => place.toObject({ getters: true })) })

}

const updatePlaceById = async (req, res, next) => {

    // Before touching data, make sure request is valid
    const errorsFromValidation = validationResult(req)

    if (!errorsFromValidation.isEmpty()) {
        res.status(402)
        return next(new HttpError('Invalid inputs, please check you data', 422))
    }

    // Get the values we want to use for change
    const { title, description } = req.body

    const placeId = req.params.pid

    let placeToUpdate;

    try {

        placeToUpdate = await Place.findById(placeId)

    } catch (error) {

        return next(
            new HttpError('Failed to find place with this id', 500)
        )

    }

    // If the place creator isn't the user signed in 
    // creater is a mongoose objectid type, so must be string for comparison
    if (placeToUpdate.creator.toString() !== req.userData.userID) {
        const error = new HttpError('Users can only edit places they added', 401);
        return next(error)
    }

    // Make changes with new values
    placeToUpdate.title = title;
    placeToUpdate.description = description;

    try {

        // Behind the scenes .save method has change tracking on each document and knows to update document instead of save a new one. 
        // There are others ways availbale to do this https://masteringjs.io/tutorials/mongoose/update
        await placeToUpdate.save()

    } catch (error) {
        return next(
            new HttpError(error, 500)
        )
    }

    res.status(200).json({ place: [placeToUpdate.toObject({ getters: true })] })

}

const deletePlaceById = async (req, res, next) => {

    const placeId = req.params.pid
    let placeToDelete;

    try {

        // Populate, instead of only returning creator ref id, populate will return the entire document associated with the id
        // TLDR Returns place and 'creator' property will have access to document that matches it's _id  https://stackoverflow.com/questions/38051977/what-does-populate-in-mongoose-mean
        placeToDelete = await Place.findById(placeId).populate('creator')


    } catch (error) {

        return next(
            new HttpError('Something went wrong, failed deleting place', 500)
        )

    }

    if (!placeToDelete) {
        return next(
            new HttpError('Failed to find place to delete', 404)
        )
    }

    // Make sure only user that made place can delete the place
    if (placeToDelete.creator.id !== req.userData.userID) {
        const error = new HttpError('Users can only delete places they added', 401);
        return next(error)
    }

    const imagePath = placeToDelete.image

    try {

        // TODO Understand this better

        // Start session to start transaction
        const sess = await mongoose.startSession();
        sess.startTransaction();

        // Remove place to delete from Places collection and refer to current session
        await placeToDelete.remove({ session: sess });

        // For the places property in the found user document, pull place we need to delete
        // pull will behind the scenes establish connection between the models, 
        // pull then grabs placeToDelete unique id to know what document to remove from our users places (Check User schema)
        placeToDelete.creator.places.pull(placeToDelete);

        // Update user(creator) with new place array with the place removed using save()
        // ** NOTE Because I populated creator (look above) I have access to user model through creator from place models reference
        await placeToDelete.creator.save({ session: sess })

        // All changes will be saved here, or cancelled if one fails
        await sess.commitTransaction();

    } catch (error) {

        return next(
            new HttpError('Failed to delete place', 500)
        )

    }

    // deletes files with path
    fs.unlink(imagePath, err => {
        console.log(`Error deleting image`, err)
    })

    res.status(200).json({ message: 'Deleted Place' })

}

// module.exports would export 1 thing 
// This will export multiple things as one object
exports.createPlace = createPlace
exports.getPlaceById = getPlaceById
exports.getPlaceByUserId = getPlaceByUserId
exports.updatePlaceById = updatePlaceById
exports.deletePlaceById = deletePlaceById
