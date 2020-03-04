const HttpError = require('../models/http-error.js')
const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {

    // Browser sends this request first, so allow it before blocking requests
    if (req.method === 'OPTIONS') {
        return next()
    }

    try {

        // req.headers provided by express, authorization header has token 
        // ex/  Authorization: 'Bearer ' + auth.token ( Bearer is just for naming convention)
        const token = req.headers.authorization.split(' ')[1]

        if (!token) {
            throw new Error('Token could not be authorized !')
        }

        //  * NOTE Verify token, using private key created when creating token, 
        // returns payload encoded into token (Check sign up/login controller)
        const decodedToken = jwt.verify(token, process.env.JWT_PRIVATE_KEY)
        // console.log(`!!!!!!!!!!!!!! DCTOKEN: `, decodedToken)

        // add userData property to add token to request object
        req.userData = { userID: decodedToken.userId }

        next()

    } catch (error) {
        return next(new HttpError('Authentication failed'))
    }



}