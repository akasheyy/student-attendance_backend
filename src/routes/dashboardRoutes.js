const express = require("express");
const Student = require("../models/Student");
const Attendance = require("../models/Attendance");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/stats", auth, async (req, res) => {
  try {
    // 1️⃣ Total students
    const totalStudents = await Student.countDocuments();

    // Today date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 2️⃣ Today attendance
    const todayAttendance = await Attendance.find({ date: today });

    const presentToday = todayAttendance.filter(
      (a) => a.status === "present"
    ).length;

    const todayPercentage =
      totalStudents > 0
        ? Math.round((presentToday / totalStudents) * 100)
        : 0;

    // 3️⃣ Monthly average
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const monthly = await Attendance.aggregate([
      {
        $addFields: {
          m: { $month: "$date" },
          y: { $year: "$date" }
        }
      },
      { $match: { m: month, y: year } },
      {
        $group: {
          _id: "$date",
          present: {
            $sum: {
              $cond: [{ $eq: ["$status", "present"] }, 1, 0]
            }
          }
        }
      }
    ]);

    const monthlyAvg =
      monthly.length > 0
        ? Math.round(
            (monthly.reduce((a, b) => a + b.present, 0) /
              (monthly.length * totalStudents)) *
              100
          )
        : 0;

    res.json({
      totalStudents,
      todayPercentage,
      monthlyAvg
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load stats" });
  }
});

module.exports = router;
