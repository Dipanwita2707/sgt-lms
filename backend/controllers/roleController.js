const Role = require('../models/Role');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { PERMISSIONS } = require('../config/rbac');

// Create a new role
exports.createRole = async (req, res) => {
  try {
    const { name, permissions } = req.body;
    if (!name || !Array.isArray(permissions)) return res.status(400).json({ error: 'Invalid data' });
    // Validate permissions
    for (const perm of permissions) {
      if (!PERMISSIONS.includes(perm)) return res.status(400).json({ error: `Invalid permission: ${perm}` });
    }
    const role = await Role.create({ name, permissions });
    await AuditLog.create({ action: 'create_role', performedBy: req.user._id, details: { name, permissions } });
    res.json(role);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Edit a role
exports.editRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) return res.status(400).json({ error: 'Invalid permissions' });
    for (const perm of permissions) {
      if (!PERMISSIONS.includes(perm)) return res.status(400).json({ error: `Invalid permission: ${perm}` });
    }
    const role = await Role.findByIdAndUpdate(id, { permissions }, { new: true });
    await AuditLog.create({ action: 'edit_role', performedBy: req.user._id, details: { id, permissions } });
    res.json(role);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// List all roles
exports.listRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Assign a role to a user
exports.assignRole = async (req, res) => {
  try {
    const { userId, roleId } = req.body;
    const role = await Role.findById(roleId);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    const user = await User.findByIdAndUpdate(userId, { role: role.name, permissions: role.permissions }, { new: true });
    await AuditLog.create({ action: 'assign_role', performedBy: req.user._id, targetUser: userId, details: { role: role.name } });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// List audit logs
exports.listAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find().populate('performedBy', 'email').populate('targetUser', 'email').sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
