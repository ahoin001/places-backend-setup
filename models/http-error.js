// Extends Error so it can access its properties
class HttpError extends Error {
    constructor(message, errorCode) {
        super(message); // Add a message property

        // So we can return 404's 500's etc
        this.code = errorCode
    }

}

module.exports = HttpError