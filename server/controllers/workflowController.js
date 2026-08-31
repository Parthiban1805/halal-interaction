const Workflow = require('../models/Workflow');

exports.getWorkflows = async (req, res) => {
  try {
    const workflows = await Workflow.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: workflows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.create({
      ...req.body,
      createdBy: req.user ? req.user.id : null
    });
    res.status(201).json({ success: true, data: workflow });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!workflow) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }
    res.status(200).json({ success: true, data: workflow });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findByIdAndDelete(req.params.id);
    if (!workflow) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
