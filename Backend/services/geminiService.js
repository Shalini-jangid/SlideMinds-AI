const axios = require("axios");

async function callGeminiAPI(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${process.env.GEMINI_MODEL}:generateContent`;

  try {
    const response = await axios.post(
      url,
      {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
      }
    );

    const text =
      response.data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No content returned";
    return { success: true, text };
  } catch (error) {
    console.error("Gemini API Error:", error.response?.data || error.message);
    throw new Error(
      "Gemini model not available. Please verify your GEMINI_MODEL in .env"
    );
  }
}

// ✅ Add this function (this fixes your error)
async function generatePresentation(prompt) {
  // You can modify the prompt to ask for structured output
  const formattedPrompt = `
    Create a JSON formatted PowerPoint outline based on this topic:
    "${prompt}".
    Structure it like:
    {
      "title": "Presentation Title",
      "slides": [
        {"title": "Slide 1 Title", "content": ["Point 1", "Point 2"]},
        {"title": "Slide 2 Title", "content": ["Point 1", "Point 2"]}
      ]
    }
  `;

  const { text } = await callGeminiAPI(formattedPrompt);

  // Try to safely parse the AI response into JSON
  const match = text.match(/\{[\s\S]*\}/);
  let parsed;
  try {
    parsed = match ? JSON.parse(match[0]) : { title: "Untitled", slides: [] };
  } catch {
    parsed = { title: "Untitled", slides: [{ title: "Error", content: [text] }] };
  }

  return parsed;
}

module.exports = { callGeminiAPI, generatePresentation };
