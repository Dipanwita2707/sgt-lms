/**
 * Migration Script: Convert RegNo/TeacherId to New UID System
 * 
 * New System (NUMERIC ONLY):
 * - Staff (teachers, HOD, dean, admin): ##### (5 digits, e.g., 00001, 00002)
 * - Students: ######## (8 digits, e.g., 00000001, 00000002)
 */

const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function migrateUIDs() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');

    console.log('\n📊 Starting UID migration...\n');

    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} total users`);

    // First pass: collect all existing UIDs to avoid duplicates
    const existingUIDs = new Set();
    const usersToUpdate = [];

    for (const user of users) {
      if (user.uid && /^\d+$/.test(user.uid)) {
        existingUIDs.add(user.uid);
        console.log(`✅ ${user.name} already has UID: ${user.uid}`);
      } else {
        usersToUpdate.push(user);
      }
    }

    console.log(`\n📝 ${usersToUpdate.length} users need UID assignment`);
    console.log(`📌 ${existingUIDs.size} UIDs already in use\n`);

    // Find the next available UID numbers
    let nextStaffNum = 1;
    let nextStudentNum = 1;

    // Extract numbers from existing UIDs to find the highest
    for (const uid of existingUIDs) {
      const num = parseInt(uid);
      // 5-digit UIDs are staff, 8+ digit UIDs are students
      if (uid.length === 5 && num >= nextStaffNum) {
        nextStaffNum = num + 1;
      } else if (uid.length >= 8 && num >= nextStudentNum) {
        nextStudentNum = num + 1;
      }
    }

    console.log(`🔢 Next available Staff UID: ${String(nextStaffNum).padStart(5, '0')}`);
    console.log(`🔢 Next available Student UID: ${String(nextStudentNum).padStart(8, '0')}\n`);

    let updated = 0;
    let skipped = 0;

    for (const user of usersToUpdate) {
      const roles = user.roles || [user.role];
      const isStudent = roles.includes('student');
      const isStaff = roles.some(r => ['teacher', 'hod', 'dean', 'admin'].includes(r));

      let newUID = null;
      let source = 'counter';

      if (isStudent) {
        // Student: 8 digits
        // Try to extract number from existing regNo if it exists and doesn't conflict
        if (user.regNo) {
          const numMatch = user.regNo.match(/\d+/);
          if (numMatch) {
            const num = parseInt(numMatch[0]);
            const candidateUID = String(num).padStart(8, '0');
            if (!existingUIDs.has(candidateUID)) {
              newUID = candidateUID;
              source = `regNo (${user.regNo})`;
              existingUIDs.add(newUID);
            }
          }
        }
        
        // If no regNo or conflict, use counter
        if (!newUID) {
          // Find next available student number
          while (existingUIDs.has(String(nextStudentNum).padStart(8, '0'))) {
            nextStudentNum++;
          }
          newUID = String(nextStudentNum).padStart(8, '0');
          existingUIDs.add(newUID);
          nextStudentNum++;
          source = 'auto-increment';
        }
        
        console.log(`👨‍🎓 Student: ${user.name} (${user.email})`);
        console.log(`   Old regNo: ${user.regNo || 'N/A'} → New UID: ${newUID} (${source})`);
        
      } else if (isStaff) {
        // Staff: 5 digits
        // Try to extract number from existing teacherId if it exists and doesn't conflict
        if (user.teacherId) {
          const numMatch = user.teacherId.match(/\d+/);
          if (numMatch) {
            const num = parseInt(numMatch[0]);
            const candidateUID = String(num).padStart(5, '0');
            if (!existingUIDs.has(candidateUID)) {
              newUID = candidateUID;
              source = `teacherId (${user.teacherId})`;
              existingUIDs.add(newUID);
            }
          }
        }
        
        // If no teacherId or conflict, use counter
        if (!newUID) {
          // Find next available staff number
          while (existingUIDs.has(String(nextStaffNum).padStart(5, '0'))) {
            nextStaffNum++;
          }
          newUID = String(nextStaffNum).padStart(5, '0');
          existingUIDs.add(newUID);
          nextStaffNum++;
          source = 'auto-increment';
        }
        
        console.log(`👨‍🏫 Staff: ${user.name} (${user.email}) - Roles: ${roles.join(', ')}`);
        console.log(`   Old teacherId: ${user.teacherId || 'N/A'} → New UID: ${newUID} (${source})`);
      }

      if (newUID) {
        user.uid = newUID;
        await user.save();
        updated++;
        console.log(`   ✅ Updated\n`);
      } else {
        console.log(`   ⚠️  Could not determine UID for ${user.name}\n`);
        skipped++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Updated: ${updated} users`);
    console.log(`   ⏭️  Skipped: ${skipped} users (already had UIDs)`);
    console.log(`   📊 Total: ${users.length} users`);
    console.log('\n🎉 Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from database');
  }
}

// Run migration
if (require.main === module) {
  migrateUIDs()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = migrateUIDs;
