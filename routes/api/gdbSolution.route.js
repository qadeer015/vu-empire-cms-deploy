const express = require('express');
const router = express.Router();
const gdbSolutionController = require('../../controllers/gdbSolution.controller');
const { authenticate } = require('../../middlewares/authenticate');
const { authorize } = require('../../middlewares/authorize');

// All GDB solution routes require admin authentication (CMS manages content)
router.use(authenticate, authorize('admin'));

router.get('/', gdbSolutionController.getAll);
router.get('/search', gdbSolutionController.search);
router.get('/:id', gdbSolutionController.getOne);

router.post('/', gdbSolutionController.create);

router.patch('/:id', gdbSolutionController.update);

router.delete('/:id', gdbSolutionController.delete);

module.exports = router;