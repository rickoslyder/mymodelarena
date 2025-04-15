import { PrismaClient } from "@prisma/client";

// Initialize Prisma Client
const prisma = new PrismaClient({
  // Optional: Add logging for development
  // log: ['query', 'info', 'warn', 'error'],
});

export default prisma;
