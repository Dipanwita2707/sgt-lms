import React from 'react';
import { Box, Typography, keyframes } from '@mui/material';

// Animation keyframes
const logoFloat = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-8px);
  }
`;

const logoGlow = keyframes`
  0%, 100% {
    box-shadow: 0 8px 32px rgba(33, 150, 243, 0.15);
  }
  50% {
    box-shadow: 0 12px 40px rgba(33, 150, 243, 0.25);
  }
`;

const textShimmer = keyframes`
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: 200px 0;
  }
`;

const SGTLogo = ({ size = 120, animate = true, showText = true, variant = 'full' }) => {
  const logoContainerStyle = {
    width: size,
    height: size,
    borderRadius: '24px',
    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    boxShadow: animate 
      ? '0 8px 32px rgba(0, 0, 0, 0.12)' 
      : '0 4px 20px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(33, 150, 243, 0.1)',
    animation: animate ? `${logoFloat} 3s ease-in-out infinite, ${logoGlow} 4s ease-in-out infinite` : 'none',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: animate ? 'scale(1.05)' : 'scale(1.02)',
      boxShadow: '0 12px 40px rgba(33, 150, 243, 0.2)',
    }
  };

  if (variant === 'minimal') {
    return (
      <Box sx={logoContainerStyle}>
        <img 
          src="/sgt_logo.png" 
          alt="SGT University Logo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1))',
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {/* University Logo */}
      <Box sx={logoContainerStyle}>
        <img 
          src="/sgt_logo.png" 
          alt="SGT University Logo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1))',
          }}
        />
      </Box>

      {showText && (
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #2196F3, #1976D2, #0D47A1)',
              backgroundSize: '200px 100%',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              animation: animate ? `${textShimmer} 3s ease-in-out infinite` : 'none',
              letterSpacing: '1px',
              mb: 1,
            }}
          >
            SGT UNIVERSITY
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: '#546e7a',
              fontWeight: 400,
              letterSpacing: '0.5px',
              mb: 2,
              opacity: 0.8,
            }}
          >
            Shree Guru Gobind Singh Tricentenary University
          </Typography>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
              color: 'white',
              padding: '8px 20px',
              borderRadius: '25px',
              fontSize: '14px',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(33, 150, 243, 0.3)',
              animation: animate ? `${logoGlow} 3s ease-in-out infinite` : 'none',
            }}
          >
            NAAC A+
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default SGTLogo;