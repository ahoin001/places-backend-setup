const express = require('express')
const router = express.Router();

const { check } = require('express-validator')
const fileUpload = require('../middleware/file-upload')
const usersControllers = require('../controller/users-controller')

router.get('/', usersControllers.getUsers)

// .single middleware to expect a single file with the name image
router.post(
    '/signup',
    fileUpload.single('image'), // image is key used to find file in post request body object
    [
        check('name')
            .not()
            .isEmpty(),
        check('email')
            .normalizeEmail()
            .isEmail(),
        check('password').isLength({ min: 5 }),

    ], usersControllers.signup
)

router.post('/login', usersControllers.login);

module.exports = router