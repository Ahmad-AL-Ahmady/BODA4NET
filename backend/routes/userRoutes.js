/**
 * userRoutes.js
 *
 * User routes for the BODA 4 NET backend.
 * Handles user profile management and admin functions.
 */

import express from "express";
import * as userController from "../controllers/userController.js";
import { protect } from "../controllers/authController.js";

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

// User profile routes
router.get("/me", userController.getMe);
router.patch("/updateMe", userController.updateMe);
router.delete("/deleteMe", userController.deleteMe);

// Balance management routes
router.get("/balance", userController.getBalance);
router.post("/balance/add", userController.addBalance);
router.post("/balance/deduct", userController.deductBalance);

// Admin routes (you can add admin middleware here later)
router.get("/", userController.getAllUsers);
router.get("/stats", userController.getUserStats);
router.get("/:id", userController.getUser);
router.patch("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

export default router;
