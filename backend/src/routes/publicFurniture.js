import express from "express";
import Furniture from "../models/Furniture.js";

const router = express.Router();

// ─── PUBLIC: GET FURNITURE CATALOG ──────────────────────────────────────────
// Called by RoomDesigner2D.jsx – no auth required
router.get("/", async (req, res) => {
  try {
    const furniture = await Furniture.find({}, "-__v").sort({ name: 1 });
    res.json(furniture);
  } catch (err) {
    console.error("Get furniture catalog error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── PUBLIC: GET ONE FURNITURE BY ID ─────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const item = await Furniture.findById(req.params.id);
    if (!item)
      return res.status(404).json({ error: "Furniture not found" });
    res.json(item);
  } catch (err) {
    if (err.name === "CastError")
      return res.status(404).json({ error: "Invalid ID format" });
    res.status(500).json({ error: err.message });
  }
});

export default router;
