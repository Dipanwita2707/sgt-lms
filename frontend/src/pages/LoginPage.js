import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Typography, TextField, Button, Link, Alert, Paper } from '@mui/material';
import { loginUser, isAuthenticated, getCurrentUser } from '../utils/authService';
import { universityImages } from '../assets/universityImages';
import sgtLogo from '../assets/sgt-logo-white.png';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const navigate = useNavigate();
  
  // Check if user is already logged in
  useEffect(() => {
    if (isAuthenticated()) {
      const user = getCurrentUser();
      if (user) {
        // Redirect based on user role (supports multi-role)
        if (user.roles ? user.roles.includes('admin') : user.role === 'admin') {
          navigate('/admin');
        } else if (user.roles ? user.roles.includes('dean') : user.role === 'dean') {
          navigate('/dean');
        } else if (user.roles ? user.roles.includes('hod') : user.role === 'hod') {
          navigate('/hod');
        } else if (user.roles ? user.roles.includes('teacher') : user.role === 'teacher') {
          navigate('/teacher');
        } else if (user.roles ? user.roles.includes('student') : user.role === 'student') {
          navigate('/student');
        }
      }
    }
  }, [navigate]);

  // Slideshow effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === universityImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000); // Change image every 4 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const result = await loginUser(email, password);
      
      if (!result.success) {
        setError(result.error);
        return;
      }
      
      const user = result.user;
      
      // Redirect based on user role (supports multi-role)
      if (user.roles ? user.roles.includes('admin') : user.role === 'admin') {
        navigate('/admin');
      } else if (user.roles ? user.roles.includes('dean') : user.role === 'dean') {
        navigate('/dean');
      } else if (user.roles ? user.roles.includes('hod') : user.role === 'hod') {
        navigate('/hod');
      } else if (user.roles ? user.roles.includes('teacher') : user.role === 'teacher') {
        navigate('/teacher');
      } else if (user.roles ? user.roles.includes('student') : user.role === 'student') {
        navigate('/student');
      } else {
        setError('Unknown user role');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        overflow: 'hidden',
      }}
    >
      {/* Left Side - University Images Slideshow - Hidden on mobile */}
      <Box
        sx={{
          flex: { xs: 0, md: 2 },
          display: { xs: 'none', md: 'flex' },
          position: 'relative',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)',
        }}
      >
        {/* Slideshow Container */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {universityImages.map((image, index) => (
            <Box
              key={index}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundImage: `url(${image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: currentImageIndex === index ? 1 : 0,
                transition: 'opacity 1s ease-in-out',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(26, 35, 126, 0.2)', // Reduced overlay opacity to show more of the slideshow
                  zIndex: 1,
                }
              }}
            />
          ))}
        </Box>

        {/* Overlay Content */}
        <Box
          sx={{
            position: 'absolute',
            zIndex: 2,
            color: 'white',
            textAlign: 'center',
            p: 4,
            maxWidth: '80%',
          }}
        >
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              mb: 2,
              textShadow: '4px 4px 12px rgba(0,0,0,0.9), 2px 2px 6px rgba(0,0,0,0.7)', // Multiple layered shadows
              fontSize: { xs: '2rem', md: '3rem', lg: '3.5rem' },
              color: '#ffffff',
              filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.4))', // Enhanced glow effect
              WebkitTextStroke: '1px rgba(0,0,0,0.3)', // Text outline for better contrast
            }}
          >
            Welcome to SGT University
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 400,
              opacity: 1,
              textShadow: '3px 3px 10px rgba(0,0,0,0.9), 1px 1px 4px rgba(0,0,0,0.7)', // Multiple layered shadows
              fontSize: { xs: '1rem', md: '1.25rem' },
              lineHeight: 1.6,
              color: '#ffffff',
              filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.3))', // Enhanced glow
              WebkitTextStroke: '0.5px rgba(0,0,0,0.2)', // Subtle text outline
              background: 'linear-gradient(90deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.3) 100%)', // Gradient text background
              padding: '8px 16px',
              borderRadius: '20px',
              backdropFilter: 'blur(4px)',
            }}
          >
            Excellence in Education • Innovation in Learning • Future in Making
          </Typography>
        </Box>

        {/* Slide Indicators */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 1,
            zIndex: 2,
          }}
        >
          {universityImages.map((_, index) => (
            <Box
              key={index}
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: currentImageIndex === index ? 'white' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.8)',
                }
              }}
              onClick={() => setCurrentImageIndex(index)}
            />
          ))}
        </Box>
      </Box>

      {/* Right Side - Login Form */}
      <Box
        sx={{
          flex: { xs: 1, md: 1 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
          p: { xs: 2, md: 4 },
          minWidth: { xs: '100%', md: '400px' },
          minHeight: { xs: '100vh', md: 'auto' },
        }}
      >
        <Container maxWidth="sm" sx={{ width: '100%' }}>
          <Paper
      elevation={8}
      sx={{
        p: { xs: 3, md: 4 },
        borderRadius: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        maxWidth: { xs: '100%', sm: 450 },
        width: '100%',
        mx: 'auto',

        // Core 3D effect styling
        position: 'relative',
        transform: 'translateY(-8px)', // Lifts the paper up
        transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',

        // New zoom-in effect on hover
        '&:hover': {
          transform: 'translateY(-8px) scale(1.009)', // Zooms in slightly and stays lifted
          boxShadow: '0 30px 60px rgba(0,0,0,0.15)',
        },

        // The pseudo-element for the 3D bottom layer
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#eef6ffff', // The darker base color
          borderRadius: 'inherit',
          zIndex: -1, // Positions it behind the main Paper
          boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
          transition: 'transform 0.3s ease-in-out',
        },
        // Ensures the base also scales on hover
        '&:hover::before': {
          transform: 'scale(1.02)',
        },
      }}
    >
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 2
            }}>
              <img
                src={sgtLogo}
                alt="SGT University Logo"
                style={{
                  width: '180px',
                  maxWidth: '100%',
                  marginBottom: '16px',
                  filter: 'drop-shadow(0 4px 12px rgba(26, 35, 126, 0.15))',
                  objectFit: 'contain',
                }}
              />
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  color: '#1a237e',
                  letterSpacing: 0.5,
                  textAlign: 'center',
                  lineHeight: 1.2,
                  fontFamily: 'Montserrat',
                  fontSize: { xs: '1.5rem', sm: '2rem' },
                  mb: 1
                }}
              >
                University Management System
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 400,
                  color: '#3949ab',
                  textAlign: 'center',
                }}
              >
              </Typography>
            </Box>
            
            <Typography 
              variant="body1" 
              color="text.secondary" 
              mb={3} 
              textAlign="center"
              sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem' } }}
            >
              Enter your credentials to access your dashboard
            </Typography>
            
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3, 
                  width: '100%',
                  borderRadius: 2,
                }}
              >
                {error}
              </Alert>
            )}
            
            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
              <TextField
                label="Email Address or UID"
                type="text"
                fullWidth
                margin="normal"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                disabled={loading}
                placeholder="Enter your email or user ID"
                
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    fontSize: { xs: '0.95rem', sm: '1rem' },
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: { xs: '0.95rem', sm: '1rem' },
                  }
                }}
              />
              <TextField
                label="Password"
                type="password"
                fullWidth
                margin="normal"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    fontSize: { xs: '0.95rem', sm: '1rem' },
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: { xs: '0.95rem', sm: '1rem' },
                  }
                }}
              />
              <style jsx>{`
        .pushable {
          /* General button properties from original sx prop */
          background-color: #1a237e; /* The darker base color */
          border-radius: 16px;
          border: none;
          padding: 0;
          cursor: pointer;
          outline-offset: 4px;
          width: 100%;
          margin-top: 8px;
          margin-bottom: 16px;
        }
        
        .front {
          /* This section now permanently applies the 3D 'raised' effect. */
          display: block;
          padding: 12px 42px;
          border-radius: 16px;
          font-size: 1.1rem;
          font-weight: 600;
          background-color: #303f9f; /* The lighter 'face' color */
          color: white;
          /* The permanent 3D effect is created here */
          transform: translateY(-6px);
          transition: transform 600ms cubic-bezier(.3, .7, .4, 1);
        }

        /* Added a new hover effect to darken the button face slightly */
        .pushable:hover .front {
          background-color: #2a3a8a; /* A darker shade for hover */
          transform: translateY(-8px); /* Also makes it "lift" more on hover */
          transition: transform 250ms cubic-bezier(.3, .7, .4, 1.5);
        }

        /* Active (push) effect remains on click */
        .pushable:active .front {
          transform: translateY(-2px);
          transition: transform 34ms;
        }

        /* Disabled state, matching the original button's disabled color */
        .pushable:disabled {
          background-color: #ccc;
        }

        .pushable:disabled .front {
          background-color: #ccc;
          transform: none; /* No animation when disabled */
        }
      `}</style>

      {/* The new button element with the classes applied */}
      <button
        className="pushable"
        type="submit"
        disabled={loading}
      >
        <span className="front">
          {loading ? 'Signing in...' : 'Sign In'}
        </span>
      </button>
              <Box mt={2} textAlign="center">
                <Link 
                  href="/forgot-password" 
                  variant="body2"
                  sx={{
                    color: '#1a237e',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    '&:hover': {
                      textDecoration: 'underline',
                    }
                  }}
                >
                  Forgot password?
                </Link>
              </Box>
            </Box>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default LoginPage;
