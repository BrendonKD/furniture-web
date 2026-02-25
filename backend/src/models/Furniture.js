import mongoose from 'mongoose';

const furnitureSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  sku: String,
  inventoryStatus: { type: Boolean, default: true },
  description: String,
  dimensions: {
    width: Number,
    height: Number,
    depth: Number
  },
  glbPath: { type: String, required: true },
  glbFilename: String
}, { timestamps: true });

export default mongoose.model('Furniture', furnitureSchema);
