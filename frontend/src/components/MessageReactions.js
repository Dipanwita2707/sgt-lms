import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Popover,
  Typography,
  Tooltip,
  Chip,
  Grid,
  Zoom,
  alpha
} from '@mui/material';
import {
  ThumbUp as ThumbUpIcon,
  Favorite as FavoriteIcon,
  SentimentSatisfied as LaughIcon,
  SentimentDissatisfied as SadIcon,
  LocalFireDepartment as FireIcon,
  Star as StarIcon,
  CheckCircle as CheckIcon,
  Cancel as DislikeIcon
} from '@mui/icons-material';
import { styled, keyframes } from '@mui/material/styles';

const bounce = keyframes`
  0%, 20%, 60%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  80% { transform: translateY(-5px); }
`;

const ReactionButton = styled(IconButton)(({ theme, selected }) => ({
  width: 48,
  height: 48,
  margin: theme.spacing(0.5),
  borderRadius: '50%',
  backgroundColor: selected ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
  border: selected ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
  transition: 'all 0.2s ease',
  animation: selected ? `${bounce} 0.6s ease` : 'none',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    transform: 'scale(1.1)',
  },
}));

const ReactionChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.25),
  borderRadius: 16,
  fontSize: '0.75rem',
  height: 24,
  '& .MuiChip-label': {
    paddingLeft: 6,
    paddingRight: 6,
  },
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
  },
}));

const MessageReactions = ({ 
  messageId, 
  reactions = {}, 
  currentUserId, 
  onAddReaction, 
  onRemoveReaction 
}) => {
  const [anchorEl, setAnchorEl] = useState(null);

  const reactionTypes = [
    { type: '👍', icon: ThumbUpIcon, label: 'Like', color: '#2196f3' },
    { type: '❤️', icon: FavoriteIcon, label: 'Love', color: '#f44336' },
    { type: '😂', icon: LaughIcon, label: 'Laugh', color: '#ff9800' },
    { type: '😢', icon: SadIcon, label: 'Sad', color: '#607d8b' },
    { type: '🔥', icon: FireIcon, label: 'Fire', color: '#ff5722' },
    { type: '⭐', icon: StarIcon, label: 'Star', color: '#ffc107' },
    { type: '✅', icon: CheckIcon, label: 'Agree', color: '#4caf50' },
    { type: '👎', icon: DislikeIcon, label: 'Dislike', color: '#757575' },
  ];

  const handleReactionClick = (reactionType) => {
    const userReactions = reactions[reactionType] || [];
    const hasReacted = userReactions.some(r => r.userId === currentUserId);

    if (hasReacted) {
      onRemoveReaction(messageId, reactionType);
    } else {
      onAddReaction(messageId, reactionType);
    }
    
    setAnchorEl(null);
  };

  const getTotalReactions = () => {
    return Object.values(reactions).reduce((total, reactionList) => total + reactionList.length, 0);
  };

  const getUserReactionTypes = () => {
    const userReactions = [];
    Object.entries(reactions).forEach(([type, users]) => {
      if (users.some(user => user.userId === currentUserId)) {
        userReactions.push(type);
      }
    });
    return userReactions;
  };

  return (
    <Box sx={{ mt: 0.5 }}>
      {/* Existing reactions display */}
      {getTotalReactions() > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
          {Object.entries(reactions).map(([reactionType, users]) => 
            users.length > 0 && (
              <Zoom in key={reactionType} timeout={200}>
                <ReactionChip
                  label={`${reactionType} ${users.length}`}
                  size="small"
                  clickable
                  onClick={() => handleReactionClick(reactionType)}
                  variant={users.some(user => user.userId === currentUserId) ? "filled" : "outlined"}
                  color={users.some(user => user.userId === currentUserId) ? "primary" : "default"}
                />
              </Zoom>
            )
          )}
        </Box>
      )}

      {/* Add reaction button */}
      <Tooltip title="Add reaction">
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            fontSize: '0.875rem',
            opacity: 0.6,
            transition: 'opacity 0.2s',
            '&:hover': { opacity: 1 }
          }}
        >
          😊➕
        </IconButton>
      </Tooltip>

      {/* Reaction picker popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            p: 1,
            minWidth: 280
          }
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1, px: 1, color: 'text.secondary' }}>
          Choose a reaction
        </Typography>
        <Grid container spacing={0.5}>
          {reactionTypes.map((reaction) => {
            const hasReacted = reactions[reaction.type]?.some(r => r.userId === currentUserId);
            const Icon = reaction.icon;
            
            return (
              <Grid item key={reaction.type}>
                <Tooltip title={reaction.label} arrow>
                  <ReactionButton
                    selected={hasReacted}
                    onClick={() => handleReactionClick(reaction.type)}
                    sx={{
                      color: hasReacted ? reaction.color : 'text.secondary',
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography sx={{ fontSize: '1.2rem', mb: -0.5 }}>
                        {reaction.type}
                      </Typography>
                      <Icon sx={{ fontSize: 12, opacity: 0.7 }} />
                    </Box>
                  </ReactionButton>
                </Tooltip>
              </Grid>
            );
          })}
        </Grid>
        
        {getUserReactionTypes().length > 0 && (
          <Box sx={{ mt: 1, px: 1, borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Your reactions: {getUserReactionTypes().join(' ')}
            </Typography>
          </Box>
        )}
      </Popover>
    </Box>
  );
};

export default MessageReactions;