import React from 'react';
import { Button, Tooltip, alpha } from '@mui/material';
import { Chat as ChatIcon, Star as StarIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { styled, keyframes } from '@mui/material/styles';

const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

const StyledButton = styled(Button)(({ theme, enhanced }) => ({
  background: enhanced 
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    : theme.palette.primary.main,
  color: 'white',
  borderRadius: '12px',
  padding: theme.spacing(1, 2),
  textTransform: 'none',
  fontWeight: 600,
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s ease',
  boxShadow: enhanced 
    ? '0 4px 15px rgba(102, 126, 234, 0.4)'
    : theme.shadows[2],
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: enhanced 
      ? '0 8px 25px rgba(102, 126, 234, 0.6)'
      : theme.shadows[4],
    background: enhanced
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      : theme.palette.primary.dark,
  },
  '&:before': enhanced ? {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-200px',
    width: '200px',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
    animation: `${shimmer} 2s infinite`,
  } : {},
  '& .MuiButton-startIcon': {
    marginRight: theme.spacing(1),
  }
}));

const EnhancedGroupChatButton = ({ 
  courseId, 
  sectionId, 
  variant = 'enhanced', 
  size = 'medium', 
  sx = {},
  children,
  ...props 
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    const route = variant === 'enhanced' 
      ? `/group-chat-enhanced/${courseId}/${sectionId}`
      : `/group-chat/${courseId}/${sectionId}`;
    navigate(route);
  };

  const isEnhanced = variant === 'enhanced';

  return (
    <Tooltip 
      title={isEnhanced ? "Open Enhanced Group Chat" : "Open Group Chat"}
      arrow
      placement="top"
    >
      <StyledButton
        enhanced={isEnhanced}
        size={size}
        startIcon={
          isEnhanced ? (
            <StarIcon sx={{ animation: 'spin 4s linear infinite' }} />
          ) : (
            <ChatIcon />
          )
        }
        onClick={handleClick}
        sx={sx}
        {...props}
      >
        {children || (isEnhanced ? 'Enhanced Chat' : 'Group Chat')}
      </StyledButton>
    </Tooltip>
  );
};

export default EnhancedGroupChatButton;