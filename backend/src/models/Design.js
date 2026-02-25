import mongoose from "mongoose";

const furnitureItemSchema = new mongoose.Schema({
  furnitureId: { type: mongoose.Schema.Types.ObjectId, ref: "Furniture" },
  type: String,
  x: Number,
  y: Number,
  rotation: Number,
  scale: Number
}, { _id: false });

const designSchema = new mongoose.Schema({
  name: { type: String, required: true },
  roomType: String,
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: { type: String, default: "draft" },
  notes: String,
  room: {
    length: Number,
    width: Number,
    height: Number,
    wallColor: String,
    floorColor: String
  },
  furniture: [furnitureItemSchema]
}, { timestamps: true });

export default mongoose.model("Design", designSchema);
