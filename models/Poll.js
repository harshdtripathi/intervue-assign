const mongoose = require("mongoose");

const pollSchema = new mongoose.Schema({
  question: String,
  options: [
    {
      text: String,
      isCorrect: Boolean,
      votes: { type: Number, default: 0 }
    }
  ],
  startTime: Date,
  active: { type: Boolean, default: true },
  roomId: String
});

module.exports = mongoose.model("Poll", pollSchema);
