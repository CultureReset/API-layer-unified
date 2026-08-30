// Express 4 doesn't forward a rejected promise to error-handling middleware
// on its own — without this, a thrown ApiError inside an async route
// handler would just hang the request. Every route handler in this repo
// gets wrapped in this once, here, instead of each file remembering its own
// try/catch.

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { asyncHandler };
