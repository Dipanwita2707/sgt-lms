const axios = require('axios');

// Test configuration
const BASE_URL = 'https://192.168.7.20:5000';
const API_URL = `${BASE_URL}/api`;

// Test data (replace with actual IDs from your database)
const testData = {
  adminEmail: 'admin@test.com', // Replace with actual admin email
  adminPassword: 'password123',  // Replace with actual admin password
  teacherId: null,               // Will be set after login
  sectionId: null,               // Replace with actual section ID
  courseId: null                 // Replace with actual course ID
};

let authToken = '';

// Configure axios to ignore SSL errors for testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * Login and get authentication token
 */
async function login() {
  try {
    console.log('🔐 Attempting login...');
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: testData.adminEmail,
      password: testData.adminPassword
    });
    
    authToken = response.data.token;
    console.log('✅ Login successful');
    return response.data.user;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.message || error.message);
    throw error;
  }
}

/**
 * Test getting teachers with teacher role
 */
async function testGetTeachers() {
  try {
    console.log('\n📋 Testing teacher retrieval...');
    const response = await axios.get(`${API_URL}/teacher-assignments/teachers`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log(`✅ Found ${response.data.teachers?.length || 0} teachers`);
    
    // Find a teacher with the teacher role for testing
    const teacherWithRole = response.data.teachers?.find(teacher => 
      (teacher.roles && teacher.roles.includes('teacher')) || teacher.role === 'teacher'
    );
    
    if (teacherWithRole) {
      testData.teacherId = teacherWithRole._id;
      console.log(`✅ Found teacher for testing: ${teacherWithRole.name} (${teacherWithRole._id})`);
    } else {
      console.log('⚠️  No teachers with teacher role found');
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get teachers:', error.response?.data?.message || error.message);
    throw error;
  }
}

/**
 * Test getting sections
 */
async function testGetSections() {
  try {
    console.log('\n📋 Testing section retrieval...');
    const response = await axios.get(`${API_URL}/sections`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log(`✅ Found ${response.data.length || 0} sections`);
    
    if (response.data.length > 0) {
      testData.sectionId = response.data[0]._id;
      console.log(`✅ Using section for testing: ${response.data[0].name} (${response.data[0]._id})`);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get sections:', error.response?.data?.message || error.message);
    throw error;
  }
}

/**
 * Test getting courses
 */
async function testGetCourses() {
  try {
    console.log('\n📋 Testing course retrieval...');
    const response = await axios.get(`${API_URL}/courses`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log(`✅ Found ${response.data.length || 0} courses`);
    
    if (response.data.length > 0) {
      testData.courseId = response.data[0]._id;
      console.log(`✅ Using course for testing: ${response.data[0].name} (${response.data[0]._id})`);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get courses:', error.response?.data?.message || error.message);
    throw error;
  }
}

/**
 * Test teacher assignment functionality
 */
async function testTeacherAssignment() {
  if (!testData.teacherId || !testData.sectionId || !testData.courseId) {
    console.log('⚠️  Skipping assignment test - missing required IDs');
    return;
  }
  
  try {
    console.log('\n🎯 Testing teacher assignment...');
    const response = await axios.post(`${API_URL}/teacher-assignments/assign`, {
      teacherId: testData.teacherId,
      assignments: [{
        sectionId: testData.sectionId,
        courseId: testData.courseId
      }]
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Teacher assignment successful');
    console.log('📊 Assignment details:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('❌ Teacher assignment failed:', error.response?.data?.message || error.message);
    if (error.response?.data?.details) {
      console.error('📋 Error details:', error.response.data.details);
    }
  }
}

/**
 * Test getting teacher assignments
 */
async function testGetTeacherAssignments() {
  if (!testData.teacherId) {
    console.log('⚠️  Skipping get assignments test - missing teacher ID');
    return;
  }
  
  try {
    console.log('\n📋 Testing get teacher assignments...');
    const response = await axios.get(`${API_URL}/teacher-assignments/teacher/${testData.teacherId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Retrieved teacher assignments successfully');
    console.log('📊 Assignments:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get teacher assignments:', error.response?.data?.message || error.message);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Starting Teacher Assignment System Tests...\n');
  
  try {
    // Step 1: Login
    await login();
    
    // Step 2: Get data for testing
    await testGetTeachers();
    await testGetSections();
    await testGetCourses();
    
    // Step 3: Test assignment functionality
    await testTeacherAssignment();
    await testGetTeacherAssignments();
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testData
};