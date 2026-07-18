// routes/dataRoutes.js
const express = require("express");
const router = express.Router();
const dataController = require("../controllers/dataController");

// Define cleaner endpoints maps
router.post("/register", dataController.registerEmployee);
router.post("/attendance", dataController.markAttendance);
router.post("/searchAttendance", dataController.searchAttendance);
router.get("/EmployeeIdDrop", dataController.getEmployeeDropdown);
router.post("/searchEmployee", dataController.searchEmployee);

module.exports = router;