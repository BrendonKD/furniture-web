import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { connectDB } from "./config/db.js";

import authRoutes from "./routes/auth.js";
import designRoutes from "./routes/designs.js";
import furnitureRoutes from "./routes/AdminFurniture.js";
import adminFurnitureRoutes from './routes/AdminFurniture.js';
dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/designs", designRoutes);
//app.use("/api/furniture", furnitureRoutes);
app.use('/api/admin', adminFurnitureRoutes);
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
