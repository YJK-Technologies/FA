// controllers/dataController.js
const sql = require("mssql");
const axios = require("axios");
const dbConfig = require("../config/dbConfig");

// Helper constant for Python URL
const PYTHON_API_URL = "http://localhost:5055";

// 1. Employee Registration
const registerEmployee = async (req, res) => {
  try {
    const { empId, name, images } = req.body;
    let encodedFaces = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      try {
        const response = await axios.post(`${PYTHON_API_URL}/encode`, { image: img });
        if (response.data.encoding) {
          encodedFaces.push(response.data.encoding);
        } else {
          // Pass back the specific detection failure from Python
          const pyError = response.data.error || `Image ${i + 1} could not be encoded.`;
          return res.status(400).json({ error: pyError });
        }
      } catch (error) {
        const outError = error.response?.data?.error || error.message;
        return res.status(400).json({ error: `Python Engine: ${outError}` });
      }
    }

    if (encodedFaces.length === 0) {
      return res.status(400).json({ error: "No valid face encodings could be extracted." });
    }

    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input("Employee_ID", sql.VarChar, empId)
      .input("name", sql.VarChar, name)
      .input("encodings", sql.NVarChar(sql.MAX), JSON.stringify(encodedFaces))
      .query(`EXEC sp_registered_faces 'I',@Employee_ID,@name,@encodings,'','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`);

    res.json({ message: "Employee Registered Successfully" });
  } catch (err) {
    console.error("Error:", err);
    // Directly capture SQL Raiseerror or operational exceptions
    res.status(500).json({ error: err.message || "Database execution failed." });
  }
};

// 2. Face Recognition / Attendance
const markAttendance = async (req, res) => {
  try {
    const { image, deviceDetails, ipAddress, location, locationType } = req.body;

    let response;
    try {
      response = await axios.post(`${PYTHON_API_URL}/recognize`, { image });
    } catch (pyErr) {
      const errMsg = pyErr.response?.data?.error || pyErr.message;
      return res.status(400).json({ message: `Python Engine: ${errMsg}` });
    }

    if (response.data.error || !response.data.encoding) {
      return res.status(400).json({ message: response.data.error || "Face Not Detected." });
    }

    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query("EXEC sp_registered_faces 'A','','','','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL");

    for (let row of result.recordset) {
      let storedEncodings;
      try {
        storedEncodings = JSON.parse(row.descriptor);
      } catch (err) {
        continue;
      }

      for (let storedEncoding of storedEncodings) {
        let matchResponse;
        try {
          matchResponse = await axios.post(`${PYTHON_API_URL}/match`, {
            storedEncoding,
            inputEncoding: response.data.encoding
          });
        } catch (matchErr) {
          continue;
        }

        if (matchResponse.data.match) {
          const empID = row.Employee_ID;
          const todayStart = new Date().toLocaleDateString('en-CA');

          const statusResult = await pool.request()
            .input("Employee_ID", sql.VarChar, empID)
            .input("TodayStart", sql.VarChar, todayStart)
            .query(`
              SELECT TOP 1 *
              FROM tbl_AttendanceLog
              WHERE Employee_ID = @Employee_ID
                AND check_in >= CAST(@TodayStart AS DATETIME)
              ORDER BY check_in DESC
            `);

          let mode = "IN";
          if (statusResult.recordset.length > 0 && statusResult.recordset[0].check_out === null) {
            mode = "OUT";
          }

          try {
            await pool.request()
              .input("Employee_ID", sql.VarChar, empID)
              .input("DeviceDetails", sql.VarChar, deviceDetails)
              .input("IP_Address", sql.VarChar, ipAddress)
              .input("Location", sql.VarChar, location)
              .input("LocationType", sql.VarChar, locationType)
              .query(`EXEC sp_Face_Attendance_log_pavun '${mode}',@Employee_ID,'','','','','','','',@DeviceDetails,@IP_Address,@Location,@LocationType,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`);
          } catch (sqlErr) {
            return res.status(500).json({ message: `SQL Log Error: ${sqlErr.message}` });
          }

          return res.json({
            message: mode === "IN" ? `Check-In Successful (${empID})` : `Check-Out Successful (${empID})`
          });
        }
      }
    }

    return res.status(400).json({ message: "Face Not Recognized. Access Denied." });
  } catch (err) {
    console.error("Detailed Server Error:", err);
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};

// 3. Search Attendance
const searchAttendance = async (req, res) => {
  try {
    const { Employee_ID, from_date, to_date } = req.body;
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input("Employee_ID", sql.VarChar, Employee_ID)
      .input("from_date", sql.VarChar, from_date)
      .input("to_date", sql.VarChar, to_date)
      .query(`EXEC sp_Face_Attendance_log_pavun 'SC',@Employee_ID,'','','','','',@from_date,@to_date,'','','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`);
    
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset);
    } else {
      res.status(404).json("Data not found");
    }
  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 4. Employee Dropdown List
const getEmployeeDropdown = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(` EXEC sp_registered_faces 'F', '', '', '', '', '', '', '', '', '', NULL, NULL, NULL, NULL `);

    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset);
    } else {
      res.status(404).json({ message: "Data not found" });
    }
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 5. Search Employee Profile
const searchEmployee = async (req, res) => {
  try {
    const { Employee_ID, name } = req.body;
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input("Employee_ID", sql.VarChar, Employee_ID)
      .input("name", sql.VarChar, name)
      .query(`EXEC sp_registered_faces 'SC',@Employee_ID,@name,'','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`);
    
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset);
    } else {
      res.status(404).json("Data not found");
    }
  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
    registerEmployee, 
    markAttendance, 
    searchAttendance,
    getEmployeeDropdown,
    searchEmployee
}