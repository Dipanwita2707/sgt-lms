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

const REQUIRED_FIELDS = ['name', 'email', 'password', 'school', 'department'];

// Helper function to generate sample CSV content
const generateSampleCSV = () => {
  return `name,email,password,school,department,teacherId,phoneNumber,qualification
Dr. Rajesh Kumar,rajesh.kumar@sgt.edu,Rajesh@2024,School of Engineering,Computer Science Engineering,,+91-9876543210,Ph.D.
Dr. Priya Sharma,priya.sharma@sgt.edu,Priya@2024,School of Engineering,Electronics Engineering,,+91-9876543211,Ph.D.
Dr. Amit Verma,amit.verma@sgt.edu,Amit@2024,School of Management,Management Studies,,+91-9876543212,Ph.D.
Dr. Neha Gupta,neha.gupta@sgt.edu,Neha@2024,School of Law,Legal Studies,,+91-9876543213,LL.M.`;
};

// Helper function to download sample CSV
const downloadSampleCSV = () => {
  const element = document.createElement('a');
  const file = new Blob([generateSampleCSV()], {type: 'text/csv'});
  element.href = URL.createObjectURL(file);
  element.download = 'hod_creation_template.csv';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

const BulkUploadHODs = ({ onUpload }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const steps = ['Select CSV File', 'Validate Data', 'Upload HODs'];

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
            if (!normalizedRow.name || normalizedRow.name.trim() === '') {
              errors.push({ row: idx + 2, message: 'Missing field: name' });
            }
            
            if (!normalizedRow.email || normalizedRow.email.trim() === '') {
              errors.push({ row: idx + 2, message: 'Missing field: email' });
            } else {
              // Validate email format
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(normalizedRow.email.trim())) {
                errors.push({ row: idx + 2, message: 'Invalid email format' });
              }
            }
            
            if (!normalizedRow.password || normalizedRow.password.trim() === '') {
              errors.push({ row: idx + 2, message: 'Missing field: password' });
            }
            
            if (!normalizedRow.school || normalizedRow.school.trim() === '') {
              errors.push({ row: idx + 2, message: 'Missing field: school' });
            }
            
            if (!normalizedRow.department || normalizedRow.department.trim() === '') {
              errors.push({ row: idx + 2, message: 'Missing field: department' });
            }
            
            // Validate teacherId if provided (optional, 5 digits)
            if (normalizedRow.teacherid && normalizedRow.teacherid.trim() !== '') {
              const teacherId = normalizedRow.teacherid.trim();
              if (!/^\d{5}$/.test(teacherId)) {
                errors.push({ row: idx + 2, message: 'Invalid teacherId format. Expected 5 digits (e.g., 00001)' });
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
      setSuccess(result?.message || 'HODs uploaded successfully');
      setFile(null);
      setPreview([]);
      setCsvErrors([]);
      setActiveStep(0);
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk upload failed');
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
          background: 'linear-gradient(135deg, #f57c00 0%, #e65100 100%)',
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
            Bulk Upload HODs
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
              backgroundColor: '#fff3e0',
              border: '1px solid #ffb74d'
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              How to use:
            </Typography>
            <Typography variant="body2" component="div" sx={{ lineHeight: 1.8 }}>
              <Box component="ol" sx={{ pl: 2, m: 0 }}>
                <li>Download the CSV template</li>
                <li>Fill in HOD details (name, email, password, school, department)</li>
                <li>TeacherID is optional - leave empty for auto-generation (5-digit format)</li>
                <li>Upload the CSV file</li>
                <li>Review validation and fix errors</li>
                <li>Submit to create HODs and assign them to departments</li>
              </Box>
            </Typography>
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Important: Each department can only have ONE HOD. If a department already has an HOD, that row will fail.
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
              color="warning"
              sx={{ 
                py: 1.5,
                fontWeight: 600,
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                  backgroundColor: 'rgba(245, 124, 0, 0.04)'
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
              id="csv-file-upload-hods"
            />
            <label htmlFor="csv-file-upload-hods" style={{ width: '100%' }}>
              <Button 
                variant="outlined" 
                component="span"
                startIcon={<CloudUploadIcon />}
                fullWidth
                color="warning"
                sx={{ 
                  py: 1.5,
                  fontWeight: 600,
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                    backgroundColor: 'rgba(245, 124, 0, 0.04)'
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
              color="warning" 
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
              Upload HODs
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
              Selected file: <strong style={{ color: '#f57c00' }}>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
            </Typography>
          </Box>
        )}
        
        {isUploading && (
          <Box sx={{ mt: 3 }}>
            <LinearProgress color="warning" sx={{ borderRadius: 1, height: 6 }} />
            <Typography variant="body2" sx={{ mt: 1.5, textAlign: 'center', fontWeight: 500, color: '#f57c00' }}>
              Uploading HODs...
            </Typography>
          </Box>
        )}
      </CardContent>
      
      <Collapse in={expanded}>
        <Divider />
        <CardContent sx={{ backgroundColor: '#fafafa', p: 3 }}>
          {preview.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#f57c00' }}>
                Preview ({preview.length} HODs)
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
                      <TableCell sx={{ fontWeight: 700, backgroundColor: '#f57c00', color: 'white' }}>Row</TableCell>
                      {Object.keys(preview[0]).map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, backgroundColor: '#f57c00', color: 'white', textTransform: 'capitalize' }}>{h}</TableCell>
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
                          <TableCell key={h}>{h === 'password' ? '••••••••' : row[h]}</TableCell>
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
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#f57c00' }}>
              Required CSV Format
            </Typography>
            <TableContainer 
              component={Paper} 
              sx={{ 
                borderRadius: 2,
                boxShadow: 2
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#f57c00', color: 'white' }}>Field</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#f57c00', color: 'white' }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#f57c00', color: 'white' }}>Example</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f5f5' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>name</TableCell>
                    <TableCell>Full name (required)</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#f57c00' }}>Dr. Rajesh Kumar</TableCell>
                  </TableRow>
                  <TableRow sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f5f5' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>email</TableCell>
                    <TableCell>Email address (required, unique)</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#f57c00' }}>rajesh.kumar@sgt.edu</TableCell>
                  </TableRow>
                  <TableRow sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f5f5' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>password</TableCell>
                    <TableCell>Initial password (required)</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#f57c00' }}>Rajesh@2024</TableCell>
                  </TableRow>
                  <TableRow sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f5f5' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>school</TableCell>
                    <TableCell>School name (required)</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#f57c00' }}>School of Engineering</TableCell>
                  </TableRow>
                  <TableRow sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f5f5' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>department</TableCell>
                    <TableCell>Department name (required)</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#f57c00' }}>Computer Science Engineering</TableCell>
                  </TableRow>
                  <TableRow sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f5f5' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>teacherId</TableCell>
                    <TableCell>Staff ID (optional, auto-generated if empty)</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#f57c00' }}>00001 or leave empty</TableCell>
                  </TableRow>
                  <TableRow sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f5f5' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>phoneNumber</TableCell>
                    <TableCell>Phone number (optional)</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#f57c00' }}>+91-9876543210</TableCell>
                  </TableRow>
                  <TableRow sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f5f5' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>qualification</TableCell>
                    <TableCell>Highest qualification (optional)</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#f57c00' }}>Ph.D.</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            
            <Alert 
              severity="info" 
              sx={{ 
                mt: 3,
                borderRadius: 2,
                backgroundColor: '#e3f2fd',
                border: '1px solid #90caf9'
              }}
            >
              <Typography variant="body2" sx={{ lineHeight: 1.8 }}>
                <strong>Notes:</strong>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>Staff UID will be auto-generated automatically (5-digit format)</li>
                  <li>TeacherID is auto-generated if not provided (5-digit numeric: 00001, 00002, etc.)</li>
                  <li>Each department can only have ONE HOD</li>
                  <li>HOD will be automatically assigned to the specified department</li>
                  <li>Email must be unique across all users</li>
                  <li>School and department must exist in the system</li>
                </ul>
              </Typography>
            </Alert>
          </Box>
        </CardContent>
      </Collapse>
    </Card>
  );
};

export default BulkUploadHODs;
