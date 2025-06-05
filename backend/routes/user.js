const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Update the multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads', 'profiles');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `${uniqueSuffix}${path.extname(file.originalname) || '.jpg'}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        // Accept all image types
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Get user info
router.get('/info', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      username: user.name,
      email: user.email,
      profileImage: user.profileImage || null
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching user info" });
  }
});

// Change username
router.put('/username', authMiddleware, async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ message: "Username required" });
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.name = username;
    await user.save();
    res.json({ message: "Username updated" });
  } catch (err) {
    res.status(500).json({ message: "Error updating username" });
  }
});

// Change password
router.put('/password', authMiddleware, async (req, res) => {
  const { password, newPassword } = req.body;
  if (!password || !newPassword) return res.status(400).json({ message: "Both passwords required" });
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Current password incorrect" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password updated" });
  } catch (err) {
    res.status(500).json({ message: "Error updating password" });
  }
});

// Delete account
router.delete('/', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting account" });
  }
});

// Update the profile image route
router.put('/profile-image', authMiddleware, (req, res) => {
    upload.single('profileImage')(req, res, async (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({
                success: false,
                message: err.message || 'Upload failed'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        try {
            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Delete old profile image if it exists
            if (user.profileImage) {
                const oldPath = path.join(__dirname, '..', user.profileImage.replace(/^\/uploads/, 'uploads'));
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }

            // Update with new image path
            const profileImagePath = `/uploads/profiles/${req.file.filename}`;
            user.profileImage = profileImagePath;
            await user.save();

            res.json({
                success: true,
                profileImage: profileImagePath,
                message: 'Profile image updated successfully'
            });
        } catch (error) {
            console.error('Profile update error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update profile image'
            });
        }
    });
});

// Get user courses
router.get('/courses', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id); // <-- use _id
    res.json({ courses: user.courses });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch courses.' });
  }
});

// Update user courses (add/remove/edit)
router.put('/courses', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { courses } = req.body;
    
    if (!Array.isArray(courses)) {
      return res.status(400).json({ message: "Courses must be an array." });
    }

    // Update user's courses in DB
    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { courses }, 
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send response
    res.json({ 
      success: true, 
      courses: updatedUser.courses,
      message: "Courses updated successfully" 
    });

  } catch (err) {
    console.error('Course update error:', err);
    res.status(500).json({ message: "Failed to update courses." });
  }
});

module.exports = router;