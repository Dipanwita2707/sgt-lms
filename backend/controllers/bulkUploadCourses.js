// Bulk upload courses via CSV with validation and error reporting
const fs = require('fs');
const csv = require('csv-parser');
const User = require('../models/User');
const Course = require('../models/Course');
const AuditLog = require('../models/AuditLog');

exports.bulkUploadCourses = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const results = [];
  const errors = [];
  
  fs.createReadStream(req.file.path)
    .pipe(csv({
      mapHeaders: ({ header }) => header.trim().toLowerCase() // Normalize headers
    }))
    .on('data', (data) => {
      // Normalize the data object to ensure keys are lowercase
      const normalizedData = {};
      Object.keys(data).forEach(key => {
        normalizedData[key.toLowerCase().trim()] = data[key];
      });
      results.push(normalizedData);
    })
    .on('end', async () => {
      try {
        // Validate all rows first
        console.log(`Processing ${results.length} rows from CSV`);
        
        // Check for basic required fields in the CSV
        if (results.length > 0) {
          const firstRow = results[0];
          const requiredFields = ['title', 'description', 'teacherid'];
          const missingHeaders = requiredFields.filter(field => 
            !Object.keys(firstRow).some(key => key.toLowerCase() === field)
          );
          
          if (missingHeaders.length > 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ 
              message: `CSV is missing required headers: ${missingHeaders.join(', ')}. Please use the template.` 
            });
          }
        }
        
        // Validate each row
        for (let i = 0; i < results.length; i++) {
          const row = results[i];
          const rowNum = i + 2; // header is row 1
          
          if (!row.title || row.title.trim() === '') {
            errors.push({ row: rowNum, message: 'Missing field: title' });
          }
          
          // Validate teacher IDs if present
          if (row.teacherid) {
            const teacherIds = row.teacherid.split(',').map(id => id.trim()).filter(id => id);
            
            for (const teacherId of teacherIds) {
              if (!teacherId.match(/^T\d{4}$/)) {
                errors.push({ 
                  row: rowNum, 
                  message: `Invalid teacher ID format: ${teacherId}. Should be in format T#### (e.g., T0001)` 
                });
              } else {
                // Check if teacher ID exists in the database
                const teacher = await User.findOne({ teacherId, role: 'teacher' });
                if (!teacher) {
                  errors.push({ 
                    row: rowNum, 
                    message: `Teacher ID ${teacherId} does not exist in the system` 
                  });
                }
              }
            }
          }
        }
        
        if (errors.length > 0) {
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ message: 'Validation failed', errors });
        }
        
        // If valid, insert all courses
        const createdCourses = [];
        for (const row of results) {
          const title = row.title ? row.title.trim() : '';
          const description = row.description ? row.description.trim() : '';
          
          // Process teacher IDs
          const teacherIds = row.teacherid ? 
            row.teacherid.split(',').map(id => id.trim()).filter(id => id) : [];
          
          // Find the User IDs for the teacher IDs
          const teacherObjectIds = [];
          for (const teacherId of teacherIds) {
            const teacher = await User.findOne({ teacherId, role: 'teacher' });
            if (teacher) {
              teacherObjectIds.push(teacher._id);
            }
          }
          
          // Create course with teachers array
          const course = await Course.create({ 
            title, 
            description, 
            teachers: teacherObjectIds
          });
          
          createdCourses.push(course);
          
          await AuditLog.create({ 
            action: 'bulk_add_course', 
            performedBy: req.user._id, 
            details: { title, description, teacherIds } 
          });
        }
        
        fs.unlinkSync(req.file.path);
        res.status(201).json({ 
          message: `Successfully created ${createdCourses.length} courses`, 
          courses: createdCourses 
        });
      } catch (err) {
        console.error('Error in bulkUploadCourses:', err);
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error processing CSV file', error: err.message });
      }
    });
};
