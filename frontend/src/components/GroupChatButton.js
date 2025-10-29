import React from 'react';
import { Button } from '@mui/material';
import { Chat as ChatIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const GroupChatButton = ({ courseId, sectionId, variant = 'contained', size = 'medium', sx = {} }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/group-chat/${courseId}/${sectionId}`);
  };

  const colors = {
    primary: '#395a7f', // YInMn Blue
    secondary: '#6e9fc1', // Air superiority blue
  };

  return (
    <Button
      variant={variant}
      size={size}
      startIcon={<ChatIcon />}
      onClick={handleClick}
      sx={{
        bgcolor: colors.primary,
        color: 'white',
        '&:hover': {
          bgcolor: colors.secondary,
        },
        ...sx
      }}
    >
      Group Chat
    </Button>
  );
};

export default GroupChatButton;