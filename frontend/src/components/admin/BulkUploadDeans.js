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

const REQUIRED_FIELDS = ['name', 'email', 'password', 'school'];

// Helper function to generate sample CSV content
const generateSampleCSV = () => {
  return `name,email,password,school,teacherId,phoneNumber,qualification
Dr. Sunita Reddy,sunita.reddy@sgt.edu,Sunita@2024,School of Engineering,,+91-9876543220,Ph.D.
Dr. Arun Patel,arun.patel@sgt.edu,Arun@2024,School of Management,,+91-9876543221,Ph.D.
Dr. Lakshmi Iyer,lakshmi.iyer@sgt.edu,Lakshmi@2024,School of Law,,+91-9876543222,LL.D.
Dr. Suresh Nair,suresh.nair@sgt.edu,Suresh@2024,School of Sciences,,+91-9876543223,Ph.D.`;
};

// Helper function to download sample CSV
const downloadSampleCSV = () => {
  const element = document.createElement('a');
  const file = new Blob([generateSampleCSV()], {type: 'text/csv'});
  element.href = URL.createObjectURL(file);
  element.download = 'dean_creation_template.csv';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

const BulkUploadDeans = ({ onUpload }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const steps = ['Select CSV File', 'Validate Data', 'Upload Deans'];

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
      setSuccess(result?.message || 'Deans uploaded successfully');
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
          background: 'linear-gradient(135deg, #7b1fa2 0%, #4a148c 100%)',
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
            Bulk Upload Deans
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
              backgroundColor: '#f3e5f5',
              border: '1px solid #ce93d8'
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              How to use:
            </Typography>
            <Typography variant="body2" component="div" sx={{ lineHeight: 1.8 }}>
              <Box component="ol" sx={{ pl: 2, m: 0 }}>
                <li>Download the CSV template</li>
                <li>Fill in Dean details (name, email, password, school)</li>
                <li>TeacherID is optional - leave empty for auto-generation (5-digit format)</li>
                <li>Upload the CSV file</li>
                <li>Review validation and fix errors</li>
                <li>Submit to create Deans and assign them to schools</li>
              </Box>
            </Typography>
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Important: Each school can only have ONE Dean. If a school already has a Dean, that row will fail.
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
              color="secondary"
              sx={{ 
                py: 1.5,
                fontWeight: 600,
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                  backgroundColor: 'rgba(123, 31, 162, 0.04)'
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
              id="csv-file-upload-deans"
            />
            <label htmlFor="csv-file-upload-deans" style={{ width: '100%' }}>
              <Button 
                variant="outlined" 
                component="span"
                startIcon={<CloudUploadIcon />}
                fullWidth
                color="secondary"
                sx={{ 
                  py: 1.5,
                  fontWeight: 600,
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                    backgroundColor: 'rgba(123, 31, 162, 0.04)'
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
              color="secondary" 
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
              Upload Deans
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
              Selected file: <strong style={{ color: '#7b1fa2' }}>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
            </Typography>
          </Box>
        )}
        
        {isUploading && (
          <Box sx={{ mt: 3 }}>
            <LinearProgress color="secondary" sx={{ borderRadius: 1, height: 6 }} />
            <Typography variant="body2" sx={{ mt: 1.5, textAlign: 'center', fontWeight: 500, color: '#7b1fa2' }}>
              Uploading Deans...
            </Typography>
          </Box>
        )}
      </CardContent>
      
      <Collapse in={expanded}>
        <Divider />
        <CardContent sx={{ backgroundColor: '#fafafa', p: 3 }}>
          {preview.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#7b1fa2' }}>
                Preview ({preview.length} Deans)
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
                      <TableCell sx={{ fontWeight: 700, backgroundColor: '#7b1fa2', color: 'white' }}>Row</TableCell>
                      {Object.keys(preview[0]).map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, backgroundColor: '#7b1fa2', color: 'white', textTransform: 'capitalize' }}>{h}</TableCell>
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
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#7b1fa2' }}>
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
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#7b1fa2', color: 'white' }}>Field</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#7b1fa2', color: 'white' }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#7b1fa2', color: 'white' }}>Example</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f5f5' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>name</TableCell>
                    <TableCell>Full name (required)</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#7b1fa2' }}>Dr. Sunita Reddy</TableCell>
                  </TableRow>
                  <TableRow sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f5f5' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>email</TableCell>
                    <TableCell>Email address (required, unique)</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#7b1fa2' }}>sunita.reddy@sgt.edu</TableCell>
                  </TableRow>
                  <TableRow sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f5f5' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>password</TableCell>
                    <TableCell>Initial password (required)</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#7b1fa2' }}>Sunita@2024</TableCell>
                  </TableRow>
                  <TableRow sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f5f5' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>school</TableCell>
                    <TableCell>School name (required)</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#7b1fa2' }}>School of Engineering</TableCell>
                  </TableRow>
                  <TableRow sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f5f5' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>teacherId</TableCell>
                    <TableCell>Staff ID (optional, auto-generated if empty)</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#7b1fa2' }}>00001 or leave empty</TableCell>
                  </TableRow>
                  <TableRow sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f5f5' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>phoneNumber</TableCell>
                    <TableCell>Phone number (optional)</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#7b1fa2' }}>+91-9876543220</TableCell>
                  </TableRow>
                  <TableRow sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f5f5' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>qualification</TableCell>
                    <TableCell>Highest qualification (optional)</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#7b1fa2' }}>Ph.D.</TableCell>
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
                  <li>Each school can only have ONE Dean</li>
                  <li>Dean will be automatically assigned to the specified school</li>
                  <li>Email must be unique across all users</li>
                  <li>School must exist in the system</li>
                </ul>
              </Typography>
            </Alert>
          </Box>
        </CardContent>
      </Collapse>
    </Card>
  );
};

export default BulkUploadDeans;
