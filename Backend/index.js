// Load environment variables FIRST - before any other imports
const dotenv = require("dotenv");
dotenv.config();

// Add debug line to verify
console.log('✅ Environment variables loaded');
console.log('Gemini API Key:', process.env.GEMINI_API_KEY ? 'Found' : 'NOT FOUND');
console.log('JWT Secret:', process.env.JWT_SECRET ? 'Found' : 'NOT FOUND');

// Now import everything else
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db.js");
const bodyParser = require("body-parser");

const authRoutes = require("./routes/authRoute.js");
const userRoutes = require("./routes/userRoute.js");
const chatRoutes = require("./routes/chatRoute.js");
const presentationRoutes = require("./routes/presentationRoute.js");


// Connect MongoDB
connectDB();

// Initialize express app
const app = express();

// Middlewares
app.use(express.json({ limit: "10mb" }));
const allowedOrigins = [
  "http://localhost:5173", // for local React/Vite dev
  "https://ai-powered-chat-application-coral.vercel.app", // your Vercel frontend
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(morgan("dev"));
app.use(express.json()); // 👈 This is essential

// If you send form data instead of JSON:
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (req, res) => {
  res.status(200).json({ message: "AI PPT Chat API is running " });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/presentation", presentationRoutes);


// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
