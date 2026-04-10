import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ message: "No token, access denied" });
    }

    // remove "Bearer "
    const actualToken = token.split(" ")[1];

    const decoded = jwt.verify(actualToken, "secretkey");

    req.user = decoded; // attach user data

    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const isAdmin = (req, res, next) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access only" });
      }
      next();
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

export default authMiddleware;