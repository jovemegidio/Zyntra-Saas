/**
 * Request-ID Tracing Middleware
 * Generates or propagates a unique request ID for end-to-end tracing.
 * Sets X-Request-Id header on response and attaches req.requestId.
 */
const { v4: uuidv4 } = require('uuid');

function requestIdMiddleware() {
    return (req, res, next) => {
        const incoming = req.headers['x-request-id'];
        const requestId = incoming && /^[\w-]{8,128}$/.test(incoming) ? incoming : uuidv4();
        req.requestId = requestId;
        res.setHeader('X-Request-Id', requestId);
        next();
    };
}

module.exports = { requestIdMiddleware };
