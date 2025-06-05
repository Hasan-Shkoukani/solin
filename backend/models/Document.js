const mongoose = require('mongoose');

const ContentBlockSchema = new mongoose.Schema({
  type: { type: String, required: true },
  content: { type: mongoose.Schema.Types.Mixed, required: true },
  fontSize: Number,
  color: String,
  _id: { type: String, required: true }
}, { _id: false });

const SharedUserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  accessType: { type: String, enum: ['edit'], default: 'edit' },
  sharedAt: { type: Date, default: Date.now },
  deleted: { type: Boolean, default: false } // Add this field
});

const DocumentSchema = new mongoose.Schema({
  title: String,
  description: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contentBlocks: [ContentBlockSchema],
  sharedWith: [SharedUserSchema],
  linkShareEnabled: { type: Boolean, default: false }, // For read-only link sharing
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Document', DocumentSchema);