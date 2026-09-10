const express = require("express");
const { all } = require("../db");
const { authenticate } = require("../lib/auth");

const router = express.Router();
router.use(authenticate);

// Directory of active staff — used for the new-DM picker and @mention
// autocomplete. Deliberately not admin-only: any active staff member
// needs to see who else is on the team to message them.
router.get("/", (req, res) => {
  const users = all(
    "SELECT id, name, email, role FROM users WHERE status = 'ACTIVE' ORDER BY name ASC"
  );
  res.json({ users });
});

module.exports = router;
