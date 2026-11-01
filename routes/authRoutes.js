import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import Institute from "../models/Institute.js";
import User from "../models/User.js";

const router = express.Router();

// REGISTER - Create Institute and Admin
router.post("/register", async (req, res) => {
  let institute;

  try {
    const { name, instituteName, email, password } = req.body || {};

    if (
      !name?.trim() ||
      !instituteName?.trim() ||
      !email?.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Server authentication configuration error",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    institute = await Institute.create({
      name: instituteName.trim(),
      email: normalizedEmail,
    });

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      instituteId: institute._id,
      role: "admin",
    });

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.status(201).json({
      success: true,
      message: "Institute registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        instituteId: user.instituteId,
      },
      institute: {
        id: institute._id,
        name: institute.name,
        email: institute.email,
      },
    });
  } catch (error) {
    // Clean up the institute if admin creation failed
    if (institute) {
      await Institute.findByIdAndDelete(institute._id);
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered",
      });
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
});

// LOGIN - Admin login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Server authentication configuration error",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).populate("instituteId", "name email");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        instituteId: user.instituteId?._id,
        instituteName: user.instituteId?.name,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

export default router;
