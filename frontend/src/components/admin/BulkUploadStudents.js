import React, { useState } from 'react';
import { Box, Button, Alert, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Link } from '@mui/material';
import Papa from 'papaparse';
import DownloadIcon from '@mui/icons-material/Download';

// Backend now only strictly requires name & email; password becomes optional (auto-generated if missing)
const REQUIRED_FIELDS = ['name', 'email'];
const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Helper function to generate sample CSV content
const generateSampleCSV = () => {
  return `name,email,password,section,school,department,courseAssigned
Aarav Kumar,aarav.kumar@student.sgtuniversity.edu,Aarav@2024,A1,School of Engineering,Computer Science Engineering,CS101;CS102;CS103
Diya Sharma,diya.sharma@student.sgtuniversity.edu,Diya@2024,A1,School of Engineering,Computer Science Engineering,CS101;CS102;CS103
Arjun Patel,arjun.patel@student.sgtuniversity.edu,Arjun@2024,A2,School of Engineering,Computer Science Engineering,CS101;CS102;CS103
Ananya Singh,ananya.singh@student.sgtuniversity.edu,Ananya@2024,A2,School of Engineering,Computer Science Engineering,CS101;CS102;CS103
Rohan Verma,rohan.verma@student.sgtuniversity.edu,Rohan@2024,B1,School of Engineering,Electronics Engineering,EE101;EE102
Isha Gupta,isha.gupta@student.sgtuniversity.edu,Isha@2024,B1,School of Engineering,Electronics Engineering,EE101;EE102
Kabir Reddy,kabir.reddy@student.sgtuniversity.edu,Kabir@2024,C1,School of Management,MBA,MBA101;MBA102;MBA103
Meera Joshi,meera.joshi@student.sgtuniversity.edu,Meera@2024,C1,School of Management,MBA,MBA101;MBA102;MBA103
Advait Desai,advait.desai@student.sgtuniversity.edu,Advait@2024,D1,School of Arts,English Literature,ENG101;ENG102
Saanvi Iyer,saanvi.iyer@student.sgtuniversity.edu,Saanvi@2024,D1,School of Arts,English Literature,ENG101;ENG102`;
};

// Helper function to download sample CSV
const downloadSampleCSV = () => {
  const element = document.createElement('a');
  const file = new Blob([generateSampleCSV()], {type: 'text/csv'});
  element.href = URL.createObjectURL(file);
  element.download = 'student_template.csv';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

const BulkUploadStudents = ({ onUpload }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]); // client-side pre-validation errors
  const [serverErrors, setServerErrors] = useState([]); // row-level errors returned by server
  const [serverResults, setServerResults] = useState([]); // successful rows with possible generated passwords

  const handleFileChange = e => {
    setFile(e.target.files[0]);
    setPreview([]);
    setCsvErrors([]);
    setError('');
    setSuccess('');
    if (e.target.files[0]) {
      Papa.parse(e.target.files[0], {
        header: true,
        skipEmptyLines: true,
        delimiter: '', // Auto-detect delimiter (comma, tab, etc.)
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
          const seenEmails = new Set();
          
          rows.forEach((row, idx) => {
            // Handle case where name might be NAME or Name instead of name
            const normalizedRow = {};
            Object.keys(row).forEach(key => {
              normalizedRow[key.toLowerCase().trim()] = row[key];
            });
            
            // Required fields (password optional now)
            REQUIRED_FIELDS.forEach(f => {
              if (!normalizedRow[f] || normalizedRow[f].trim() === '') {
                errors.push({ row: idx + 2, message: `Missing field: ${f}` });
              }
            });
            
            if (normalizedRow.email) {
              if (!emailRegex.test(normalizedRow.email)) {
                errors.push({ row: idx + 2, message: 'Invalid email' });
              }
              if (seenEmails.has(normalizedRow.email.toLowerCase())) {
                errors.push({ row: idx + 2, message: 'Duplicate email in file' });
              }
              seenEmails.add(normalizedRow.email.toLowerCase());
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
    if (!file) return setError('Please select a CSV file');
    if (csvErrors.length > 0) return setError('Please fix CSV errors before uploading.');
    try {
      const data = await onUpload(file);
      setServerErrors([]);
      setServerResults(data.results || []);
      if (data.failed && data.failed > 0) {
        setSuccess(`Uploaded ${data.success} students, ${data.failed} failed.`);
        setServerErrors(data.errors || []);
      } else {
        setSuccess(`Uploaded ${data.success || data.total || 0} students successfully.`);
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
          Upload a CSV file with required columns: <strong>name</strong>, <strong>email</strong>.
          Optional columns: <strong>password</strong> (auto-generated if blank), <strong>regNo</strong>, <strong>school</strong>, <strong>department</strong>, <strong>section</strong>, <strong>courseAssigned</strong> (single or multiple; use comma / semicolon or ["C000001","C000002"]).
          <br />
          <strong>Note:</strong> <strong>UIDs (Unique IDs)</strong> will be automatically generated as 8-digit numbers (e.g., 00000001, 00000002) for each new student. The regNo field is optional and can be used for legacy registration numbers if needed.
          <br />If password is omitted a secure random password will be generated and shown below after upload (copy & distribute securely).
          <br />You can assign students to sections by providing school, department, and section codes/IDs.
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
          Upload Students
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
          {(csvErrors.length > 0) && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <b>Local CSV Validation Errors:</b>
              <ul style={{ margin: 0 }}>
                {csvErrors.map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}
              </ul>
            </Alert>
          )}
        </Box>
      )}

      {serverErrors.length > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <b>Server Reported Row Errors:</b>
          <ul style={{ margin: 0 }}>
            {serverErrors.map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}
          </ul>
        </Alert>
      )}

      {serverResults.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Uploaded Students Summary</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>CSV Row</TableCell>
                  <TableCell>Reg No</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Generated Password</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {serverResults.map((r,i) => (
                  <TableRow key={i}>
                    <TableCell>{r.row}</TableCell>
                    <TableCell>{r.regNo}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell style={{ fontFamily: 'monospace' }}>{r.generatedPassword || ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Distribute generated passwords securely; advise users to change them after first login.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default BulkUploadStudents;
