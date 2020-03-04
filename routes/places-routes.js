const express = require('express')

// Returns Router Object from express object
const router = express.Router()

// Multer storage and file handling configuration I created 
const fileUpload = require('../middleware/file-upload')

const checkAuth = require('../middleware/check-auth')

// Import specific middleware from package 
const { check } = require('express-validator')

// Business Logic functions
const placesControllers = require('../controller/places-controller')

/*
    Place CRUD Routes
*/

router.get('/:pid', placesControllers.getPlaceById);

router.get('/user/:uid', placesControllers.getPlaceByUserId);

// Require token for authorization for any routes after this point
router.use(checkAuth)

// Add validation checks on request
router.post(
    '/',
    fileUpload.single('image'),
    [
        check('title')
            .not()
            .isEmpty(),
        check('description').isLength({ min: 5 }),
        check('address')
            .not()
            .isEmpty()
    ],
    placesControllers.createPlace
);


router.patch('/:pid',
    [
        check('title')
            .not()
            .isEmpty(),
        check('description')
            .isLength({ min: 5 })
    ],
    placesControllers.updatePlaceById
)

router.delete('/:pid', placesControllers.deletePlaceById);
// Export Router Object that has our routes
module.exports = router