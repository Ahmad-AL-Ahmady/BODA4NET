/**
 * passport.js
 *
 * This file configures Passport.js authentication for the BODA 4 NET backend.
 * It sets up Google OAuth 2.0 authentication strategy and handles user serialization.
 * The configuration includes:
 * - Google OAuth strategy setup with client credentials
 * - User lookup/creation logic for Google authentication
 * - User serialization/deserialization for session management
 */

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/userModel.js";
import crypto from "crypto";
import { GOOGLE_CONFIG, BASE_URL } from "./index.js";

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${BASE_URL}/api/auth/google/callback`,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("🔐 [GOOGLE] Received Google profile:", {
          id: profile.id,
          email: profile.emails?.[0]?.value,
          displayName: profile.displayName,
        });

        // 1. First, try to find user by googleId or by email
        let user = await User.findOne({
          $or: [
            { googleId: profile.id },
            { email: profile.emails?.[0]?.value },
          ],
        });

        if (user) {
          console.log("✅ [GOOGLE] Existing user found:", user._id);
          
          // Update user with Google info if not already set
          if (!user.googleId) {
            console.log("🔄 [GOOGLE] Updating existing user with Google ID");
            user.googleId = profile.id;
            user.emailVerified = true; // Google emails are verified
            await user.save({ validateBeforeSave: false });
          }
          
          // Update last login
          user.lastLogin = new Date();
          await user.save({ validateBeforeSave: false });
          
          return done(null, user);
        }

        // 2. Create new user with Google profile info
        console.log("🆕 [GOOGLE] Creating new user from Google profile");

        // Generate a random password (required by our schema)
        const randomPassword = crypto.randomBytes(20).toString("hex");

        // Create new user
        user = await User.create({
          googleId: profile.id,
          fullName: profile.displayName,
          email: profile.emails[0].value,
          phone: "01000000000", // Default phone, user can update later
          password: randomPassword,
          passwordConfirm: randomPassword,
          emailVerified: true, // Google emails are verified
          balance: 0, // Start with zero balance
        });

        console.log("✅ [GOOGLE] New user created:", user._id);
        return done(null, user);
      } catch (err) {
        console.error("❌ [GOOGLE] Error in Google Strategy:", err);
        return done(err, null);
      }
    }
  )
);

// Serialization
passport.serializeUser((user, done) => {
  console.log("📦 [PASSPORT] Serializing user:", user._id);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log("📦 [PASSPORT] Deserializing user:", id);
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    console.error("❌ [PASSPORT] Deserialization error:", err);
    done(err, null);
  }
});

export default passport;

