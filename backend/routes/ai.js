const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const User = require('../models/User');
const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const textract = require('textract');
const Tesseract = require('tesseract.js');
const authMiddleware = require('../middleware/authMiddleware');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Function to extract text from images
async function extractTextFromImage(imagePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(
      imagePath,
      'eng',
      { logger: m => console.log(m) }
    );
    return text;
  } catch (error) {
    console.error(`Error extracting text from image ${imagePath}:`, error);
    return '';
  }
}

// Function to extract text from different file types
async function extractTextFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  try {
    switch (ext) {
      case '.pdf':
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdf(dataBuffer);
        return pdfData.text;
        
      case '.docx':
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
        
      case '.pptx':
        return new Promise((resolve, reject) => {
          textract.fromFileWithPath(filePath, (error, text) => {
            if (error) reject(error);
            else resolve(text);
          });
        });
        
      case '.jpg':
      case '.jpeg':
      case '.png':
        return await extractTextFromImage(filePath);
        
      default:
        return '';
    }
  } catch (error) {
    console.error(`Error extracting text from ${filePath}:`, error);
    return '';
  }
}

// Update the course content function with better logging
async function getCourseContent(courseCode) {
  const courseDir = path.join(__dirname, '..', 'data', 'LECTURE_NOTES', courseCode);
  let allContent = '';
  
  console.log(`[AI] Checking course directory: ${courseDir}`);

  try {
    if (!fs.existsSync(courseDir)) {
      console.log(`[AI] Course directory not found for: ${courseCode}`);
      return null;
    }

    const files = fs.readdirSync(courseDir);
    console.log(`[AI] Found ${files.length} files for course ${courseCode}`);
    
    let processedFiles = 0;
    
    for (const file of files) {
      const filePath = path.join(courseDir, file);
      const ext = path.extname(file).toLowerCase();
      
      if (['.pdf', '.docx', '.pptx', '.jpg', '.jpeg', '.png'].includes(ext)) {
        console.log(`[AI] Processing file: ${file}`);
        const text = await extractTextFromFile(filePath);
        if (text.trim()) {
          processedFiles++;
          allContent += `\n=== Content from ${file} ===\n${text.trim()}\n`;
        }
      }
    }

    console.log(`[AI] Successfully processed ${processedFiles} files for ${courseCode}`);
    return allContent.trim();
  } catch (error) {
    console.error(`[AI] Error processing course content for ${courseCode}:`, error);
    return null;
  }
}

// Update the AI route with better error handling
router.post('/:id/aiGenerate', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { prompt, courseCode } = req.body;

  try {
    // Find document and verify access permissions
    const document = await Document.findById(id);
    if (!document) {
      console.log('[AI] Document not found:', id);
      return res.status(404).json({ 
        success: false, 
        message: "Document not found" 
      });
    }

    // Get user for permission check
    const user = await User.findById(req.user._id);
    if (!user) {
      console.log('[AI] User not found:', req.user._id);
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    // Check if user has edit access
    const hasEditAccess = 
      document.owner.toString() === req.user._id.toString() || 
      document.sharedWith.some(share => 
        share.email === user.email && 
        share.accessType === 'edit' &&
        !share.deleted
      );

    if (!hasEditAccess) {
      console.log('[AI] User lacks edit permission:', req.user._id);
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to edit this document" 
      });
    }

    // Validate input
    if (!prompt) {
      return res.status(400).json({ 
        success: false,
        message: "Prompt is required" 
      });
    }

    console.log('[AI] Generation request:', {
      userId: req.user._id,
      documentId: id,
      courseCode,
      promptLength: prompt.length
    });
    // Get and verify course content
    let courseContent = null;
    if (courseCode) {
      console.log(`[AI] Fetching content for course: ${courseCode}`);
      try {
        courseContent = await getCourseContent(courseCode);
      } catch (error) {
        console.error('[AI] Error fetching course content:', error);
        // Continue without course content
      }
    }

    // Build AI prompt with error checking
    const systemPrompt = `You are a helpful educational AI tutor.
Answer the following question completely and clearly.
Be thorough but concise.

Question: ${prompt}\n
${courseContent 
  ? `Using these course materials as reference:\n${courseContent}\n`
  : courseCode 
    ? 'FAILED TO FIND CONTENT, GENERATING FROM GENERAL KNOWLEDGE...\n'
    : ''}`;

    console.log(courseContent);

    // Verify API key
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Make API call with error handling
    console.log('[AI] Sending request to Gemini API');
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ 
          role: 'user', 
          parts: [{ text: systemPrompt }] 
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.8,
          topK: 40
        }
      }
    ).catch(error => {
      console.error('[AI] Gemini API Error:', error.response?.data || error.message);
      throw new Error('Failed to generate AI response');
    });

    // Process AI response with validation
    const aiText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!aiText) {
      console.log('[AI] No response generated');
      return res.status(500).json({
        success: false,
        message: "No response generated from AI"
      });
    }

    // Save generated content
    const newBlock = {
      _id: new mongoose.Types.ObjectId(),
      type: 'paragraph',
      content: aiText,
      fontSize: 16,
      color: "#FFF"
    };

    document.contentBlocks.push(newBlock);
    await document.save();

    console.log('[AI] Content generated successfully:', {
      responseLength: aiText.length,
      usedCourseContent: !!courseContent
    });

    // Return success response
    res.json({
      success: true,
      message: "AI generated content successfully",
      document,
      usedCourseContent: !!courseContent,
      contentSource: courseContent ? 'course_materials' : 'general_knowledge'
    });

  } catch (error) {
    console.error('[AI] Generation Error:', error);
    res.status(500).json({ 
      success: false,
      message: "Error generating AI content",
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;