import bcrypt from "bcrypt";

export async function hashPassword(password) {
  const saltRounds = 12; // Bigger = secure... er...
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
