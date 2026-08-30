// One error type, one shape, for every route in this repo — replaces the
// repeated `if (error) return res.status(500).json({ error: error.message })`
// that was creeping into every route file slightly differently. A route
// throws one of these (or lets a Supabase error bubble as a plain Error,
// caught as 500 by the middleware in server.js) instead of hand-rolling a
// status code inline.

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = {
  ApiError,
  badRequest: (msg) => new ApiError(400, msg),
  unauthorized: (msg) => new ApiError(401, msg),
  forbidden: (msg) => new ApiError(403, msg),
  notFound: (msg) => new ApiError(404, msg),
  conflict: (msg) => new ApiError(409, msg),
};
