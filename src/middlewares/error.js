export function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Not Found - ${req.originalUrl}`));
}

export function errorHandler(err, req, res, next) {
  // eslint-disable-line
  const status =
    res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  
  // Log chi tiết lỗi trong development
  if (process.env.NODE_ENV !== 'production') {
    console.error('❌ Error Handler:', {
      message: err.message,
      status,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });
  }
  
  res.status(status).json({
    success: false,
    message: err.message || 'Server error',
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
}
