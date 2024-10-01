const errorMiddleware = ( req, res, next) => {
    // Set default status code to 500 for server errors
    const statusCode = err.statusCode || 500;

    // Determine the error message
    const message = err.message || 'Internal Server Error';

    // Log the error stack in development mode for debugging
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }

    // Send the error response
    res.status(statusCode).json({
        success: false,
        error: {
            message,
            statusCode,
            // Include error stack in the response in development mode
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
    });
};


const errorHandler = (err, req, res, next) => {
    // Set default status code to 500 for server errors
    const statusCode = err.statusCode || 500;

    // Determine the error message
    const message = err.message || 'Internal Server Error';

    // Log the error stack in development mode for debugging
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }

    // Send the error response
    res.status(statusCode).json({
        success: false,
        error: {
            message,
            statusCode,
            // Include error stack in the response in development mode
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
    });
};

module.exports = {errorMiddleware,errorHandler}

