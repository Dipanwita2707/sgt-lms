const QuizConfiguration = require('../models/QuizConfiguration');
const Course = require('../models/Course');
const Section = require('../models/Section');
const Unit = require('../models/Unit');
const SectionCourseTeacher = require('../models/SectionCourseTeacher');

// Get quiz configuration for a specific unit in a section
exports.getQuizConfiguration = async (req, res) => {
  try {
    const { courseId, sectionId, unitId } = req.params;

    let config = await QuizConfiguration.findOne({
      course: courseId,
      section: sectionId,
      unit: unitId,
      isActive: true
    })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    // If no config exists, return default values
    if (!config) {
      return res.json({
        timeLimit: 30,
        numberOfQuestions: 10,
        passingPercentage: 40,
        maxAttempts: 3,
        shuffleQuestions: true,
        showResultsImmediately: true,
        isDefault: true
      });
    }

    res.json(config);
  } catch (error) {
    console.error('Error fetching quiz configuration:', error);
    res.status(500).json({ message: 'Error fetching quiz configuration', error: error.message });
  }
};

// Get all quiz configurations for a course (grouped by section)
exports.getCourseQuizConfigurations = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userSchool = req.user.school;

    // Verify course belongs to user's school
    const course = await Course.findOne({ _id: courseId, school: userSchool });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Get all units for this course
    const units = await Unit.find({ course: courseId }).select('title').sort({ order: 1 });

    // Get all sections for this course
    const sections = await Section.find({ 
      school: userSchool,
      courses: courseId 
    }).select('name').sort({ name: 1 });

    // Get all configurations
    const configs = await QuizConfiguration.find({
      course: courseId,
      isActive: true
    })
      .populate('section', 'name')
      .populate('unit', 'title')
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role')
      .sort({ section: 1, unit: 1 });

    // Create a map for easy lookup
    const configMap = {};
    configs.forEach(config => {
      const key = `${config.section._id}_${config.unit._id}`;
      configMap[key] = config;
    });

    // Build response with all sections and units
    const sectionConfigs = sections.map(section => {
      const unitConfigs = units.map(unit => {
        const key = `${section._id}_${unit._id}`;
        return {
          unit: {
            _id: unit._id,
            title: unit.title
          },
          config: configMap[key] || {
            timeLimit: 30,
            numberOfQuestions: 10,
            passingPercentage: 40,
            maxAttempts: 3,
            shuffleQuestions: true,
            showResultsImmediately: true,
            isDefault: true
          }
        };
      });

      return {
        section: {
          _id: section._id,
          name: section.name
        },
        units: unitConfigs
      };
    });

    res.json({
      course: {
        _id: course._id,
        title: course.title,
        courseCode: course.courseCode
      },
      sections: sectionConfigs
    });
  } catch (error) {
    console.error('Error fetching course quiz configurations:', error);
    res.status(500).json({ message: 'Error fetching configurations', error: error.message });
  }
};

// Create or update quiz configuration
exports.createOrUpdateQuizConfiguration = async (req, res) => {
  try {
    const { courseId, sectionId, unitId } = req.params;
    const {
      timeLimit,
      numberOfQuestions,
      passingPercentage,
      maxAttempts,
      shuffleQuestions,
      showResultsImmediately
    } = req.body;

    const userId = req.user._id;
    const userRole = req.user.role;
    const userSchool = req.user.school;

    // Validate inputs
    if (timeLimit < 5 || timeLimit > 180) {
      return res.status(400).json({ message: 'Time limit must be between 5 and 180 minutes' });
    }
    if (numberOfQuestions < 1 || numberOfQuestions > 50) {
      return res.status(400).json({ message: 'Number of questions must be between 1 and 50' });
    }

    // Verify course, section, and unit
    const course = await Course.findOne({ _id: courseId, school: userSchool });
    const section = await Section.findOne({ _id: sectionId, school: userSchool });
    const unit = await Unit.findOne({ _id: unitId, course: courseId });

    if (!course || !section || !unit) {
      return res.status(404).json({ message: 'Course, section, or unit not found' });
    }

    // For teachers, verify they are assigned to this course and section
    if (userRole === 'teacher') {
      const assignment = await SectionCourseTeacher.findOne({
        section: sectionId,
        course: courseId,
        teacher: userId
      });

      if (!assignment) {
        return res.status(403).json({ message: 'You are not authorized to configure this quiz' });
      }
    }

    // Check if configuration already exists
    let config = await QuizConfiguration.findOne({
      course: courseId,
      section: sectionId,
      unit: unitId
    });

    if (config) {
      // Update existing configuration
      config.timeLimit = timeLimit;
      config.numberOfQuestions = numberOfQuestions;
      config.passingPercentage = passingPercentage;
      config.maxAttempts = maxAttempts;
      config.shuffleQuestions = shuffleQuestions;
      config.showResultsImmediately = showResultsImmediately;
      config.updatedBy = userId;
      config.isActive = true;

      await config.save();

      config = await QuizConfiguration.findById(config._id)
        .populate('course', 'title courseCode')
        .populate('section', 'name')
        .populate('unit', 'title')
        .populate('createdBy', 'name email role')
        .populate('updatedBy', 'name email role');

      res.json({
        message: 'Quiz configuration updated successfully',
        config
      });
    } else {
      // Create new configuration
      config = new QuizConfiguration({
        course: courseId,
        section: sectionId,
        unit: unitId,
        timeLimit,
        numberOfQuestions,
        passingPercentage,
        maxAttempts,
        shuffleQuestions,
        showResultsImmediately,
        createdBy: userId
      });

      await config.save();

      config = await QuizConfiguration.findById(config._id)
        .populate('course', 'title courseCode')
        .populate('section', 'name')
        .populate('unit', 'title')
        .populate('createdBy', 'name email role');

      res.status(201).json({
        message: 'Quiz configuration created successfully',
        config
      });
    }
  } catch (error) {
    console.error('Error creating/updating quiz configuration:', error);
    res.status(500).json({ message: 'Error saving configuration', error: error.message });
  }
};

// Bulk update for HOD/Dean - update multiple units at once
exports.bulkUpdateConfigurations = async (req, res) => {
  try {
    const { courseId, sectionId } = req.params;
    const { configs } = req.body; // Array of { unitId, timeLimit, numberOfQuestions, etc. }

    const userId = req.user._id;
    const userRole = req.user.role;

    if (!['hod', 'dean'].includes(userRole)) {
      return res.status(403).json({ message: 'Only HOD and Dean can bulk update configurations' });
    }

    const results = [];

    for (const configData of configs) {
      try {
        let config = await QuizConfiguration.findOne({
          course: courseId,
          section: sectionId,
          unit: configData.unitId
        });

        if (config) {
          config.timeLimit = configData.timeLimit;
          config.numberOfQuestions = configData.numberOfQuestions;
          config.passingPercentage = configData.passingPercentage || 40;
          config.maxAttempts = configData.maxAttempts || 3;
          config.shuffleQuestions = configData.shuffleQuestions !== undefined ? configData.shuffleQuestions : true;
          config.showResultsImmediately = configData.showResultsImmediately !== undefined ? configData.showResultsImmediately : true;
          config.updatedBy = userId;
          await config.save();
        } else {
          config = new QuizConfiguration({
            course: courseId,
            section: sectionId,
            unit: configData.unitId,
            timeLimit: configData.timeLimit,
            numberOfQuestions: configData.numberOfQuestions,
            passingPercentage: configData.passingPercentage || 40,
            maxAttempts: configData.maxAttempts || 3,
            shuffleQuestions: configData.shuffleQuestions !== undefined ? configData.shuffleQuestions : true,
            showResultsImmediately: configData.showResultsImmediately !== undefined ? configData.showResultsImmediately : true,
            createdBy: userId
          });
          await config.save();
        }

        results.push({ unitId: configData.unitId, success: true });
      } catch (error) {
        results.push({ unitId: configData.unitId, success: false, error: error.message });
      }
    }

    res.json({
      message: 'Bulk update completed',
      results
    });
  } catch (error) {
    console.error('Error bulk updating configurations:', error);
    res.status(500).json({ message: 'Error bulk updating configurations', error: error.message });
  }
};

// Reset to default (delete configuration)
exports.resetToDefault = async (req, res) => {
  try {
    const { courseId, sectionId, unitId } = req.params;
    const userRole = req.user.role;

    if (!['teacher', 'hod', 'dean'].includes(userRole)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // For teachers, verify assignment
    if (userRole === 'teacher') {
      const assignment = await SectionCourseTeacher.findOne({
        section: sectionId,
        course: courseId,
        teacher: req.user._id
      });

      if (!assignment) {
        return res.status(403).json({ message: 'You are not authorized' });
      }
    }

    await QuizConfiguration.deleteOne({
      course: courseId,
      section: sectionId,
      unit: unitId
    });

    res.json({ message: 'Configuration reset to default successfully' });
  } catch (error) {
    console.error('Error resetting configuration:', error);
    res.status(500).json({ message: 'Error resetting configuration', error: error.message });
  }
};
