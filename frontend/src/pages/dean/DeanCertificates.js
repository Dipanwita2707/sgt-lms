import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import SignatureUpload from '../../components/hod/SignatureUpload'; // Reuse HOD component

const DeanCertificates = () => {
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600, color: '#009688' }}>
        Dean Signature Management
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Upload your digital signature for approving course certificates across your school.
      </Typography>

      {/* Signature Upload Section */}
      <SignatureUpload />

      <Box sx={{ mt: 3, p: 2, bgcolor: '#e0f2f1', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Note:</strong>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>Your signature will appear as "Approved by" on all certificates for courses in your school</li>
            <li>This signature is used automatically when HODs activate certificates</li>
            <li>You can update your signature at any time</li>
            <li>Ensure your signature is clear and professional</li>
          </ul>
        </Typography>
      </Box>
    </Container>
  );
};

export default DeanCertificates;
