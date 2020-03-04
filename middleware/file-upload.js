const multer = require('multer')
const uuid = require('uuid/v1')

// TODO Learn about this data strcuture 
const MIME_TYPE_MAP = {
    "image/png": "png",
    "image/jpeg": "jpeg",
    "image/jpg": "jpg"
}

// result of function will be file upload middlewares to use in routes, we pass object to configure it
const fileUpload = multer({

    limits: 500000,
    storage: multer.diskStorage({ //storage describes how data should be stored
        destination: (req, file, cb) => {

            // path to where file is stored
            cb(null, "uploads/images")
        }
        ,
        filename: (req, file, cb) => { // decide how file should be named

            // using files mimetype, compare to our map to get proper extension 
            const ext = MIME_TYPE_MAP[file.mimetype];

            // How filenames will be formatted
            cb(null, uuid() + '.' + ext)

        }

    }),

    // Prevent files that aren't in our acceptable mimetype
    fileFilter: (req, file, cb) => {

        // The!! converts anything to a boolean of true or false
        const isValid = !!MIME_TYPE_MAP[file.mimetype]

        let error = isValid ? null : new Error('Invalid file type!')

        cb(error, isValid)

    }

})

module.exports = fileUpload