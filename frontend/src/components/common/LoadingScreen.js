import React, { useState, useEffect } from 'react';
import { Box, Typography, LinearProgress, Fade, keyframes } from '@mui/material';
import SGTLogo from './SGTLogo';

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const floatingParticles = keyframes`
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
    opacity: 0.7;
  }
  33% {
    transform: translateY(-20px) rotate(120deg);
    opacity: 1;
  }
  66% {
    transform: translateY(-10px) rotate(240deg);
    opacity: 0.8;
  }
`;

const gradientShift = keyframes`
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
`;

const LoadingScreen = ({ onComplete, message = "Loading your dashboard..." }) => {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('Initializing...');
  const [visible, setVisible] = useState(true);

  const loadingMessages = [
    'Initializing system...',
    'Loading your courses...',
    'Fetching progress data...',
    'Preparing dashboard...',
    'Almost ready...'
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prevProgress) => {
        if (prevProgress >= 100) {
          setTimeout(() => {
            setVisible(false);
            setTimeout(onComplete, 500);
          }, 800);
          return 100;
        }
        const newProgress = prevProgress + Math.random() * 15 + 5;
        return Math.min(newProgress, 100);
      });
    }, 300);

    return () => clearInterval(timer);
  }, [onComplete]);

  useEffect(() => {
    const messageIndex = Math.floor((progress / 100) * (loadingMessages.length - 1));
    setCurrentMessage(loadingMessages[messageIndex]);
  }, [progress]);

  return (
    <Fade in={visible} timeout={500}>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 50%, #e3f2fd 100%)',
          backgroundSize: '300% 300%',
          animation: `${gradientShift} 6s ease infinite`,
          zIndex: 9999,
          color: '#2c3e50',
          overflow: 'hidden',
        }}
      >
        {/* Futuristic floating particles */}
        {[...Array(12)].map((_, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: `linear-gradient(45deg, ${i % 2 === 0 ? '#3498db' : '#f1c40f'}, ${i % 2 === 0 ? '#74b9ff' : '#fdcb6e'})`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `${floatingParticles} ${3 + Math.random() * 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
              boxShadow: `0 0 20px ${i % 2 === 0 ? 'rgba(52, 152, 219, 0.5)' : 'rgba(241, 196, 15, 0.5)'}`,
            }}
          />
        ))}

        {/* Glassmorphism background shapes */}
        <Box
          sx={{
            position: 'absolute',
            top: '15%',
            left: '10%',
            width: '150px',
            height: '150px',
            borderRadius: '30px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            animation: `${fadeInUp} 3s ease-out infinite alternate`,
            transform: 'rotate(45deg)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: '60%',
            right: '15%',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'rgba(52, 152, 219, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(52, 152, 219, 0.3)',
            animation: `${fadeInUp} 2.5s ease-out infinite alternate`,
            animationDelay: '0.5s',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '20%',
            left: '20%',
            width: '120px',
            height: '120px',
            borderRadius: '20px',
            background: 'rgba(241, 196, 15, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(241, 196, 15, 0.3)',
            animation: `${fadeInUp} 3.5s ease-out infinite alternate`,
            animationDelay: '1s',
            transform: 'rotate(-30deg)',
          }}
        />

        {/* Main loading content */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            maxWidth: '600px',
            width: '100%',
            px: 4,
            animation: `${fadeInUp} 1s ease-out`,
            position: 'relative',
            zIndex: 10,
          }}
        >
          {/* Logo with glassmorphism card */}
          <Box
            sx={{
              background: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(20px)',
              borderRadius: '30px',
              padding: '40px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 25px 45px rgba(0, 0, 0, 0.1)',
            }}
          >
            <SGTLogo size={160} animate={true} showText={false} />
          </Box>

          {/* University name with futuristic styling */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #3498db, #f1c40f, #3498db)',
                backgroundSize: '200% 100%',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                animation: `${gradientShift} 3s ease-in-out infinite`,
                letterSpacing: '4px',
                mb: 1,
                textShadow: 'none',
                fontFamily: '"Segoe UI", "Arial", sans-serif',
              }}
            >
              SGT UNIVERSITY
            </Typography>
            
            <Typography
              variant="h6"
              sx={{
                color: '#34495e',
                fontWeight: 400,
                letterSpacing: '2px',
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
                background: 'linear-gradient(45deg, #f1c40f, #f39c12)',
                borderRadius: '30px',
                padding: '12px 24px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(241, 196, 15, 0.3)',
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  color: 'white',
                  fontWeight: 'bold',
                  letterSpacing: '2px',
                  textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)',
                }}
              >
                NAAC A+
              </Typography>
            </Box>
          </Box>

          {/* Loading progress with glassmorphism */}
          <Box 
            sx={{ 
              width: '100%', 
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '30px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            <Typography
              variant="h5"
              sx={{
                mb: 3,
                color: '#2c3e50',
                fontWeight: 500,
                letterSpacing: '1px',
              }}
            >
              {currentMessage}
            </Typography>

            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 12,
                borderRadius: 6,
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 6,
                  background: 'linear-gradient(45deg, #3498db, #74b9ff)',
                  boxShadow: '0 4px 15px rgba(52, 152, 219, 0.4)',
                },
              }}
            />

            <Typography
              variant="body1"
              sx={{
                mt: 2,
                color: '#34495e',
                fontWeight: 500,
              }}
            >
              {Math.round(progress)}% Complete
            </Typography>
          </Box>

          {/* Inspirational quote */}
          <Typography
            variant="h6"
            sx={{
              textAlign: 'center',
              color: '#34495e',
              fontStyle: 'italic',
              maxWidth: '500px',
              lineHeight: 1.6,
              fontWeight: 300,
              opacity: 0.9,
            }}
          >
            "The future belongs to those who believe in the beauty of their dreams"
          </Typography>
        </Box>
      </Box>
    </Fade>
  );
};

export default LoadingScreen;