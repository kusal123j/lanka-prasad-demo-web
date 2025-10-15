// middlewares/auth.js
const userAuth = (roles = []) => {
  return (req, res, next) => {
    if (!req.session) {
      console.error("Session not found!");
      return res
        .status(500)
        .json({ success: false, message: "Session not initialized" });
    }
    const sessionUser = req.session.user;

    if (!sessionUser || !sessionUser.id) {
      return res.json({
        success: false,
        message: "User not authenticated, login again",
      });
    }
    // ✅ Role check only if roles were provided
    if (roles.length > 0 && !roles.includes(sessionUser.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    req.userId = sessionUser.id; // Same as before
    next();
  };
};
export default userAuth;
