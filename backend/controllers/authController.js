/**
 * authController.js
 *
 * This file handles all authentication-related functionality for the BODA 4 NET backend.
 * It manages user authentication, authorization, and account management operations.
 *
 * Features:
 * - User registration and email verification
 * - Login with JWT token generation
 * - Password reset and update
 * - Balance management
 * - Account security (lockout protection)
 * - Session management
 *
 * The controller uses JWT for authentication and includes security features
 * such as password hashing, email verification, and secure cookie handling.
 */

import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import sendEmail from "../utils/email.js";
import crypto from "crypto";
import { promisify } from "util";
import passport from "../config/passport.js";

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  res.cookie("jwt", token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

// Helper function to send verification email
const sendVerificationEmail = async (user, verificationToken) => {
  const verificationURL = `${process.env.BASE_URL}/api/auth/verifyEmail/${verificationToken}`;

  const message = `
    <div style="background-color: #f9fafb; padding: 20px; font-family: Arial, sans-serif;">
      <div style="background-color: white; padding: 20px; border-radius: 10px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #dc2626; text-align: center; font-size: 24px; margin-bottom: 20px;">BODA 4 NET - Verify Your Email</h2>
        <p style="color: #3a2d34; text-align: center; font-size: 16px;">Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationURL}" style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
        </div>
        <p style="color: #3a2d34; font-size: 14px; text-align: center; margin-bottom: 20px;">This link will expire in 10 minutes.</p>
        <hr style="border: none; border-top: 1px solid #e6e6e6; margin: 20px 0;">
        <p style="color: #888; font-size: 12px; text-align: center;">If you didn't create an account, please ignore this email.</p>
      </div>
    </div>
  `;

  await sendEmail({
    email: user.email,
    subject: "BODA 4 NET - Please verify your email address",
    message,
  });
};

export const verifyEmail = catchAsync(async (req, res, next) => {
  const { token } = req.params;

  // 1) Hash token
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // 2) Find user with matching token that hasn't expired
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("Invalid or expired verification link", 400));
  }

  // 3) Update user
  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  // 4) Send HTML response
  res.send(`
    <html>
      <head>
        <title>Email Verification Success - BODA 4 NET</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: Arial, sans-serif;">
        <div style="padding: 20px;">
          <div style="background-color: white; padding: 20px; border-radius: 10px; max-width: 600px; margin: 40px auto; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #dc2626; text-align: center; font-size: 24px; margin-bottom: 20px;">Email Verified Successfully!</h2>
            <p style="color: #3a2d34; text-align: center; font-size: 16px;">Your email has been verified successfully.</p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                <svg style="width: 24px; height: 24px; display: inline-block; vertical-align: middle; margin-right: 8px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Verification Complete
              </div>
            </div>
            <p style="color: #3a2d34; font-size: 14px; text-align: center; margin-bottom: 20px;">You can now close this window and continue using BODA 4 NET.</p>
            <hr style="border: none; border-top: 1px solid #e6e6e6; margin: 20px 0;">
            <p style="color: #888; font-size: 12px; text-align: center;">Thank you for choosing BODA 4 NET!</p>
          </div>
        </div>
        <script>
          setTimeout(() => {
            window.close();
          }, 5000);
        </script>
      </body>
    </html>
  `);
});

export const signup = catchAsync(async (req, res, next) => {
  // 1) Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email: req.body.email.toLowerCase() }, { phone: req.body.phone }],
  });

  if (existingUser) {
    if (existingUser.email === req.body.email.toLowerCase()) {
      return next(
        new AppError(
          "البريد الإلكتروني مستخدم بالفعل. يرجى استخدام بريد إلكتروني آخر أو تسجيل الدخول إذا كان لديك حساب بالفعل.",
          400
        )
      );
    } else {
      return next(
        new AppError(
          "رقم الهاتف مستخدم بالفعل. يرجى استخدام رقم هاتف آخر.",
          400
        )
      );
    }
  }

  // 2) Create user data
  const userData = {
    fullName: req.body.fullName,
    email: req.body.email,
    phone: req.body.phone,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    emailVerified: false,
  };

  // 3) Create user
  const newUser = await User.create(userData);

  // 4) Generate verification token
  const verificationToken = newUser.createEmailVerificationToken();
  await newUser.save({ validateBeforeSave: false });

  // 5) Send verification email
  let emailSent = false;
  try {
    await sendVerificationEmail(newUser, verificationToken);
    emailSent = true;
  } catch (emailError) {
    console.error("❌ [SIGNUP] Email sending failed:", emailError);
    // Continue with user creation even if email fails
  }

  // 6) Send response
  res.status(201).json({
    status: "success",
    message: emailSent
      ? "تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني لتأكيد الحساب."
      : "تم إنشاء الحساب بنجاح. حدث خطأ في إرسال بريد التأكيد، يرجى المحاولة مرة أخرى لاحقاً.",
    data: {
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        emailVerified: newUser.emailVerified,
        balance: newUser.balance,
      },
    },
  });
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password are provided
  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  // 2) Find user and include password for comparison
  const user = await User.findOne({ email }).select("+password");

  // 3) Check if user exists and password is correct
  if (!user || !(await user.correctPassword(password, user.password))) {
    // Increment login attempts
    if (user) {
      await user.incLoginAttempts();
    }
    return next(new AppError("Incorrect email or password", 401));
  }

  // 4) Check if account is locked
  if (user.isLocked()) {
    return next(
      new AppError(
        "Account is temporarily locked. Please try again later.",
        423
      )
    );
  }

  // 5) Check if email is verified
  if (!user.emailVerified) {
    // Generate new verification token
    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Send new verification email
    try {
      await sendVerificationEmail(user, verificationToken);
      return next(
        new AppError(
          "Please verify your email first. A new verification link has been sent to your email.",
          401
        )
      );
    } catch (err) {
      // If email sending fails, clear the verification tokens
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return next(
        new AppError(
          "Error sending verification email. Please try again later.",
          500
        )
      );
    }
  }

  // 6) Reset login attempts on successful login
  await user.resetLoginAttempts();

  // 7) Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // 8) Send token and log in user
  createSendToken(user, 200, req, res);
});

export const protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token does no longer exist", 401)
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please login again", 401)
    );
  }

  // Grant access to protected route
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

export const forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError("There is no user with this email address", 404));
  }

  // 2) Generate random OTP
  const otp = user.createPasswordResetOTP();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  const message = `
    <div style="background-color: #f6f9fc; padding: 20px; font-family: Arial, sans-serif;">
      <div style="background-color: white; padding: 20px; border-radius: 10px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #dc2626; text-align: center; font-size: 24px; margin-bottom: 20px;">BODA 4 NET - Password Reset Code</h2>
        <p style="color: #3a2d34; text-align: center; font-size: 16px;">You requested a password reset. Use the code below to reset your password:</p>
        <div style="background-color: #dc2626; padding: 15px; margin: 20px auto; text-align: center; border-radius: 5px; font-size: 18px; font-weight: bold; color: #fff; width: fit-content;">
          ${otp}
        </div>
        <p style="color: #3a2d34; font-size: 14px; text-align: center; margin-bottom: 20px;">This code is valid for 10 minutes.</p>
        <hr style="border: none; border-top: 1px solid #e6e6e6; margin: 20px 0;">
        <p style="color: #888; font-size: 12px; text-align: center;">If you didn't request this, please ignore this email.</p>
      </div>
    </div>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: "BODA 4 NET - Your Password Reset Code",
      message,
      html: message,
    });

    res.status(200).json({
      status: "success",
      message: "OTP sent to email!",
    });
  } catch (err) {
    user.passwordResetOTP = undefined;
    user.passwordResetOTPExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "There was an error sending the email. Try again later!",
        500
      )
    );
  }
});

export const verifyOTP = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new AppError("Please provide email and OTP", 400));
  }

  // Find user with unexpired OTP
  const user = await User.findOne({ email }).select(
    "+passwordResetOTP +passwordResetOTPExpires"
  );

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Verify OTP
  const isValid = user.verifyOTP(otp);
  if (!isValid) {
    return next(new AppError("Invalid OTP", 400));
  }

  // Generate reset token
  const resetToken = user.createPasswordResetToken();

  // Clear OTP fields
  user.passwordResetOTP = undefined;
  user.passwordResetOTPExpires = undefined;

  await user.save({ validateBeforeSave: false });

  // Send token in cookie
  res.cookie("passwordResetToken", resetToken, {
    expires: new Date(Date.now() + 10 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  res.status(200).json({
    status: "success",
    message: "OTP verified successfully",
    resetToken: resetToken,
  });
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const { password, passwordConfirm, resetToken: bodyToken } = req.body;
  const cookieToken = req.cookies.passwordResetToken;

  // Use either cookie token or body token
  const resetToken = cookieToken || bodyToken;

  if (!resetToken) {
    return next(new AppError("Reset session has expired or is invalid", 400));
  }

  // Hash token
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Find user with token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("Reset session has expired or is invalid", 400));
  }

  // Update password
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpires = undefined;
  await user.save();

  // Clear passwordResetToken cookie
  res.cookie("passwordResetToken", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  // Log user in
  createSendToken(user, 200, req, res);
});

export const updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user info
  const user = await User.findById(req.user.id).select("+password");

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("Your current password is wrong.", 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4) Log user in, send JWT
  createSendToken(user, 200, req, res);
});

export const logout = (req, res) => {
  res.cookie("jwt", "", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  res.status(200).json({ status: "success" });
};

// Balance management

// Google OAuth routes
export const googleLogin = (req, res, next) => {
  passport.authenticate("google", { scope: ["profile", "email"] })(
    req,
    res,
    next
  );
};

export const googleCallback = (req, res, next) => {
  passport.authenticate(
    "google",
    { failureRedirect: "/login" },
    (err, user) => {
      if (err) {
        return next(new AppError("Google authentication failed", 500));
      }

      if (!user) {
        return next(new AppError("Google authentication failed", 401));
      }

      // Create JWT token
      const token = signToken(user._id);

      // Set cookie
      res.cookie("jwt", token, {
        expires: new Date(
          Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      // Redirect to frontend with token
      res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:5173"}?token=${token}`
      );
    }
  )(req, res, next);
};

export const handleGoogleUser = catchAsync(async (req, res, next) => {
  const { googleId, email, fullName } = req.body;

  if (!googleId || !email || !fullName) {
    return next(new AppError("Missing required Google user data", 400));
  }

  // Find or create user
  let user = await User.findOne({
    $or: [{ googleId }, { email }],
  });

  if (user) {
    // Update existing user with Google info if needed
    if (!user.googleId) {
      user.googleId = googleId;
      user.emailVerified = true;
      await user.save({ validateBeforeSave: false });
    }
  } else {
    // Create new user
    const randomPassword = crypto.randomBytes(20).toString("hex");
    user = await User.create({
      googleId,
      fullName,
      email,
      phone: "01000000000", // Default phone
      password: randomPassword,
      passwordConfirm: randomPassword,
      emailVerified: true,
      balance: 0,
    });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Send token
  createSendToken(user, 200, req, res);
});
