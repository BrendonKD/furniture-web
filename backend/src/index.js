import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { connectDB } from "./config/db.js";
import { fileURLToPath } from 'url';

import authRoutes from "./routes/auth.js";
import designRoutes from "./routes/designs.js";
import adminFurnitureRoutes from './routes/AdminFurniture.js';
import publicFurnitureRouter from './routes/publicFurniture.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

connectDB();

// ─── STATIC FILES ─────────────────────────────────────────────────────────────
const uploadsPath = path.join(__dirname, '..', 'public', 'uploads');
console.log('📁 Serving /uploads from:', uploadsPath);
console.log('📁 Path exists:', fs.existsSync(uploadsPath));
app.use('/uploads', express.static(uploadsPath));

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/designs", designRoutes);
app.use('/api/admin', adminFurnitureRoutes);
app.use('/api/furniture', publicFurnitureRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));