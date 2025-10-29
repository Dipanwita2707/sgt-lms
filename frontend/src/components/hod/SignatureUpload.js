import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Avatar
} from '@mui/material';
import { Upload as UploadIcon, CheckCircle, CloudUpload } from '@mui/icons-material';
import axios from 'axios';

const SignatureUpload = () => {
  const [signatureFile, setSignatureFile] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [currentSignature, setCurrentSignature] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    fetchSignatureStatus();
  }, []);

  const fetchSignatureStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/certificates/signature/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setHasSignature(response.data.hasSignature);
      if (response.data.signatureUrl) {
        setCurrentSignature(response.data.signatureUrl);
      }
    } catch (error) {
      console.error('Error fetching signature status:', error);
    }
  };

  const handleFileChange = (e) => {
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

      setSignatureFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignaturePreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      setMessage({ type: '', text: '' });
    }
  };

  const handleUpload = async () => {
    if (!signatureFile) {
      setMessage({ type: 'error', text: 'Please select a signature file' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('signature', signatureFile);

      const response = await axios.post('/api/certificates/signature/upload', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setMessage({ type: 'success', text: 'Signature uploaded successfully!' });
      setHasSignature(true);
      setCurrentSignature(response.data.signatureUrl);
      setSignatureFile(null);
      setSignaturePreview(null);
      
      // Reset file input
      document.getElementById('signature-upload-input').value = '';
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to upload signature' 
      });
    } finally {
      setLoading(false);
    }
  };

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
            Digital Signature Upload
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
            Upload your digital signature for course certificates (required to activate certificates)
          </Typography>
        </Box>

        {message.text && (
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}

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
                alt="Current Signature" 
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
            id="signature-upload-input"
            type="file"
            onChange={handleFileChange}
          />
          <label htmlFor="signature-upload-input">
            <Button
              variant="outlined"
              component="span"
              startIcon={<UploadIcon />}
              fullWidth
              sx={{ mb: 2 }}
            >
              {hasSignature ? 'Change Signature' : 'Select Signature File'}
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
            onClick={handleUpload}
            disabled={!signatureFile || loading}
            fullWidth
            startIcon={loading ? <CircularProgress size={20} /> : <UploadIcon />}
          >
            {loading ? 'Uploading...' : 'Upload Signature'}
          </Button>

          <Box sx={{ mt: 2, p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Guidelines:</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Upload a clear image of your signature</li>
                <li>Supported formats: JPG, JPEG, PNG</li>
                <li>Maximum file size: 2MB</li>
                <li>Recommended: White background with black signature</li>
                <li>This signature will appear on all certificates for your department</li>
              </ul>
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SignatureUpload;
