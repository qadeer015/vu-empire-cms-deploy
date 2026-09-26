const express = require('express');
const router = express.Router();

const { run } = require("../../utils/ai");
const gdbAgent = require("../../utils/agents/gdb.agent");

const { authenticate } = require('../../middlewares/authenticate');
const { authorize } = require('../../middlewares/authorize');

router.use(authenticate, authorize('admin'));

router.post("/ask", async (req, res) => {
    try {
        const { message } = req.body;

        const result = await run(
            gdbAgent,
            message,
            {
                db: req.app.locals.db,
                user: req.user,
                request: req,
            }
        );

        res.json({
            success: true,
            response: result,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

module.exports = router;