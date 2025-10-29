import axios from 'axios';

// Create a new section
export const createSection = async (sectionData) => {
  const response = await axios.post('/api/sections/create', sectionData);
  return response.data;
};

// Assign teacher to section
export const assignTeacher = async (sectionId, teacherId) => {
  const response = await axios.post('/api/sections/assign-teacher', 
    { sectionId, teacherId }
  );
  return response.data;
};

// Assign teacher to section (new method)
export const assignTeacherToSection = async (sectionId, teacherId) => {
  const response = await axios.post('/api/sections/assign-teacher-to-section', 
    { sectionId, teacherId }
  );
  return response.data;
};

// Remove teacher from section
export const removeTeacherFromSection = async (sectionId) => {
  const response = await axios.post('/api/sections/remove-teacher', 
    { sectionId }
  );
  return response.data;
};

// Assign students to section
export const assignStudents = async (sectionId, studentIds) => {
  const response = await axios.post('/api/sections/assign-students', 
    { sectionId, studentIds }
  );
  return response.data;
};

// Get sections by course
export const getSectionsByCourse = async (courseId) => {
  const response = await axios.get(`/api/sections/course/${courseId}`);
  return response.data;
};

// Get teacher-student connections via section
export const getTeacherStudentConnections = async (teacherId) => {
  const response = await axios.get(`/api/sections/teacher/${teacherId}/connections`);
  return response.data;
};

// Get student's section
export const getStudentSection = async (studentId, token) => {
  const response = await axios.get(`/api/sections/student/${studentId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};

// Assign a student to a section (with one-student-one-section constraint)
export const assignStudentToSection = async (sectionId, studentId) => {
  const response = await axios.post(`/api/sections/assign-student`, 
    { sectionId, studentId }
  );
  return response.data;
};

// Remove a student from a section
export const removeStudentFromSection = async (sectionId, studentId) => {
  const response = await axios.post(`/api/sections/remove-student`, 
    { sectionId, studentId }
  );
  return response.data;
};

// Assign courses to a section
export const assignCoursesToSection = async (sectionId, courseIds) => {
  const response = await axios.post(`/api/sections/assign-courses`, 
    { sectionId, courseIds }
  );
  return response.data;
};

// Remove courses from a section
export const removeCoursesFromSection = async (sectionId, courseIds) => {
  const response = await axios.post(`/api/sections/remove-courses`, 
    { sectionId, courseIds }
  );
  return response.data;
};

// Get all sections
export const getAllSections = async () => {
  const response = await axios.get('/api/sections');
  return response.data;
};

// Get available students for assignment (not in any section)
export const getAvailableStudents = async (schoolId) => {
  const response = await axios.get(`/api/sections/available-students/${schoolId}`);
  return response.data;
};

// ============ COURSE-TEACHER ASSIGNMENT API FUNCTIONS ============

// Get unassigned courses for a section
export const getUnassignedCourses = async (sectionId) => {
  const response = await axios.get(`/api/sections/${sectionId}/unassigned-courses`);
  return response.data;
};

// Assign teacher to a course in a section
export const assignCourseTeacher = async (sectionId, courseId, teacherId) => {
  const response = await axios.post(`/api/sections/${sectionId}/assign-course-teacher`, 
    { courseId, teacherId }
  );
  return response.data;
};

// Get all course-teacher assignments for a section
export const getSectionCourseTeachers = async (sectionId) => {
  const response = await axios.get(`/api/sections/${sectionId}/course-teachers`);
  return response.data;
};

// Remove teacher assignment from a course
export const removeCourseTeacher = async (sectionId, courseId) => {
  const response = await axios.delete(`/api/sections/${sectionId}/course/${courseId}/teacher`);
  return response.data;
};

// Get teacher's course assignments
export const getTeacherCourseAssignments = async (teacherId) => {
  const response = await axios.get(`/api/sections/teacher/${teacherId}/course-assignments`);
  return response.data;
};

// Get section details with populated courses and assignments
export const getSectionWithAssignments = async (sectionId, token) => {
  const response = await axios.get(`/api/sections/${sectionId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Enhanced teacher assignment for sections
export const getAvailableTeachersForSectionCourse = async (courseId, sectionId, token) => {
  const params = sectionId ? { sectionId } : {};
  const response = await axios.get(`/api/teacher-assignments/teachers/course/${courseId}`, {
    params,
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};
