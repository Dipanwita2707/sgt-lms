# CSV Template Guide for Bulk Uploads

This folder contains CSV templates for bulk uploading data into the SGT-LMS system.

## 📋 Available Templates

### 1. **teacher_bulk_upload_template.csv**
Upload teachers in bulk with auto-generated 5-digit UIDs (00001, 00002, etc.)

**Required Fields:**
- `name` - Full name of the teacher
- `email` - University email address (must be unique)
- `password` - Initial password (teachers can change later)
- `school` - School name/code/ID (REQUIRED)

**Optional Fields:**
- `department` - Department name/code/ID (recommended)

**Example:**
```csv
name,email,password,school,department
Dr. Rajesh Kumar,rajesh.kumar@sgtuniversity.edu,Rajesh@2024,School of Engineering,Computer Science Engineering
```

**Important Notes:**
- School is REQUIRED for all teachers
- Department is optional but recommended for better organization
- School/Department can be identified by name, code, or ObjectId
- UIDs are auto-generated in 5-digit format (00001, 00002, ...)

---

### 2. **student_bulk_upload_template.csv**
Upload students in bulk with auto-generated 8-digit UIDs (00000001, 00000002, etc.)

**Required Fields:**
- `name` - Full name of the student
- `email` - University email address (must be unique)
- `section` - Section name (REQUIRED - must exist in system)
- `school` - School name/code/ID
- `department` - Department name/code/ID

**Optional Fields:**
- `password` - Initial password (auto-generated if not provided)
- `courseAssigned` - Courses to assign (semicolon or comma separated)

**Example:**
```csv
name,email,password,section,school,department,courseAssigned
Aarav Kumar,aarav.kumar@student.sgtuniversity.edu,Aarav@2024,A1,School of Engineering,Computer Science Engineering,CS101;CS102;CS103
```

**Important Notes:**
- Section is REQUIRED for all students
- Supports assigning multiple courses: `CS101;CS102;CS103` or `CS101,CS102,CS103`
- School/Department can be identified by name, code, or ObjectId
- Recommended batch size: 500-1000 students per file

---

### 3. **section_bulk_upload_template.csv**
Create sections in bulk across schools and departments

**Required Fields:**
- `name` - Section name (e.g., A1, A2, B1)
- `school` - School name/code/ID
- `department` - Department name/code/ID

**Optional Fields:**
- `semester` - Semester number (1-12)
- `year` - Academic year (e.g., 2024-2025)
- `capacity` - Maximum students (default: 60)

**Example:**
```csv
name,school,department,semester,year,capacity
A1,School of Engineering,Computer Science Engineering,1,2024-2025,60
```

**Important Notes:**
- Section names must be unique within the same school+department
- School and Department must already exist in the system
- Can use school/department names, codes, or ObjectIds

---

### 4. **course_assignment_template.csv**
Assign courses to sections in bulk

**Required Fields:**
- `section` - Section name/ID
- `courses` - Course codes (semicolon or comma separated)

**Optional Fields (for disambiguation):**
- `school` - School name/code/ID
- `department` - Department name/code/ID

**Example:**
```csv
section,school,department,courses
A1,School of Engineering,Computer Science Engineering,CS101;CS102;CS103;CS104;CS105
```

**Important Notes:**
- Courses must already exist in the system
- Supports multiple courses: `CS101;CS102;CS103` or `CS101,CS102,CS103`
- Duplicate assignments are automatically skipped
- Reports courses added, skipped, and not found

---

### 5. **teacher_assignment_template.csv**
Assign teachers to section-course combinations in bulk

**Required Fields:**
- `section` - Section name/ID
- `course` - Course code/title/ID
- `teacher` - Teacher email, UID, or teacherId

**Example:**
```csv
section,course,teacher
A1,CS101,rajesh.kumar@sgtuniversity.edu
A1,CS102,00001
A2,CS101,priya.sharma@sgtuniversity.edu
```

**Important Notes:**
- Course must already be assigned to the section
- Teacher can be identified by email, UID, or old teacherId
- Creates SectionCourseTeacher relationship
- Automatically adds teacher to section's teacher list

---

## 🔄 Recommended Workflow for 20K Students

### Step 1: Create Sections
```
Upload: section_bulk_upload_template.csv
Endpoint: POST /api/admin/section/bulk
Batch Size: 100-200 sections
```

### Step 2: Assign Courses to Sections
```
Upload: course_assignment_template.csv
Endpoint: POST /api/admin/section/bulk-course-assignment
Batch Size: 200-500 rows
```

### Step 3: Upload Teachers (if not already done)
```
Upload: teacher_bulk_upload_template.csv
Endpoint: POST /api/admin/bulk-upload-teachers
Batch Size: 100-200 teachers
```

### Step 4: Assign Teachers to Section-Courses
```
Upload: teacher_assignment_template.csv
Endpoint: POST /api/admin/section/bulk-teacher-assignment
Batch Size: 500-1000 rows
```

### Step 5: Upload Students with Section Assignment
```
Upload: student_bulk_upload_template.csv
Endpoint: POST /api/admin/bulk-upload-students
Batch Size: 500-1000 students per file
Total: 20-40 files for 20,000 students
Estimated Time: 30-45 minutes (parallel) or 2-3 hours (sequential)
```

---

## ✅ Validation Rules

### Email Format
- Must be valid email format
- Must be unique across all users
- Recommended: Use institutional domain

### Section Assignment
- Section MUST exist before assigning students
- Use exact section name from system
- Case-insensitive matching supported

### Course Codes
- Must match existing course codes in database
- Can use course code, title, or ObjectId
- Multiple courses: semicolon (`;`) or comma (`,`) separated

### Teacher Identification
- Email (recommended): `teacher@example.com`
- UID: `00001` (5-digit auto-generated)
- Legacy teacherId: `T001` (if exists)

---

## 🚨 Common Errors & Solutions

### "Section not found"
**Solution:** Create section first using section_bulk_upload_template.csv

### "Course not assigned to section"
**Solution:** Assign course to section first using course_assignment_template.csv

### "Duplicate email"
**Solution:** Check for existing users, ensure emails are unique

### "School/Department not found"
**Solution:** Verify school and department names match exactly (case-insensitive)

### "Teacher not found"
**Solution:** Upload teacher first using teacher_bulk_upload_template.csv

---

## 📊 Expected Response Format

All bulk upload endpoints return:

```json
{
  "success": 950,
  "failed": 50,
  "total": 1000,
  "results": [
    {
      "row": 2,
      "name": "Aarav Kumar",
      "status": "Created successfully"
    }
  ],
  "errors": [
    {
      "row": 15,
      "message": "Duplicate email: student@example.com"
    }
  ]
}
```

---

## 🔐 Security Notes

- All passwords should meet minimum complexity requirements
- Bulk upload is restricted to Admin role only
- File size limit: 10MB per upload
- All operations are logged with admin user ID and timestamp

---

## 💡 Tips for Large Scale (20K+ Students)

1. **Test First**: Upload 10-20 records to validate format
2. **Split Files**: Keep batch sizes between 500-1000 rows
3. **Sequential Upload**: Complete sections → courses → teachers → students
4. **Error Handling**: Download failed rows, fix errors, re-upload
5. **Parallel Processing**: Use multiple browser tabs for different sections
6. **Verify Data**: Cross-check counts after each batch
7. **Keep Backups**: Save original CSV files before upload

---

## 📞 Support

For issues with bulk uploads:
1. Check validation errors in the response
2. Verify all prerequisite data exists (schools, departments, courses)
3. Ensure CSV format matches templates exactly
4. Check file encoding (UTF-8 recommended)
5. Contact system administrator for database-level issues
