import mongoose from "mongoose";
import { getTimerStatus } from "../utils/timerStatus.js";

const { Schema } = mongoose;
// target schema
const targetingSchema = new Schema(
  {
    mode: {
      type: String,
      enum: ["all", "products", "collections"],
      default: "all",
    },
    resourceIds: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

 // timer appearance scchema

const appearanceSchema = new Schema(
  {
    backgroundColor: { type: String, default: "#1a1a1a" },
    textColor: { type: String, default: "#ffffff" },
    size: {
      type: String,
      enum: ["small", "medium", "large"],
      default: "medium",
    },
    position: {
      type: String,
      enum: ["inline", "top", "bottom"],
      default: "inline",
    },
    message: { type: String, default: "Offer ends in:" },
    expiredMessage: { type: String, default: "" },
    urgencyStyle: {
      type: String,
      enum: ["none", "pulse", "shake", "flash"],
      default: "pulse",
    },
  },
  { _id: false }
);

// model design for timer

const timerSchema = new Schema(
  {
    shop: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: ["fixed", "evergreen"], required: true },
    isEnabled: { type: Boolean, default: true },

    // fixed timers
    startDate: { type: Date },
    endDate: { type: Date },

    // evergreen timers
    durationSeconds: { type: Number, min: 1 },

    targeting: { type: targetingSchema, default: () => ({}) },
    appearance: { type: appearanceSchema, default: () => ({}) },
  },
  { timestamps: true }
);

timerSchema.index({ shop: 1, "targeting.mode": 1 });
timerSchema.index({ shop: 1, "targeting.resourceIds": 1 });

timerSchema.methods.getStatus = function getStatus(now = new Date()) {
  return getTimerStatus(this, now);
};

export const Timer = mongoose.model("Timer", timerSchema);
