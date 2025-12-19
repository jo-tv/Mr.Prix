import mongoose from "mongoose";
import { isWorkingHours } from "./workingHours.js";
import { connectDB } from "./db.js";

export async function workingHoursMiddleware(req, res, next) {
  if (!isWorkingHours()) {
    // ❌ خارج وقت العمل → افصل DB إن كانت متصلة
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log("🌙 Outside working hours - DB disconnected");
    }

    return res.status(503).json({
      message: "⏰ التطبيق متوقف خارج ساعات العمل (08:00 - 22:00)"
    });
  }

  // ✅ داخل وقت العمل → تأكد من الاتصال
  await connectDB();
  next();
}