import express, { Request, Response, NextFunction } from "express";
import cors from "cors"; // Import cors
import config from "./config";
// Import routers
import mainRouter from "./routes/index"; // Corrected import path
import requestLogger from "./middleware/requestLogger";
import errorHandler from "./middleware/errorHandler";

const app = express();

// Apply Request Logger Middleware FIRST
app.use(requestLogger);

// --- Configure CORS ---
// Allow requests from the Vite development server origin
// TODO: Configure allowed origins more restrictively for production
const corsOptions = {
  origin: "http://localhost:5173", // Vite default dev port
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health Check Route
app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "UP" });
});

// API Routes
app.use("/api", mainRouter);

// Basic Not Found Handler (for API routes)
app.use("/api/*", (req: Request, res: Response) => {
  res
    .status(404)
    .json({ success: false, error: { message: "API route not found" } });
});

// Apply Error Handling Middleware LAST
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
