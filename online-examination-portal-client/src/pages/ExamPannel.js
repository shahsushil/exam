/* global chrome */

import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import axios from 'axios';
import '../axios';
import QuestionCard from '../components/QuestionCard';
import CountDownTimer from '../components/CountDownTimer';
import Button from '@mui/material/Button';
import { Chip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';



const ExamPannel = () => {
  const { examID } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState([])
  const [response, setResponse] = useState([])
  const [currQuestion, setCurrQuestion] = useState(0);
  const [questionStatus, setQuestionStatus] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [counts, setCounts] = useState({ answered: 0, flagged: 0, rest: 0 })

  // Anti-cheat states
  const [warnings, setWarnings] = useState(0);
  const [cheatDialog, setCheatDialog] = useState({ open: false, message: "" });
  const terminatedRef = useRef(false);

  // -------- Fullscreen helpers --------
  const enterFullScreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => { });
      }
    }
  };

  const exitFullScreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { });
    }
  };

  // Fetch exam + enter fullscreen
  useEffect(() => {
    setLoading(true)
    axios.get(`/exam/get-exam-data/${examID}`)
      .then(res => {
        const initialResponse = new Array(res.data.exam[0].questions.length).fill(null)
        setResponse(initialResponse)
        setExam(res.data.exam[0])
        setLoading(false)

        // ✅ Force fullscreen once exam loads
        enterFullScreen();
      })
      .catch(err => {
        console.log(err)
        setLoading(false)
      })
  }, [examID])

  useEffect(() => {
    if (!exam || !exam.questions) return;
    let c1 = 0, c2 = 0;
    const items = [...questionStatus]
    for (const item of items) {
      if (item === 'answered') c1++;
      else c2++;
    }
    setCounts({ answered: c1, flagged: c2, rest: exam.questions.length - c1 - c2 })
  }, [questionStatus, exam])

  // ✅ Centralized exam termination
  const terminateExam = async (reason = "Exam Ended") => {
    if (terminatedRef.current) return;
    terminatedRef.current = true;

    try {
      exitFullScreen(); // ✅ Always exit fullscreen
    } catch (e) {}

    // ✅ Submit responses before redirect
    let object = {
      examID,
      studentID: JSON.parse(localStorage.getItem('userData')).user.userID,
      score: 0,
      response: []
    };

    for (let i = 0; i < response.length; i++) {
      object.response.push({
        question: exam.questions[i].question,
        questionID: exam.questions[i]._id,
        givenAnswer: response[i] ? response[i] : null,
      });
    }

    try {
      await axios.post(`/result/submit/${examID}`, {
        response: { ...object }
      });
    } catch (err) {
      console.error("Submit error:", err);
    }

    // ✅ Redirect to dashboard instead of staying on exam UI
    navigate("/dashboard");
  };

  // ---------- Manual submit ----------
  const handleSubmit = () => terminateExam("Student submitted");

  // ---------- Anti-cheat detection ----------

  // Inside your ExamPannel component
  useEffect(() => {
  const handleMouseMove = (e) => {
    if (e.clientY <= 10) {
      // Cursor near top edge (where fullscreen cross is)
      setCheatDialog({
        open: true,
        message: "⚠️ Warning: Clicking the fullscreen cross will end your exam automatically."
      });
    }
  };

  window.addEventListener("mousemove", handleMouseMove);

  return () => {
    window.removeEventListener("mousemove", handleMouseMove);
  };
}, []);


useEffect(() => {
  const handleFullScreenChange = () => {
    if (!document.fullscreenElement) {
      // ✅ User pressed Esc OR clicked the "X" button to exit fullscreen
      if (!terminatedRef.current) {
        terminatedRef.current = true;
        setCheatDialog({
          open: true,
          message: "❌ Exam ended because fullscreen was exited."
        });

        setTimeout(() => {
          handleSubmit();   // auto-submit exam
          navigate("/dashboard"); // redirect to dashboard
        }, 2000);
      }
    }
  };

  document.addEventListener("fullscreenchange", handleFullScreenChange);

  return () => {
    document.removeEventListener("fullscreenchange", handleFullScreenChange);
  };
}, []);

  useEffect(() => {
    let lastViolationTime = 0;

    const handleViolation = (reason) => {
      if (terminatedRef.current) return;

      const now = Date.now();
      if (now - lastViolationTime < 1500) return; // prevent double trigger
      lastViolationTime = now;

      setWarnings((prev) => {
        const newWarnings = prev + 1;
        if (newWarnings >= 3) {
          setCheatDialog({ open: true, message: "❌ Exam terminated due to multiple cheating attempts." });
          setTimeout(() => terminateExam("Cheating"), 2000);
        } else if (newWarnings === 2) {
          setCheatDialog({ open: true, message: `⚠️ Warning ${newWarnings}/3: ${reason}. LAST warning!` });
        } else {
          setCheatDialog({ open: true, message: `⚠️ Warning ${newWarnings}/3: ${reason}` });
        }
        return newWarnings;
      });
    };

    // Detect tab switching / blur
    const onVisibility = () => {
      if (document.hidden) handleViolation("Tab switched / minimized");
    };
    const onBlur = () => handleViolation("Window inactive / switched");

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);

    // ✅ Listen for extension messages (optional)
    if (window.chrome && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "inactive") {
          handleViolation("Active Window Extension: User not active");
        }
      });
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      if (window.chrome && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.removeListener(() => {});
      }
    };
  }, []);

  return (
    <>
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      {/* Anti-cheat Warning Dialog */}
      <Dialog open={cheatDialog.open} onClose={() => setCheatDialog({ ...cheatDialog, open: false })}>
        <DialogTitle>Exam Notice</DialogTitle>
        <DialogContent>{cheatDialog.message}</DialogContent>
        <DialogActions>
          <Button onClick={() => setCheatDialog({ ...cheatDialog, open: false })}>OK</Button>
        </DialogActions>
      </Dialog>

      {/* --- Exam UI --- */}
      <div className='min-h-screen w-full flex flex-col items-center'>
        {/* Top bar */}
        <div className='flex w-full justify-between items-center px-8 dark-blue-bg' style={{ height: "50px" }}>
          <h1 className='text-lg font-semibold' style={{ zIndex: 1 }}>{exam.name}</h1>
          <span className='text-lg font-normal px-6 bg-blue-900' style={{ height: "50px" }}>
            <p className='relative top-2'>
              {exam.duration !== undefined &&
                <CountDownTimer
                  minutes={exam.duration}
                  handleSubmit={handleSubmit}
                />}
            </p>
          </span>
          <Button
            variant='outlined'
            className='rounded-md'
            size='small'
            color='success'
            style={{ color: 'lightgreen' }}
            onClick={handleSubmit}   // ✅ Directly end exam + redirect
          >
            Submit
          </Button>
        </div>

        {/* Left sidebar */}
        <div className=' w-1/5 absolute left-0 bottom-0 pt-16 px-2 dark-blue-bg flex flex-col justify-between' style={{ height: '99.7vh' }}>
          <div>
            <h2 className='text-md font-medium pt-6 -mt-4' style={{ borderTop: "1px solid black" }}>Questions Status</h2>
            <div>
              {exam.questions && exam.questions.map((item, index) => {
                return (
                  <Chip
                    key={index}
                    label={index + 1}
                    color={questionStatus[index] ?
                      (questionStatus[index] === 'answered' ? 'success' : 'secondary')
                      : 'primary'}
                    style={{ cursor: 'pointer', margin: '7px', width: '50px', aspectRatio: '1' }}
                    clickable
                    onClick={() => setCurrQuestion(index)}
                  />
                )
              })}
            </div>
          </div>
        </div>

        {/* Main question panel */}
        <div className=' w-3/4 absolute right-0 top-16 flex flex-col justify-between' style={{ height: '91vh' }}>
          <div>
            {exam.questions &&
              <QuestionCard
                question={exam.questions}
                response={response}
                setResponse={setResponse}
                setCurrQuestion={setCurrQuestion}
                currQuestion={currQuestion}
                setQuestionStatus={setQuestionStatus}
                questionStatus={questionStatus}
                counts={counts}
                open={open}
                setOpen={setOpen}
                exam={exam}
                examID={examID}
              />}
          </div>
        </div>
      </div>
    </>
  )
}

export default ExamPannel
