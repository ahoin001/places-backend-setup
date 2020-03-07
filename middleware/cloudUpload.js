const cloudinary = require('cloudinary');
const cloudinaryStorage = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary object to use proper account
cloudinary.config({
    cloud_name: process.env.cloud_name,
    api_key: process.env.api_key,
    api_secret: process.env.api_secret
});

// Tell multer where to store files
const storage = cloudinaryStorage({
    cloudinary: cloudinary,
    folder: 'PLACES',
    allowedFormats: ['jpg', 'png', 'jpeg'],
    // filename: function (req, file, cb) {
    //     cb(undefined, 'my-file-name');
    // }
});

let uploadToCloudinary = multer({ storage: storage });

module.exports = uploadToCloudinary