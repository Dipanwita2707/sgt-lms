import React, { useState } from 'react';
import { Box, Button, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Link } from '@mui/material';
import Papa from 'papaparse';
import DownloadIcon from '@mui/icons-material/Download';

const REQUIRED_FIELDS = ['name', 'school', 'department'];

// Helper function to generate sample CSV content
const generateSampleCSV = () => {
  return `name,school,department,semester,year,capacity
A1,School of Engineering,Computer Science Engineering,1,2024-2025,60
A2,School of Engineering,Computer Science Engineering,1,2024-2025,60
A3,School of Engineering,Computer Science Engineering,1,2024-2025,60
B1,School of Engineering,Electronics Engineering,1,2024-2025,55
B2,School of Engineering,Electronics Engineering,1,2024-2025,55
C1,School of Management,MBA,1,2024-2025,50
C2,School of Management,MBA,1,2024-2025,50
D1,School of Arts,English Literature,1,2024-2025,45
D2,School of Arts,English Literature,1,2024-2025,45
E1,School of Engineering,Mechanical Engineering,1,2024-2025,60`;
};

// Helper function to download sample CSV
const downloadSampleCSV = () => {
  const element = document.createElement('a');
  const file = new Blob([generateSampleCSV()], {type: 'text/csv'});
  element.href = URL.createObjectURL(file);
  element.download = 'section_template.csv';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

const BulkUploadSections = ({ onUpload }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [serverErrors, setServerErrors] = useState([]);
  const [serverResults, setServerResults] = useState([]);

  const handleFileChange = e => {
    setFile(e.target.files[0]);
    setPreview([]);
    setCsvErrors([]);
    setError('');
    setSuccess('');
    setServerErrors([]);
    setServerResults([]);
    
    if (e.target.files[0]) {
      Papa.parse(e.target.files[0], {
        header: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim().toLowerCase(), // Normalize headers
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
          const seenNames = new Set();
          
          rows.forEach((row, idx) => {
            // Handle case where name might be NAME or Name instead of name
            const normalizedRow = {};
            Object.keys(row).forEach(key => {
              normalizedRow[key.toLowerCase().trim()] = row[key];
            });
            
            // Check required fields
            REQUIRED_FIELDS.forEach(f => {
              if (!normalizedRow[f] || normalizedRow[f].trim() === '') {
                errors.push({ row: idx + 2, message: `Missing field: ${f}` });
              }
            });
            
            // Check for duplicate section names in the same school/department
            if (normalizedRow.name && normalizedRow.school && normalizedRow.department) {
              const sectionKey = `${normalizedRow.school}-${normalizedRow.department}-${normalizedRow.name}`.toLowerCase();
              if (seenNames.has(sectionKey)) {
                errors.push({ row: idx + 2, message: 'Duplicate section name in same school/department' });
              }
              seenNames.add(sectionKey);
            }
            
            // Validate capacity if provided
            if (normalizedRow.capacity && normalizedRow.capacity.trim() !== '') {
              const capacity = parseInt(normalizedRow.capacity);
              if (isNaN(capacity) || capacity < 1) {
                errors.push({ row: idx + 2, message: 'Invalid capacity (must be a positive number)' });
              }
            }
            
            // Validate semester if provided
            if (normalizedRow.semester && normalizedRow.semester.trim() !== '') {
              const semester = parseInt(normalizedRow.semester);
              if (isNaN(semester) || semester < 1 || semester > 12) {
                errors.push({ row: idx + 2, message: 'Invalid semester (must be between 1-12)' });
              }
            }
          });
          
          setPreview(rows);
          setCsvErrors(errors);
        },
        error: (err) => setError('CSV parse error: ' + err.message)
      });
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setServerErrors([]);
    setServerResults([]);
    
    if (!file) return setError('Please select a CSV file');
    if (csvErrors.length > 0) return setError('Please fix CSV errors before uploading.');
    
    try {
      const data = await onUpload(file);
      
      if (data.results) {
        setServerResults(data.results);
      }
      
      if (data.errors && data.errors.length > 0) {
        setServerErrors(data.errors);
        setSuccess(`Uploaded ${data.success || 0} sections, ${data.failed || 0} failed.`);
      } else {
        setSuccess(`Uploaded ${data.success || data.total || 0} sections successfully.`);
      }
      
      setFile(null);
      setPreview([]);
      setCsvErrors([]);
    } catch (err) {
      setSuccess('');
      const resp = err.response?.data;
      setError(resp?.message || err.message || 'Bulk upload failed');
      if (resp?.errors) setServerErrors(resp.errors);
      else setServerErrors([]);
      setServerResults([]);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: 2 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          Upload a CSV file with the following required columns: 
          <strong> name</strong>, <strong>school</strong>, <strong>department</strong>. 
          <br />
          Optional columns: <strong>semester</strong> (1-12), <strong>year</strong> (e.g., 2024-2025), <strong>capacity</strong> (number of students).
          <br />
          <strong>Note:</strong> School and department should match existing entries in the system (case-insensitive).
          <br />
          Section names should be unique within the same school/department combination.
          <br />
          <Link 
            component="button" 
            onClick={downloadSampleCSV} 
            sx={{ display: 'inline-flex', alignItems: 'center', mt: 1 }}
          >
            <DownloadIcon fontSize="small" sx={{ mr: 0.5 }} />
            Download CSV Template
          </Link>
        </Typography>
      </Alert>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <input 
          type="file" 
          accept=".csv" 
          onChange={handleFileChange} 
          style={{ marginRight: 8 }} 
        />
        <Button 
          type="submit" 
          variant="contained" 
          color="primary" 
          disabled={csvErrors.length > 0 && preview.length > 0}
          sx={{ ml: 2 }}
        >
          Upload Sections
        </Button>
      </Box>
      
      {preview.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1">Preview:</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {Object.keys(preview[0]).map(h => <TableCell key={h}>{h}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.map((row, i) => (
                  <TableRow key={i}>
                    {Object.keys(preview[0]).map(h => <TableCell key={h}>{row[h]}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {csvErrors.length > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <b>CSV Errors:</b>
              <ul style={{ margin: 0 }}>
                {csvErrors.map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}
              </ul>
            </Alert>
          )}
        </Box>
      )}

      {serverErrors.length > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <b>Server Reported Errors:</b>
          <ul style={{ margin: 0 }}>
            {serverErrors.map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}
          </ul>
        </Alert>
      )}

      {serverResults.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Uploaded Sections Summary</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>CSV Row</TableCell>
                  <TableCell>Section Name</TableCell>
                  <TableCell>School</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Semester</TableCell>
                  <TableCell>Year</TableCell>
                  <TableCell>Capacity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {serverResults.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.row}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.school}</TableCell>
                    <TableCell>{r.department}</TableCell>
                    <TableCell>{r.semester || '-'}</TableCell>
                    <TableCell>{r.year || '-'}</TableCell>
                    <TableCell>{r.capacity || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
};

export default BulkUploadSections;
