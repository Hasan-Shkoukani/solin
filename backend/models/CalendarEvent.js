const mongoose = require("mongoose");

const CalendarEventSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: String,
  day: String,
  startTime: String,
  endTime: String,
  location: String,
  color: String,
  type: { type: String, enum: ["event", "course"] }
});

module.exports = mongoose.model("CalendarEvent", CalendarEventSchema);