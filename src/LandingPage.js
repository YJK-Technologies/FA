import React from "react";
import "./CSS/LandingPage.css";
import Logo from "./Images/Logo.PNG";
import Tilt from "react-parallax-tilt";

const LandingPage = () => {

  return (
    <div className="landing-container">
      <nav className="navbar">
        <div className="logo"><img src={Logo} /><p>TECHNOLOGIES</p></div>
      </nav>

      <div className="hero-section">
        <div className="content">
          <h1>
            <span className="white-text">F</span>
            <span className="white-text">A</span>
            <span className="white-text">C</span>
            <span className="white-text">E</span>
            &nbsp;
            <span className="pink-text">R</span>
            <span className="pink-text">E</span>
            <span className="pink-text">C</span>
            <span className="pink-text">O</span>
            <span className="pink-text">G</span>
            <span className="pink-text">N</span>
            <span className="pink-text">I</span>
            <span className="pink-text">T</span>
            <span className="pink-text">I</span>
            <span className="pink-text">O</span>
            <span className="pink-text">N</span>
          </h1>
          <p className="pink-text">ML-Powered Face Recognition Attendance System </p>

          <p>Our Face Attendance System leverages cutting-edge ML to ensure accurate and efficient attendance tracking. 
             Built using React, Node.js, Python, and SQL Server, it integrates InsightFace and YOLO models for precise face detection and recognition.</p>
        </div>

        <Tilt
          tiltMaxAngleX={25}
          tiltMaxAngleY={25}
          perspective={1000}
          transitionSpeed={1500}
          scale={1.1}
          className="wireframe-face-container"
        >
          <div className="wireframe-face"></div>
        </Tilt>
      </div>
    </div>
  );
};

export default LandingPage;
