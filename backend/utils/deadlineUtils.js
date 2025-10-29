const Unit = require('../models/Unit');

/**
 * Check if a unit deadline has expired
 * @param {ObjectId} unitId - The unit ID to check
 * @returns {Object} - { hasDeadline, isExpired, deadline, daysLeft, showWarning }
 */
const checkUnitDeadline = async (unitId) => {
  try {
    const unit = await Unit.findById(unitId);
    
    if (!unit || !unit.hasDeadline || !unit.deadline) {
      return {
        hasDeadline: false,
        isExpired: false,
        deadline: null,
        daysLeft: null,
        showWarning: false
      };
    }

    const now = new Date();
    const deadline = new Date(unit.deadline);
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const isExpired = now > deadline;
    const showWarning = diffDays <= unit.warningDays && diffDays > 0;

    return {
      hasDeadline: true,
      isExpired,
      deadline: unit.deadline,
      daysLeft: diffDays,
      showWarning,
      strictDeadline: unit.strictDeadline,
      warningDays: unit.warningDays,
      deadlineDescription: unit.deadlineDescription
    };
  } catch (error) {
    console.error('Error checking unit deadline:', error);
    return {
      hasDeadline: false,
      isExpired: false,
      deadline: null,
      daysLeft: null,
      showWarning: false
    };
  }
};

/**
 * Check if an activity should be counted based on deadline
 * @param {ObjectId} unitId - The unit ID
 * @param {Date} activityDate - When the activity was completed
 * @returns {Object} - { shouldCount, completedAfterDeadline }
 */
const checkActivityDeadlineCompliance = async (unitId, activityDate = new Date()) => {
  try {
    const deadlineInfo = await checkUnitDeadline(unitId);
    
    if (!deadlineInfo.hasDeadline) {
      // No deadline, activity always counts
      return {
        shouldCount: true,
        completedAfterDeadline: false
      };
    }

    const completedAfterDeadline = new Date(activityDate) > new Date(deadlineInfo.deadline);
    
    // If strict deadline is enabled and activity was after deadline, don't count it
    const shouldCount = deadlineInfo.strictDeadline ? !completedAfterDeadline : true;

    return {
      shouldCount,
      completedAfterDeadline
    };
  } catch (error) {
    console.error('Error checking activity deadline compliance:', error);
    // Default to counting the activity if there's an error
    return {
      shouldCount: true,
      completedAfterDeadline: false
    };
  }
};

/**
 * Get units that are approaching their deadlines for a student
 * @param {ObjectId} studentId - The student ID
 * @param {ObjectId} courseId - The course ID
 * @returns {Array} - Array of units with approaching deadlines
 */
const getUnitsWithApproachingDeadlines = async (studentId, courseId) => {
  try {
    const StudentProgress = require('../models/StudentProgress');
    
    const progress = await StudentProgress.findOne({
      student: studentId,
      course: courseId
    }).populate({
      path: 'units.unitId',
      select: 'title hasDeadline deadline warningDays deadlineDescription'
    });

    if (!progress) {
      return [];
    }

    const unitsWithWarnings = [];
    
    for (const unitProgress of progress.units) {
      if (!unitProgress.unitId || unitProgress.status === 'completed') {
        continue;
      }

      const deadlineInfo = await checkUnitDeadline(unitProgress.unitId._id);
      
      if (deadlineInfo.showWarning && !unitProgress.deadlineWarningShown) {
        unitsWithWarnings.push({
          unitId: unitProgress.unitId._id,
          unitTitle: unitProgress.unitId.title,
          deadline: deadlineInfo.deadline,
          daysLeft: deadlineInfo.daysLeft,
          deadlineDescription: deadlineInfo.deadlineDescription
        });
      }
    }

    return unitsWithWarnings;
  } catch (error) {
    console.error('Error getting units with approaching deadlines:', error);
    return [];
  }
};

/**
 * Mark deadline warning as shown for a unit
 * @param {ObjectId} studentId - The student ID
 * @param {ObjectId} courseId - The course ID
 * @param {ObjectId} unitId - The unit ID
 */
const markDeadlineWarningShown = async (studentId, courseId, unitId) => {
  try {
    const StudentProgress = require('../models/StudentProgress');
    
    await StudentProgress.updateOne(
      {
        student: studentId,
        course: courseId,
        'units.unitId': unitId
      },
      {
        $set: { 'units.$.deadlineWarningShown': true }
      }
    );
  } catch (error) {
    console.error('Error marking deadline warning as shown:', error);
  }
};

module.exports = {
  checkUnitDeadline,
  checkActivityDeadlineCompliance,
  getUnitsWithApproachingDeadlines,
  markDeadlineWarningShown
};