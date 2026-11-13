export function requireRequestOrigin(uiOrigin) {
  return (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.get('origin') !== uiOrigin) {
      return res.status(403).json({ error: 'Request origin is not allowed' });
    }
    return next();
  };
}
