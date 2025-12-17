const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();
connectDB();
console.log("Backend started...");

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:5173", // local frontend
      "http://localhost:3000", // optional
      "https://student-attendance-frontend-rose.vercel.app" // vercel frontend
    ],
    credentials: true
  })
);


app.get("/", (req, res) => {
  res.json({ message: "Student Attendance API running" });
});

const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
