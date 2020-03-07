// ** TODO NOTE throwing error does not work in async tasks, must use next

const { validationResult } = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const HttpError = require('../models/http-error')
const User = require('../models/user')


const getUsers = async (req, res, next) => {

    let users;

    try {

        // Return users without password property
        users = await User.find({}, '-password')

        // Only returns email and name with each user
        // const users = await User.find({},'email name')

    } catch (err) {

        return next(new new HttpError('Failed fetching users, please try again later', 500))

    }

    res.status(200).json({ users: users.map(user => user.toObject({ getters: true })) })

}

const signup = async (req, res, next) => {

    // console.log('REQ.FILE&&&&&&&&',req.file)
    // Make sure user inputs are valid
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        res.status(402)
        return next(
            new HttpError('Invalid sign up information, please check your data', 422)
        )
    }

    const { name, email, password } = req.body;

    let exsistingUser;
    try {

        // Check if a user already has this email
        exsistingUser = await User.findOne({ email: email })

    } catch (err) {
        const error = new HttpError('Sign up failed please check information.', 500)
        return next(error)
    }

    if (exsistingUser) {
        const error = new HttpError('User with this email already exsists, please log in instead', 422)
        return next(error)
    }


    // Encrypt password provided by user
    let hashedPassword;

    // * Second argument is how many "rolls" on password to increase strength , but make longer to decrypt later
    try {
        hashedPassword = await bcrypt.hash(password, 12)
    } catch (error) {
        return next(new HttpError('Failed hashing password', 500))
    }

    // Places will automatically be added when a place is created by a user
    const createdUser = new User({
        name,
        email,
        image: req.file.url,
        password: hashedPassword,
        places: []

    })

    try {

        // Save user to database
        await createdUser.save()

    } catch (error) {

        error = new HttpError('Sign up failed, please try again.', 500);
        // use next to stop code excecution
        return next(error)

    }


    // * NOTE Creating jsonwebtoken 
    let token;
    try {

        // Issue maybe here with id (__id if getter didn't set in creating user)
        token = jwt.sign(
            { userId: createdUser.id, email: createdUser.email },
            process.env.JWT_PRIVATE_KEY,
            { expiresIn: '1h' } // third argument is config object with properties we can change values of 
        )
    } catch (error) {
        error = new HttpError('Sign up failed, please try again.', 500);
        // use next to stop code excecution
        return next(error)
    }

    // Can send back anything
    res.status(201).json({ userId: createdUser.id, email: createdUser.email, token: token })

    // return object with user data that can be used
    // res.status(201).json({ user: createdUser.toObject({ getters: true }) })

}

const login = async (req, res, next) => {

    const { email, password } = req.body;

    // First fin any user witht the email
    let exsistingUser;
    try {

        // Check if a user already has this email
        exsistingUser = await User.findOne({ email: email })

    } catch (err) {
        const error = new HttpError('Login failed, please try again later.', 500)
        return next(error)
    }

    if (!exsistingUser) {
        return next(new HttpError('Login failed,invalid email ', 403))
    }

    let isValidPassword;

    try {

        // Use Bcrypt to compare provided password to encrypted passwords, returns boolean
        isValidPassword = await bcrypt.compare(password, exsistingUser.password)

    } catch (error) {
        return next(new HttpError('Login failed, inavalid credentials ', 500))
    }

    // TODO Why is this ! here?
    if (!isValidPassword) {
        return next(new HttpError('Login failed, inavalid password ', 403))
    }

    // * NOTE Creating jsonwebtoken 
    let token;
    try {

        // Issue maybe here with id (__id if getter didn't set in creating user)
        token = jwt.sign(
            { userId: exsistingUser.id, email: exsistingUser.mail },
            process.env.JWT_PRIVATE_KEY, //private key must be same in login at is in sign up
            { expiresIn: '1h' } // third argument is config object with properties we can change values of 
        )
    } catch (error) {
        error = new HttpError('Login failed, please try again.', 500);
        // use next to stop code excecution
        return next(error)
    }

    console.log(`*********************`, token)
    //  console.log(`*********************`,exsistingUser.id)

    res.status(201).json({ userId: exsistingUser.id, email: exsistingUser.email, token: token })

}

const deleteUser = async (req, res, next) => {

    const userId = req.params.pid
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

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;

