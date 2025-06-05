const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    password: {
        type: String,
        required: true
    },
    profileImage: {
        type: String,
        default: null
    },
    avatarText: {
        type: String,
        default: function() {
            return this.name ? this.name.charAt(0).toUpperCase() : 'U';
        }
    },
    courses: {
        type: [String],
        default: []
    }
});

module.exports = mongoose.model('User', userSchema);
