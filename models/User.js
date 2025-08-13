const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  socketId: String,
  role: { type: String, enum: ["teacher", "student"], default: "student" },
  roomId: String
});

module.exports = mongoose.model("User", userSchema);
