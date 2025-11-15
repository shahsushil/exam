const express = require("express");
const router = express.Router();
const CheatingLog = require("../models/CheatingLog");
// const ExamSession = require("../models/ExamSession"); // if you have
const ExamSchema = require("../models/Exam");
// POST /api/cheating/log
router.post("/log", async (req, res) => {
  try {
    const { studentId, examId, reason, extra } = req.body;
    await CheatingLog.create({ studentId, examId, reason, extra });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});
// POST /api/cheating/terminate
router.post("/terminate", async (req, res) => {
  try {
    const { studentId, examId } = req.body;
    // Mark session as terminated and optionally auto-submit results
    await ExamSchema.findOneAndUpdate({ studentId, examId }, { isTerminated: true });
    // additional auto-submit logic ...
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});
module.exports = router;
