const express = require("express");
const Student = require("../models/Student");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// Add student
router.post("/", auth, async (req, res) => {
  try {
    const { name, rollNo } = req.body;
    if (!name || !rollNo) {
      return res.status(400).json({ message: "Name and rollNo required" });
    }

    const exists = await Student.findOne({ rollNo });
    if (exists) {
      return res.status(400).json({ message: "Roll number already exists" });
    }

    const student = await Student.create({ name, rollNo });
    res.status(201).json(student);
  } catch (err) {
    console.error("add student error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all students
router.get("/", auth, async (req, res) => {
  try {
    const students = await Student.find().sort({ rollNo: 1 });
    res.json(students);
  } catch (err) {
    console.error("get students error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
// Delete student
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    await Student.findByIdAndDelete(id);

    res.json({ message: "Student removed successfully" });
  } catch (err) {
    console.error("delete student error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});
// Update student
router.put("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, rollNo } = req.body;

    if (!name || rollNo === undefined) {
      return res.status(400).json({ message: "Name and rollNo required" });
    }

    const updated = await Student.findByIdAndUpdate(
      id,
      {
        name,
        rollNo: Number(rollNo),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("update student error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});
