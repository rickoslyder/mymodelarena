import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const config = {
  port: process.env.PORT || 3001,
  databaseUrl: process.env.DATABASE_URL,
  // Add other environment variables here as needed
};

// Validate essential configuration
if (!config.databaseUrl) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

export default config;
