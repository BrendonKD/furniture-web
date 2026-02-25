import express from 'express';
import multer from 'multer';
import Furniture from '../models/Furniture.js';
import adminMiddleware from '../middleware/admin.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Multer config - save to public/uploads
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created public/uploads/');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),  // ✅ Absolute path
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

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

// GET all furniture
router.get('/furniture', adminMiddleware, async (req, res) => {
  try {
    const furniture = await Furniture.find().sort({ createdAt: -1 });
    res.json(furniture);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;
