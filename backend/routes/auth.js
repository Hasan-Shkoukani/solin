const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Register Route
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        if (!email || !password || !name) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        console.log("hello");
        
        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: "Email already registered" });
        }

        if (!email.endsWith("neu.edu.tr")) {
            return res.status(400).json({ message: "Email format is not supported, must end with: neu.edu.tr" });
        }

        const hashed = await bcrypt.hash(password, 10);

        const newUser = new User({
            name, email, password: hashed
        });

        await newUser.save();
        res.status(201).json({ message: "User Registered Successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Server Error!" });
    }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign(
        { 
          id: user._id,  // Changed from _id to id
          email: user.email 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          profileImage: user.profileImage
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;