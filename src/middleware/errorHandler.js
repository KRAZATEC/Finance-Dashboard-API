// errorHandler.js — a catch-all Express error handler.
// Sits at the very end of the middleware chain so any unhandled error
// from a route or controller lands here instead of crashing the process.

function errorHandler(err, req, res, next) {
  // Log the full stack in development so it's easy to debug
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${new Date().toISOString()}] Unhandled error on ${req.method} ${req.path}:`);
    console.error(err.stack || err);
  }

  // If the response has already started streaming, Express needs us to delegate
  if (res.headersSent) {
    return next(err);
  }

  // Try to preserve a meaningful status code; fall back to 500
  const status = err.status || err.statusCode || 500;
  const message = status < 500
    ? err.message
    : 'Something went wrong on our end. Please try again later.';

  return res.status(status).json({ error: message });
}

module.exports = errorHandler;
