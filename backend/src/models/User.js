import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  preferences: {
    defaultRoomType: { type: String },
    defaultUnits: { type: String, default: "m" },
    defaultWallColor: { type: String, default: "#ffffff" }
  }
}, { timestamps: true });

userSchema.methods.comparePassword = function (pw) {
  return bcrypt.compare(pw, this.passwordHash);
};

export default mongoose.model("User", userSchema);
