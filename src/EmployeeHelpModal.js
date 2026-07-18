import React, { useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import { ClientSideRowModelModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { FaSearch, FaSync } from "react-icons/fa";
import toast from "react-hot-toast";

ModuleRegistry.registerModules([ClientSideRowModelModule]);

const config = require("./ApiConfig"); // Check your ApiConfig path

const EmployeeHelpModal = ({ isOpen, onClose, onSelectEmployee }) => {
  const [modalEmpId, setModalEmpId] = useState("");
  const [modalEmpName, setModalEmpName] = useState("");
  const [modalRowData, setModalRowData] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const modalColumnDefs = [
    { headerName: "Employee ID", field: "Employee_ID", flex: 1, minWidth: 120 },
    { headerName: "Employee Name", field: "name", flex: 1, minWidth: 150 },
  ];

  // Popup search button functionality
  const handleModalSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${config.apiBaseUrl}/searchEmployee`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Employee_ID: modalEmpId, 
          name: modalEmpName       
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setModalRowData(data); 
        // toast.success("Data fetched successfully");
      } else if (response.status === 404) {
        setModalRowData([]);
        toast.error("Data not found"); 
      } else {
        const errData = await response.json();
        toast.error(errData.error || "Failed to fetch employee data");
      }
    } catch (error) {
      console.error("Error fetching help data:", error);
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleModalReload = () => {
    console.log("Modal Reload clicked");
    setModalEmpId("");
    setModalEmpName("");
    setModalRowData([]);
  };

  // Action when a row is double-clicked in the grid
  const onRowDoubleClicked = (event) => {
    const selectedData = event.data;
    onSelectEmployee(selectedData.Employee_ID); // Sends the ID to the main file
    onClose(); // Closes the popup
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content-box" style={{ width: "600px", maxWidth: "95%" }}>
        <div className="modal-header">
          <h3>Employee Help</h3>
          <button className="close-modal-btn" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleModalSearch} className="modal-form">
          <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
            <div className="modal-input-group" style={{ flex: 1 }}>
              <label>Employee ID</label>
              <input 
                type="text" 
                value={modalEmpId} 
                onChange={(e) => setModalEmpId(e.target.value)} 
                placeholder="Enter Employee ID"
              />
            </div>
            <div className="modal-input-group" style={{ flex: 1 }}>
              <label>Employee Name</label>
              <input 
                type="text" 
                value={modalEmpName} 
                onChange={(e) => setModalEmpName(e.target.value)} 
                placeholder="Enter Employee Name"
              />
            </div>
          </div>
          
          <div className="button-container" style={{ justifyContent: "flex-end", marginTop: "0", marginBottom: "15px" }}>
            <button 
              type="submit" 
              className="icon-btn"
              disabled={loading}
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              <FaSearch />
            </button>
            <button 
              type="button" 
              className="icon-btn" 
              onClick={handleModalReload}
            >
              <FaSync />
            </button>
          </div>
        </form>

        <div className="modal-table-container" style={{ padding: "0 20px 20px 20px" }}>
          <p style={{ fontSize: "12px", color: "#666", margin: "0 0 5px 0" }}>
           <strong>Instructions:</strong> Double click on a row to select the employee
          </p>
          <div className="ag-theme-alpine" style={{ height: "250px", width: "100%" }}>
            <AgGridReact
              columnDefs={modalColumnDefs}
              rowData={modalRowData}
              headerHeight={40}
              rowHeight={40}
              onRowDoubleClicked={onRowDoubleClicked}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeHelpModal;