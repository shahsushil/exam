const mongoose = require("mongoose");
const CheatingLogSchema = new mongoose.Schema({
  studentId: { type: mongoose.Types.ObjectId, ref: "Student" },
  examId: { type: mongoose.Types.ObjectId, ref: "Exam" },
  reason: String,
  extra: Object,
  timestamp: { type: Date, default: Date.now },
});
module.exports = mongoose.model("CheatingLog", CheatingLogSchema);
