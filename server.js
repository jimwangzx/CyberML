const express = require("express");
const speakeasy = require("speakeasy");
const uuid = require("uuid");
const { JsonDB } = require("node-json-db");
const { Config } = require("node-json-db/dist/lib/JsonDBConfig");

const app = express();
const PORT = process.env.PORT || 5000;
const db = new JsonDB(new Config("2FAPlayground", true, false, "/"));

// Middleware
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "2FA Server Playground!",
  });
}); // Test Route

app.post("/api/register", (req, res) => {
  const id = uuid.v4();
  try {
    const path = `/user/${id}`;
    const tempSecret = speakeasy.generateSecret();
    db.push(path, { id, tempSecret });
    res.json({ id, secret: tempSecret.base32 });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error Generating the Secret!",
    });
  }
}); // Register User in DB + Create Temporary Secret for each User

app.post("/api/verify", (req, res) => {
  const { userId, token } = req.body;
  try {
    const path = `/user/${userId}`;
    const user = db.getData(path);
    const { base32: secret } = user.tempSecret;
    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
    });

    if (verified) {
      db.push(path, { id: userId, secret: user.tempSecret });
      res.json({ verified: true });
    } else {
      res.json({ verified: false });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error Finding the User!",
    });
  }
}); // Verifying the Token from Authenticator

app.post("/api/validate", (req, res) => {
  const { userId, token } = req.body;
  try {
    const path = `/user/${userId}`;
    const user = db.getData(path);
    const { base32: secret } = user.secret;
    const validates = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (validates) {
      res.json({ validated: true });
    } else {
      res.json({ validated: false });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error Finding the User!",
    });
  }
}); // Validating the Token from Authenticator

app.listen(PORT, () => console.log(`Server Running on Port: ${PORT}`));
