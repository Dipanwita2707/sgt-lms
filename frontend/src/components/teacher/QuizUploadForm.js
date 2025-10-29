import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  CircularProgress,
  Paper,
  Typography,
  Alert,
  AlertTitle,
  MenuItem,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  FormHelperText
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Description as FileIcon,
  Download as DownloadIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getTeacherCourses, getTeacherUnitsByCourse } from '../../api/teacherApi';
import { getQuizTemplate, uploadQuiz } from '../../api/quizApi';
import QuizConfigPanel from './QuizConfigPanel';

const QuizUploadForm = ({ onCancel }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [timeLimit, setTimeLimit] = useState('30');
  const [passingScore, setPassingScore] = useState('70');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [units, setUnits] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    // Load teacher's courses when component mounts
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const coursesData = await getTeacherCourses(token);
      setCourses(coursesData);
      
      if (coursesData.length > 0) {
        setCourseId(coursesData[0]._id);
        setSections(coursesData[0].sections || []);
        if (coursesData[0].sections && coursesData[0].sections.length > 0) {
          setSectionId(coursesData[0].sections[0]._id);
        }
        fetchUnits(coursesData[0]._id);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Failed to load courses. Please try again later.');
      setLoading(false);
    }
  };

  const fetchUnits = async (courseId) => {
    try {
      setLoading(true);
      const unitsData = await getTeacherUnitsByCourse(courseId, token);
      setUnits(unitsData);
      
      // Reset unit selection when changing courses
      setUnitId('');
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching units:', err);
      setError('Failed to load units for the selected course.');
      setLoading(false);
    }
  };

  const handleCourseChange = async (e) => {
    const selectedCourseId = e.target.value;
    setCourseId(selectedCourseId);
    
    // Update sections for the selected course
    const selectedCourse = courses.find(c => c._id === selectedCourseId);
    setSections(selectedCourse?.sections || []);
    setSectionId(selectedCourse?.sections?.[0]?._id || '');
    
    await fetchUnits(selectedCourseId);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check if file is a CSV
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }
      
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setValidated(false);
      setValidationErrors([]);
      setError('');
      setSuccess('');
    }
  };

  const downloadTemplate = async () => {
    try {
      await getQuizTemplate(token);
    } catch (err) {
      console.error('Error downloading template:', err);
      setError('Failed to download template. Please try again.');
    }
  };

  const validateCSV = async () => {
    if (!file) {
      setError('Please select a CSV file first');
      return;
    }

    if (!courseId) {
      setError('Please select a course');
      return;
    }

    // Reset validation state
    setValidationErrors([]);
    setValidated(false);
    setError('');

    // Read the file to validate its structure
    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target.result;
      // Split by newlines and handle both Windows (CRLF) and Unix (LF) line endings
      let lines = csv.replace(/\r\n/g, '\n').split('\n');
      
      // Filter out empty lines
      lines = lines.filter(line => line.trim().length > 0);
      
      // Convert tabs to commas if needed (handle TSV files too)
      if (lines[0].includes('\t')) {
        lines = lines.map(line => line.replace(/\t/g, ','));
        console.log('Converted tabs to commas in CSV file');
      }
      
      // Basic validation checks
      const errors = [];
      
      // Check if there are at least 4 lines (header + 3 questions minimum)
      if (lines.length < 4) {
        errors.push('CSV must contain at least 3 quiz questions (plus header row). Found ' + (lines.length - 1) + ' question rows.');
      }
      
      // Check header row
      const headerRow = lines[0].toLowerCase();
      if (!headerRow.includes('questiontext') || 
          !headerRow.includes('option1') || 
          !headerRow.includes('correctoption')) {
        errors.push('CSV header is missing required columns (questionText, options, correctOption)');
      }
      
      // Validate each data row
      lines.slice(1).forEach((line, index) => {
        if (!line.trim()) return; // Skip empty lines
        
        const cols = line.split(',');
        if (cols.length < 6) {
          errors.push(`Row ${index + 2}: Not enough columns (found ${cols.length}, need at least 7 columns)`);
        } else {
          // Check for empty question text
          if (!cols[0].trim()) {
            errors.push(`Row ${index + 2}: Question text is empty`);
          }
          
          // Check for empty options
          for (let i = 1; i <= 4; i++) {
            if (!cols[i] || !cols[i].trim()) {
              errors.push(`Row ${index + 2}: Option ${i} is empty or missing`);
            }
          }
          
          // Check for valid correct option
          const correctOption = parseInt(cols[5]);
          if (isNaN(correctOption) || correctOption < 1 || correctOption > 4) {
            errors.push(`Row ${index + 2}: Correct option must be a number between 1 and 4 (found "${cols[5]}")`);
          }
        }
      });
      
      setValidationErrors(errors);
      
      if (errors.length === 0) {
        setValidated(true);
        setSuccess('CSV validation successful! You can now upload the quiz.');
      } else {
        setError('CSV validation failed. Please fix the errors and try again.');
      }
    };
    
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!title.trim()) {
      setError('Please enter a quiz title');
      return;
    }
    
    if (!courseId) {
      setError('Please select a course');
      return;
    }
    
    if (units.length > 0 && !unitId) {
      setError('Please select a unit');
      return;
    }
    
    if (!file) {
      setError('Please select a CSV file');
      return;
    }
    
    if (!validated) {
      setError('Please validate the CSV file before uploading');
      return;
    }
    
    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('courseId', courseId);
      
      if (unitId) {
        formData.append('unitId', unitId);
      }
      
      formData.append('timeLimit', timeLimit);
      formData.append('passingScore', passingScore);
      formData.append('file', file);
      
      const response = await uploadQuiz(formData, token);
      
      setSuccess('Quiz uploaded successfully! It has been added to the unit quiz pool.');
      setLoading(false);
      
      // Navigate to the quizzes page after a short delay
      setTimeout(() => {
        navigate('/teacher/quizzes');
      }, 1500);
      
    } catch (err) {
      console.error('Error uploading quiz:', err);
      setError(err.response?.data?.message || 'Failed to upload quiz. Please try again.');
      setLoading(false);
    }
  };

  if (loading && courses.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Upload Quiz Questions
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <AlertTitle>Quiz Pool Information</AlertTitle>
        <Typography variant="body2">
          All quizzes uploaded to the same unit will form a quiz pool. When students take the quiz, they will receive 10 randomly selected questions from this pool.
          Each student will see a different set of questions. Students must score at least 70% to progress to the next unit.
        </Typography>
      </Alert>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Quiz Title"
                fullWidth
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <FormHelperText>
                This will identify your contribution to the quiz pool
              </FormHelperText>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Select Course"
                fullWidth
                required
                value={courseId}
                onChange={handleCourseChange}
              >
                {courses.map((course) => (
                  <MenuItem key={course._id} value={course._id}>
                    {course.title} ({course.courseCode})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Select Section"
                fullWidth
                required
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                disabled={sections.length === 0}
                helperText={sections.length === 0 ? "No sections available" : "Select the section for this quiz"}
              >
                {sections.map((section) => (
                  <MenuItem key={section._id} value={section._id}>
                    {section.name} ({section.studentsCount} students)
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Select Unit"
                fullWidth
                required={units.length > 0}
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                disabled={units.length === 0}
                helperText={units.length === 0 ? "No units available for this course" : ""}
              >
                {units.map((unit) => (
                  <MenuItem key={unit._id} value={unit._id}>
                    {unit.title}
                  </MenuItem>
                ))}
              </TextField>
              <FormHelperText>
                Your questions will be added to this unit's quiz pool
              </FormHelperText>
            </Grid>
          </Grid>
          
          {/* Quiz Configuration Panel */}
          {courseId && sectionId && unitId && (
            <Box sx={{ mt: 3 }}>
              <QuizConfigPanel 
                courseId={courseId}
                sectionId={sectionId}
                unitId={unitId}
                unitTitle={units.find(u => u._id === unitId)?.title || 'Selected Unit'}
              />
            </Box>
          )}
          
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  Quiz settings (time limit, number of questions, etc.) are now configured above.
                  These settings will apply to all students taking this quiz.
                </Typography>
              </Alert>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Time Limit (minutes)"
                type="number"
                fullWidth
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                InputProps={{ inputProps: { min: 5, max: 180 } }}
                disabled={true}
                helperText="Configured in Quiz Configuration Panel above"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Passing Score (%)"
                type="number"
                fullWidth
                value={passingScore}
                onChange={(e) => setPassingScore(e.target.value)}
                InputProps={{ inputProps: { min: 50, max: 100 } }}
                disabled={true}
              />
              <FormHelperText>
                <InfoIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                Configured in Quiz Configuration Panel above
              </FormHelperText>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="h6" gutterBottom>
                Quiz Questions (CSV)
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={downloadTemplate}
                  sx={{ mr: 2 }}
                >
                  Download Template
                </Button>
                
                <Typography variant="body2" color="text.secondary">
                  Download and fill the template with your quiz questions
                </Typography>
              </Box>
              
              <Box sx={{ border: '1px dashed grey', borderRadius: 1, p: 3, textAlign: 'center', mb: 2 }}>
                <input
                  accept=".csv"
                  style={{ display: 'none' }}
                  id="csv-file-upload"
                  type="file"
                  onChange={handleFileChange}
                />
                <label htmlFor="csv-file-upload">
                  <Button 
                    component="span" 
                    variant="contained" 
                    startIcon={<CloudUploadIcon />}
                  >
                    Choose CSV File
                  </Button>
                </label>
                
                {fileName && (
                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileIcon sx={{ mr: 1 }} />
                    <Typography>{fileName}</Typography>
                    {validated && <CheckIcon color="success" sx={{ ml: 1 }} />}
                  </Box>
                )}
              </Box>
              
              {file && !validated && (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={validateCSV}
                  sx={{ mb: 2 }}
                >
                  Validate CSV
                </Button>
              )}
              
              {validationErrors.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="error" gutterBottom>
                    CSV Validation Errors:
                  </Typography>
                  <List dense>
                    {validationErrors.map((error, index) => (
                      <ListItem key={index}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <ErrorIcon color="error" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={error} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Grid>
            
            {error && (
              <Grid item xs={12}>
                <Alert severity="error">{error}</Alert>
              </Grid>
            )}
            
            {success && (
              <Grid item xs={12}>
                <Alert severity="success">{success}</Alert>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button 
                  variant="outlined" 
                  onClick={onCancel || (() => navigate('/teacher/quizzes'))}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary" 
                  disabled={loading || !validated}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  {loading ? 'Uploading...' : 'Upload Quiz Questions'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default QuizUploadForm;
