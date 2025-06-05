const express = require("express");
const router = express.Router();
const CalendarEvent = require("../models/CalendarEvent");
const authMiddleware = require('../middleware/authMiddleware');

// Add authMiddleware to all routes
router.use(authMiddleware);

// GET user's events
router.get("/", async (req, res) => {
  try {
    const events = await CalendarEvent.find({ owner: req.user._id });
    res.json({ events });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch events." });
  }
});

// POST (save events)
router.post("/", async (req, res) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events)) {
      return res.status(400).json({ message: "Invalid events array." });
    }

    // Clean events data and add owner
    const cleanedEvents = events.map(event => ({
      owner: req.user._id,
      title: event.title,
      day: event.day,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location || '',
      color: event.color,
      type: event.type
    }));

    // Remove all existing events for this user and insert new ones
    await CalendarEvent.deleteMany({ owner: req.user._id });
    const savedEvents = await CalendarEvent.insertMany(cleanedEvents);
    res.json({ events: savedEvents });
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ message: "Failed to save events." });
  }
});

// PUT (edit event)
router.put("/:id", async (req, res) => {
  try {
    const { title, day, startTime, endTime, location, color, type } = req.body;
    
    // Ensure user owns the event
    const event = await CalendarEvent.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const updated = await CalendarEvent.findByIdAndUpdate(
      req.params.id,
      { title, day, startTime, endTime, location, color, type },
      { new: true }
    );
    
    res.json(updated);
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ message: "Failed to update event." });
  }
});

// DELETE (delete one event)
router.delete("/:id", async (req, res) => {
  try {
    // Ensure user owns the event
    const event = await CalendarEvent.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    await CalendarEvent.findByIdAndDelete(req.params.id);
    res.json({ message: "Event deleted." });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete event." });
  }
});

module.exports = router;