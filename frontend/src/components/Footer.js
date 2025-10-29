import React from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Typography, 
  Link, 
  IconButton, 
  useTheme,
  Stack,
  Divider
} from '@mui/material';
import {
  LinkedIn as LinkedInIcon,
  Twitter as TwitterIcon,
  Instagram as InstagramIcon,
  YouTube as YouTubeIcon,
  Home as HomeIcon,
  Book as BookIcon,
  ContactMail as ContactIcon,
  Info as InfoIcon,
  Help as HelpIcon,
  Security as SecurityIcon,
  Policy as PolicyIcon
} from '@mui/icons-material';
import sgtLogo from '../assets/sgt-logo-white.png';

const Footer = () => {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    {
      icon: <LinkedInIcon />,
      url: 'https://www.linkedin.com/school/sgt-university/posts/?feedView=all',
      label: 'LinkedIn',
      color: '#0077B5'
    },
    {
      icon: <InstagramIcon />,
      url: 'https://www.instagram.com/sgtuniversity/',
      label: 'Instagram',
      color: '#E4405F'
    },
    {
      icon: <YouTubeIcon />,
      url: 'https://www.youtube.com/@SGTUniversityGurgaonNCR',
      label: 'YouTube',
      color: '#FF0000'
    },
    {
      icon: <TwitterIcon />,
      url: 'https://x.com/SGTUniversity',
      label: 'Twitter',
      color: '#1DA1F2'
    }
  ];

  const navigationLinks = [
    { label: 'Dashboard', href: '#', icon: <HomeIcon sx={{ fontSize: 16 }} /> },
    { label: 'Courses', href: '#', icon: <BookIcon sx={{ fontSize: 16 }} /> },
    { label: 'Contact', href: '#', icon: <ContactIcon sx={{ fontSize: 16 }} /> },
    { label: 'About Us', href: '#', icon: <InfoIcon sx={{ fontSize: 16 }} /> }
  ];

  const supportLinks = [
    { label: 'Help Center', href: '#', icon: <HelpIcon sx={{ fontSize: 16 }} /> },
    { label: 'Privacy Policy', href: '#', icon: <SecurityIcon sx={{ fontSize: 16 }} /> },
    { label: 'Terms of Service', href: '#', icon: <PolicyIcon sx={{ fontSize: 16 }} /> }
  ];

  return (
    <Box
      component="footer"
      role="contentinfo"
      aria-label="Footer"
      sx={{
        backgroundColor: theme.palette.primary.dark || '#011f4b', // primary-900
        color: theme.palette.secondary.light || '#b3cde0', // primary-100
        width: '100%',
        mt: 'auto',
        pt: { xs: 4, md: 6 },
        pb: 2,
        boxShadow: `0 -4px 20px rgba(0, 91, 150, 0.15)`,
        // Position footer to start after sidebar on desktop
        ml: { xs: 0, md: '280px' }, // Margin left equal to sidebar width
        maxWidth: { xs: '100%', md: 'calc(100% - 280px)' }, // Reduce width by sidebar width
      }}
    >
      <Container maxWidth="lg">
        {/* Main Footer Content */}
        <Grid container spacing={4} sx={{ mb: 4 }}>
          {/* Branding Section */}
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <img
                  src={sgtLogo}
                  alt="SGT University Logo"
                  style={{
                    width: 150,
                    height: 'auto',
                    filter: 'brightness(1.1)',
                    objectFit: 'contain',
                  }}
                />
              </Box>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: '#b3cde0',
                  fontWeight: 600,
                  mb: 1,
                  letterSpacing: 0.5
                }}
              >
                SGT University LMS
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#6497b1', // primary-300
                  lineHeight: 1.6,
                  maxWidth: 280
                }}
              >
                Empowering education through innovative learning management solutions. 
                Excellence in Education • Innovation in Learning • Future in Making
              </Typography>
            </Box>
          </Grid>

          {/* Navigation Links */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography 
              variant="h6" 
              sx={{ 
                color: '#b3cde0',
                fontWeight: 600,
                mb: 2,
                fontSize: '1.1rem'
              }}
            >
              Navigation
            </Typography>
            <Stack spacing={1.5}>
              {navigationLinks.map((link, index) => (
                <Link
                  key={index}
                  href={link.href}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: '#6497b1', // primary-300
                    textDecoration: 'none',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      color: '#b3cde0', // primary-100
                      transform: 'translateX(4px)',
                    },
                    '&:focus-visible': {
                      outline: `2px solid #b3cde0`,
                      outlineOffset: '2px',
                      borderRadius: 1,
                    }
                  }}
                  aria-label={link.label}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </Stack>
          </Grid>

          {/* Support Links */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography 
              variant="h6" 
              sx={{ 
                color: '#b3cde0',
                fontWeight: 600,
                mb: 2,
                fontSize: '1.1rem'
              }}
            >
              Support
            </Typography>
            <Stack spacing={1.5}>
              {supportLinks.map((link, index) => (
                <Link
                  key={index}
                  href={link.href}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: '#6497b1', // primary-300
                    textDecoration: 'none',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      color: '#b3cde0', // primary-100
                      transform: 'translateX(4px)',
                    },
                    '&:focus-visible': {
                      outline: `2px solid #b3cde0`,
                      outlineOffset: '2px',
                      borderRadius: 1,
                    }
                  }}
                  aria-label={link.label}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </Stack>
          </Grid>

          {/* Social Media */}
          <Grid item xs={12} md={2}>
            <Typography 
              variant="h6" 
              sx={{ 
                color: '#b3cde0',
                fontWeight: 600,
                mb: 2,
                fontSize: '1.1rem'
              }}
            >
              Connect
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {socialLinks.map((social, index) => (
                <IconButton
                  key={index}
                  component="a"
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  sx={{
                    color: '#6497b1', // primary-300
                    backgroundColor: 'rgba(100, 151, 177, 0.1)', // primary-300 with opacity
                    border: '1px solid rgba(100, 151, 177, 0.2)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      backgroundColor: social.color,
                      color: '#ffffff',
                      transform: 'translateY(-2px) scale(1.05)',
                      boxShadow: `0 8px 20px ${social.color}40`,
                      borderColor: social.color,
                    },
                    '&:focus-visible': {
                      outline: `2px solid #b3cde0`,
                      outlineOffset: '2px',
                    },
                    '&:active': {
                      transform: 'translateY(0) scale(0.95)',
                    }
                  }}
                >
                  {social.icon}
                </IconButton>
              ))}
            </Box>
          </Grid>
        </Grid>

        {/* Divider */}
        <Divider 
          sx={{ 
            borderColor: '#6497b1', // primary-300
            opacity: 0.3,
            mb: 3
          }} 
        />

        {/* Bottom Bar */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'center', sm: 'center' },
            gap: 2,
            pt: 2
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#6497b1', // primary-300
              fontSize: '0.9rem',
              fontWeight: 500,
              textAlign: { xs: 'center', sm: 'left' }
            }}
          >
            © {currentYear} SGT University LMS. All rights reserved.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {socialLinks.map((social, index) => (
              <IconButton
                key={`bottom-${index}`}
                component="a"
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${social.label} - Footer`}
                size="small"
                sx={{
                  color: '#6497b1', // primary-300
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    color: '#b3cde0', // primary-100
                    transform: 'scale(1.1)',
                  },
                  '&:focus-visible': {
                    outline: `1px solid #b3cde0`,
                    outlineOffset: '2px',
                  }
                }}
              >
                {social.icon}
              </IconButton>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
