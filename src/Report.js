import React, { useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import { ClientSideRowModelModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { FaSearch, FaSync } from "react-icons/fa";
import "./CSS/Report.css";
import toast, { Toaster } from 'react-hot-toast';
import { Tooltip } from 'react-tooltip';

const config = require("./ApiConfig");

ModuleRegistry.registerModules([ClientSideRowModelModule]);
const AttendanceLog = () => {
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [Employee_ID, setEmployee_ID] = useState("");
    const [rowData, setRowData] = useState([]);

    const columnDefs = [
        { headerName: "Employee ID", field: "empId", flex: 1, minWidth: 150 },
        { headerName: "Employee Name", field: "name", flex: 1, minWidth: 150 },
        { headerName: "Date", field: "date", flex: 1, minWidth: 150 },
        { headerName: "IN", field: "inTime", flex: 1, minWidth: 150 },
        { headerName: "OUT", field: "outTime", flex: 1, minWidth: 150 },
        { headerName: "Total Hours", field: "totalHours", flex: 1, minWidth: 150 },
    ];

    const formatDate = (isoDateString) => {
        const date = new Date(isoDateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
        const day = String(date.getDate()).padStart(2, '0');
        return (`${year}-${month}-${day}`);
    };

    const handleSearch = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${config.apiBaseUrl}/searchAttendance`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ Employee_ID, from_date: fromDate, to_date: toDate })
            });
            if (response.ok) {
                const searchData = await response.json();
                const newRows = searchData.map((matchedItem) => ({
                    empId: matchedItem.Employee_ID,
                    name: matchedItem.name,
                    date: formatDate(matchedItem.date),
                    inTime: matchedItem.First_CheckIn,
                    outTime: matchedItem.Last_CheckOut,
                    totalHours: matchedItem.Total_Hours
                }));
                setRowData(newRows);
                console.log("Data fetched successfully");
            } else if (response.status === 404) {
                console.log("Data not found");
                toast.error("Data not found")
                setRowData([]);
            } else {
                const errorResponse = await response.json();
                toast.error(errorResponse.message || "Failed to insert sales data");
            }
        } catch (error) {
            console.error("Error saving data:", error);
            toast.error("Error updating data: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReload = () => {
        console.log("Reload clicked");
        setFromDate("");
        setToDate("");
        setEmployee_ID("");
        setRowData([]);
    };

    return (
        <div className="attendance-container">
            <Tooltip id="shared-tooltip" place="top" className="custom-tooltip" />
            <Toaster position="top-right" reverseOrder={false} />
            <h2 className="title">Attendance Report</h2>
            <div className="search-container">
                <div className="input-group">
                    <label>From:</label>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        data-tooltip-id="shared-tooltip"
                        data-tooltip-content="Enter From Date"
                    />
                </div>
                <div className="input-group">
                    <label>To:</label>
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        data-tooltip-id="shared-tooltip"
                        data-tooltip-content="Enter To Date"
                    />
                </div>
                <div className="input-group">
                    <label>Employee Id:</label>
                    <input
                        type="text"
                        value={Employee_ID}
                        onChange={(e) => setEmployee_ID(e.target.value)}
                        data-tooltip-id="shared-tooltip"
                        data-tooltip-content="Enter Employee ID"
                    />
                </div>
                <div className="button-container">
                    <button className="icon-btn" data-tooltip-id="shared-tooltip"
                        data-tooltip-content="Search" onClick={handleSearch}>
                        <FaSearch />
                    </button>

                    <button className="icon-btn" data-tooltip-id="shared-tooltip"
                        data-tooltip-content="Reload" onClick={handleReload}>
                        <FaSync />
                    </button>
                </div>
            </div>
            <div className="ag-theme-alpine table-container" style={{ width: "50%" }}>
                <AgGridReact
                    columnDefs={columnDefs}
                    rowData={rowData}
                    headerHeight={40}
                    rowHeight={40}
                />
            </div>
        </div>
    );
};

export default AttendanceLog;
