/**
 * Migration script to generate teacher IDs for existing teachers without one
 */
const User = require('../models/User');

async function generateTeacherIds() {
  try {
    console.log('Checking for teachers without teacherId...');
    
    // Find all teachers without a teacherId
    const teachers = await User.find({ 
      role: 'teacher', 
      $or: [
        { teacherId: null },
        { teacherId: { $exists: false } }
      ]
    });
    
    if (teachers.length === 0) {
      console.log('No teachers found without teacherId.');
      return;
    }
    
    console.log(`Found ${teachers.length} teachers without teacherId. Generating IDs...`);
    
    // Find the highest existing teacherId
    const highestTeacher = await User.findOne(
      { teacherId: { $regex: /^T\d{4}$/ } },
      { teacherId: 1 },
      { sort: { teacherId: -1 } }
    );
    
    let nextNumber = 1;
    if (highestTeacher && highestTeacher.teacherId) {
      // Extract the number from existing ID and increment
      const currentNumber = parseInt(highestTeacher.teacherId.substring(1), 10);
      nextNumber = currentNumber + 1;
    }
    
    // Generate and assign IDs to each teacher
    for (const teacher of teachers) {
      const teacherId = 'T' + nextNumber.toString().padStart(4, '0');
      await User.findByIdAndUpdate(teacher._id, { teacherId });
      console.log(`Assigned ${teacherId} to teacher ${teacher.name} (${teacher.email})`);
      nextNumber++;
    }
    
    console.log('Teacher ID generation complete.');
  } catch (error) {
    console.error('Error generating teacher IDs:', error);
  }
}

module.exports = generateTeacherIds;
