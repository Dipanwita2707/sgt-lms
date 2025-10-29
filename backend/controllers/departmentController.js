const Department = require('../models/Department');
const School = require('../models/School');
const User = require('../models/User');
const Course = require('../models/Course');

// Create a new department
exports.createDepartment = async (req, res) => {
  try {
    const { name, code, description, schoolId, hodId, established, budget, contact } = req.body;

    // Check if school exists
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    // Check if department code already exists
    const existingDepartment = await Department.findOne({ code });
    if (existingDepartment) {
      return res.status(400).json({ message: 'Department code already exists' });
    }

    // If HOD is provided, validate it
    if (hodId) {
      const hod = await User.findById(hodId);
      if (!hod) {
        return res.status(404).json({ message: 'HOD not found' });
      }
      if (hod.role !== 'hod' && hod.role !== 'admin') {
        return res.status(400).json({ message: 'Selected user must have HOD role' });
      }
    }

    const department = new Department({
      name,
      code,
      description,
      school: schoolId,
      hod: hodId || null, // HOD is optional
      established,
      budget,
      contact
    });

    await department.save();

    // Update school's departments array
    await School.findByIdAndUpdate(schoolId, {
      $push: { departments: department._id }
    });

    // Update HOD's department and school references only if HOD is provided
    if (hodId) {
      await User.findByIdAndUpdate(hodId, { 
        department: department._id,
        school: schoolId
      });
    }

    const populatedDepartment = await Department.findById(department._id)
      .populate('school', 'name code')
      .populate('hod', 'name email')
      .populate('courses', 'title courseCode');

    res.status(201).json(populatedDepartment);
  } catch (err) {
    console.error('Error creating department:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get all departments
exports.getAllDepartments = async (req, res) => {
  try {
    const { schoolId } = req.query;

    const filter = { isActive: true };
    if (schoolId) {
      filter.school = schoolId;
    }

    const departments = await Department.find(filter)
      .populate('school', 'name code')
      .populate('hod', 'name email')
      .populate('courses', 'title courseCode')
      .sort({ name: 1 });

    res.json(departments);
  } catch (err) {
    console.error('Error getting departments:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get departments by school
exports.getDepartmentsBySchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    console.log('=== getDepartmentsBySchool Debug ===');
    console.log('Requested school ID:', schoolId);
    console.log('School ID type:', typeof schoolId);
    
    // First check if school exists
    const school = await School.findById(schoolId);
    console.log('School found:', school ? school.name : 'NOT FOUND');
    
    const departments = await Department.find({ school: schoolId, isActive: true })
      .populate('hod', 'name email')
      .populate('courses', 'title courseCode')
      .sort({ name: 1 });
      
    console.log('Departments found:', departments.length);
    console.log('Department details:', departments.map(d => ({
      id: d._id,
      name: d.name,
      code: d.code,
      school: d.school,
      hasHOD: !!d.hod
    })));

    res.json(departments);
  } catch (err) {
    console.error('Error getting departments by school:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get department by ID
exports.getDepartmentById = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await Department.findById(departmentId)
      .populate('school', 'name code dean')
      .populate('hod', 'name email phone')
      .populate({
        path: 'courses',
        populate: {
          path: 'teachers',
          select: 'name email teacherId'
        }
      })
      .populate('teachers', 'name email teacherId');

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Get course and teacher counts
    const courseCount = await Course.countDocuments({ department: departmentId, isActive: true });
    const teacherCount = await User.countDocuments({ department: departmentId, role: 'teacher', isActive: true });
    const studentCount = await User.countDocuments({ 
      coursesAssigned: { $in: department.courses },
      role: 'student',
      isActive: true 
    });

    res.json({
      ...department.toObject(),
      stats: {
        courseCount,
        teacherCount,
        studentCount
      }
    });
  } catch (err) {
    console.error('Error getting department:', err);
    res.status(500).json({ message: err.message });
  }
};

// Update department
exports.updateDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { name, code, description, hodId, established, budget, contact } = req.body;

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // If HOD is being changed, validate new HOD
    if (hodId && hodId !== department.hod?.toString()) {
      const newHod = await User.findById(hodId);
      if (!newHod) {
        return res.status(404).json({ message: 'New HOD not found' });
      }
      if (newHod.role !== 'hod' && newHod.role !== 'admin') {
        return res.status(400).json({ message: 'Selected user must have HOD role' });
      }

      // Update old HOD's department reference (if there was one)
      if (department.hod) {
        await User.findByIdAndUpdate(department.hod, { 
          $unset: { department: 1 }
        });
      }
      // Update new HOD's department and school references
      await User.findByIdAndUpdate(hodId, { 
        department: departmentId,
        school: department.school
      });
    } else if (hodId === null || hodId === '') {
      // Removing HOD assignment
      if (department.hod) {
        await User.findByIdAndUpdate(department.hod, { 
          $unset: { department: 1 }
        });
      }
    }

    const updatedDepartment = await Department.findByIdAndUpdate(
      departmentId,
      {
        name,
        code,
        description,
        hod: hodId || null, // Allow null for no HOD
        established,
        budget,
        contact
      },
      { new: true }
    ).populate('school', 'name code')
     .populate('hod', 'name email')
     .populate('courses', 'title courseCode');

    res.json(updatedDepartment);
  } catch (err) {
    console.error('Error updating department:', err);
    res.status(500).json({ message: err.message });
  }
};

// Delete department (soft delete)
exports.deleteDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if department has active courses
    const activeCourses = await Course.countDocuments({ department: departmentId, isActive: true });
    if (activeCourses > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete department with active courses. Please remove or transfer courses first.' 
      });
    }

    // Soft delete
    await Department.findByIdAndUpdate(departmentId, { isActive: false });

    // Remove from school's departments array
    await School.findByIdAndUpdate(department.school, {
      $pull: { departments: departmentId }
    });

    // Update HOD's department reference (only if HOD exists)
    if (department.hod) {
      await User.findByIdAndUpdate(department.hod, { 
        $unset: { department: 1 }
      });
    }

    res.json({ message: 'Department deleted successfully' });
  } catch (err) {
    console.error('Error deleting department:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get department dashboard data for HOD
exports.getDepartmentDashboard = async (req, res) => {
  try {
    const { departmentId } = req.params;

    // Verify user is HOD of this department
    if (req.user.role === 'hod' && req.user.department?.toString() !== departmentId) {
      return res.status(403).json({ message: 'Access denied. You are not the HOD of this department.' });
    }

    const department = await Department.findById(departmentId)
      .populate('school', 'name code')
      .populate('hod', 'name email');

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Get courses with teachers
    const courses = await Course.find({ department: departmentId, isActive: true })
      .populate('teachers', 'name email teacherId')
      .lean();

    // Get all teachers assigned to courses in this department
    const teacherIds = [...new Set(courses.flatMap(course => course.teachers.map(t => t._id)))];
    const teachers = await User.find({ 
      _id: { $in: teacherIds },
      role: 'teacher',
      isActive: true 
    }).select('name email teacherId coursesAssigned');

    // Get students enrolled in department courses
    const courseIds = courses.map(course => course._id);
    const students = await User.find({
      coursesAssigned: { $in: courseIds },
      role: 'student',
      isActive: true
    }).select('name email regNo coursesAssigned');

    // Overall stats
    const totalCourses = courses.length;
    const totalTeachers = teachers.length;
    const totalStudents = students.length;

    res.json({
      department,
      courses,
      teachers,
      students: students.slice(0, 50), // Limit for performance
      stats: {
        totalCourses,
        totalTeachers,
        totalStudents
      }
    });
  } catch (err) {
    console.error('Error getting department dashboard:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get teachers assigned to department courses (for HOD view)
exports.getDepartmentTeachers = async (req, res) => {
  try {
    const { departmentId } = req.params;

    // Verify access
    if (req.user.role === 'hod' && req.user.department?.toString() !== departmentId) {
      return res.status(403).json({ message: 'Access denied. You are not the HOD of this department.' });
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Get all courses in this department
    const courses = await Course.find({ department: departmentId, isActive: true })
      .populate('teachers', 'name email teacherId phone')
      .select('title courseCode teachers');

    // Create a map of teachers with their assigned courses
    const teacherMap = new Map();
    
    courses.forEach(course => {
      course.teachers.forEach(teacher => {
        if (!teacherMap.has(teacher._id.toString())) {
          teacherMap.set(teacher._id.toString(), {
            ...teacher.toObject(),
            courses: []
          });
        }
        teacherMap.get(teacher._id.toString()).courses.push({
          _id: course._id,
          title: course.title,
          courseCode: course.courseCode
        });
      });
    });

    const teachers = Array.from(teacherMap.values());

    res.json({
      department: { name: department.name, code: department.code },
      teachers,
      totalTeachers: teachers.length
    });
  } catch (err) {
    console.error('Error getting department teachers:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get eligible HODs (users with hod role not assigned to any department)
exports.getEligibleHods = async (req, res) => {
  try {
    const eligibleHods = await User.find({
      role: 'hod',
      isActive: true,
      $or: [
        { department: { $exists: false } },
        { department: null }
      ]
    }).select('name email');

    res.json(eligibleHods);
  } catch (err) {
    console.error('Error getting eligible HODs:', err);
    res.status(500).json({ message: err.message });
  }
};
