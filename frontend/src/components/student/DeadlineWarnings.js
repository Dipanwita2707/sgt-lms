import React, { useState, useEffect } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Warning,
  Schedule,
  Close,
  ExpandMore,
  ExpandLess,
  Assignment
} from '@mui/icons-material';
import { getDeadlineWarnings, markDeadlineWarningSeen } from '../../api/studentVideoApi';

const DeadlineWarnings = ({ courseId }) => {
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [dismissedWarnings, setDismissedWarnings] = useState(new Set());

  useEffect(() => {
    const fetchWarnings = async () => {
      if (!courseId) return;
      
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await getDeadlineWarnings(courseId, token);
          setWarnings(response.warnings || []);
        }
      } catch (error) {
        console.error('Error fetching deadline warnings:', error);
        setWarnings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWarnings();
  }, [courseId]);

  const handleDismissWarning = async (unitId) => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await markDeadlineWarningSeen(courseId, unitId, token);
        setDismissedWarnings(prev => new Set([...prev, unitId]));
      }
    } catch (error) {
      console.error('Error dismissing warning:', error);
    }
  };

  const formatTimeLeft = (daysLeft) => {
    if (daysLeft <= 0) {
      return 'Deadline passed';
    } else if (daysLeft === 1) {
      return '1 day left';
    } else {
      return `${daysLeft} days left`;
    }
  };

  const getWarningColor = (daysLeft) => {
    if (daysLeft <= 0) return 'error';
    if (daysLeft <= 2) return 'error';
    if (daysLeft <= 5) return 'warning';
    return 'info';
  };

  const getWarningMessage = (daysLeft) => {
    if (daysLeft <= 0) {
      return 'This unit is no longer accessible due to expired deadline.';
    }
    return 'Complete this unit before the deadline to ensure your progress is counted.';
  };

  const visibleWarnings = warnings.filter(warning => !dismissedWarnings.has(warning.unitId));

  if (loading || visibleWarnings.length === 0) {
    return null;
  }

  return (
    <Card sx={{ mb: 3, border: '2px solid', borderColor: 'warning.main' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="warning" />
            <Typography variant="h6" color="warning.main">
              Unit Deadlines Approaching
            </Typography>
            <Chip 
              label={visibleWarnings.length} 
              color="warning" 
              size="small" 
            />
          </Box>
          <IconButton 
            onClick={() => setExpanded(!expanded)}
            sx={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }}
          >
            <ExpandMore />
          </IconButton>
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {visibleWarnings.some(w => w.daysLeft <= 0) 
                ? 'Some units have expired deadlines and are no longer accessible.'
                : 'Complete these units before their deadlines to ensure your progress is counted.'
              }
            </Typography>
            
            <List dense>
              {visibleWarnings.map((warning, index) => (
                <Box key={warning.unitId}>
                  <ListItem
                    sx={{
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      mb: 1,
                      border: 1,
                      borderColor: getWarningColor(warning.daysLeft) + '.light'
                    }}
                  >
                    <ListItemIcon>
                      <Assignment color={getWarningColor(warning.daysLeft)} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" component="span">
                            {warning.unitTitle}
                          </Typography>
                          <Chip
                            icon={<Schedule />}
                            label={formatTimeLeft(warning.daysLeft)}
                            color={getWarningColor(warning.daysLeft)}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Deadline: {new Date(warning.deadline).toLocaleDateString()} at{' '}
                            {new Date(warning.deadline).toLocaleTimeString()}
                          </Typography>
                          {warning.deadlineDescription && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {warning.deadlineDescription}
                            </Typography>
                          )}
                          <Typography variant="body2" color={getWarningColor(warning.daysLeft) + '.main'} sx={{ mt: 0.5 }}>
                            {getWarningMessage(warning.daysLeft)}
                          </Typography>
                        </Box>
                      }
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleDismissWarning(warning.unitId)}
                      sx={{ ml: 1 }}
                    >
                      <Close />
                    </IconButton>
                  </ListItem>
                  {index < visibleWarnings.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default DeadlineWarnings;