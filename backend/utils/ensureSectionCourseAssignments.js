/**
 * Utility to ensure all sections in a department have their department's courses assigned
 * This runs automatically on server startup and can be called manually
 */

const Section = require('../models/Section');
const Course = require('../models/Course');
const Department = require('../models/Department');

/**
 * Ensure all sections have proper department and course assignments
 */
async function ensureSectionCourseAssignments() {
  console.log('\n🔧 [Section-Course Assignment Check] Starting validation...');
  
  try {
    // Get all departments
    const departments = await Department.find({});
    console.log(`📋 Found ${departments.length} departments`);
    
    let totalSectionsFixed = 0;
    let totalCoursesAssigned = 0;
    
    for (const department of departments) {
      console.log(`\n🏢 Processing Department: ${department.name}`);
      
      // Get all courses in this department
      const departmentCourses = await Course.find({ 
        department: department._id 
      }).select('_id title courseCode');
      
      if (departmentCourses.length === 0) {
        console.log(`   ⚠️  No courses found in ${department.name}`);
        continue;
      }
      
      console.log(`   📚 Found ${departmentCourses.length} courses`);
      departmentCourses.forEach(course => {
        console.log(`      - ${course.courseCode}: ${course.title}`);
      });
      
      const courseIds = departmentCourses.map(c => c._id);
      
      // Get all sections in this department
      const sections = await Section.find({ 
        $or: [
          { department: department._id },
          { department: null } // Include sections without department
        ]
      });
      
      console.log(`   📋 Found ${sections.length} sections in/without department`);
      
      for (const section of sections) {
        let updated = false;
        
        // Fix missing department
        if (!section.department || section.department.toString() !== department._id.toString()) {
          // Check if this section should belong to this department
          // For now, assign sections without department to the first department found
          if (!section.department) {
            console.log(`   🔧 Section ${section.name}: Assigning to ${department.name}`);
            section.department = department._id;
            updated = true;
            totalSectionsFixed++;
          }
        }
        
        // Ensure courses array exists
        if (!section.courses) {
          section.courses = [];
        }
        
        // Check if all department courses are assigned to this section
        const currentCourseIds = section.courses.map(c => c.toString());
        const missingCourses = courseIds.filter(
          courseId => !currentCourseIds.includes(courseId.toString())
        );
        
        if (missingCourses.length > 0) {
          console.log(`   📝 Section ${section.name}: Adding ${missingCourses.length} missing courses`);
          section.courses = [...new Set([...section.courses, ...courseIds])];
          updated = true;
          totalCoursesAssigned += missingCourses.length;
        }
        
        if (updated) {
          await section.save();
          console.log(`   ✅ Section ${section.name} updated successfully`);
        }
      }
    }
    
    console.log(`\n✅ [Section-Course Assignment] Validation complete!`);
    console.log(`   📊 Total sections fixed: ${totalSectionsFixed}`);
    console.log(`   📊 Total course assignments: ${totalCoursesAssigned}`);
    
    return {
      success: true,
      sectionsFixed: totalSectionsFixed,
      coursesAssigned: totalCoursesAssigned
    };
    
  } catch (error) {
    console.error('❌ [Section-Course Assignment] Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Assign specific course to specific section
 */
async function assignCourseToSection(sectionId, courseId) {
  try {
    const section = await Section.findById(sectionId);
    if (!section) {
      throw new Error('Section not found');
    }
    
    const course = await Course.findById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }
    
    // Ensure courses array exists
    if (!section.courses) {
      section.courses = [];
    }
    
    // Check if course is already assigned
    const courseIds = section.courses.map(c => c.toString());
    if (courseIds.includes(courseId.toString())) {
      return {
        success: true,
        message: 'Course already assigned to section',
        alreadyExists: true
      };
    }
    
    // Add course
    section.courses.push(courseId);
    await section.save();
    
    console.log(`✅ Course ${course.courseCode} assigned to section ${section.name}`);
    
    return {
      success: true,
      message: 'Course assigned successfully',
      section: section.name,
      course: course.courseCode
    };
    
  } catch (error) {
    console.error('Error assigning course to section:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Ensure section belongs to correct department based on its courses
 */
async function ensureSectionDepartment(sectionId) {
  try {
    const section = await Section.findById(sectionId).populate('courses');
    if (!section) {
      throw new Error('Section not found');
    }
    
    // If section has courses, use the department from the first course
    if (section.courses && section.courses.length > 0) {
      const firstCourse = await Course.findById(section.courses[0]).populate('department');
      if (firstCourse && firstCourse.department) {
        if (!section.department || section.department.toString() !== firstCourse.department._id.toString()) {
          section.department = firstCourse.department._id;
          await section.save();
          console.log(`✅ Section ${section.name} department updated to ${firstCourse.department.name}`);
        }
      }
    }
    
    return {
      success: true,
      section: section.name,
      department: section.department
    };
    
  } catch (error) {
    console.error('Error ensuring section department:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  ensureSectionCourseAssignments,
  assignCourseToSection,
  ensureSectionDepartment
};
