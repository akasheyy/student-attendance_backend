const express = require("express");
const Attendance = require("../models/Attendance");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * =========================
 * MARK ATTENDANCE (ONE TIME)
 * =========================
 */
router.post("/mark", auth, async (req, res) => {
  try {
    const { records, date } = req.body;

    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ message: "Date and records required" });
    }

    const day = new Date(date);
    day.setHours(0, 0, 0, 0);

    // ✅ Safer check (scalable)
    const count = await Attendance.countDocuments({ date: day });
    if (count > 0) {
      return res.status(400).json({
        message: "Attendance already marked for this date"
      });
    }

    const docs = records
      .filter((r) => r.studentId && r.status)
      .map((r) => ({
        studentId: r.studentId,
        date: day,
        status: r.status
      }));

    await Attendance.insertMany(docs);

    res.status(201).json({ message: "Attendance marked successfully" });
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

    const safeRecords = records.map((r) => ({
      _id: r._id,
      date: r.date,
      status: r.status,
      student: r.studentId
        ? {
            name: r.studentId.name,
            rollNo: r.studentId.rollNo
          }
        : {
            name: "Deleted Student",
            rollNo: "-"
          }
    }));

    res.json(safeRecords);
  } catch (err) {
    console.error("daily report error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * =========================
 * MONTHLY REPORT
 * =========================
 */
router.get("/monthly", auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ message: "Month and year required" });
    }

    const m = Number(month);
    const y = Number(year);

    const report = await Attendance.aggregate([
      {
        $addFields: {
          month: { $month: "$date" },
          year: { $year: "$date" }
        }
      },
      { $match: { month: m, year: y } },
      {
        $group: {
          _id: "$studentId",
          present: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] }
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] }
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
      {
        $unwind: {
          path: "$student",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          rollNo: { $ifNull: ["$student.rollNo", "-"] },
          name: { $ifNull: ["$student.name", "Deleted Student"] },
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

/**
 * =========================
 * EDIT ATTENDANCE (24 HR)
 * =========================
 */
router.put("/edit", auth, async (req, res) => {
  try {
    const { date, records } = req.body;

    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ message: "Date and records required" });
    }

    const day = new Date(date);
    day.setHours(0, 0, 0, 0);

    const existing = await Attendance.findOne({ date: day });
    if (!existing) {
      return res.status(404).json({
        message: "Attendance not found for this date"
      });
    }

    const hoursDiff =
      (Date.now() - day.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      return res.status(403).json({
        message: "Attendance is locked after 24 hours"
      });
    }

    for (const rec of records) {
      if (!rec.studentId || !rec.status) continue;

      await Attendance.updateOne(
        { studentId: rec.studentId, date: day },
        { $set: { status: rec.status } }
      );
    }

    res.json({ message: "Attendance updated successfully" });
  } catch (err) {
    console.error("edit attendance error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
