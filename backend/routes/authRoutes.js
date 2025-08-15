/**
 * authRoutes.js
 *
 * Authentication routes for the BODA 4 NET backend.
 * Handles user registration, login, password reset, and email verification.
 */

import express from "express";
import * as authController from "../controllers/authController.js";
import { protect } from "../controllers/authController.js";

const router = express.Router();

// Public routes
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/forgotPassword", authController.forgotPassword);
router.post("/verifyOTP", authController.verifyOTP);
router.patch("/resetPassword", authController.resetPassword);
router.get("/verifyEmail/:token", authController.verifyEmail);

// Google OAuth routes
router.get("/google", authController.googleLogin);
router.get("/google/callback", authController.googleCallback);
router.post("/google/user", authController.handleGoogleUser);

// Protected routes (require authentication)
router.use(protect); // Apply protect middleware to all routes below

router.patch("/updatePassword", authController.updatePassword);
router.get("/logout", authController.logout);

export default router;
