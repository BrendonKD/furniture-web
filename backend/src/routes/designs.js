import express from "express";
import Design from "../models/Design.js";
import { requireAuth, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// ─── PUBLIC ADMIN: GET ALL DESIGNS (no auth) ────────────────────────────────
router.get("/admin", async (req, res) => {
  try {
    const designs = await Design.find().sort({ updatedAt: -1 }).limit(20);
    res.json(designs);
  } catch (err) {
    console.error("Admin designs error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Your existing auth routes stay the same...
router.get("/", requireAuth, async (req, res) => {
  // ...
});


router.get("/public/:id", async (req, res) => {
  try {
    const design = await Design.findById(req.params.id);
    if (!design) return res.status(404).json({ message: "Not found" });
    // return public fields only
    res.json({
      _id: design._id,
      name: design.name,
      roomType: design.roomType,
      room: design.room,
      furniture: design.furniture,
      updatedAt: design.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// User: get own designs
router.get("/", requireAuth, async (req, res) => {
  const query = req.user.role === "admin" ? {} : { ownerId: req.user.id };
  const designs = await Design.find(query).sort({ updatedAt: -1 });
  res.json(designs);
});

// Get by id (for details/designer)
router.get("/:id", requireAuth, async (req, res) => {
  const design = await Design.findById(req.params.id);
  if (!design) return res.status(404).json({ message: "Not found" });
  if (req.user.role !== "admin" && design.ownerId.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }
  res.json(design);
});

// Create
router.post("/", requireAuth, async (req, res) => {
  const design = await Design.create({ ...req.body, ownerId: req.user.id });
  res.status(201).json(design);
});

// Update
router.put("/:id", requireAuth, async (req, res) => {
  const design = await Design.findById(req.params.id);
  if (!design) return res.status(404).json({ message: "Not found" });
  if (req.user.role !== "admin" && design.ownerId.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }
  Object.assign(design, req.body);
  await design.save();
  res.json(design);
});

// Delete
router.delete("/:id", requireAuth, async (req, res) => {
  const design = await Design.findById(req.params.id);
  if (!design) return res.status(404).json({ message: "Not found" });
  if (req.user.role !== "admin" && design.ownerId.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }
  await design.deleteOne();
  res.json({ message: "Deleted" });
});

export default router;
