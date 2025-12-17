const express = require("express");
const Attendance = require("../models/Attendance");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// Mark attendance for a day
router.post("/mark", auth, async (req, res) => {
  try {
    const { records, date } = req.body;
    // records: [{ studentId, status }, ...]
    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ message: "Date and records required" });
    }

    const day = new Date(date);
    day.setHours(0, 0, 0, 0);

    const results = [];

    for (const rec of records) {
      if (!rec.studentId || !rec.status) continue;

      const doc = await Attendance.findOneAndUpdate(
        { studentId: rec.studentId, date: day },
        { studentId: rec.studentId, date: day, status: rec.status },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      results.push(doc);
    }

    res.status(201).json(results);
  } catch (err) {
    console.error("mark attendance error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Daily report
router.get("/daily", auth, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "Date is required" });

    const day = new Date(date);
    day.setHours(0, 0, 0, 0);

    const records = await Attendance.find({ date: day }).populate(
      "studentId",
      "name rollNo"
    );

    res.json(records);
  } catch (err) {
    console.error("daily report error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Monthly report (counts present days per student)
router.get("/monthly", auth, async (req, res) => {
  try {
    const { month, year } = req.query; // month: 1-12
    if (!month || !year) {
      return res.status(400).json({ message: "Month and year required" });
    }

    const m = Number(month) - 1; // JS month index
    const y = Number(year);

    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);

    const data = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: "$studentId",
          presentDays: {
            $sum: {
              $cond: [{ $eq: ["$status", "present"] }, 1, 0]
            }
          },
          totalDays: { $sum: 1 }
        }
      }
    ]);

    // populate student data
    const populated = await Attendance.populate(data, {
      path: "_id",
      select: "name rollNo",
      model: "Student"
    });

    res.json(populated);
  } catch (err) {
    console.error("monthly report error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
