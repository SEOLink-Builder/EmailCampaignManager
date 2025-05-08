/**
 * Admin middleware
 * Verifies that the authenticated user has admin role
 * Should be used after the auth middleware
 */

module.exports = function(req, res, next) {
  try {
    // Check if user exists and has admin role
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // User is admin, proceed
    next();
  } catch (err) {
    console.error('Admin middleware error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};