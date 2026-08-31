const express = require('express');
const { getWorkflows, createWorkflow, updateWorkflow, deleteWorkflow } = require('../controllers/workflowController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getWorkflows)
  .post(createWorkflow);

router.route('/:id')
  .put(updateWorkflow)
  .delete(deleteWorkflow);

module.exports = router;
