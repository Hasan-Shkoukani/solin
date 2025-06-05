require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/document');
const aiRoutes = require('./routes/ai');
const uploadRoutes = require('./routes/upload');
const userRoutes = require('./routes/user');
const timetableRoutes = require('./routes/timetable');
const calendarRoutes = require('./routes/calendar');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB connection error:", err));

// Ensure uploads directory exists
if (!fs.existsSync('uploads/profiles')) {
    fs.mkdirSync('uploads/profiles', { recursive: true });
}

// Add this BEFORE your route definitions
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);  // <-- FIXED LINE
app.use('/api/documents', documentRoutes);
app.use('/api/ai', aiRoutes);  // FIXED: Add API prefix for AI routes
app.use('/api/upload', uploadRoutes); // FIXED: Add API prefix for upload routes
app.use('/api/user', userRoutes); // <-- add this line after other app.use
app.use('/api/timetable', timetableRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/uploads', express.static('uploads'));  // <-- Serve uploaded files

app.get('/', (req, res) => {
    res.send('RUNNING');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Ensure courses directory exists
if (!fs.existsSync('courses')) {
  fs.mkdirSync('courses', { recursive: true });
}
