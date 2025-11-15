// useAntiCheating.js
import { useEffect, useRef } from "react";
import axios from "../axios"; // or your API wrapper

/**
 * options: { examId, studentId, maxWarnings = 3, reportUrl }
 */
export default function useAntiCheating({ examId, studentId, maxWarnings = 3, reportUrl = "/api/cheating/log" }) {
  const warningsRef = useRef(0);
  const lastTypingTsRef = useRef(null);
  const typingBurstRef = useRef(0);

  const sendReport = async (reason, extra = {}) => {
    try {
      await axios.post(reportUrl, {
        examId, studentId, reason, extra, timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to send anti-cheat report", err);
    }
  };

  const registerWarning = async (reason, extra) => {
    warningsRef.current += 1;
    await sendReport(reason, extra);
    // optional immediate UI warning
    if (warningsRef.current >= maxWarnings) {
      // terminate exam (call your endpoint)
      try {
        await axios.post("/api/cheating/terminate", { examId, studentId });
      } catch (err) {
        console.error("Terminate request failed", err);
      }
      alert("Exam terminated due to repeated suspicious behavior.");
      window.location.href = "/exam-terminated";
    } else {
      // show small warning
      console.warn(`Warning ${warningsRef.current}: ${reason}`);
    }
  };

  useEffect(() => {
    // Visibility / tab switch
    const onVisibility = () => {
      if (document.hidden) registerWarning("tab-switch-or-minimize");
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Window blur (loss of focus)
    const onBlur = () => registerWarning("window-blur");
    window.addEventListener("blur", onBlur);

    // Copy / paste detection
    const onCopy = () => registerWarning("copy-action");
    const onPaste = () => registerWarning("paste-action");
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);

    // Detect devtools (heuristic)
    let devtoolsOpen = false;
    const devtoolsCheck = () => {
      // simple heuristic: measure console open
      const threshold = 160;
      const start = new Date();
      debugger;
      const end = new Date();
      if (end - start > threshold && !devtoolsOpen) {
        devtoolsOpen = true;
        registerWarning("devtools-open");
      }
    };
    const devtoolsInterval = setInterval(devtoolsCheck, 2000);

    // Auto-typer / paste heuristic: detect extremely fast typing bursts
    const onKeyDown = (e) => {
      const now = Date.now();
      if (!lastTypingTsRef.current) lastTypingTsRef.current = now;
      const dt = now - lastTypingTsRef.current;
      lastTypingTsRef.current = now;

      // if dt < 20ms consider automated or hardware macro
      if (dt < 20) {
        typingBurstRef.current += 1;
      } else {
        typingBurstRef.current = Math.max(0, typingBurstRef.current - 1);
      }
      if (typingBurstRef.current > 8) {
        registerWarning("auto-typer-detected", { dt, key: e.key });
        typingBurstRef.current = 0;
      }
    };
    document.addEventListener("keydown", onKeyDown);

    // Detect long inactivity while answer appears (optional)
    // Fingerprint / VM hints using WebGL + navigator
    const vmFingerprint = () => {
      const fp = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        cores: navigator.hardwareConcurrency,
      };
      try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        if (gl) {
          const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
          if (debugInfo) {
            fp.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            fp.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          }
        }
      } catch (e) { /* ignore */ }
      // send once on exam start
      sendReport("fingerprint", fp);
    };
    vmFingerprint();

    // cleanup
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("keydown", onKeyDown);
      clearInterval(devtoolsInterval);
    };
  }, [examId, studentId]);
}
