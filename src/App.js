import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import LandingPage from "./LandingPage";
import Register from "./Register";
import Attendance from "./Attendance";
import Report from "./Report";
import LoadingScreen from "./LoadingScreen";
import "./App.css";

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000); 

    return () => clearTimeout(timer);
  }, []);

  return (
    <Router>
     {loading ? (
        <LoadingScreen />
      ) : (
        <div className="App">
          <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
          <div className={`main-content ${isOpen ? "open" : ""}`}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/register" element={<Register />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/report" element={<Report />} />
            </Routes>
          </div>
        </div>
      )}    </Router>
  );
}

export default App;
