const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: '../.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt3', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const migrateRoleAssignments = async () => {
  try {
    console.log('🔄 Starting role assignments migration...');
    
    const users = await User.find({}).populate('school departments');
    console.log(`📊 Found ${users.length} users to migrate`);
    
    for (const user of users) {
      try {
        // Skip if roleAssignments already exist
        if (user.roleAssignments && user.roleAssignments.length > 0) {
          console.log(`✅ User ${user.email} already has role assignments, skipping`);
          continue;
        }
        
        // Create role assignments based on current roles and school/department data
        const roleAssignments = [];
        const userRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
        
        for (const role of userRoles) {
          if (!role) continue;
          
          const assignment = {
            role: role,
            isActive: true,
            assignedAt: new Date()
          };
          
          // Assign school and departments based on role type
          switch (role) {
            case 'dean':
              // Deans oversee entire schools
              if (user.school) {
                assignment.schools = [user.school];
              }
              break;
              
            case 'hod':
              // HODs manage departments within schools
              if (user.school) {
                assignment.school = user.school;
              }
              if (user.departments && user.departments.length > 0) {
                assignment.departments = user.departments;
              } else if (user.department) {
                assignment.departments = [user.department];
              }
              break;
              
            case 'teacher':
            case 'cc':
              // Teachers and CCs work within specific departments and schools
              if (user.school) {
                assignment.school = user.school;
              }
              if (user.departments && user.departments.length > 0) {
                assignment.departments = user.departments;
              } else if (user.department) {
                assignment.departments = [user.department];
              }
              break;
              
            case 'student':
              // Students belong to specific departments and schools
              if (user.school) {
                assignment.school = user.school;
              }
              if (user.department) {
                assignment.departments = [user.department];
              }
              break;
              
            case 'admin':
            case 'superadmin':
              // Admins don't need school/department restrictions
              break;
          }
          
          roleAssignments.push(assignment);
        }
        
        // Update user with new role assignments
        user.roleAssignments = roleAssignments;
        await user.save();
        
        console.log(`✅ Migrated user ${user.email} with ${roleAssignments.length} role assignments`);
        
      } catch (userError) {
        console.error(`❌ Error migrating user ${user.email}:`, userError.message);
      }
    }
    
    console.log('🎉 Role assignments migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the migration
migrateRoleAssignments();