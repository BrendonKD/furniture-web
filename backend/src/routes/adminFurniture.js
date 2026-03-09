import express from 'express';
import multer from 'multer';
import Furniture from '../models/Furniture.js';
import adminMiddleware from '../middleware/admin.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirnameLocal = path.dirname(__filename);
// This file: src/routes/AdminFurniture.js → go up 2 levels to reach backend/public/uploads

const router = express.Router();

// Multer config - save to public/uploads
const uploadsDir = path.join(__dirnameLocal, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created public/uploads/');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

// ─── CREATE ───────────────────────────────────────────────────────────────────
router.post('/furniture', adminMiddleware, upload.single('glbFile'), async (req, res) => {
  try {
    console.log('Form data:', req.body);
    console.log('File:', req.file?.filename);

    const furniture = new Furniture({
      name: req.body.name,
      category: req.body.category,
      price: parseFloat(req.body.price),
      sku: req.body.sku || '',
      inventoryStatus: req.body.inventoryStatus === 'true',
      description: req.body.description || '',
      dimensions: JSON.parse(req.body.dimensions),
      glbPath: `/uploads/${req.file.filename}`,
      glbFilename: req.file.originalname
    });

    await furniture.save();
    res.json({ message: 'Furniture added', id: furniture._id });
  } catch (err) {
    console.error('Furniture save error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET ALL ──────────────────────────────────────────────────────────────────
router.get('/furniture', adminMiddleware, async (req, res) => {
  try {
    const furniture = await Furniture.find().sort({ createdAt: -1 });
    res.json(furniture);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET ONE BY ID ────────────────────────────────────────────────────────────
// Used by FurnitureDetail (edit page) and FurnitureView (3D viewer fallback)
router.get('/furniture/:id', adminMiddleware, async (req, res) => {
  try {
    const item = await Furniture.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Furniture not found' });
    res.json(item);
  } catch (err) {
    // Handle invalid MongoDB ObjectId format gracefully
    if (err.name === 'CastError') return res.status(404).json({ error: 'Invalid ID format' });
    res.status(500).json({ error: err.message });
  }
});

// ─── UPDATE BY ID ─────────────────────────────────────────────────────────────
// Used by FurnitureDetail save button — sends PUT with updated fields
router.put('/furniture/:id', adminMiddleware, async (req, res) => {
  try {
    const { name, category, price, sku, inventoryStatus, description, dimensions } = req.body;

    const updated = await Furniture.findByIdAndUpdate(
      req.params.id,
      {
        name,
        category,
        price: parseFloat(price),
        sku,
        inventoryStatus,
        description,
        dimensions,
      },
      { new: true, runValidators: true }  // return updated doc + run schema validators
    );

    if (!updated) return res.status(404).json({ error: 'Furniture not found' });
    res.json({ message: 'Updated successfully', item: updated });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Invalid ID format' });
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE BY ID ─────────────────────────────────────────────────────────────
// Used by FurnitureList delete button — also removes the .glb file from disk
router.delete('/furniture/:id', adminMiddleware, async (req, res) => {
  try {
    const item = await Furniture.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Furniture not found' });

    // Delete the .glb file from disk to avoid orphaned files building up
    if (item.glbPath) {
      const filePath = path.join(process.cwd(), 'public', item.glbPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑 Deleted file: ${filePath}`);
      }
    }

    await Furniture.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Invalid ID format' });
    res.status(500).json({ error: err.message });
  }
});

export default router;