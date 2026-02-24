import React, { useState, useRef } from "react";
import Webcam from "react-webcam";
import './CSS/Register.css';
import './App.css';
import toast, { Toaster } from 'react-hot-toast';
import LoadingScreen from "./LoadingScreen";
import { Tooltip } from 'react-tooltip';

const config = require("./ApiConfig");

const Register = () => {
  const [empId, setEmpId] = useState("");
  const [name, setName] = useState("");
  const webcamRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const registerEmployee = async () => {
    let hasError = false;

    const empInput = document.getElementById("empId");
    const nameInput = document.getElementById("empName");

    if (!empId.trim()) {
      empInput.classList.add("shake");
      hasError = true;
    }

    if (!name.trim()) {
      nameInput.classList.add("shake");
      hasError = true;
    }

    if (hasError) {
      toast.error("Error: Missing required fields");
      setTimeout(() => {
        empInput.classList.remove("shake");
        nameInput.classList.remove("shake");
      }, 500);
      return; 
    }

    setLoading(true);
    let images = [];

    for (let i = 0; i < 5; i++) {
      let image = webcamRef.current.getScreenshot();
      images.push(image);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    try {
      const response = await fetch(`${config.apiBaseUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empId, name, images })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Employee registered successfully!");
        window.location.reload();
      } else {
        toast.error(data.error || "Failed to register employee.");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to register employee.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content">
      <Tooltip id="shared-tooltip" place="top" className="custom-tooltip" />
      <Toaster position="top-right" reverseOrder={false} />
      <div className="register-container">
        <h2 className="register-title">Employee Registration</h2>
        {loading && <LoadingScreen />}
        <div className="webcam-container">
          <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="webcam" />
        </div>
        <input
          id="empId"
          type="text"
          value={empId}
          onChange={(e) => setEmpId(e.target.value)}
          placeholder="Employee ID"
          className="input-field"
          data-tooltip-id="shared-tooltip"
          data-tooltip-content="Enter Employee ID"
        />
        <input
          id="empName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="input-field"
          data-tooltip-id="shared-tooltip"
          data-tooltip-content="Enter Name"
        />
        <button onClick={registerEmployee} data-tooltip-id="shared-tooltip"
          data-tooltip-content="Register" className="register-button">Register</button>
      </div>
    </div>
  );
};

export default Register;
