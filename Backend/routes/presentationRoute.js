const express = require("express");
const router = express.Router();
const {
  generatePresentation,
  exportPresentation,
  upload,
} = require("../controllers/presentationController");

// ✅ For JSON-based requests (no file)
router.post("/generate", generatePresentation);

// ✅ For file uploads (FormData with optional prompt + file)
router.post("/generate-file", upload.single("file"), generatePresentation);

// ✅ For exporting to PPTX
router.post("/export", exportPresentation);

module.exports = router;
