import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Alert, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Typography, 
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Divider,
  IconButton,
  Collapse,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import Papa from 'papaparse';
import DownloadIcon from '@mui/icons-material/Download';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const REQUIRED_FIELDS = ['section', 'course', 'teacher'];

// Helper function to generate sample CSV content
const generateSampleCSV = () => {
  return `section,course,teacher
CS-A,CS101,rajesh.kumar@sgt.edu
CS-A,CS102,priya.sharma@sgt.edu
CS-A,CS103,rajesh.kumar@sgt.edu
CS-B,CS101,amit.verma@sgt.edu
CS-B,CS102,priya.sharma@sgt.edu
EC-A,EC201,neha.gupta@sgt.edu
EC-A,EC202,suresh.nair@sgt.edu
MBA-1,MBA101,sunita.reddy@sgt.edu
MBA-1,MBA102,lakshmi.iyer@sgt.edu
MBA-2,MBA101,arun.patel@sgt.edu`;
};

// Helper function to download sample CSV
const downloadSampleCSV = () => {
  const element = document.createElement('a');
  const file = new Blob([generateSampleCSV()], {type: 'text/csv'});
  element.href = URL.createObjectURL(file);
  element.download = 'teacher_assignment_template.csv';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

const BulkAssignTeachers = ({ onUpload }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const steps = ['Select CSV File', 'Validate Data', 'Assign Teachers'];

  const handleFileChange = e => {
    setFile(e.target.files[0]);
    setPreview([]);
    setCsvErrors([]);
    setError('');
    setSuccess('');
    setActiveStep(1);
    
    if (e.target.files[0]) {
      Papa.parse(e.target.files[0], {
        header: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim().toLowerCase(),
        complete: (results) => {
          const rows = results.data;
          
          // Check if we have the right headers
          const headers = Object.keys(rows[0] || {}).map(h => h.toLowerCase());
          const missingHeaders = REQUIRED_FIELDS.filter(f => !headers.includes(f));
          
          if (missingHeaders.length > 0) {
            setError(`CSV is missing required headers: ${missingHeaders.join(', ')}. Please use the template.`);
            return;
          }
          
          const errors = [];
          
          rows.forEach((row, idx) => {
            const normalizedRow = {};
            Object.keys(row).forEach(key => {
              normalizedRow[key.toLowerCase().trim()] = row[key];
            });
            
            // Check required fields
            if (!normalizedRow.section || normalizedRow.section.trim() === '') {
              errors.push({ row: idx + 2, message: 'Missing field: section' });
            }
            
            if (!normalizedRow.course || normalizedRow.course.trim() === '') {
              errors.push({ row: idx + 2, message: 'Missing field: course' });
            }
            
            if (!normalizedRow.teacher || normalizedRow.teacher.trim() === '') {
              errors.push({ row: idx + 2, message: 'Missing field: teacher' });
            } else {
              // Validate email format
              const email = normalizedRow.teacher.trim();
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(email) && !email.match(/^\d{5}$/)) {
                // Allow either email or 5-digit UID
                errors.push({ row: idx + 2, message: `Invalid teacher identifier: ${email}. Use email or 5-digit UID (00001)` });
              }
            }
          });
          
          setPreview(rows);
          setCsvErrors(errors);
          
          if (errors.length === 0) {
            setActiveStep(2);
          }
        },
        error: (err) => setError('CSV parse error: ' + err.message)
      });
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!file) return setError('Please select a CSV file');
    if (csvErrors.length > 0) return setError('Please fix CSV errors before uploading.');
    
    setIsUploading(true);
    
    try {
      const result = await onUpload(file);
      setSuccess(result?.message || 'Teachers assigned successfully');
      setFile(null);
      setPreview([]);
      setCsvErrors([]);
      setActiveStep(0);
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk assignment failed');
      if (err.response?.data?.errors) {
        setCsvErrors(err.response.data.errors);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const toggleHelp = () => {
    setShowHelp(!showHelp);
  };

  return (
    <Card 
      elevation={3} 
      sx={{ 
        mb: 3, 
        overflow: 'hidden',
        borderRadius: 2,
        background: 'linear-gradient(to bottom, #ffffff, #f8f9fa)'
      }}
    >
      <Box 
        sx={{ 
          background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
          p: 2.5,
          color: 'white'
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center'
        }}>
          <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
            Bulk Assign Teachers to Section-Courses
          </Typography>
          <Box>
            <IconButton 
              onClick={toggleHelp} 
              size="small"
              sx={{ 
                color: 'white',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
              }}
            >
              <HelpOutlineIcon />
            </IconButton>
            <IconButton 
              onClick={toggleExpanded} 
              size="small"
              sx={{ 
                color: 'white',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
              }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>
      </Box>

      <CardContent sx={{ p: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{success}</Alert>}
        
        <Collapse in={showHelp}>
          <Alert 
            severity="info" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              backgroundColor: '#e8f5e9',
              border: '1px solid #81c784'
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              How to use:
            </Typography>
            <Typography variant="body2" component="div" sx={{ lineHeight: 1.8 }}>
              <Box component="ol" sx={{ pl: 2, m: 0 }}>
                <li>Download the CSV template</li>
                <li>Fill in section names, course codes, and teacher emails/UIDs</li>
                <li>Upload the CSV file</li>
                <li>Review validation and fix errors</li>
                <li>Submit to assign teachers to section-course combinations</li>
              </Box>
            </Typography>
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Important: Courses must be assigned to sections before assigning teachers!
              </Typography>
            </Alert>
          </Alert>
        </Collapse>

        <Stepper 
          activeStep={activeStep} 
          sx={{ 
            mb: 4,
            '& .MuiStepLabel-label': {
              fontWeight: 500
            }
          }}
        >
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <Grid container spacing={2.5} alignItems="center">
          <Grid item xs={12} md={4}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={downloadSampleCSV}
              fullWidth
              color="success"
              sx={{ 
                py: 1.5,
                fontWeight: 600,
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                  backgroundColor: 'rgba(46, 125, 50, 0.04)'
                }
              }}
            >
              Download Template
            </Button>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="csv-file-upload-teachers"
            />
            <label htmlFor="csv-file-upload-teachers" style={{ width: '100%' }}>
              <Button 
                variant="outlined" 
                component="span"
                startIcon={<CloudUploadIcon />}
                fullWidth
                color="success"
                sx={{ 
                  py: 1.5,
                  fontWeight: 600,
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                    backgroundColor: 'rgba(46, 125, 50, 0.04)'
                  }
                }}
              >
                Select CSV File
              </Button>
            </label>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Button 
              type="submit" 
              variant="contained" 
              color="success" 
              onClick={handleSubmit}
              disabled={csvErrors.length > 0 || !file || isUploading}
              fullWidth
              sx={{ 
                py: 1.5,
                fontWeight: 600,
                boxShadow: 3,
                '&:hover': {
                  boxShadow: 6
                }
              }}
            >
              Assign Teachers
            </Button>
          </Grid>
        </Grid>
        
        {file && (
          <Box 
            sx={{ 
              mt: 2.5, 
              p: 2, 
              backgroundColor: '#f5f5f5', 
              borderRadius: 2,
              border: '1px solid #e0e0e0'
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Selected file: <strong style={{ color: '#2e7d32' }}>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
            </Typography>
          </Box>
        )}
        
        {isUploading && (
          <Box sx={{ mt: 3 }}>
            <LinearProgress color="success" sx={{ borderRadius: 1, height: 6 }} />
            <Typography variant="body2" sx={{ mt: 1.5, textAlign: 'center', fontWeight: 500, color: '#2e7d32' }}>
              Assigning teachers to section-courses...
            </Typography>
          </Box>
        )}
      </CardContent>
      
      <Collapse in={expanded}>
        <Divider />
        <CardContent sx={{ backgroundColor: '#fafafa', p: 3 }}>
          {preview.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#2e7d32' }}>
                Preview ({preview.length} assignments)
              </Typography>
              <TableContainer 
                component={Paper} 
                sx={{ 
                  maxHeight: 300,
                  borderRadius: 2,
                  boxShadow: 2
                }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, backgroundColor: '#2e7d32', color: 'white' }}>Row</TableCell>
                      {Object.keys(preview[0]).map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, backgroundColor: '#2e7d32', color: 'white', textTransform: 'capitalize' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.map((row, i) => (
                      <TableRow 
                        key={i} 
                        hover
                        sx={{ 
                          '&:nth-of-type(odd)': { backgroundColor: '#f5f5f5' }
                        }}
                      >
                        <TableCell sx={{ fontWeight: 600 }}>{i + 2}</TableCell>
                        {Object.keys(preview[0]).map(h => (
                          <TableCell key={h}>{row[h]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {csvErrors.length > 0 && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    mt: 3,
                    borderRadius: 2,
                    border: '1px solid #f44336'
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    CSV Validation Errors:
                  </Typography>
                  <TableContainer 
                    component={Paper} 
                    sx={{ 
                      maxHeight: 200, 
                      mt: 1.5,
                      borderRadius: 1
                    }}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, backgroundColor: '#ffebee' }}>Row</TableCell>
                          <TableCell sx={{ fontWeight: 700, backgroundColor: '#ffebee' }}>Error</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {csvErrors.map((e, i) => (
                          <TableRow key={i}>
                            <TableCell sx={{ fontWeight: 600 }}>{e.row}</TableCell>
                            <TableCell>{e.message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Alert>
              )}
            </Box>
          )}
          
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#2e7d32' }}>
              Required CSV Format
            </Typography>
            <TableContainer 
              component={Paper} 
              sx={{ 
                maxWidth: 700,
                borderRadius: 2,
                boxShadow: 2
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#2e7d32', color: 'white' }}>Field</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#2e7d32', color: 'white' }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#2e7d32', color: 'white' }}>Example</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f5f5' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>section</TableCell>
                    <TableCell>Section name (required)</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#2e7d32' }}>CS-A, MBA-1</TableCell>
                  </TableRow>
                  <TableRow sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f5f5' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>course</TableCell>
                    <TableCell>Course code (required)</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#2e7d32' }}>CS101, EC201</TableCell>
                  </TableRow>
                  <TableRow sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f5f5' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>teacher</TableCell>
                    <TableCell>Teacher email or UID (required)</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#2e7d32' }}>rajesh.kumar@sgt.edu or 00001</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            
            <Alert 
              severity="warning" 
              sx={{ 
                mt: 3,
                borderRadius: 2,
                backgroundColor: '#fff3e0',
                border: '1px solid #ffb74d'
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Prerequisites:
              </Typography>
              <Typography variant="body2" component="div" sx={{ lineHeight: 1.8 }}>
                <Box component="ol" sx={{ pl: 2, m: 0 }}>
                  <li>Course must be assigned to the section first</li>
                  <li>Teacher must exist in the system</li>
                  <li>One teacher per section-course combination (override previous if exists)</li>
                </Box>
              </Typography>
            </Alert>
            
            <Alert 
              severity="info" 
              sx={{ 
                mt: 2,
                borderRadius: 2,
                backgroundColor: '#e3f2fd',
                border: '1px solid #90caf9'
              }}
            >
              <Typography variant="body2" sx={{ lineHeight: 1.8 }}>
                <strong>Note:</strong> This creates Section-Course-Teacher relationships. 
                The same course can have different teachers in different sections (e.g., CS101 taught by Dr. Kumar in CS-A and Dr. Sharma in CS-B).
              </Typography>
            </Alert>
          </Box>
        </CardContent>
      </Collapse>
    </Card>
  );
};

export default BulkAssignTeachers;
