import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import Lead from "./models/Lead.js";
import authRoutes from "./routes/authRoutes.js";
import authMiddleware from "./middleware/authMiddleware.js";

dotenv.config();

const app = express();
app.use(authMiddleware);

// Middleware

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL?.trim().replace(/\/$/, ""),
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
      return callback(null, true);
    }

    console.log("Blocked CORS origin:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// IMPORTANT: Parse incoming JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);

// Home route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CodeGrowth CRM API is running",
  });
});


// GET - Only this institute's leads
app.get("/api/leads", authMiddleware, async (req, res) => {
  try {
    const leads = await Lead.find({
      instituteId: req.user.instituteId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leads.length,
      leads,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// POST - Add lead to logged-in user's institute
app.post("/api/leads", authMiddleware, async (req, res) => {
  try {
    const { name, phone, course } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof phone !== "string" ||
      typeof course !== "string" ||
      !name.trim() ||
      !phone.trim() ||
      !course.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, phone and course are required",
      });
    }

    const newLead = await Lead.create({
      name: name.trim(),
      phone: phone.trim(),
      course: course.trim(),
      instituteId: req.user.instituteId,
    });

    res.status(201).json({
      success: true,
      message: "Lead added successfully",
      lead: newLead,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// PATCH - Update only this institute's lead
app.patch("/api/leads/:id", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowedStatus = ["New", "Follow-up", "Converted"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const updatedLead = await Lead.findOneAndUpdate(
      {
        _id: req.params.id,
        instituteId: req.user.instituteId,
      },
      { status },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedLead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Lead updated successfully",
      lead: updatedLead,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// DELETE - Delete only this institute's lead
app.delete("/api/leads/:id", authMiddleware, async (req, res) => {
  try {
    const deletedLead = await Lead.findOneAndDelete({
      _id: req.params.id,
      instituteId: req.user.instituteId,
    });

    if (!deletedLead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});


// Database connection and server start
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

startServer();
