import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    course: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["New", "Follow-up", "Converted"],
      default: "New",
    },
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

const Lead = mongoose.model("Lead", leadSchema);

export default Lead;
