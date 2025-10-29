const Course = require('../models/Course');
const Department = require('../models/Department');
const School = require('../models/School');

// Get all courses
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true })
      .populate('school', 'name code')
      .populate('department', 'name code')
      .sort({ title: 1 });
    
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get course by ID
exports.getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const course = await Course.findById(courseId)
      .populate('school', 'name code')
      .populate('department', 'name code')
      .populate('videos')
      .populate('units');
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    res.json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get courses by school
exports.getCoursesBySchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    const courses = await Course.find({ 
      school: schoolId,
      isActive: true 
    })
      .populate('department', 'name code')
      .sort({ title: 1 });
    
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses by school:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get courses by department
exports.getCoursesByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    
    const courses = await Course.find({ 
      department: departmentId,
      isActive: true 
    })
      .populate('school', 'name code')
      .sort({ title: 1 });
    
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses by department:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create a new course
exports.createCourse = async (req, res) => {
  try {
    const {
      courseCode,
      title,
      description,
      schoolId,
      departmentId,
      credits,
      semester,
      academicYear
    } = req.body;

    // Validate required fields
    if (!title || !schoolId || !departmentId) {
      return res.status(400).json({ 
        message: 'Title, school, and department are required' 
      });
    }

    // Check if school exists
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    // Check if department exists and belongs to the school
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    if (department.school.toString() !== schoolId) {
      return res.status(400).json({ 
        message: 'Department does not belong to the selected school' 
      });
    }

    // Check if course code already exists (if provided)
    if (courseCode) {
      const existingCourse = await Course.findOne({ courseCode });
      if (existingCourse) {
        return res.status(400).json({ 
          message: 'Course code already exists' 
        });
      }
    }

    const course = new Course({
      courseCode: courseCode || `CRS${Date.now()}`, // Generate if not provided
      title,
      description,
      school: schoolId,
      department: departmentId,
      credits: credits || 3,
      semester,
      academicYear
    });

    await course.save();

    const populatedCourse = await Course.findById(course._id)
      .populate('school', 'name code')
      .populate('department', 'name code');

    res.status(201).json(populatedCourse);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update course
exports.updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const updateData = req.body;

    const course = await Course.findByIdAndUpdate(
      courseId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('school', 'name code')
      .populate('department', 'name code');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete course
exports.deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findByIdAndUpdate(
      courseId,
      { isActive: false },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ message: error.message });
  }
};