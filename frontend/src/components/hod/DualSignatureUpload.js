import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  Divider
} from '@mui/material';
import { Upload as UploadIcon, CheckCircle, CloudUpload } from '@mui/icons-material';
import axios from 'axios';

const DualSignatureUpload = () => {
  // HOD Signature State
  const [hodSignatureFile, setHodSignatureFile] = useState(null);
  const [hodSignaturePreview, setHodSignaturePreview] = useState(null);
  const [currentHodSignature, setCurrentHodSignature] = useState(null);
  const [hodLoading, setHodLoading] = useState(false);
  const [hasHodSignature, setHasHodSignature] = useState(false);

  // Registrar Signature State
  const [registrarSignatureFile, setRegistrarSignatureFile] = useState(null);
  const [registrarSignaturePreview, setRegistrarSignaturePreview] = useState(null);
  const [currentRegistrarSignature, setCurrentRegistrarSignature] = useState(null);
  const [registrarLoading, setRegistrarLoading] = useState(false);
  const [hasRegistrarSignature, setHasRegistrarSignature] = useState(false);

  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSignatureStatus();
  }, []);

  const fetchSignatureStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/certificates/signature/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // HOD Signature
      setHasHodSignature(response.data.hasSignature);
      if (response.data.signatureUrl) {
        setCurrentHodSignature(response.data.signatureUrl);
      }

      // Registrar Signature
      setHasRegistrarSignature(response.data.hasRegistrarSignature);
      if (response.data.registrarSignatureUrl) {
        setCurrentRegistrarSignature(response.data.registrarSignatureUrl);
      }
    } catch (error) {
      console.error('Error fetching signature status:', error);
    }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'File size must be less than 2MB' });
        return;
      }

      // Validate file type
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        setMessage({ type: 'error', text: 'Only JPG, JPEG, and PNG files are allowed' });
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'hod') {
          setHodSignatureFile(file);
          setHodSignaturePreview(reader.result);
        } else {
          setRegistrarSignatureFile(file);
          setRegistrarSignaturePreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
      
      setMessage({ type: '', text: '' });
    }
  };

  const handleUpload = async (type) => {
    const file = type === 'hod' ? hodSignatureFile : registrarSignatureFile;
    
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a signature file' });
      return;
    }

    if (type === 'hod') {
      setHodLoading(true);
    } else {
      setRegistrarLoading(true);
    }
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('signature', file);
      formData.append('signatureType', type); // 'hod' or 'registrar'

      const response = await axios.post('/api/certificates/signature/upload', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setMessage({ 
        type: 'success', 
        text: `${type === 'hod' ? 'HOD' : 'Sub-Register (Exam)'} signature uploaded successfully!` 
      });
      
      if (type === 'hod') {
        setHasHodSignature(true);
        setCurrentHodSignature(response.data.signatureUrl);
        setHodSignatureFile(null);
        setHodSignaturePreview(null);
        document.getElementById('hod-signature-upload-input').value = '';
      } else {
        setHasRegistrarSignature(true);
        setCurrentRegistrarSignature(response.data.registrarSignatureUrl);
        setRegistrarSignatureFile(null);
        setRegistrarSignaturePreview(null);
        document.getElementById('registrar-signature-upload-input').value = '';
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to upload signature' 
      });
    } finally {
      if (type === 'hod') {
        setHodLoading(false);
      } else {
        setRegistrarLoading(false);
      }
    }
  };

  const SignatureSection = ({ 
    title, 
    subtitle, 
    currentSignature, 
    signaturePreview, 
    signatureFile, 
    hasSignature, 
    loading, 
    type,
    inputId 
  }) => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {subtitle}
      </Typography>

      {hasSignature && currentSignature && !signaturePreview && (
        <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckCircle color="success" />
            <Typography variant="body2" color="text.secondary">
              Current Signature:
            </Typography>
          </Box>
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <img 
              src={currentSignature} 
              alt={`${title} Signature`}
              style={{ 
                maxWidth: '300px', 
                maxHeight: '100px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '8px',
                backgroundColor: 'white'
              }} 
            />
          </Box>
        </Box>
      )}

      <Box>
        <input
          accept="image/jpeg,image/jpg,image/png"
          style={{ display: 'none' }}
          id={inputId}
          type="file"
          onChange={(e) => handleFileChange(e, type)}
        />
        <label htmlFor={inputId}>
          <Button
            variant="outlined"
            component="span"
            startIcon={<UploadIcon />}
            fullWidth
            sx={{ mb: 2 }}
          >
            {hasSignature ? `Change ${title}` : `Select ${title}`}
          </Button>
        </label>

        {signaturePreview && (
          <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Preview:
            </Typography>
            <Box sx={{ textAlign: 'center' }}>
              <img 
                src={signaturePreview} 
                alt="Signature Preview" 
                style={{ 
                  maxWidth: '300px', 
                  maxHeight: '100px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '8px',
                  backgroundColor: 'white'
                }} 
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
              {signatureFile?.name} ({(signatureFile?.size / 1024).toFixed(2)} KB)
            </Typography>
          </Box>
        )}

        <Button
          variant="contained"
          color="primary"
          onClick={() => handleUpload(type)}
          disabled={!signatureFile || loading}
          fullWidth
          startIcon={loading ? <CircularProgress size={20} /> : <UploadIcon />}
        >
          {loading ? 'Uploading...' : `Upload ${title}`}
        </Button>
      </Box>
    </Box>
  );

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ 
          background: 'linear-gradient(135deg, #3f51b5 0%, #283593 100%)',
          p: 2,
          mb: 3,
          borderRadius: 1,
          color: 'white'
        }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudUpload />
            Digital Signatures Upload
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
            Upload both HOD and Sub-Register (Exam) signatures for course certificates
          </Typography>
        </Box>

        {message.text && (
          <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
            {message.text}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* HOD Signature */}
          <Grid item xs={12} md={6}>
            <SignatureSection
              title="HOD Signature"
              subtitle="Verified by - Head of Department"
              currentSignature={currentHodSignature}
              signaturePreview={hodSignaturePreview}
              signatureFile={hodSignatureFile}
              hasSignature={hasHodSignature}
              loading={hodLoading}
              type="hod"
              inputId="hod-signature-upload-input"
            />
          </Grid>

          {/* Registrar Signature */}
          <Grid item xs={12} md={6}>
            <SignatureSection
              title="Sub-Register (Exam) Signature"
              subtitle="Prepared by - AAST Registrar"
              currentSignature={currentRegistrarSignature}
              signaturePreview={registrarSignaturePreview}
              signatureFile={registrarSignatureFile}
              hasSignature={hasRegistrarSignature}
              loading={registrarLoading}
              type="registrar"
              inputId="registrar-signature-upload-input"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Guidelines:</strong>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>Upload clear images of signatures</li>
              <li>Supported formats: JPG, JPEG, PNG</li>
              <li>Maximum file size: 2MB each</li>
              <li>Recommended: White background with black signature</li>
              <li><strong>HOD Signature:</strong> Will appear as "Verified by" on certificates</li>
              <li><strong>Sub-Register Signature:</strong> Will appear as "Prepared by" on certificates</li>
              <li>Both signatures are required to activate certificates</li>
            </ul>
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default DualSignatureUpload;
