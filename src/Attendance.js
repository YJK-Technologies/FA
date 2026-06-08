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

const OFFICE_LAT = 13.332963698098698;
const OFFICE_LNG = 80.19095630988188;


const Attendance = () => {
  const webcamRef = useRef(null);
  const cameraRef = useRef(null);
  const blinkCounterRef = useRef(0);

  const [loading, setLoading] = useState(false);

  const [location, setLocation] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [deviceDetails, setDeviceDetails] = useState("");
  const [locationType, setLocationType] = useState("");
  const [locationEnabled, setLocationEnabled] = useState(false);

  const attendanceLockRef = useRef(false);
  const blinkTimeRef = useRef(0);
  const doubleBlinkRef = useRef(0);

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
    if (
      !results ||
      !results.multiFaceLandmarks ||
      results.multiFaceLandmarks.length === 0
    ) {
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    const ear = calculateEAR(landmarks);

    if (ear === null) return;

    if (ear < EAR_THRESHOLD) {
      blinkCounterRef.current += 1;
    } else {

      if (blinkCounterRef.current >= BLINK_CONSEC_FRAMES) {

        const now = Date.now();

        if (now - blinkTimeRef.current <= 2000) {

          doubleBlinkRef.current += 1;

        } else {

          doubleBlinkRef.current = 1;

        }

        blinkTimeRef.current = now;

        if (
          doubleBlinkRef.current >= 2 &&
          !attendanceLockRef.current
        ) {

          attendanceLockRef.current = true;

          captureAndMarkAttendance();

          setTimeout(() => {
            attendanceLockRef.current = false;
          }, 3000);

          doubleBlinkRef.current = 0;
        }
      }

      blinkCounterRef.current = 0;
    }
  };

  const getCurrentLocationData = () => {
    return new Promise((resolve, reject) => {

      navigator.geolocation.getCurrentPosition(

        (position) => {

          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          const accuracy = position.coords.accuracy;

          const distance = calculateDistance(
            OFFICE_LAT,
            OFFICE_LNG,
            latitude,
            longitude
          );

          console.log("Office Lat:", OFFICE_LAT);
          console.log("Office Lng:", OFFICE_LNG);
          console.log("Current Lat:", latitude);
          console.log("Current Lng:", longitude);
          console.log("Distance:", distance);

          let currentLocationType = "Home";

          if (distance <= 500) {
            currentLocationType = "Office";
          } else if (distance <= 600) {
            currentLocationType = "On the Way";
          } else {
            currentLocationType = "Home";
          }

          resolve({
            latitude,
            longitude,
            accuracy,
            distance,
            locationType: currentLocationType
          });

        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  const calculateDistance = (
    lat1,
    lon1,
    lat2,
    lon2
  ) => {

    const R = 6371000;

    const dLat =
      (lat2 - lat1) * Math.PI / 180;

    const dLon =
      (lon2 - lon1) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +

      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *

      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c =
      2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    return R * c;
  };

  const loadDeviceInformation = async () => {

    try {

      setDeviceDetails(navigator.userAgent);

      const ipResponse = await fetch(
        "https://api.ipify.org?format=json"
      );

      const ipData = await ipResponse.json();

      setIpAddress(ipData.ip);

      const locationData =
        await getCurrentLocationData();

      setLocation(
        `${locationData.latitude},${locationData.longitude}`
      );

      setLocationType(
        locationData.locationType
      );

      setLocationEnabled(true);

    }
    catch (err) {

      setLocationEnabled(false);

      toast.error(
        "Location access is required for attendance"
      );

      console.error(err);

    }
  };

  useEffect(() => {
    loadDeviceInformation();

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

  const captureAndMarkAttendance = async () => {
    const locationData = await getCurrentLocationData();

    const currentLocation = `${locationData.latitude},${locationData.longitude}`;

    const currentLocationType = locationData.locationType;

    if (!currentLocation) {
      toast.error("Please enable location to mark attendance");
      return;
    }

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
        body: JSON.stringify({
          image: imageSrc,
          deviceDetails,

          ipAddress,

          location: currentLocation,

          locationType: currentLocationType
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
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
      <h2>(Double Blink To Mark Attendance)</h2>

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
