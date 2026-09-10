require("dotenv").config();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { get, run } = require("./index");

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();
  const name = process.env.ADMIN_NAME || "Admin";
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";

  let admin = get("SELECT * FROM users WHERE email = ?", [email]);
  if (admin) {
    console.log(`Admin ${email} already exists — skipping.`);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    run("INSERT INTO users (id, email, name, password_hash, role, status) VALUES (?, ?, ?, ?, 'ADMIN', 'ACTIVE')", [
      id,
      email,
      name,
      passwordHash,
    ]);
    admin = get("SELECT * FROM users WHERE id = ?", [id]);
    console.log(
      `Created admin account:\n  email: ${email}\n  password: ${password}\n(change this password after first login)`
    );
  }

  const general = get("SELECT * FROM channels WHERE name = 'general'");
  if (!general) {
    const id = crypto.randomUUID();
    run("INSERT INTO channels (id, name, description) VALUES (?, 'general', 'Team-wide announcements and chat')", [
      id,
    ]);
    run("INSERT INTO channel_members (id, channel_id, user_id) VALUES (?, ?, ?)", [
      crypto.randomUUID(),
      id,
      admin.id,
    ]);
    console.log("Created #general channel.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
