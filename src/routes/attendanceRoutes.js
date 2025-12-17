const express = require("express");
const Attendance = require("../models/Attendance");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * =========================
 * MARK ATTENDANCE (DAILY)
 * =========================
 */
router.post("/mark", auth, async (req, res) => {
  try {
    const { records, date } = req.body;
    // records: [{ studentId, status }]

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
        {
          studentId: rec.studentId,
          date: day,
          status: rec.status,
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

      results.push(doc);
    }

    res.status(201).json(results);
  } catch (err) {
    console.error("mark attendance error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * =========================
 * DAILY REPORT
 * =========================
 */
router.get("/daily", auth, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

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

/**
 * =========================
 * MONTHLY REPORT
 * =========================
 * Returns:
 * rollNo, name, present, absent, total, percentage
 */
router.get("/monthly", auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ message: "Month and year required" });
    }

    const m = Number(month); // 1–12
    const y = Number(year);

    const report = await Attendance.aggregate([
      {
        $addFields: {
          month: { $month: "$date" },
          year: { $year: "$date" }
        }
      },
      {
        $match: {
          month: m,
          year: y
        }
      },
      {
        $group: {
          _id: "$studentId",
          present: {
            $sum: {
              $cond: [{ $eq: ["$status", "present"] }, 1, 0]
            }
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ["$status", "absent"] }, 1, 0]
            }
          },
          total: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "students",
          localField: "_id",
          foreignField: "_id",
          as: "student"
        }
      },
      { $unwind: "$student" },
      {
        $project: {
          _id: 0,
          rollNo: "$student.rollNo",
          name: "$student.name",
          present: 1,
          absent: 1,
          total: 1,
          percentage: {
            $round: [
              {
                $multiply: [
                  { $divide: ["$present", "$total"] },
                  100
                ]
              },
              2
            ]
          }
        }
      },
      { $sort: { rollNo: 1 } }
    ]);

    res.json(report);
  } catch (err) {
    console.error("monthly report error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});



module.exports = router;
