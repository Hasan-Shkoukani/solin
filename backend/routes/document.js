const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Create a new document (POST /api/documents)
router.post('/', authMiddleware, async (req, res) => {
  const { title, contentBlocks } = req.body;
  const userId = req.user._id;
  console.log("logging in")
  try {
    const document = new Document({
      title,
      contentBlocks: contentBlocks || [],
      owner: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await document.save();

    res.status(201).json(document);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error creating document" });
  }
});

// Get all documents for a user (GET /api/documents/user/:userId)
router.get('/user/:userId', authMiddleware, async (req, res) => {
    const { userId } = req.params;
    try {
        // Get owned documents
        const ownedDocuments = await Document.find({ owner: userId });
        
        // Get shared documents (excluding deleted ones)
        const user = await User.findById(userId);
        const sharedDocuments = await Document.find({
            'sharedWith': {
                $elemMatch: {
                    email: user.email,
                    deleted: { $ne: true } // Only get non-deleted shares
                }
            }
        });

        // Combine and send both
        const documents = [
            ...ownedDocuments.map(doc => ({
                ...doc.toObject(),
                accessType: 'owner'
            })),
            ...sharedDocuments.map(doc => ({
                ...doc.toObject(),
                accessType: doc.sharedWith.find(s => s.email === user.email)?.accessType
            }))
        ];

        res.status(200).json(documents);
    } catch (error) {
        console.error('Fetch documents error:', error);
        res.status(500).json({ message: "Error fetching documents." });
    }
});

// Get a single document by ID (GET /api/documents/:id)
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    res.status(200).json(document);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching document." });
  }
});

// Update a document
router.put('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { title, contentBlocks } = req.body; // <-- add contentBlocks here
    const userId = req.user._id.toString();

    try {
        const document = await Document.findById(id);
        if (!document) {
            return res.status(404).json({ 
                success: false, 
                message: "Document not found" 
            });
        }

        const isOwner = document.owner.toString() === userId;
        if (!isOwner) {
            return res.status(403).json({ 
                success: false, 
                message: "You can't update a document you don't own" 
            });
        }

        document.title = title;
        if (contentBlocks) {
            document.contentBlocks = contentBlocks; // <-- update contentBlocks
        }
        document.updatedAt = new Date();
        await document.save();

        res.status(200).json({
            success: true,
            message: "Document updated successfully",
            document
        });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ 
            success: false, 
            message: "Error updating document" 
        });
    }
});

// Delete a document
router.delete('/:id', authMiddleware, async (req, res) => {
    console.log('Delete route hit with ID:', req.params.id);
    console.log('User making request:', req.user);

    try {
        // First check if document exists
        const document = await Document.findById(req.params.id);
        
        if (!document) {
            console.log('Document not found:', req.params.id); // Debug log
            return res.status(404).json({
                success: false,
                message: "Document not found"
            });
        }

        // Check ownership
        console.log('Document owner:', document.owner); // Debug log
        console.log('Request user:', req.user._id); // Debug log
        
        const isOwner = document.owner.toString() === req.user._id.toString();
        
        if (!isOwner) {
            console.log('Unauthorized delete attempt'); // Debug log
            return res.status(403).json({
                success: false,
                message: "You don't have permission to delete this document"
            });
        }

        // Perform deletion
        await Document.findByIdAndDelete(req.params.id);
        
        console.log('Document successfully deleted:', req.params.id); // Debug log
        
        return res.status(200).json({
            success: true,
            message: "Document deleted successfully",
            deletedId: req.params.id
        });

    } catch (error) {
        console.error('Error in delete route:', error); // Debug log
        return res.status(500).json({
            success: false,
            message: "Error deleting document",
            error: error.message
        });
    }
});

// CRUD operations for contentBlocks

// Create a contentBlock
router.post('/:id/contentBlocks', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { type, content } = req.body;
    const userId = req.user._id; // Changed from req.user.id

    try {
        const document = await Document.findById(id);
        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        const isOwner = document.owner.toString() === userId;
        if (!isOwner) {
            return res.status(403).json({ message: "You can't add content blocks to a document you don't own" });
        }

        const newContentBlock = {
            type,
            content
        };

        document.contentBlocks.push(newContentBlock);
        await document.save();

        res.status(201).json({
            message: "Content block created successfully!",
            document
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error creating content block" });
    }
});

// Update a specific contentBlock
router.put('/:documentId/contentBlocks/:contentBlockId', authMiddleware, async (req, res) => {
    const { documentId, contentBlockId } = req.params;
    const { type, content } = req.body;
    const userId = req.user._id; // Changed from req.user.id

    try {
        const document = await Document.findById(documentId);
        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        const isOwner = document.owner.toString() === userId;
        if (!isOwner) {
            return res.status(403).json({ message: "You can't update content blocks in a document you don't own" });
        }

        const contentBlock = document.contentBlocks.id(contentBlockId);
        if (!contentBlock) {
            return res.status(404).json({ message: "Content block not found" });
        }

        contentBlock.type = type || contentBlock.type;
        contentBlock.content = content || contentBlock.content;
        document.updatedAt = new Date();

        await document.save();

        res.status(200).json({
            message: "Content block updated successfully",
            document
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error updating content block" });
    }
});

// Delete a specific contentBlock
router.delete('/:documentId/contentBlocks/:contentBlockId', authMiddleware, async (req, res) => {
    const { documentId, contentBlockId } = req.params;
    const userId = req.user._id; // Changed from req.user.id
    try {
        const document = await Document.findById(documentId);
        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        const isOwner = document.owner.toString() === userId;
        if (!isOwner) {
            return res.status(403).json({ message: "You can't delete content blocks from a document you don't own" });
        }

        const contentBlock = document.contentBlocks.id(contentBlockId);
        if (!contentBlock) {
            return res.status(404).json({ message: "Content block not found" });
        }

        contentBlock.remove();
        document.updatedAt = new Date();

        await document.save();

        res.status(200).json({
            message: "Content block deleted successfully",
            document
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error deleting content block" });
    }
});

// Share document with a user (read or edit)
router.post('/:id/share', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { email, accessType } = req.body;
  if (!email || !accessType) return res.status(400).json({ success: false, message: "Email and accessType required" });

  try {
    const document = await Document.findById(id);
    if (!document) return res.status(404).json({ success: false, message: "Document not found" });

    // Only owner can share
    if (document.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the owner can share this document" });
    }

    // Check if user exists
    const sharedUser = await User.findOne({ email });
    if (!sharedUser) return res.status(404).json({ success: false, message: "User not found" });

    // Update or add sharing
    const existing = document.sharedWith.find(u => u.email === email);
    if (existing) {
      existing.accessType = accessType;
    } else {
      document.sharedWith.push({ email, accessType });
    }
    await document.save();

    res.json({ success: true, message: "Document shared", sharedWith: document.sharedWith });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update sharing access
router.put('/:id/share', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { email, accessType } = req.body;
  if (!email || !accessType) return res.status(400).json({ success: false, message: "Email and accessType required" });

  try {
    const document = await Document.findById(id);
    if (!document) return res.status(404).json({ success: false, message: "Document not found" });

    if (document.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the owner can update sharing" });
    }

    const shared = document.sharedWith.find(u => u.email === email);
    if (!shared) return res.status(404).json({ success: false, message: "User not shared with this document" });

    shared.accessType = accessType;
    await document.save();

    res.json({ success: true, message: "Access updated", sharedWith: document.sharedWith });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Remove sharing
router.delete('/:id/share', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "Email required" });

  try {
    const document = await Document.findById(id);
    if (!document) return res.status(404).json({ success: false, message: "Document not found" });

    if (document.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the owner can remove sharing" });
    }

    document.sharedWith = document.sharedWith.filter(u => u.email !== email);
    await document.save();

    res.json({ success: true, message: "Access removed", sharedWith: document.sharedWith });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update the content update route
router.put('/:id/content', authMiddleware, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const user = await User.findById(req.user._id);
    
    // Check if user has edit access
    const hasEditAccess = 
      document.owner.toString() === req.user._id.toString() || 
      document.sharedWith.some(share => 
        share.email === user.email && 
        share.accessType === 'edit' &&
        !share.deleted
      );

    if (!hasEditAccess) {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to edit this document" 
      });
    }

    // Update the content blocks
    document.contentBlocks = req.body.contentBlocks;
    document.updatedAt = Date.now();
    await document.save();

    return res.json({
      success: true,
      message: "Content updated successfully"
    });

  } catch (error) {
    console.error('Content update error:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to update content"
    });
  }
});

// Update the remove access route
router.put('/:id/removeAccess', authMiddleware, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const user = await User.findById(req.user._id);
    const sharedUserIndex = document.sharedWith.findIndex(u => u.email === user.email);

    if (sharedUserIndex === -1) {
      return res.status(404).json({ success: false, message: "Share access not found" });
    }

    // Remove the user from sharedWith array
    document.sharedWith.splice(sharedUserIndex, 1);
    await document.save();

    return res.status(200).json({
      success: true,
      message: "Successfully removed access"
    });
  } catch (error) {
    console.error('Remove access error:', error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;