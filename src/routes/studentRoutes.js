const express = require("express");
const Student = require("../models/Student");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * =========================
 * ADD STUDENT
 * =========================
 */
router.post("/", auth, async (req, res) => {
  try {
    const { name, rollNo } = req.body;

    if (!name || rollNo === undefined) {
      return res.status(400).json({
        message: "Name and roll number are required"
      });
    }

    const exists = await Student.findOne({ rollNo });
    if (exists) {
      return res.status(400).json({
        message: "Roll number already exists"
      });
    }

    const student = await Student.create({
      name,
      rollNo: Number(rollNo),
      isActive: true
    });

    res.status(201).json(student);
  } catch (err) {
    console.error("add student error:", err.message);
    res.status(400).json({
      message: err.message || "Invalid student data"
    });
  }
});

/**
 * =========================
 * GET ALL ACTIVE STUDENTS
 * =========================
 */
router.get("/", auth, async (req, res) => {
  try {
    const students = await Student.find({ isActive: true }).sort({ rollNo: 1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * =========================
 * UPDATE STUDENT
 * =========================
 */
router.put("/:id", auth, async (req, res) => {
  try {
    const { name, rollNo } = req.body;

    if (!name || rollNo === undefined) {
      return res.status(400).json({
        message: "Name and roll number are required"
      });
    }

    const updated = await Student.findByIdAndUpdate(
      req.params.id,
      {
        name,
        rollNo: Number(rollNo)
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Student not found"
      });
    }

    res.json(updated);
  } catch (err) {
    console.error("update student error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * =========================
 * SOFT DELETE STUDENT
 * =========================
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    await Student.findByIdAndUpdate(req.params.id, {
      isActive: false
    });

    res.json({ message: "Student removed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
