/**
 * userController.js
 *
 * This file handles user management functionality for the BODA 4 NET backend.
 * It provides endpoints for admin user management and statistics.
 *
 * Features:
 * - Get all users (admin)
 * - Get user statistics (admin)
 * - Get specific user (admin)
 * - Update user (admin)
 * - Delete user (admin)
 * - User data filtering and validation
 *
 * The controller includes proper data validation and admin authorization.
 */

import User from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

// Helper function to filter object properties
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// Get all users (Admin only)
export const getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find().select("-password");

  res.status(200).json({
    status: "success",
    results: users.length,
    data: {
      users,
    },
  });
});

// Get user statistics (Admin only)
export const getUserStats = catchAsync(async (req, res, next) => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: ["$active", 1, 0] },
        },
        verifiedUsers: {
          $sum: { $cond: ["$emailVerified", 1, 0] },
        },
        totalBalance: { $sum: "$balance" },
        avgBalance: { $avg: "$balance" },
      },
    },
  ]);

  const monthlyStats = await User.aggregate([
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { "_id.year": -1, "_id.month": -1 },
    },
    {
      $limit: 12,
    },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      stats: stats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        verifiedUsers: 0,
        totalBalance: 0,
        avgBalance: 0,
      },
      monthlyStats,
    },
  });
});

// Get specific user (Admin only)
export const getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

// Update user (Admin only)
export const updateUser = catchAsync(async (req, res, next) => {
  // 1) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(
    req.body,
    "fullName",
    "email",
    "phone",
    "balance",
    "active",
    "emailVerified"
  );

  // 2) Update user document
  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    filteredBody,
    {
      new: true,
      runValidators: true,
    }
  ).select("-password");

  if (!updatedUser) {
    return next(new AppError("No user found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

// Delete user (Admin only)
export const deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Get current user profile (moved from authController for consistency)
export const getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

// Update current user data (except password)
export const updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updatePassword.",
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, "fullName", "phone");

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

// Delete current user account
export const deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Get user balance
export const getBalance = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    status: "success",
    data: {
      balance: user.balance,
    },
  });
});

// Add balance to user account
export const addBalance = catchAsync(async (req, res, next) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return next(new AppError("Please provide a valid amount", 400));
  }

  const user = await User.findById(req.user.id);
  await user.addBalance(amount);

  res.status(200).json({
    status: "success",
    message: "Balance added successfully",
    data: {
      balance: user.balance,
    },
  });
});

// Deduct balance from user account
export const deductBalance = catchAsync(async (req, res, next) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return next(new AppError("Please provide a valid amount", 400));
  }

  const user = await User.findById(req.user.id);

  try {
    await user.deductBalance(amount);
  } catch (error) {
    return next(new AppError(error.message, 400));
  }

  res.status(200).json({
    status: "success",
    message: "Balance deducted successfully",
    data: {
      balance: user.balance,
    },
  });
});
