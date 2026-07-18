// https.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const https = require("https");
const dataRoutes = require("./routes/dataRoutes");

const app = express();
const HTTPS_PORT = 5443;

// SSL configuration
const sslOptions = {
  key: fs.readFileSync(path.resolve("C:/Utils/Certificates/STAR.yjktechnologies.com_cert_Nov2025", "STAR.yjktechnologies.com_key.key")),
  cert: fs.readFileSync(path.resolve("C:/Utils/Certificates/STAR.yjktechnologies.com_cert_Nov2025", "STAR.yjktechnologies.com.crt")),
  ca: fs.readFileSync(path.resolve("C:/Utils/Certificates/STAR.yjktechnologies.com_cert_Nov2025", "STAR.yjktechnologies.com.ca-bundle")),
};

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// Link identical routes logic
app.use("/", dataRoutes);

// Fire up safe HTTPS server
https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
  console.log(`✅ Secured HTTPS server running on https://localhost:${HTTPS_PORT}`);
});