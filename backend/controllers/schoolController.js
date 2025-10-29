const School = require('../models/School');
const Department = require('../models/Department');
const User = require('../models/User');
const Course = require('../models/Course');

// Create a new school
exports.createSchool = async (req, res) => {
  try {
    const { name, code, description, deanId, established, location, contact } = req.body;

    // Check if school code already exists
    const existingSchool = await School.findOne({ code });
    if (existingSchool) {
      return res.status(400).json({ message: 'School code already exists' });
    }

    // If dean is provided, validate it
    if (deanId) {
      const dean = await User.findById(deanId);
      if (!dean) {
        return res.status(404).json({ message: 'Dean not found' });
      }
      if (dean.role !== 'dean' && dean.role !== 'admin') {
        return res.status(400).json({ message: 'Selected user must have dean role' });
      }
    }

    const school = new School({
      name,
      code,
      description,
      dean: deanId || null, // Dean is optional
      established,
      location,
      contact
    });

    await school.save();

    // Update dean's school reference only if dean is provided
    if (deanId) {
      await User.findByIdAndUpdate(deanId, { school: school._id });
    }

    const populatedSchool = await School.findById(school._id)
      .populate('dean', 'name email')
      .populate('departments', 'name code');

    res.status(201).json(populatedSchool);
  } catch (err) {
    console.error('Error creating school:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get all schools
exports.getAllSchools = async (req, res) => {
  try {
    const schools = await School.find({ isActive: true })
      .populate('dean', 'name email')
      .populate({
        path: 'departments',
        populate: {
          path: 'hod',
          select: 'name email'
        }
      })
      .sort({ name: 1 });

    res.json(schools);
  } catch (err) {
    console.error('Error getting schools:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get school by ID
exports.getSchoolById = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const school = await School.findById(schoolId)
      .populate('dean', 'name email phone')
      .populate({
        path: 'departments',
        populate: {
          path: 'hod',
          select: 'name email'
        }
      });

    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    // Get department and course counts
    const departmentCount = await Department.countDocuments({ school: schoolId, isActive: true });
    const courseCount = await Course.countDocuments({ school: schoolId, isActive: true });

    res.json({
      ...school.toObject(),
      stats: {
        departmentCount,
        courseCount
      }
    });
  } catch (err) {
    console.error('Error getting school:', err);
    res.status(500).json({ message: err.message });
  }
};

// Update school
exports.updateSchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { name, code, description, deanId, established, location, contact } = req.body;

    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    // If dean is being changed, validate new dean
    if (deanId && deanId !== school.dean?.toString()) {
      const newDean = await User.findById(deanId);
      if (!newDean) {
        return res.status(404).json({ message: 'New dean not found' });
      }
      if (newDean.role !== 'dean' && newDean.role !== 'admin') {
        return res.status(400).json({ message: 'Selected user must have dean role' });
      }

      // Update old dean's school reference (if there was one)
      if (school.dean) {
        await User.findByIdAndUpdate(school.dean, { $unset: { school: 1 } });
      }
      // Update new dean's school reference
      await User.findByIdAndUpdate(deanId, { school: schoolId });
    } else if (deanId === null || deanId === '') {
      // Removing dean assignment
      if (school.dean) {
        await User.findByIdAndUpdate(school.dean, { $unset: { school: 1 } });
      }
    }

    const updatedSchool = await School.findByIdAndUpdate(
      schoolId,
      {
        name,
        code,
        description,
        dean: deanId || null, // Allow null for no dean
        established,
        location,
        contact
      },
      { new: true }
    ).populate('dean', 'name email')
     .populate('departments', 'name code');

    res.json(updatedSchool);
  } catch (err) {
    console.error('Error updating school:', err);
    res.status(500).json({ message: err.message });
  }
};

// Delete school (soft delete)
exports.deleteSchool = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    // Check if school has active departments
    const activeDepartments = await Department.countDocuments({ school: schoolId, isActive: true });
    if (activeDepartments > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete school with active departments. Please remove or transfer departments first.' 
      });
    }

    // Soft delete
    await School.findByIdAndUpdate(schoolId, { isActive: false });

    // Update dean's school reference (only if dean exists)
    if (school.dean) {
      await User.findByIdAndUpdate(school.dean, { $unset: { school: 1 } });
    }

    res.json({ message: 'School deleted successfully' });
  } catch (err) {
    console.error('Error deleting school:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get school dashboard data for dean
exports.getSchoolDashboard = async (req, res) => {
  try {
    const { schoolId } = req.params;

    // Verify user is dean of this school
    if (req.user.role === 'dean' && req.user.school?.toString() !== schoolId) {
      return res.status(403).json({ message: 'Access denied. You are not the dean of this school.' });
    }

    const school = await School.findById(schoolId)
      .populate('dean', 'name email');

    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    // Get departments with stats
    const departments = await Department.find({ school: schoolId, isActive: true })
      .populate('hod', 'name email')
      .lean();

    // Get stats for each department
    for (let dept of departments) {
      dept.courseCount = await Course.countDocuments({ department: dept._id, isActive: true });
      dept.teacherCount = await User.countDocuments({ department: dept._id, role: 'teacher', isActive: true });
    }

    // Overall stats
    const totalDepartments = departments.length;
    const totalCourses = await Course.countDocuments({ school: schoolId, isActive: true });
    const totalTeachers = await User.countDocuments({ school: schoolId, role: 'teacher', isActive: true });
    const totalStudents = await User.countDocuments({ school: schoolId, role: 'student', isActive: true });

    res.json({
      school,
      departments,
      stats: {
        totalDepartments,
        totalCourses,
        totalTeachers,
        totalStudents
      }
    });
  } catch (err) {
    console.error('Error getting school dashboard:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get eligible deans (users with dean role not assigned to any school)
exports.getEligibleDeans = async (req, res) => {
  try {
    const eligibleDeans = await User.find({
      role: 'dean',
      isActive: true,
      $or: [
        { school: { $exists: false } },
        { school: null }
      ]
    }).select('name email');

    res.json(eligibleDeans);
  } catch (err) {
    console.error('Error getting eligible deans:', err);
    res.status(500).json({ message: err.message });
  }
};
