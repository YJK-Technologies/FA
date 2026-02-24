import React, { useState } from "react";
import "./CSS/Sidebar.css";
import { FaBars, FaTimes } from "react-icons/fa";
import { Link } from "react-router-dom";
import { Tooltip } from 'react-tooltip';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div>
       <Tooltip id="shared-tooltip" place="top" className="custom-tooltip" />
      <button className="menu-btn" onClick={toggleSidebar}>
        {isOpen ? <FaTimes data-tooltip-id="shared-tooltip"  data-tooltip-content="Close"/> : <FaBars data-tooltip-id="shared-tooltip"
        data-tooltip-content="Sidebar Menu"/>}
      </button>

      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        <ul className={`sidebar-list ${isOpen ? "fade-in" : ""}`}>
          <li><Link to="/" onClick={toggleSidebar}>🏠 Home</Link></li>
          <li><Link to="/attendance" onClick={toggleSidebar}>📅 Attendance</Link></li>
          <li><Link to="/register" onClick={toggleSidebar}>📝 Register</Link></li>
          <li><Link to="/report" onClick={toggleSidebar}>👤 Report</Link></li>
        </ul>

        <div className="sidebar-footer">
          <div>© YJK TECHNOLOGIES</div>
          <div>Version 0.0.1</div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
