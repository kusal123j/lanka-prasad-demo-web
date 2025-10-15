import userModel from "../models/userModel.js";

const EducatorAuth = async (req, res, next) => {
  const sessionUser = req.session.user;

  if (!sessionUser || !sessionUser.id) {
    return res
      .status(401)
      .json({ success: false, message: "User not authenticated, login again" });
  }

  req.userId = sessionUser.id; // Same as before
  const adminuser = await userModel.findById(sessionUser.id);
  if (adminuser.isAdmin) {
    next();
  } else {
    return res
      .status(403)
      .json({ success: false, message: "Access denied, Not an Admin" });
  }
};

export default EducatorAuth;
