const Announcement = require('../models/Announcement');
const User = require('../models/User');
const School = require('../models/School');
const Department = require('../models/Department');
const Section = require('../models/Section');
const Course = require('../models/Course');
// Notification utility
const NotificationController = require('./notificationController');

// Helper function to get user's hierarchy context
const getUserHierarchyContext = async (userId) => {
  const user = await User.findById(userId)
    .populate('school', 'name code')
    .populate('department', 'name code school')
    .populate('assignedSections', 'name courses teacher students');
  
  return {
    user,
    school: user.school,
    department: user.department,
    sections: user.assignedSections || []
  };
};

// Helper function to get target recipients based on role and targeting
const getTargetRecipients = async (sender, targetAudience) => {
  let recipients = [];
  
  console.log('🎯 getTargetRecipients called with targetAudience:', JSON.stringify(targetAudience, null, 2));
  
  try {
    // All users (admin only)
    if (targetAudience.allUsers) {
      recipients = await User.find({ isActive: true }).select('_id');
      console.log(`✅ All users targeting: ${recipients.length} users`);
      return recipients.map(r => r._id);
    }
    
    // Global announcements (dean to all schools)
    if (targetAudience.isGlobal) {
      recipients = await User.find({ isActive: true }).select('_id');
      console.log(`✅ Global targeting: ${recipients.length} users`);
      return recipients.map(r => r._id);
    }
    
    // Role/School/Department intersection targeting (for dean/hod use cases)
    const attributeFilters = [];
    if (targetAudience.targetRoles && targetAudience.targetRoles.length > 0) {
      console.log(`📌 Target roles specified: ${targetAudience.targetRoles.join(', ')}`);
      // Support both new roles array and legacy role field
      attributeFilters.push({ 
        $or: [
          { roles: { $in: targetAudience.targetRoles } },
          { role: { $in: targetAudience.targetRoles } }
        ]
      });
    }
    if (targetAudience.targetSchools && targetAudience.targetSchools.length > 0) {
      console.log(`📌 Target schools specified: ${targetAudience.targetSchools.length} schools`);
      attributeFilters.push({ school: { $in: targetAudience.targetSchools } });
    }
    if (targetAudience.targetDepartments && targetAudience.targetDepartments.length > 0) {
      console.log(`📌 Target departments specified: ${targetAudience.targetDepartments.length} departments`);
      attributeFilters.push({ department: { $in: targetAudience.targetDepartments } });
    }
    if (attributeFilters.length > 0) {
      const filteredUsers = await User.find({
        isActive: true,
        $and: attributeFilters
      }).select('_id');
      console.log(`✅ Attribute filters matched ${filteredUsers.length} users`);
      recipients.push(...filteredUsers.map(u => u._id));
    }
    
    // Section-based targeting
    if (targetAudience.targetSections && targetAudience.targetSections.length > 0) {
      console.log(`📌 Target sections specified: ${targetAudience.targetSections.length} sections`);
      const sections = await Section.find({
        _id: { $in: targetAudience.targetSections }
      }).populate('students', '_id').populate('teacher', '_id');
      
      sections.forEach(section => {
        recipients.push(...(section.students || []).map(s => s._id));
        if (section.teacher) {
          recipients.push(section.teacher._id);
        }
      });
      console.log(`✅ Section targeting added ${sections.length} sections worth of users`);
    }
    
    // Course-based targeting with role filtering
    if (targetAudience.targetCourses && targetAudience.targetCourses.length > 0) {
      console.log(`📌 Target courses specified: ${targetAudience.targetCourses.length} courses`);
      console.log(`   - includeStudents: ${targetAudience.includeStudents}`);
      console.log(`   - includeTeachers: ${targetAudience.includeTeachers}`);
      
      const courseSections = await Section.find({
        courses: { $in: targetAudience.targetCourses }
      }).populate('students', '_id').populate('teacher', '_id');
      
      console.log(`   - Found ${courseSections.length} sections with these courses`);
      
      const courseSectionIds = courseSections.map(s => s._id);
      
      courseSections.forEach(section => {
        // Include students if specified
        if (targetAudience.includeStudents) {
          recipients.push(...(section.students || []).map(s => s._id));
        }
        // Include teachers if specified (note: teacher is singular in Section model)
        if (targetAudience.includeTeachers && section.teacher) {
          recipients.push(section.teacher._id);
        }
      });
      
      console.log(`   - Added recipients from course sections`);
      
      // Also get teachers who have these sections in their assignedSections
      if (targetAudience.includeTeachers && courseSectionIds.length > 0) {
        console.log(`   - Looking for teachers with assignedSections in:`, courseSectionIds.map(id => id.toString()));
        const teachersWithSections = await User.find({
          $or: [
            { roles: { $in: ['teacher'] } },
            { role: 'teacher' }
          ],
          assignedSections: { $in: courseSectionIds },
          isActive: true
        }).select('_id name email');
        
        console.log(`   - Found ${teachersWithSections.length} teachers assigned to these sections:`);
        teachersWithSections.forEach(t => {
          console.log(`     * ${t.name} (${t._id})`);
        });
        
        recipients.push(...teachersWithSections.map(t => t._id));
      }
      
      // Also get users directly enrolled in courses (not just through sections)
      if (targetAudience.includeStudents) {
        const courseStudents = await User.find({
          $or: [
            { roles: { $in: ['student'] } },
            { role: 'student' }
          ],
          coursesAssigned: { $in: targetAudience.targetCourses },
          isActive: true
        }).select('_id');
        recipients.push(...courseStudents.map(s => s._id));
      }
      
      if (targetAudience.includeTeachers) {
        const courseTeachers = await User.find({
          $or: [
            { roles: { $in: ['teacher'] } },
            { role: 'teacher' }
          ],
          coursesAssigned: { $in: targetAudience.targetCourses },
          isActive: true
        }).select('_id');
        recipients.push(...courseTeachers.map(t => t._id));
      }
    }
    
    // Specific users
    if (targetAudience.specificUsers && targetAudience.specificUsers.length > 0) {
      console.log(`📌 Specific users specified: ${targetAudience.specificUsers.length} users`);
      recipients.push(...targetAudience.specificUsers);
    }
    
    console.log(`📊 Total recipients before deduplication: ${recipients.length}`);
    
    // Remove duplicates and sender
    const uniqueRecipients = [...new Set(recipients.map(r => r.toString()))]
      .filter(r => r !== sender.toString());
    
    console.log(`✅ Final unique recipients (excluding sender): ${uniqueRecipients.length}`);
    console.log(`👥 Final recipient IDs:`, uniqueRecipients);
    
    return uniqueRecipients;
  } catch (error) {
    console.error('Error getting target recipients:', error);
    return [];
  }
};

// Create announcement with role-based permissions
exports.createAnnouncement = async (req, res) => {
  try {
    const senderId = req.user._id;
    const senderRoles = req.user.roles || [req.user.role];
    const senderRole = req.user.role; // Keep for legacy compatibility
    const { title, message, targetAudience, priority, scheduledFor, expiresAt, requiresApproval } = req.body;
    
    // Debug logging
    console.log('Creating announcement with targetAudience:', JSON.stringify(targetAudience, null, 2));
    console.log('Sender roles:', senderRoles);
    
    // Get sender's hierarchy context
    const context = await getUserHierarchyContext(senderId);
    
    // Validate permissions based on role
    let allowedToCreate = false;
    let needsApproval = false;
    
    // Determine primary role (prioritize: admin > dean > hod > teacher > student)
    let primaryRole = 'student';
    if (senderRoles.includes('admin')) primaryRole = 'admin';
    else if (senderRoles.includes('dean')) primaryRole = 'dean';
    else if (senderRoles.includes('hod')) primaryRole = 'hod';
    else if (senderRoles.includes('teacher')) primaryRole = 'teacher';
    
    switch (primaryRole) {
      case 'admin':
        allowedToCreate = true;
        break;
        
      case 'dean':
        // Dean can announce to their school and departments under them
        allowedToCreate = true;
        
        // Check if dean wants to make global announcement
        if (targetAudience.isGlobal) {
          // Dean can make global announcements to all schools
          allowedToCreate = true;
        } else if (targetAudience.targetSchools && targetAudience.targetSchools.length > 0) {
          // Check if dean is targeting another school (cross-school announcement)
          const targetSchoolIds = targetAudience.targetSchools.map(id => id.toString());
          const deanSchoolId = context.school?._id?.toString();
          
          // If targeting schools other than their own
          const otherSchools = targetSchoolIds.filter(id => id !== deanSchoolId);
          if (otherSchools.length > 0) {
            // This is a cross-school announcement - needs approval from target school dean
            needsApproval = true;
            allowedToCreate = true;
            
            // Find the dean of the target school (assuming single target school for cross-school)
            const targetSchool = await School.findById(otherSchools[0]).populate('dean');
            if (!targetSchool || !targetSchool.dean) {
              return res.status(400).json({
                message: 'Target school does not have an assigned dean for approval'
              });
            }
          } else {
            // Announcing to own school - validate departments if specified
            if (targetAudience.targetDepartments && targetAudience.targetDepartments.length > 0) {
              const departments = await Department.find({ _id: { $in: targetAudience.targetDepartments } })
                .select('_id school');
              const invalid = departments.filter(d => d.school?.toString() !== context.school?._id?.toString());
              if (invalid.length > 0) {
                return res.status(403).json({
                  message: 'Deans can only announce to departments within their own school'
                });
              }
            }
          }
        } else {
          // No specific school targeting - validate dean is announcing within their school
          if (targetAudience.targetDepartments && targetAudience.targetDepartments.length > 0) {
            const departments = await Department.find({ _id: { $in: targetAudience.targetDepartments } })
              .select('_id school');
            const invalid = departments.filter(d => d.school?.toString() !== context.school?._id?.toString());
            if (invalid.length > 0) {
              return res.status(403).json({
                message: 'Deans can only announce to departments within their own school'
              });
            }
          }
        }
        break;
        
      case 'hod':
        // HOD can announce to their department
        allowedToCreate = true;
        
        // If targeting specific departments, validate HOD is announcing within their department
        if (targetAudience.targetDepartments && targetAudience.targetDepartments.length > 0 &&
            !targetAudience.targetDepartments.includes(context.department?._id?.toString())) {
          return res.status(403).json({ 
            message: 'HODs can only announce to their own department' 
          });
        }
        
        // If targeting sections, validate sections are in HOD's department
        if (targetAudience.targetSections && targetAudience.targetSections.length > 0) {
          const sections = await Section.find({ _id: { $in: targetAudience.targetSections } });
          const invalidSections = sections.filter(s => 
            s.department?.toString() !== context.department?._id?.toString()
          );
          if (invalidSections.length > 0) {
            return res.status(403).json({ 
              message: 'HODs can only announce to sections in their own department' 
            });
          }
        }
        break;
        
      case 'teacher':
        // Teacher needs HOD approval and can only announce to assigned sections
        const teacher = await User.findById(senderId);
        if (!teacher.canAnnounce) {
          return res.status(403).json({ 
            message: 'You do not have permission to create announcements. Contact your HOD.' 
          });
        }
        allowedToCreate = true;
        needsApproval = true;
        
        // Validate teacher is announcing only to assigned sections
        const teacherSectionIds = context.sections.map(s => s._id.toString());
        const invalidSections = targetAudience.targetSections?.filter(
          sId => !teacherSectionIds.includes(sId)
        );
        
        if (invalidSections && invalidSections.length > 0) {
          return res.status(403).json({ 
            message: 'Teachers can only announce to their assigned sections' 
          });
        }
        break;
        
      default:
        allowedToCreate = false;
    }
    
    if (!allowedToCreate) {
      return res.status(403).json({ message: 'Not authorized to create announcements' });
    }
    
    // Prepare cross-school data if needed
    let crossSchoolData = {};
    if (primaryRole === 'dean' && targetAudience.targetSchools && targetAudience.targetSchools.length > 0) {
      const targetSchoolIds = targetAudience.targetSchools.map(id => id.toString());
      const deanSchoolId = context.school?._id?.toString();
      const otherSchools = targetSchoolIds.filter(id => id !== deanSchoolId);
      
      if (otherSchools.length > 0) {
        const targetSchool = await School.findById(otherSchools[0]).populate('dean');
        if (targetSchool && targetSchool.dean) {
          crossSchoolData = {
            crossSchoolRequest: true,
            targetSchoolDean: targetSchool.dean._id,
            originalRequestedSchool: targetSchool._id
          };
        }
      }
    }
    // Create announcement
    
    // Calculate recipients based on targetAudience
    const calculatedRecipients = await getTargetRecipients(senderId, targetAudience);
    console.log(`📋 Calculated ${calculatedRecipients.length} recipients for announcement`);
    console.log(`👥 Recipients IDs:`, calculatedRecipients.map(r => r.toString()));
    console.log(`📝 TargetAudience received:`, JSON.stringify(targetAudience, null, 2));
    
    const announcement = new Announcement({
      sender: senderId,
      role: primaryRole, // Use primary role for announcement
      title,
      message,
      targetAudience: {
        ...targetAudience,
        // Add calculated specific users to ensure visibility
        specificUsers: [
          ...(targetAudience.specificUsers || []),
          ...calculatedRecipients
        ]
      },
      recipients: targetAudience.targetRoles || [], // Populate legacy field for backward compatibility
      priority: priority || 'normal',
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      requiresApproval: needsApproval || requiresApproval,
      approvalStatus: needsApproval ? 'pending' : 'approved',
      ...crossSchoolData,
      submittedForApproval: needsApproval,
      approvalRequestedAt: needsApproval ? new Date() : undefined,
      hodReviewRequired: primaryRole === 'teacher' && needsApproval
    });
    
    await announcement.save();

    // Fire-and-forget notifications (don't block main response)
    (async () => {
      try {
        if (needsApproval) {
          if (primaryRole === 'teacher') {
            // Teacher flow: notify HOD(s) for approval
            const hods = await User.find({
              $or: [
                { roles: 'hod' },
                { role: 'hod' }
              ],
              department: context.department?._id,
              isActive: true
            }).select('_id');
            for (const hod of hods) {
              await NotificationController.createNotification({
                type: 'announcement_approval',
                recipient: hod._id,
                message: `New announcement from ${req.user.name} requires your approval: "${title}"`,
                data: { announcementId: announcement._id, senderRole: primaryRole },
                announcement: announcement._id
              });
            }
          } else if (primaryRole === 'dean' && crossSchoolData.crossSchoolRequest) {
            // Cross-school dean flow: notify target school dean for approval
            await NotificationController.createNotification({
              type: 'cross_school_announcement_approval',
              recipient: crossSchoolData.targetSchoolDean,
              message: `Cross-school announcement request from ${req.user.name}: "${title}" requires your approval`,
              data: { 
                announcementId: announcement._id, 
                senderRole: primaryRole,
                requestingDean: req.user.name,
                requestingSchool: context.school?.name,
                targetSchool: announcement.originalRequestedSchool
              },
              announcement: announcement._id
            });
          }
        } else {
          // Immediate publish (admin/dean/hod): notify recipients
          console.log('🔔 Getting target recipients for announcement:', title);
          console.log('📋 Target Audience:', JSON.stringify(targetAudience, null, 2));
          const recipients = await getTargetRecipients(senderId, targetAudience);
          console.log(`📤 Found ${recipients.length} recipients:`, recipients.map(r => r.toString()));
          // Avoid notifying the sender
          const recipientsToNotify = recipients.filter(r => r.toString() !== senderId.toString());
          console.log(`✉️ Sending notifications to ${recipientsToNotify.length} recipients (excluding sender)`);
          for (const rid of recipientsToNotify) {
            await NotificationController.createNotification({
              type: 'announcement',
              recipient: rid,
              message: `New ${primaryRole} announcement: ${title}`,
              data: { announcementId: announcement._id, priority: announcement.priority },
              announcement: announcement._id
            });
          }
          console.log('✅ Notifications sent successfully');
        }
      } catch (notifyErr) {
        console.error('Non-blocking: failed to dispatch notifications for announcement:', notifyErr?.message || notifyErr);
      }
    })();
    
    // Populate the announcement before returning
    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('sender', 'name email role')
      .populate('targetAudience.targetSchools', 'name code')
      .populate('targetAudience.targetDepartments', 'name code')
      .populate('targetAudience.targetSections', 'name courses')
      .populate('targetAudience.targetCourses', 'title courseCode');
    
    res.status(201).json({
      message: needsApproval ? 'Announcement created and sent for approval' : 'Announcement created successfully',
      announcement: populatedAnnouncement
    });
    
  } catch (err) {
    console.error('Error creating announcement:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get announcements based on user role and hierarchy
exports.getAnnouncements = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { status = 'all', page = 1, limit = 20, activeRole } = req.query;
    
    // Get user's hierarchy context
    const context = await getUserHierarchyContext(userId);
    let query = {};
    
    // Base query filters
    if (status === 'active') {
      query.isActive = true;
      query.expiresAt = { $or: [{ $exists: false }, { $gte: new Date() }] };
    }
    
    // Role-based filtering
    const userRoles = req.user.roles || [req.user.role];
    const isAdmin = userRoles.includes('admin');
    const isDean = userRoles.includes('dean');
    
    if (isAdmin && !activeRole) {
      // Admins see all announcements only when no activeRole is specified
      if (status === 'pending') {
        query.approvalStatus = 'pending';
      } else {
        query.approvalStatus = 'approved';
      }
    } else {
      // All other cases: filter by role context
      query.approvalStatus = 'approved';
      
      // Determine which role to filter by
      const filterRole = activeRole || userRole;
      
      // Validate that the user actually has the activeRole they're claiming
      if (activeRole && !userRoles.includes(activeRole)) {
        return res.status(403).json({ message: 'You do not have access to that role' });
      }
      
      const targetConditions = [
        { 'targetAudience.allUsers': true },
        { 'targetAudience.targetRoles': filterRole },
        { 'targetAudience.specificUsers': userId } // Array contains userId
      ];
      
      // If no activeRole specified and user is not admin, fall back to checking all user roles
      if (!activeRole && !isAdmin && userRoles && userRoles.length > 0) {
        targetConditions.push({ 'targetAudience.targetRoles': { $in: userRoles } });
      }
      
      if (context.school) {
        targetConditions.push({ 'targetAudience.targetSchools': context.school._id });
      }
      
      if (context.department) {
        targetConditions.push({ 'targetAudience.targetDepartments': context.department._id });
      }
      
      console.log(`🔍 Fetching announcements for user ${userId} with role ${filterRole}`);
      console.log(`📋 Target conditions count: ${targetConditions.length}`);
      
      if (context.sections && context.sections.length > 0) {
        targetConditions.push({ 
          'targetAudience.targetSections': { 
            $in: context.sections.map(s => s._id) 
          } 
        });
      }
      
      // Include approved cross-school announcements targeted to user's school
      if (context.school) {
        targetConditions.push({ 
          crossSchoolRequest: true,
          approvalStatus: 'approved',
          originalRequestedSchool: context.school._id
        });
      }
      
      // Also include announcements sent by the user
      targetConditions.push({ sender: userId });
      
      query.$or = targetConditions;
    }
    
    // Execute query with pagination
    const skip = (page - 1) * limit;
    const announcements = await Announcement.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('sender', 'name email role teacherId')
      .populate('approvedBy', 'name email role')
      .populate('approvalHistory.approvedBy', 'name email role')
      .populate('targetAudience.targetSchools', 'name code')
      .populate('targetAudience.targetDepartments', 'name code')
      .populate('targetAudience.targetSections', 'name courses')
      .populate('targetAudience.targetCourses', 'title courseCode');
    
    const total = await Announcement.countDocuments(query);
    
    res.json({
      announcements,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: announcements.length,
        totalRecords: total
      }
    });
    
  } catch (err) {
    console.error('Error fetching announcements:', err);
    res.status(500).json({ message: err.message });
  }
};

// Approve/Reject announcement (HOD/Admin only)
exports.moderateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, note } = req.body; // action: 'approve' or 'reject'
    const moderatorId = req.user._id;
    const moderatorRoles = req.user.roles || [req.user.role];
    
    const announcement = await Announcement.findById(id).populate('sender');
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    // Check permissions
    let canModerate = false;
    
    if (moderatorRoles.includes('admin')) {
      canModerate = true;
    } else if (moderatorRoles.includes('hod')) {
      // HOD can moderate announcements from teachers in their department
      const teacher = await User.findById(announcement.sender._id);
      const moderator = await User.findById(moderatorId);
      
      if (teacher.department && moderator.department && 
          teacher.department.toString() === moderator.department.toString()) {
        canModerate = true;
      }
    }
    
    if (!canModerate) {
      return res.status(403).json({ message: 'Not authorized to moderate this announcement' });
    }
    
    // Update announcement
    announcement.approvalStatus = action === 'approve' ? 'approved' : 'rejected';
    announcement.approvedBy = moderatorId;
    announcement.approvalNote = note;
    
    await announcement.save();
    
    res.json({ 
      message: `Announcement ${action}d successfully`,
      announcement 
    });
    
  } catch (err) {
    console.error('Error moderating announcement:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get user's targeting options based on their role
exports.getTargetingOptions = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRoles = req.user.roles || [req.user.role];
    const userRole = req.user.role; // Keep for backward compatibility
    
    const context = await getUserHierarchyContext(userId);
    let options = {
      roles: [],
      schools: [],
      departments: [],
      sections: [],
      courses: []
    };
    
    // Determine primary role for targeting (prioritize: admin > dean > hod > teacher > student)
    let primaryRole = 'student';
    if (userRoles.includes('admin')) primaryRole = 'admin';
    else if (userRoles.includes('dean')) primaryRole = 'dean';
    else if (userRoles.includes('hod')) primaryRole = 'hod';
    else if (userRoles.includes('teacher')) primaryRole = 'teacher';
    
    switch (primaryRole) {
      case 'admin':
    options.roles = ['admin', 'dean', 'hod', 'teacher', 'student'];
    options.schools = await School.find({ isActive: true }).select('name code');
    options.departments = await Department.find({ isActive: true }).select('name code school');
    // Return sections without populating courses to avoid strictPopulate issues
    options.sections = await Section.find().select('name courses');
        options.courses = await Course.find().select('title courseCode');
        break;
        
      case 'dean':
        options.roles = ['hod', 'teacher', 'student'];
        
        // Add all schools for cross-school announcements
        options.allSchools = await School.find({ isActive: true }).select('name code');
        
        if (context.school) {
          options.schools = [context.school];
          const schoolDepartments = await Department.find({ 
            school: context.school._id, 
            isActive: true 
          }).select('name code');
          options.departments = schoolDepartments;

          // Get sections within the dean's school departments
          const departmentIds = schoolDepartments.map(d => d._id);
          const schoolSections = await Section.find({ 
            department: { $in: departmentIds } 
          }).select('name department').populate('department', 'name');
          options.sections = schoolSections;

          // Load users in dean's school grouped by department
          const [hods, teachers, students] = await Promise.all([
            User.find({ 
              $or: [
                { roles: 'hod' },
                { role: 'hod' }
              ], 
              school: context.school._id, 
              isActive: true 
            }).select('name email department'),
            User.find({ 
              $or: [
                { roles: { $in: ['teacher'] } },
                { role: 'teacher' }
              ], 
              school: context.school._id, 
              isActive: true 
            }).select('name email department teacherId'),
            User.find({ 
              $or: [
                { roles: { $in: ['student'] } },
                { role: 'student' }
              ], 
              school: context.school._id, 
              isActive: true 
            }).select('name email regNo department')
          ]);

          options.hods = hods;
          options.teachers = teachers;
          options.students = students;

          // Groupings by department for quick counts/selection
          const hodsByDepartment = {};
          const teachersByDepartment = {};
          const studentsByDepartment = {};
          const sectionsByDepartment = {};

          const deptIds = schoolDepartments.map(d => d._id.toString());
          deptIds.forEach(id => {
            hodsByDepartment[id] = { department: id, hods: [] };
            teachersByDepartment[id] = { department: id, teachers: [] };
            studentsByDepartment[id] = { department: id, students: [] };
            sectionsByDepartment[id] = { department: id, sections: [] };
          });

          hods.forEach(h => {
            const d = h.department ? h.department.toString() : null;
            if (d && hodsByDepartment[d]) hodsByDepartment[d].hods.push(h);
          });
          teachers.forEach(t => {
            const d = t.department ? t.department.toString() : null;
            if (d && teachersByDepartment[d]) teachersByDepartment[d].teachers.push(t);
          });
          students.forEach(s => {
            const d = s.department ? s.department.toString() : null;
            if (d && studentsByDepartment[d]) studentsByDepartment[d].students.push(s);
          });
          schoolSections.forEach(s => {
            const d = s.department ? s.department._id.toString() : null;
            if (d && sectionsByDepartment[d]) sectionsByDepartment[d].sections.push(s);
          });

          options.hodsByDepartment = hodsByDepartment;
          options.teachersByDepartment = teachersByDepartment;
          options.studentsByDepartment = studentsByDepartment;
          options.sectionsByDepartment = sectionsByDepartment;

          options.schoolSummary = {
            name: context.school.name,
            totalDepartments: schoolDepartments.length,
            totalHods: hods.length,
            totalTeachers: teachers.length,
            totalStudents: students.length,
            totalSections: schoolSections.length
          };
        }
        break;
        
      case 'hod':
        options.roles = ['teacher', 'student'];
        if (context.department) {
          options.departments = [context.department];
          
          console.log('HOD Department Context:', context.department._id, context.department.name);
          
          // Get all sections in HOD's department
          const departmentSections = await Section.find({
            department: context.department._id
          }).select('name courses teacher teachers');
          options.sections = departmentSections;
          
          console.log('Department Sections found:', departmentSections.length);
          console.log('Section details:');
          departmentSections.forEach(sec => {
            console.log(`  - ${sec.name}: courses=${JSON.stringify(sec.courses || [])}, teacher=${sec.teacher}, teachers=${JSON.stringify(sec.teachers || [])}`);
          });
          
          // Get all courses in HOD's department
          const departmentCourses = await Course.find({
            department: context.department._id,
            isActive: true
          }).select('title courseCode year semester createdAt').sort({ title: 1 });
          options.courses = departmentCourses;
          
          console.log('Department Courses found:', departmentCourses.length, departmentCourses.map(c => c.title));
          
          // Get all teachers in HOD's department with their sections
          const departmentTeachers = await User.find({
            department: context.department._id,
            $or: [
              { roles: { $in: ['teacher'] } },
              { role: 'teacher' }
            ],
            isActive: true
          }).select('name email teacherId assignedSections').populate('assignedSections', 'name courses');
          
          // Enhanced teacher data with section information
          options.teachers = departmentTeachers.map(teacher => ({
            _id: teacher._id,
            name: teacher.name,
            email: teacher.email,
            teacherId: teacher.teacherId,
            assignedSections: teacher.assignedSections || [], // Keep as assignedSections for compatibility
            sectionNames: teacher.assignedSections ? teacher.assignedSections.map(s => s.name).join(', ') : 'No sections assigned'
          }));
          
          // Get all students in HOD's department sections (not just by department field)
          // First get all section IDs in the department
          const departmentSectionIds = departmentSections.map(s => s._id);
          
          // Populate sections with students to get all enrolled students
          const populatedSections = await Section.find({
            _id: { $in: departmentSectionIds }
          }).populate('students', 'name email regNo assignedSections isActive');
          
          // Collect unique students from all sections in the department
          const studentMap = new Map();
          populatedSections.forEach(section => {
            if (section.students && Array.isArray(section.students)) {
              section.students.forEach(student => {
                if (student.isActive !== false) { // Include active students or those without isActive field
                  studentMap.set(student._id.toString(), student);
                }
              });
            }
          });
          
          // Convert map to array and populate assignedSections
          const departmentStudents = Array.from(studentMap.values());
          
          // Populate assignedSections for each student
          for (let student of departmentStudents) {
            if (student.assignedSections && student.assignedSections.length > 0) {
              await student.populate('assignedSections', 'name courses');
            }
          }
          
          console.log(`\n👥 Total students in department (from sections): ${departmentStudents.length}`);
          departmentStudents.forEach(student => {
            console.log(`  - ${student.name} (${student.regNo}): assignedSections=${JSON.stringify(student.assignedSections ? student.assignedSections.map(s => s.name) : [])}`)
          });
          
          // Enhanced student data with course and section information
          options.students = departmentStudents.map(student => ({
            _id: student._id,
            name: student.name,
            email: student.email,
            regNo: student.regNo,
            assignedSections: student.assignedSections || [], // Keep as assignedSections for compatibility
            sectionNames: student.assignedSections ? student.assignedSections.map(s => s.name).join(', ') : 'No sections assigned'
          }));
          
          // Group teachers and students by course for better organization
          const teachersByCourse = {};
          const studentsByCourse = {};
          
          departmentCourses.forEach(course => {
            // Initialize course objects
            teachersByCourse[course._id] = {
              course,
              teachers: []
            };
            studentsByCourse[course._id] = {
              course,
              students: []
            };
            
            // Find sections that have this course
            const courseSections = departmentSections.filter(section => 
              Array.isArray(section.courses) && section.courses.some(cId => cId.toString() === course._id.toString())
            );
            
            console.log(`\n🔍 Processing course: ${course.title} (${course._id})`);
            console.log(`  📚 Sections with this course: ${courseSections.length}`);
            courseSections.forEach(sec => {
              console.log(`    - ${sec.name} (${sec._id})`);
            });
            
            const sectionIds = courseSections.map(s => s._id.toString());
            console.log(`  🔑 Section IDs: ${JSON.stringify(sectionIds)}`);
            
            console.log(`  🔎 Checking ${options.teachers.length} teachers...`);
            options.teachers.forEach(t => {
              if (Array.isArray(t.assignedSections)) {
                const teacherSections = t.assignedSections.map(s => s._id ? s._id.toString() : s.toString());
                console.log(`    ${t.name}: ${JSON.stringify(teacherSections)}, match: ${teacherSections.some(ts => sectionIds.includes(ts))}`);
              }
            });
            
            // Find teachers assigned to these sections
            teachersByCourse[course._id].teachers = options.teachers.filter(teacher => 
              Array.isArray(teacher.assignedSections) && 
              teacher.assignedSections.some(s => sectionIds.includes(s._id ? s._id.toString() : s.toString()))
            );
            
            console.log(`  ✅ Teachers assigned: ${teachersByCourse[course._id].teachers.length}`);
            
            // Find students assigned to these sections
            studentsByCourse[course._id].students = options.students.filter(student => 
              Array.isArray(student.assignedSections) && 
              student.assignedSections.some(s => sectionIds.includes(s._id ? s._id.toString() : s.toString()))
            );
            
            console.log(`  ✅ Students assigned: ${studentsByCourse[course._id].students.length}`);
          });
          
          options.teachersByCourse = teachersByCourse;
          options.studentsByCourse = studentsByCourse;
          
          // Add department summary
          options.departmentSummary = {
            name: context.department.name,
            totalTeachers: options.teachers.length,
            totalStudents: options.students.length,
            totalCourses: departmentCourses.length,
            totalSections: departmentSections.length
          };
        }
        break;
        
      case 'teacher':
        options.sections = context.sections.map(s => ({
          _id: s._id,
          name: s.name,
          courses: s.courses || []
        }));
        break;
    }
    
    console.log('Final targeting options for role:', primaryRole, {
      coursesCount: options.courses?.length || 0,
      teachersByCoursesCount: Object.keys(options.teachersByCourse || {}).length,
      studentsByCoursesCount: Object.keys(options.studentsByCourse || {}).length,
      departmentSummary: options.departmentSummary
    });
    
    res.json(options);
    
  } catch (err) {
    console.error('Error getting targeting options:', err);
    res.status(500).json({ message: err.message });
  }
};

// Toggle teacher announcement permission (HOD only)
exports.toggleTeacherPermission = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const hodId = req.user._id;
    const hodRoles = req.user.roles || [req.user.role];
    
    if (!hodRoles.includes('hod') && !hodRoles.includes('admin')) {
      return res.status(403).json({ message: 'Only HODs can manage teacher permissions' });
    }
    
    const teacher = await User.findById(teacherId);
    const hod = await User.findById(hodId);
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Check if user is a teacher (support multi-role)
    const teacherRoles = teacher.roles || [teacher.role];
    if (!teacherRoles.includes('teacher')) {
      return res.status(404).json({ message: 'User is not a teacher' });
    }
    
    // Check if HOD and teacher are in same department (unless admin)
    if (hodRoles.includes('hod') && !hodRoles.includes('admin') &&
        (!teacher.department || !hod.department || 
         teacher.department.toString() !== hod.department.toString())) {
      return res.status(403).json({ 
        message: 'You can only manage teachers in your department' 
      });
    }
    
    teacher.canAnnounce = !teacher.canAnnounce;
    await teacher.save();
    
    res.json({ 
      message: `Teacher announcement permission ${teacher.canAnnounce ? 'granted' : 'revoked'}`,
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        canAnnounce: teacher.canAnnounce
      }
    });
    
  } catch (err) {
    console.error('Error toggling teacher permission:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get pending announcements for HOD approval
exports.getPendingApprovals = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRoles = req.user.roles || [req.user.role];
    
    if (!userRoles.includes('hod')) {
      return res.status(403).json({ message: 'Only HODs can view pending approvals' });
    }
    
    // Get HOD's context
    const context = await getUserHierarchyContext(userId);
    
    // Find announcements from teachers in HOD's department requiring approval
    const pendingAnnouncements = await Announcement.find({
      approvalStatus: 'pending',
      hodReviewRequired: true,
      $or: [
        { role: 'teacher' },
        { 'sender.roles': 'teacher' },
        { 'sender.role': 'teacher' }
      ]
    })
  .populate('sender', 'name email department')
  .populate('targetAudience.targetSections', 'name courses')
    .populate('targetAudience.targetCourses', 'title courseCode')
    .sort({ createdAt: -1 });
    
    // Filter announcements from teachers in the HOD's department
    const departmentAnnouncements = pendingAnnouncements.filter(announcement => 
      announcement.sender.department && 
      announcement.sender.department.toString() === context.department?._id?.toString()
    );
    
    res.json({
      announcements: departmentAnnouncements,
      count: departmentAnnouncements.length
    });
    
  } catch (err) {
    console.error('Error getting pending approvals:', err);
    res.status(500).json({ message: err.message });
  }
};

  // Approve or reject teacher announcement (HOD only)
exports.approveTeacherAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, note } = req.body; // action: 'approve' or 'reject'
    const userId = req.user._id;
    const userRoles = req.user.roles || [req.user.role];
    
    if (!userRoles.includes('hod')) {
      return res.status(403).json({ message: 'Only HODs can approve announcements' });
    }
    
    const announcement = await Announcement.findById(id)
      .populate('sender', 'name email department');
    
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    // Verify the announcement is from a teacher in HOD's department
    const context = await getUserHierarchyContext(userId);
    if (announcement.sender.department.toString() !== context.department?._id?.toString()) {
      return res.status(403).json({ 
        message: 'You can only approve announcements from teachers in your department' 
      });
    }
    
    // Store previous status for history
    const previousStatus = announcement.approvalStatus;
    
    // Update approval status
    announcement.approvalStatus = action === 'approve' ? 'approved' : 'rejected';
    announcement.approvedBy = userId;
    announcement.approvalNote = note;
    announcement.hodReviewRequired = false;
    
    // Add to approval history
    if (!announcement.approvalHistory) {
      announcement.approvalHistory = [];
    }
    
    announcement.approvalHistory.push({
      approvedBy: userId,
      approverRole: 'hod',
      action: action === 'approve' ? 'approved' : 'rejected',
      actionDate: new Date(),
      note: note || '',
      previousStatus: previousStatus
    });
    
    await announcement.save();
    
    // If approved, send notifications to recipients
    if (action === 'approve') {
      console.log('🔔 Sending notifications for approved teacher announcement:', announcement.title);
      
      // Get recipients based on targetAudience
      const recipients = await getTargetRecipients(announcement.sender._id, announcement.targetAudience);
      
      console.log(`📤 Sending notifications to ${recipients.length} recipients`);
      
      // Send notifications to all recipients (fire-and-forget)
      (async () => {
        try {
          const recipientsToNotify = recipients.filter(r => r.toString() !== announcement.sender._id.toString());
          for (const rid of recipientsToNotify) {
            await NotificationController.createNotification({
              type: 'announcement',
              recipient: rid,
              message: `New ${announcement.role} announcement: ${announcement.title}`,
              data: { announcementId: announcement._id, priority: announcement.priority },
              announcement: announcement._id
            });
          }
          console.log('✅ Notifications sent successfully');
        } catch (notifyErr) {
          console.error('❌ Error sending notifications for approved announcement:', notifyErr);
        }
      })();
      
      // Also notify the teacher that their announcement was approved
      await NotificationController.createNotification({
        type: 'announcement_approved',
        recipient: announcement.sender._id,
        message: `Your announcement "${announcement.title}" has been approved by ${req.user.name}`,
        data: { announcementId: announcement._id }
      });
    } else {
      // Notify the teacher that their announcement was rejected
      await NotificationController.createNotification({
        type: 'announcement_rejected',
        recipient: announcement.sender._id,
        message: `Your announcement "${announcement.title}" was rejected. ${note ? 'Reason: ' + note : ''}`,
        data: { announcementId: announcement._id, note }
      });
    }
    
    // Populate the updated announcement
    const updatedAnnouncement = await Announcement.findById(id)
      .populate('sender', 'name email role')
      .populate('approvedBy', 'name email role')
      .populate('targetAudience.targetSections', 'name')
      .populate('targetAudience.targetCourses', 'title courseCode');
    
    res.json({
      message: `Announcement ${action}d successfully`,
      announcement: updatedAnnouncement
    });
    
  } catch (err) {
    console.error('Error approving announcement:', err);
    res.status(500).json({ message: err.message });
  }
};// Dean: Approve or reject cross-school announcement requests
exports.approveCrossSchoolAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, approvalNote } = req.body; // action: 'approve' or 'reject'
    const deanId = req.user._id;
    const deanRoles = req.user.roles || [req.user.role];
    
    if (!deanRoles.includes('dean')) {
      return res.status(403).json({ message: 'Only deans can approve cross-school announcements' });
    }
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be approve or reject' });
    }
    
    const announcement = await Announcement.findById(id)
      .populate('sender', 'name email role')
      .populate('targetSchoolDean', 'name email')
      .populate('originalRequestedSchool', 'name code');
    
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    // Verify this dean is the target dean for this cross-school request
    if (!announcement.crossSchoolRequest || 
        announcement.targetSchoolDean._id.toString() !== deanId.toString()) {
      return res.status(403).json({ message: 'You are not authorized to approve this announcement' });
    }
    
    // Check if already processed
    if (announcement.approvalStatus !== 'pending') {
      return res.status(400).json({ message: 'This announcement has already been processed' });
    }
    
    // Store previous status for history
    const previousStatus = announcement.approvalStatus;
    
    // Update announcement status
    announcement.approvalStatus = action === 'approve' ? 'approved' : 'rejected';
    announcement.approvedBy = deanId;
    announcement.approvalNote = approvalNote;
    
    // Add to approval history
    if (!announcement.approvalHistory) {
      announcement.approvalHistory = [];
    }
    
    announcement.approvalHistory.push({
      approvedBy: deanId,
      approverRole: 'dean',
      action: action === 'approve' ? 'approved' : 'rejected',
      actionDate: new Date(),
      note: approvalNote || '',
      previousStatus: previousStatus
    });
    
    await announcement.save();
    
    // If approved, send notifications to recipients
    if (action === 'approve') {
      console.log('🔔 Sending notifications for approved cross-school announcement:', announcement.title);
      
      // Get recipients based on targetAudience
      const recipients = await getTargetRecipients(announcement.sender._id, announcement.targetAudience);
      
      console.log(`📤 Sending notifications to ${recipients.length} recipients`);
      
      // Send notifications to all recipients (fire-and-forget)
      (async () => {
        try {
          const recipientsToNotify = recipients.filter(r => r.toString() !== announcement.sender._id.toString());
          for (const rid of recipientsToNotify) {
            await NotificationController.createNotification({
              type: 'announcement',
              recipient: rid,
              message: `New cross-school announcement: ${announcement.title}`,
              data: { announcementId: announcement._id, priority: announcement.priority },
              announcement: announcement._id
            });
          }
          console.log('✅ Cross-school notifications sent successfully');
        } catch (notifyErr) {
          console.error('❌ Error sending cross-school notifications:', notifyErr);
        }
      })();
    }
    
    // Send notification to requesting dean
    await NotificationController.createNotification({
      type: 'announcement_decision',
      recipient: announcement.sender._id,
      message: `Your cross-school announcement "${announcement.title}" has been ${action}d by ${req.user.name} from ${announcement.originalRequestedSchool.name}`,
      data: { 
        announcementId: announcement._id,
        action: action,
        approvalNote: approvalNote,
        targetSchool: announcement.originalRequestedSchool.name
      }
    });
    
    res.json({
      message: `Cross-school announcement ${action}d successfully`,
      announcement: {
        _id: announcement._id,
        title: announcement.title,
        status: announcement.approvalStatus,
        approvalNote: announcement.approvalNote
      }
    });
    
  } catch (err) {
    console.error('Error processing cross-school announcement:', err);
    res.status(500).json({ message: err.message });
  }
};

// Dean: Get pending cross-school announcement requests for approval
exports.getPendingCrossSchoolRequests = async (req, res) => {
  try {
    const deanId = req.user._id;
    const deanRoles = req.user.roles || [req.user.role];
    
    if (!deanRoles.includes('dean')) {
      return res.status(403).json({ message: 'Only deans can view cross-school requests' });
    }
    
    const pendingRequests = await Announcement.find({
      crossSchoolRequest: true,
      targetSchoolDean: deanId,
      approvalStatus: 'pending'
    })
    .populate('sender', 'name email role')
    .populate('originalRequestedSchool', 'name code')
    .populate('targetAudience.targetDepartments', 'name code')
    .populate('targetAudience.targetSections', 'name')
    .sort({ createdAt: -1 });
    
    res.json({
      requests: pendingRequests
    });
    
  } catch (err) {
    console.error('Error getting pending cross-school requests:', err);
    res.status(500).json({ message: err.message });
  }
};
// Get edit history for a specific announcement (Admin only)
exports.getAnnouncementHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const userRoles = req.user.roles || [req.user.role];
    
    // Only admins can view edit history
    if (!userRoles.includes('admin')) {
      return res.status(403).json({ message: 'Not authorized to view edit history' });
    }
    
    const announcement = await Announcement.findById(id)
      .populate('sender', 'name email role teacherId')
      .populate('lastEditedBy', 'name email role')
      .populate('editHistory.editedBy', 'name email role');
      
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    res.json({
      announcement,
      history: announcement.editHistory || []
    });
  } catch (err) {
    console.error('Error getting announcement history:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get HOD's approval history (all announcements they have approved/rejected)
exports.getHODApprovalHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRoles = req.user.roles || [req.user.role];
    const { page = 1, limit = 20, action } = req.query; // action: 'approved', 'rejected', or 'all'
    
    if (!userRoles.includes('hod') && !userRoles.includes('admin')) {
      return res.status(403).json({ message: 'Only HODs can view their approval history' });
    }
    
    // Build query to find announcements where this HOD has taken action
    const query = {
      'approvalHistory.approvedBy': userId
    };
    
    // If specific action filter is requested
    if (action && action !== 'all') {
      query['approvalHistory.action'] = action;
    }
    
    const skip = (page - 1) * limit;
    
    // Find all announcements where this HOD appears in approval history
    const announcements = await Announcement.find(query)
      .sort({ 'approvalHistory.actionDate': -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('sender', 'name email role teacherId')
      .populate('approvalHistory.approvedBy', 'name email role')
      .populate('targetAudience.targetSections', 'name')
      .populate('targetAudience.targetCourses', 'title courseCode');
    
    // Filter and format to show only this HOD's approval actions
    const formattedAnnouncements = announcements.map(announcement => {
      const hodApprovals = announcement.approvalHistory.filter(
        h => h.approvedBy._id.toString() === userId.toString()
      );
      
      return {
        _id: announcement._id,
        title: announcement.title,
        message: announcement.message,
        sender: announcement.sender,
        targetAudience: announcement.targetAudience,
        currentStatus: announcement.approvalStatus,
        priority: announcement.priority,
        createdAt: announcement.createdAt,
        myApprovals: hodApprovals.map(approval => ({
          action: approval.action,
          actionDate: approval.actionDate,
          note: approval.note,
          previousStatus: approval.previousStatus
        }))
      };
    });
    
    const total = await Announcement.countDocuments(query);
    
    res.json({
      approvalHistory: formattedAnnouncements,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: formattedAnnouncements.length,
        totalRecords: total
      }
    });
    
  } catch (err) {
    console.error('Error getting HOD approval history:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get approval history for a specific announcement
exports.getAnnouncementApprovalHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const userRoles = req.user.roles || [req.user.role];
    
    // Only HODs and admins can view approval history
    if (!userRoles.includes('hod') && !userRoles.includes('admin')) {
      return res.status(403).json({ message: 'Not authorized to view approval history' });
    }
    
    const announcement = await Announcement.findById(id)
      .populate('sender', 'name email role teacherId')
      .populate('approvalHistory.approvedBy', 'name email role');
      
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    res.json({
      announcement: {
        _id: announcement._id,
        title: announcement.title,
        sender: announcement.sender,
        currentStatus: announcement.approvalStatus,
        createdAt: announcement.createdAt
      },
      approvalHistory: announcement.approvalHistory || []
    });
  } catch (err) {
    console.error('Error getting announcement approval history:', err);
    res.status(500).json({ message: err.message });
  }
};
