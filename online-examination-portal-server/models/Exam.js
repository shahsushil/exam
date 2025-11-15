const mongoose = require('mongoose');

const ExamSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a exam name'],
        trim: true,
        maxLength: [30, 'Exam name cannot be more than 30 characters'],
        minLength: [3, 'Exam name cannot be less than 3 characters'],
    },
    description: {
        type: String,
        required: [true, 'Please provide a description'],
    },
    duration: {
        type: Number,
        required: [true, 'Please provide a duration of exam'],
    },
    topics: {
        type: Array,
        required: [true, 'Please provide a topics of exam'],
    },
    createdBy: {
        type: mongoose.Types.ObjectId,
        ref: 'Examiner',
        required: [true, 'Please provide a examiner id'],
    },
    questions: [{
        question: {
            type: String,
        },
        options: {
            type: Array,
        },
        answer: {
            type: String,
        },
        image: {
            type: String,
        },
    }],
    registeredStudents: {
        type: Array,
    },
    cheatingAttempts: {
      type: Number,
      default: 0,
    },
    cheatingLogs: [
      {
        type: String, // e.g. "Tab switch detected", "VirtualBox detected", "Auto typer detected"
        timestamp: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ["active", "terminated", "completed"],
      default: "active",
    }
}, { timestamps: true })

module.exports = mongoose.model('Exam', ExamSchema);

// const mongoose = require("mongoose");

// const ExamSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     examId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Exam",
//       required: true,
//     },
//     startTime: {
//       type: Date,
//       default: Date.now,
//     },
//     endTime: {
//       type: Date,
//     },
//     cheatingAttempts: {
//       type: Number,
//       default: 0,
//     },
//     cheatingLogs: [
//       {
//         type: String, // e.g. "Tab switch detected", "VirtualBox detected", "Auto typer detected"
//         timestamp: { type: Date, default: Date.now },
//       },
//     ],
//     status: {
//       type: String,
//       enum: ["active", "terminated", "completed"],
//       default: "active",
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("ExamSession", ExamSchema);
