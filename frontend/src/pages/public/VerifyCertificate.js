import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Chip,
  Grid
} from '@mui/material';
import {
  VerifiedUser as VerifiedIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckIcon,
  Security as SecurityIcon,
  QrCode as QrCodeIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const VerifyCertificate = () => {
  const { hash } = useParams(); // Hash from URL if coming from QR code
  const navigate = useNavigate();
  
  const [searchType, setSearchType] = useState('hash'); // 'hash' or 'number'
  const [searchValue, setSearchValue] = useState(hash || '');
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState('');

  // Auto-verify if hash is in URL
  useEffect(() => {
    if (hash) {
      setSearchValue(hash);
      handleVerify(hash, 'hash');
    }
  }, [hash]);

  const handleVerify = async (value = searchValue, type = searchType) => {
    if (!value.trim()) {
      setError('Please enter a certificate number or verification hash');
      return;
    }

    setLoading(true);
    setError('');
    setVerificationResult(null);

    try {
      const endpoint = type === 'hash' 
        ? `/api/certificates/verify/hash/${value}`
        : `/api/certificates/verify/number/${value}`;
      
      const response = await axios.get(endpoint);
      setVerificationResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please check your input.');
      setVerificationResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      py: 8
    }}>
      <Container maxWidth="md">
        {/* Header */}
        <Paper elevation={3} sx={{ p: 4, mb: 4, textAlign: 'center' }}>
          <SecurityIcon sx={{ fontSize: 60, color: '#1976d2', mb: 2 }} />
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
            Certificate Verification
          </Typography>
          <Typography variant="h6" color="text.secondary">
            SGT University - Learning Management System
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Verify the authenticity of your certificate
          </Typography>
        </Paper>

        {/* Search Form */}
        <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <QrCodeIcon sx={{ mr: 1 }} />
            Enter Verification Details
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Search By"
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  SelectProps={{
                    native: true,
                  }}
                >
                  <option value="hash">Verification Hash</option>
                  <option value="number">Certificate Number</option>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label={searchType === 'hash' ? 'Verification Hash (64 characters)' : 'Certificate Number (e.g., SGTLMS-2025-000001)'}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={searchType === 'hash' ? 'Enter 64-character hash' : 'SGTLMS-YYYY-XXXXXX'}
                  disabled={loading}
                />
              </Grid>
            </Grid>

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={() => handleVerify()}
              disabled={loading || !searchValue.trim()}
              sx={{ mt: 3 }}
              startIcon={loading ? <CircularProgress size={20} /> : <VerifiedIcon />}
            >
              {loading ? 'Verifying...' : 'Verify Certificate'}
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 3 }} icon={<ErrorIcon />}>
              {error}
            </Alert>
          )}
        </Paper>

        {/* Verification Result */}
        {verificationResult && (
          <Paper elevation={3} sx={{ p: 4 }}>
            {verificationResult.valid ? (
              <>
                {/* Success Header */}
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <CheckIcon sx={{ fontSize: 80, color: '#4caf50', mb: 2 }} />
                  <Typography variant="h4" gutterBottom sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                    Certificate Verified ✓
                  </Typography>
                  <Chip 
                    label={verificationResult.verified ? 'Integrity Verified' : 'Warning: Integrity Check Failed'}
                    color={verificationResult.verified ? 'success' : 'warning'}
                    icon={verificationResult.verified ? <CheckIcon /> : <WarningIcon />}
                    sx={{ mt: 1 }}
                  />
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Certificate Details */}
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
                      Certificate Details
                    </Typography>
                    
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Certificate Number
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 2 }}>
                          {verificationResult.certificate.certificateNumber}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Block Number
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 2 }}>
                          #{verificationResult.certificate.blockNumber}
                        </Typography>
                      </Grid>

                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Student Name
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#333', mb: 2 }}>
                          {verificationResult.certificate.studentName}
                        </Typography>
                      </Grid>

                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Course Name
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 2 }}>
                          {verificationResult.certificate.courseName}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Marks Percentage
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 2 }}>
                          {verificationResult.certificate.marksPercentage}%
                        </Typography>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Issue Date
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 2 }}>
                          {new Date(verificationResult.certificate.issueDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Verification Hash */}
                <Card variant="outlined" sx={{ bgcolor: '#f5f5f5' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Verification Hash (SHA-256)
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace', 
                        wordBreak: 'break-all',
                        fontSize: '0.75rem',
                        color: '#666'
                      }}
                    >
                      {verificationResult.certificate.verificationHash}
                    </Typography>
                  </CardContent>
                </Card>

                {/* Security Info */}
                <Alert severity="success" sx={{ mt: 3 }} icon={<SecurityIcon />}>
                  <Typography variant="body2">
                    <strong>Authenticity Confirmed:</strong> This certificate is authentic and was issued by SGT University. 
                    The blockchain-style verification ensures that this certificate cannot be duplicated or tampered with.
                  </Typography>
                </Alert>

                {!verificationResult.verified && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Integrity Warning:</strong> While this certificate exists in our system, 
                      the data integrity check failed. Please contact SGT University administration.
                    </Typography>
                  </Alert>
                )}
              </>
            ) : (
              <>
                {/* Failure Header */}
                <Box sx={{ textAlign: 'center' }}>
                  <ErrorIcon sx={{ fontSize: 80, color: '#f44336', mb: 2 }} />
                  <Typography variant="h4" gutterBottom sx={{ color: '#f44336', fontWeight: 'bold' }}>
                    Verification Failed
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {verificationResult.message}
                  </Typography>
                  
                  <Alert severity="error" sx={{ mt: 3, textAlign: 'left' }}>
                    <Typography variant="body2">
                      This certificate could not be verified. Possible reasons:
                    </Typography>
                    <ul style={{ marginTop: 8, marginBottom: 0 }}>
                      <li>Certificate number or hash is incorrect</li>
                      <li>Certificate has been revoked</li>
                      <li>Certificate does not exist in our system</li>
                      <li>This may be a fraudulent certificate</li>
                    </ul>
                  </Alert>
                </Box>
              </>
            )}
          </Paper>
        )}

        {/* Info Box */}
        <Paper elevation={1} sx={{ p: 3, mt: 4, bgcolor: '#f8f9fa' }}>
          <Typography variant="h6" gutterBottom>
            How to Verify
          </Typography>
          <Typography variant="body2" paragraph>
            1. <strong>Scan QR Code:</strong> Use your phone to scan the QR code on the certificate
          </Typography>
          <Typography variant="body2" paragraph>
            2. <strong>Enter Certificate Number:</strong> Type the certificate number (e.g., SGTLMS-2025-000001)
          </Typography>
          <Typography variant="body2">
            3. <strong>Enter Verification Hash:</strong> Copy and paste the 64-character hash from the certificate
          </Typography>
        </Paper>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="body2" color="white" sx={{ mb: 1 }}>
            © {new Date().getFullYear()} SGT University. All rights reserved.
          </Typography>
          <Button 
            variant="outlined" 
            sx={{ color: 'white', borderColor: 'white' }}
            onClick={() => navigate('/')}
          >
            Back to Login
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default VerifyCertificate;
