import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import toast, { Toaster } from "react-hot-toast";
import { FaceMesh } from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";
import LoadingScreen from "./LoadingScreen";
import "./CSS/Attendance.css";
import "./App.css";
import { Tooltip } from "react-tooltip";

const config = require("./ApiConfig");

const EAR_THRESHOLD = 0.2;
const BLINK_CONSEC_FRAMES = 3;

const Attendance = () => {
  const webcamRef = useRef(null);
  const cameraRef = useRef(null);
  const blinkCounterRef = useRef(0);

  const [loading, setLoading] = useState(false);
  const [blinkCount, setBlinkCount] = useState(0);

  const calculateEAR = (landmarks) => {
    const indices = [33, 160, 158, 133, 153, 144];
    if (!Array.isArray(landmarks)) return null;

    for (let i of indices) {
      if (!landmarks[i] || landmarks[i].x == null || landmarks[i].y == null) {
        return null;
      }
    }

    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

    const vertical1 = dist(landmarks[160], landmarks[144]);
    const vertical2 = dist(landmarks[158], landmarks[153]);
    const horizontal = dist(landmarks[33], landmarks[133]);

    if (horizontal === 0) return null;

    return (vertical1 + vertical2) / (2.0 * horizontal);
  };

  const onResults = (results) => {
    if (!results || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;

    const landmarks = results.multiFaceLandmarks[0];
    const ear = calculateEAR(landmarks);

    if (ear === null) return;

    if (ear < EAR_THRESHOLD) {
      blinkCounterRef.current += 1;
    } else {
      if (blinkCounterRef.current >= BLINK_CONSEC_FRAMES) {
        setBlinkCount((prev) => {
          const newCount = prev + 1;
          // toast.success(`Blink ${newCount} detected!`);

          if (newCount === 1) {
            captureAndMarkAttendance("checkin");
          } else if (newCount === 2) {
            captureAndMarkAttendance("checkout");
          } else if (newCount > 2) {
            blinkCounterRef.current = 0; // Reset blink counter after 2 successful detections
            return 0;
          }

          return newCount;
        });
      }
      blinkCounterRef.current = 0; // Reset if the ear threshold is above the blink detection threshold
    }
  };

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults(onResults);

    let cameraInstance = null;

    const startCamera = () => {
      if (
        webcamRef.current &&
        webcamRef.current.video &&
        webcamRef.current.video.readyState === 4 // HAVE_ENOUGH_DATA
      ) {
        cameraInstance = new cam.Camera(webcamRef.current.video, {
          onFrame: async () => {
            await faceMesh.send({ image: webcamRef.current.video });
          },
          width: 640,
          height: 480,
        });
        cameraInstance.start();
        cameraRef.current = cameraInstance;
      } else {
        // Retry until webcam is ready
        setTimeout(startCamera, 100);
      }
    };

    startCamera();

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
    };
  }, []);

  const captureAndMarkAttendance = async (type) => {
    setLoading(true);
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        toast.error("Unable to capture image. Try again.");
        setLoading(false);
        return;
      }

      const response = await fetch(`${config.apiBaseUrl}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageSrc, type }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || `Attendance ${type} successful!`);
      } else {
        toast.error(data.message || `Attendance ${type} failed.`);
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="attendance-container">
      <Tooltip id="shared-tooltip" place="top" className="custom-tooltip" />
      <Toaster position="top-right" reverseOrder={false} />
      {loading && <LoadingScreen />}
      <h2 className="attendance-title">Employee Attendance</h2>
      <h2 className="">(Blink to Check In/Out)</h2>

      <div className="webcam-container">
        <Webcam
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          className="webcam"
          audio={false}
          mirrored={false}
          videoConstraints={{
            width: 640,
            height: 480,
            facingMode: "user",
          }}
        />
      </div>
    </div>
  );
};

export default Attendance;
