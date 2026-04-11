import User   from "../models/User.js";
import bcrypt from "bcryptjs";

/**
 * Seeds the single admin account from environment variables.
 * Only creates it if NO admin exists yet — so it's safe to call on
 * every startup without duplicating or overwriting.
 *
 * Required env vars:
 *   ADMIN_EMAIL    — email for the admin account
 *   ADMIN_PASSWORD — password for the admin account
 *   ADMIN_NAME     — display name (optional, defaults to "Admin")
 */
export const seedAdmin = async () => {
  const email    = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name     = process.env.ADMIN_NAME || "Admin";

  if (!email || !password) {
    console.log("ℹ️  ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin seed.");
    console.log("   Set them in .env to auto-create the admin account on first run.");
    return;
  }

  // Check if any admin exists already
  const existingAdmin = await User.findOne({ role: "admin" });
  if (existingAdmin) {
    console.log(`✅ Admin account exists: ${existingAdmin.email}`);
    return;
  }

  // Check if the email is already taken by a student — upgrade them
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    existingUser.role = "admin";
    existingUser.name = name;
    existingUser.password = await bcrypt.hash(password, 10);
    await existingUser.save();
    console.log(`✅ Existing account ${email} upgraded to admin.`);
    return;
  }

  // Create fresh admin
  const hashed = await bcrypt.hash(password, 10);
  await User.create({ name, email, password: hashed, role: "admin" });
  console.log(`✅ Admin account created: ${email}`);
};