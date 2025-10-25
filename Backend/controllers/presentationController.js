// presentationController.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, and Text files are allowed.'));
    }
  }
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generatePresentation = async (req, res) => {
  try {
    // Handle both JSON and FormData requests
    let prompt;
    let fileContent = null;

    if (req.is('multipart/form-data')) {
      // FormData request with possible file
      prompt = req.body.prompt;
      
      if (req.file) {
        // Read file content
        const filePath = req.file.path;
        fileContent = fs.readFileSync(filePath, 'utf-8');
        
        // Clean up uploaded file
        fs.unlinkSync(filePath);
        
        // Enhance prompt with file content
        prompt = `${prompt}\n\nFile content:\n${fileContent}`;
      }
    } else {
      // JSON request
      prompt = req.body.prompt;
    }

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: "Prompt is required"
      });
    }

    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-1.5-flash" });



    const systemPrompt = `You are a professional presentation designer. Generate a detailed presentation based on the user's request.

IMPORTANT: You must respond ONLY with valid JSON in this exact format, no markdown, no code blocks, no additional text:

{
  "title": "Presentation Title",
  "subtitle": "Optional subtitle",
  "slides": [
    {
      "title": "Slide Title",
      "content": ["Point 1", "Point 2", "Point 3"],
      "notes": "Optional speaker notes"
    }
  ]
}

Rules:
- Create 5-10 slides minimum
- Each slide should have 3-5 content points
- Content points should be concise and impactful
- Include speaker notes for complex slides
- Make it professional and engaging
- Response must be pure JSON only`;

    const result = await model.generateContent([systemPrompt, prompt]);
    const response = await result.response;
    let text = response.text();

    // Clean up the response
    text = text.trim();
    
    // Remove markdown code blocks if present
    if (text.startsWith('```json')) {
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/```\n?/g, '');
    }

    // Parse JSON
    let presentationData;
    try {
      presentationData = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Raw response:', text);
      
      return res.status(500).json({
        success: false,
        message: "AI generated invalid format. Please try again with a different prompt.",
        error: parseError.message
      });
    }

    // Validate structure
    if (!presentationData.slides || !Array.isArray(presentationData.slides)) {
      return res.status(500).json({
        success: false,
        message: "Invalid presentation structure generated",
        data: presentationData
      });
    }

    res.json({
      success: true,
      data: presentationData
    });

  } catch (error) {
    console.error('PRESENTATION GENERATION ERROR:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate presentation"
    });
  }
};

const exportPresentation = async (req, res) => {
  try {
    const { presentationData } = req.body;

    if (!presentationData) {
      return res.status(400).json({
        success: false,
        message: "Presentation data is required"
      });
    }

    const PptxGenJS = require('pptxgenjs');
    const ppt = new PptxGenJS();

    // Title slide
    const titleSlide = ppt.addSlide();
    titleSlide.background = { color: '4B5563' };
    titleSlide.addText(presentationData.title, {
      x: 0.5, y: 2.0, w: 9, h: 1.2,
      fontSize: 48, bold: true, color: 'FFFFFF', align: 'center'
    });
    
    if (presentationData.subtitle) {
      titleSlide.addText(presentationData.subtitle, {
        x: 0.5, y: 3.5, w: 9, h: 0.6,
        fontSize: 24, color: 'D1D5DB', align: 'center'
      });
    }

    // Content slides
    presentationData.slides.forEach((slide) => {
      const contentSlide = ppt.addSlide();
      contentSlide.background = { color: 'FFFFFF' };
      
      contentSlide.addText(slide.title, {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: '1F2937'
      });
      
      if (slide.content && slide.content.length > 0) {
        contentSlide.addText(
          slide.content.map(c => `• ${c}`).join('\n\n'),
          {
            x: 0.8, y: 1.8, w: 8.5, h: 4,
            fontSize: 18, color: '374151', valign: 'top'
          }
        );
      }
      
      if (slide.notes) {
        contentSlide.addNotes(slide.notes);
      }
    });

    // Generate PPTX file
    const fileName = `${presentationData.title.replace(/[^a-z0-9]/gi, '_')}.pptx`;
    const filePath = path.join(__dirname, '../temp', fileName);

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    await ppt.writeFile({ fileName: filePath });

    // Send file
    res.download(filePath, fileName, (err) => {
      // Clean up temp file after sending
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      if (err) {
        console.error('Download error:', err);
      }
    });

  } catch (error) {
    console.error('EXPORT ERROR:', error);
    res.status(500).json({
      success: false,
      message: "Failed to export presentation"
    });
  }
};

module.exports = {
  generatePresentation,
  exportPresentation,
  upload
};