const pptxgen = require('pptxgenjs');

/**
 * PPT Service - Handles PowerPoint generation and formatting
 */

const createTitleSlide = (ppt, data) => {
  const slide = ppt.addSlide();
  
  // Background gradient
  slide.background = { 
    color: '4B5563',
    transparency: 0
  };
  
  // Main title
  slide.addText(data.title || 'Untitled Presentation', {
    x: 0.5,
    y: 2.0,
    w: 9,
    h: 1.2,
    fontSize: 48,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
    fontFace: 'Arial'
  });
  
  // Subtitle
  if (data.subtitle) {
    slide.addText(data.subtitle, {
      x: 0.5,
      y: 3.5,
      w: 9,
      h: 0.6,
      fontSize: 24,
      color: 'D1D5DB',
      align: 'center',
      fontFace: 'Arial'
    });
  }
  
  // Footer with date
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  slide.addText(currentDate, {
    x: 0.5,
    y: 7.0,
    w: 9,
    h: 0.3,
    fontSize: 14,
    color: '9CA3AF',
    align: 'center',
    fontFace: 'Arial'
  });
  
  return slide;
};

const createContentSlide = (ppt, slideData, slideNumber) => {
  const slide = ppt.addSlide();
  
  // White background
  slide.background = { color: 'FFFFFF' };
  
  // Slide number in corner
  slide.addText(`${slideNumber}`, {
    x: 9.2,
    y: 7.2,
    w: 0.5,
    h: 0.3,
    fontSize: 12,
    color: '9CA3AF',
    align: 'right',
    fontFace: 'Arial'
  });
  
  // Title with accent line
  slide.addShape(ppt.ShapeType.rect, {
    x: 0.5,
    y: 0.5,
    w: 0.1,
    h: 0.8,
    fill: { color: '4B5563' }
  });
  
  slide.addText(slideData.title || 'Untitled Slide', {
    x: 0.8,
    y: 0.5,
    w: 8.7,
    h: 0.8,
    fontSize: 32,
    bold: true,
    color: '1F2937',
    valign: 'middle',
    fontFace: 'Arial'
  });
  
  // Content bullets
  if (slideData.content && Array.isArray(slideData.content) && slideData.content.length > 0) {
    const contentText = slideData.content
      .filter(item => item && item.trim().length > 0)
      .map(item => `• ${item}`)
      .join('\n\n');
    
    slide.addText(contentText, {
      x: 0.8,
      y: 1.8,
      w: 8.5,
      h: 4.5,
      fontSize: 18,
      color: '374151',
      valign: 'top',
      fontFace: 'Arial',
      lineSpacing: 28
    });
  }
  
  // Speaker notes
  if (slideData.notes) {
    slide.addNotes(slideData.notes);
  }
  
  return slide;
};

const generatePPTX = async (presentationData) => {
  try {
    // Validate input
    if (!presentationData || typeof presentationData !== 'object') {
      throw new Error('Invalid presentation data');
    }
    
    if (!presentationData.title) {
      throw new Error('Presentation title is required');
    }
    
    if (!presentationData.slides || !Array.isArray(presentationData.slides)) {
      throw new Error('Slides array is required');
    }
    
    if (presentationData.slides.length === 0) {
      throw new Error('At least one slide is required');
    }
    
    // Initialize PowerPoint
    const ppt = new pptxgen();
    
    // Set presentation properties
    ppt.author = 'SlideMinds AI';
    ppt.company = 'SlideMinds';
    ppt.subject = presentationData.title;
    ppt.title = presentationData.title;
    
    // Set layout (16:9 widescreen)
    ppt.layout = 'LAYOUT_WIDE';
    
    // Create title slide
    createTitleSlide(ppt, {
      title: presentationData.title,
      subtitle: presentationData.subtitle
    });
    
    // Create content slides
    presentationData.slides.forEach((slideData, index) => {
      createContentSlide(ppt, slideData, index + 2); // +2 because title is slide 1
    });
    
    return ppt;
  } catch (error) {
    console.error('PPT generation error:', error);
    throw error;
  }
};

const generatePPTXBuffer = async (presentationData) => {
  try {
    const ppt = await generatePPTX(presentationData);
    
    // Generate buffer instead of file
    const buffer = await ppt.write('nodebuffer');
    return buffer;
  } catch (error) {
    console.error('PPT buffer generation error:', error);
    throw error;
  }
};

const generatePPTXBase64 = async (presentationData) => {
  try {
    const ppt = await generatePPTX(presentationData);
    
    // Generate base64 string
    const base64 = await ppt.write('base64');
    return base64;
  } catch (error) {
    console.error('PPT base64 generation error:', error);
    throw error;
  }
};

const validatePresentationData = (data) => {
  const errors = [];
  
  if (!data.title || data.title.trim().length === 0) {
    errors.push('Title is required');
  }
  
  if (data.title && data.title.length > 200) {
    errors.push('Title is too long (max 200 characters)');
  }
  
  if (!data.slides || !Array.isArray(data.slides)) {
    errors.push('Slides must be an array');
  }
  
  if (data.slides && data.slides.length === 0) {
    errors.push('At least one slide is required');
  }
  
  if (data.slides && data.slides.length > 50) {
    errors.push('Too many slides (max 50)');
  }
  
  // Validate each slide
  if (data.slides && Array.isArray(data.slides)) {
    data.slides.forEach((slide, index) => {
      if (!slide.title) {
        errors.push(`Slide ${index + 1} is missing a title`);
      }
      
      if (slide.title && slide.title.length > 150) {
        errors.push(`Slide ${index + 1} title is too long (max 150 characters)`);
      }
      
      if (slide.content && !Array.isArray(slide.content)) {
        errors.push(`Slide ${index + 1} content must be an array`);
      }
      
      if (slide.content && slide.content.length > 10) {
        errors.push(`Slide ${index + 1} has too many bullet points (max 10)`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  generatePPTX,
  generatePPTXBuffer,
  generatePPTXBase64,
  validatePresentationData
};