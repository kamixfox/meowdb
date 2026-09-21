import jwt from "jsonwebtoken";

const JWT_SECRET = () => process.env.JWT_SECRET;

export async function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET(), { expiresIn: "7d" });
}

export async function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET());
}
