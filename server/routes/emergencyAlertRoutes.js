const express = require("express");
const router = express.Router();
const emergencyAlertController = require("../controllers/emergencyController");
const { isAdmin } = require("../middlewares/isAdmin");
const { authMiddleware } = require("../middlewares/authMiddleware");

// User Incident Reporting
router.post("/sendPanic", emergencyAlertController.sendPanic);

// Admin accept emergency alert
router.get(
  "/acceptEmergencyAlert/:alertId",
  isAdmin,
  emergencyAlertController.acceptEmergencyAlert
);

//Get the current emergency alert details
router.get(
  "/getEmergencyAlert/:emergencyAlertId",
  emergencyAlertController.getEmergencyAlertDetails
);

//Find and notify admins
router.post(
  "/notifyAdminsByProximity",
  emergencyAlertController.findAndNotifyAdmins
);

//Assign an emergency alert to an admin tempUpdateEmergency
router.get(
  "/assign/:emergencyAlertId",
  emergencyAlertController.tempUpdateEmergency
);

//Get all emergency alerts(admins)
router.get(
  "/getAllEmergencyAlerts",
  emergencyAlertController.getAllEmergencyAlerts
);

//Get emergency details and user details by emergency alert id (admin)
router.get(
  "/getEmergencyUserDetails/:emergencyAlertId",
  emergencyAlertController.getEmergencyDetailsByEmergencyAlertId
);

router.get(
  "/getEmergencyAlertsByUser",
  emergencyAlertController.getEmergencyAlertsByUser
);

router.get(
  "/cancelEmergencyAlert/:emergencyAlertId",
  emergencyAlertController.cancelEmergency
);

router.get(
  "/resolveEmergencyAlert/:emergencyAlertId",
  emergencyAlertController.resolveEmergency
);

router.get(
  "/clearEmergencyAlerts",
  emergencyAlertController.clearEmergencyAlerts
);

//Mock route for transportation group
router.post("/panic/external/:token", emergencyAlertController.externalPanic);

router.post(
  "/sendChatMessage",
  authMiddleware,
  emergencyAlertController.sendChatMessage
);

router.get(
  "/getChatMessages/:emergencyAlertId",
  authMiddleware,
  emergencyAlertController.getChatMessages
);

module.exports = router;
