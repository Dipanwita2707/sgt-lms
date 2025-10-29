import React, { useState } from 'react';
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
  Chip,
  Divider,
  Grid,
  InputAdornment
} from '@mui/material';
import {
  VerifiedUser as VerifiedIcon,
  Search as SearchIcon,
  QrCodeScanner as QrIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import axios from 'axios';

const CertificateVerification = () => {
  const [searchType, setSearchType] = useState('number'); // 'number' or 'hash'
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!searchValue.trim()) {
      setError('Please enter a certificate number or verification hash');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const endpoint = searchType === 'number' 
        ? `/api/certificates/verify/number/${encodeURIComponent(searchValue.trim())}`
        : `/api/certificates/verify/hash/${searchValue.trim()}`;

      const response = await axios.get(endpoint);
      
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please check the details and try again.');
      setResult(null);
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
        <Box sx={{ textAlign: 'center', mb: 6, color: 'white' }}>
          <VerifiedIcon sx={{ fontSize: 80, mb: 2 }} />
          <Typography variant="h3" gutterBottom fontWeight="bold">
            Certificate Verification
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            SGT University Learning Management System
          </Typography>
          <Typography variant="body1" sx={{ mt: 2, opacity: 0.8 }}>
            Verify the authenticity of certificates issued by our institution
          </Typography>
        </Box>

        {/* Search Card */}
        <Paper elevation={8} sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h5" gutterBottom fontWeight="bold" color="primary">
            Verify Certificate
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter the certificate number or verification hash to check authenticity
          </Typography>

          {/* Search Type Selector */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant={searchType === 'number' ? 'contained' : 'outlined'}
              onClick={() => setSearchType('number')}
              startIcon={<SearchIcon />}
              fullWidth
            >
              Certificate Number
            </Button>
            <Button
              variant={searchType === 'hash' ? 'contained' : 'outlined'}
              onClick={() => setSearchType('hash')}
              startIcon={<QrIcon />}
              fullWidth
            >
              Verification Hash
            </Button>
          </Box>

          {/* Search Input */}
          <TextField
            fullWidth
            variant="outlined"
            label={searchType === 'number' ? 'Certificate Number' : 'Verification Hash'}
            placeholder={searchType === 'number' ? 'e.g., SGTLMS-2025-000001' : 'Enter 64-character hash'}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyPress={handleKeyPress}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {searchType === 'number' ? <SearchIcon /> : <QrIcon />}
                </InputAdornment>
              ),
            }}
          />

          {/* Verify Button */}
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleVerify}
            disabled={loading || !searchValue.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : <VerifiedIcon />}
            sx={{ py: 1.5 }}
          >
            {loading ? 'Verifying...' : 'Verify Certificate'}
          </Button>

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mt: 3 }} icon={<CancelIcon />}>
              {error}
            </Alert>
          )}

          {/* Success Result */}
          {result && result.valid && (
            <Card sx={{ mt: 3, border: '2px solid', borderColor: 'success.main' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CheckIcon sx={{ color: 'success.main', fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography variant="h5" color="success.main" fontWeight="bold">
                      Certificate Verified ✓
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {result.message}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Certificate Number
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {result.certificate.certificateNumber}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Student Name
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {result.certificate.studentName}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Course Name
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {result.certificate.courseName}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Marks Obtained
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {result.certificate.marksPercentage}%
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Issue Date
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {new Date(result.certificate.issueDate).toLocaleDateString()}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Blockchain Verification
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Chip 
                        label={`Block #${result.certificate.blockNumber}`} 
                        color="primary" 
                        size="small" 
                      />
                      <Chip 
                        label={result.verified ? 'Integrity Verified' : 'Integrity Warning'} 
                        color={result.verified ? 'success' : 'warning'}
                        size="small"
                        icon={result.verified ? <CheckIcon /> : <InfoIcon />}
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Verification Hash (SHA-256)
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace', 
                        wordBreak: 'break-all',
                        bgcolor: '#f5f5f5',
                        p: 1,
                        borderRadius: 1,
                        fontSize: '0.75rem'
                      }}
                    >
                      {result.certificate.verificationHash}
                    </Typography>
                  </Grid>
                </Grid>

                <Alert severity="success" sx={{ mt: 3 }} icon={<VerifiedIcon />}>
                  This certificate is authentic and has been verified against our blockchain-secured database.
                </Alert>
              </CardContent>
            </Card>
          )}
        </Paper>

        {/* Information Section */}
        <Paper elevation={4} sx={{ p: 3, mt: 4, borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            <InfoIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            How to Verify
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            1. <strong>Certificate Number:</strong> Found at the bottom of the certificate (Format: SGTLMS-YYYY-XXXXXX)
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            2. <strong>QR Code:</strong> Scan the QR code on the certificate to automatically verify
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            3. <strong>Verification Hash:</strong> The 64-character cryptographic hash ensures data integrity
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ⚠️ If verification fails or shows warnings, the certificate may be fraudulent or tampered with.
            Please contact the institution for clarification.
          </Typography>
        </Paper>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 4, color: 'white' }}>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            © {new Date().getFullYear()} SGT University. All rights reserved.
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            Secured with blockchain-style verification technology
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default CertificateVerification;
