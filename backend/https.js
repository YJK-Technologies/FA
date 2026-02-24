// server.js
const express = require("express");
const cors = require("cors");
const sql = require("mssql");
const axios = require("axios");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const https = require("https");

const app = express();
const HTTPS_PORT = 5443;   // HTTPS port

// ========================
// SSL Certificate (update paths correctly)
// ========================
// SSL options for HTTPS
const sslOptions = {
  key: fs.readFileSync(path.resolve("C:/Utils/Certificates/STAR.yjktechnologies.com_cert_Nov2025", "STAR.yjktechnologies.com_key.key")),
  cert: fs.readFileSync(path.resolve("C:/Utils/Certificates/STAR.yjktechnologies.com_cert_Nov2025", "STAR.yjktechnologies.com.crt")),
  ca: fs.readFileSync(path.resolve("C:/Utils/Certificates/STAR.yjktechnologies.com_cert_Nov2025", "STAR.yjktechnologies.com.ca-bundle")),
};

// ========================
// Middlewares
// ========================
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// ========================
// SQL Server Configuration
// ========================
const dbConfig = {
  user: "saraswathi",
  password: "@%dSCt15",
  server: "95.216.47.253",
  database: "YJKTechnologies",
  options: { encrypt: false }
};

// ========================
// Employee Registration API
// ========================
app.post("/register", async (req, res) => {
  try {
    const { empId, name, images } = req.body;
    let encodedFaces = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      try {
        const response = await axios.post("http://localhost:5001/encode", { image: img });
        if (response.data.encoding) {
          encodedFaces.push(response.data.encoding);
        } else {
          console.warn(`Image ${i + 1}:`, response.data.error || "No encoding returned");
        }
      } catch (error) {
        console.error(`Encoding failed for image:`, error.response?.data?.error || error.message);
        return res.status(400).json({
          error: `Image encoding failed: ${error.response?.data?.error || error.message}`,
        });
      }
    }

    if (encodedFaces.length === 0) {
      return res.status(400).json({ error: "No valid face encodings found" });
    }

    const pool = await sql.connect(dbConfig);
    await pool
      .request()
      .input("Employee_ID", sql.VarChar, empId)
      .input("name", sql.VarChar, name)
      .input("encodings", sql.NVarChar(sql.MAX), JSON.stringify(encodedFaces))
      .query(
        `EXEC sp_registered_faces 'I',@Employee_ID,@name,@encodings,'','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`
      );

    res.json({ message: "Employee Registered Successfully" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

// ========================
// Face Recognition API
// ========================
app.post("/attendance", async (req, res) => {
  try {
    const { image, type } = req.body;

    const response = await axios.post("http://localhost:5001/recognize", { image });

    if (response.data.error || !response.data.encoding) {
      return res.status(400).json({ message: response.data.error || "Face Not Recognized" });
    }

    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .query("EXEC sp_registered_faces 'A','','','','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL");

    for (let row of result.recordset) {
      let storedEncodings;
      try {
        storedEncodings = JSON.parse(row.descriptor);
      } catch (err) {
        console.error("Error parsing descriptor:", err);
        continue;
      }

      for (let storedEncoding of storedEncodings) {
        const matchResponse = await axios.post("http://localhost:5001/match", {
          storedEncoding,
          inputEncoding: response.data.encoding,
        });

        if (matchResponse.data.match) {
          const empID = row.Employee_ID;
          const query =
            type === "checkin"
              ? `EXEC [sp_Face_Attendance_log] 'IN',@Employee_ID,'','','','','','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`
              : `EXEC [sp_Face_Attendance_log] 'OUT',@Employee_ID,'','','','','','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`;

          await pool.request().input("Employee_ID", sql.VarChar, empID).query(query);

          return res.json({
            message: `${type === "checkin" ? "Check-in" : "Check-out"} successful for ${empID}`,
          });
        }
      }
    }

    res.status(400).json({ message: "Face Not Recognized" });
  } catch (err) {
    console.error("Server Error:", err?.response?.data || err.message);
    const errorMessage =
      err?.response?.data?.error || err?.response?.data?.message || "Internal server error";
    res.status(500).json({ message: errorMessage });
  }
});

// ========================
// Attendance Search API
// ========================
app.post("/searchAttendance", async (req, res) => {
  try {
    const { Employee_ID, from_date, to_date } = req.body;
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input("Employee_ID", sql.VarChar, Employee_ID)
      .input("from_date", sql.VarChar, from_date)
      .input("to_date", sql.VarChar, to_date)
      .query(
        `EXEC sp_Face_Attendance_log 'SC',@Employee_ID,'','','','','',@from_date,@to_date,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`
      );
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset);
    } else {
      res.status(404).json("Data not found");
    }
  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ========================
// Start HTTPS Server
// ========================
https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
  console.log(`✅ HTTPS server running on https://localhost:${HTTPS_PORT}`);
});
