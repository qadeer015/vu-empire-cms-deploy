const express = require("express");

const extInstallationController =
    require("../../controllers/extInstallationController");

const { authenticate } = require("../../middlewares/authenticate");
const { authorize } = require("../../middlewares/authorize");

const router =
    express.Router();


/*
 * Public: called by the browser extension to register a new
 * installation. Not admin-protected.
 */
router.post(
    "/register",
    extInstallationController.register
);


/*
 * Admin (CMS): analytics + management. Order matters — the
 * "/analytics" collection route must be declared before "/:id".
 */
router.get("/analytics", authenticate, authorize("admin"), extInstallationController.analytics);
router.get("/:id", authenticate, authorize("admin"), extInstallationController.detail);
router.get("/", authenticate, authorize("admin"), extInstallationController.list);


module.exports = router;