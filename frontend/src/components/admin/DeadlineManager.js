import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Box,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Extension as ExtensionIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';

const DeadlineManager = ({ courseId, units, onDeadlineUpdate }) => {
  const [open, setOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [deadlineData, setDeadlineData] = useState({
    hasDeadline: false,
    deadline: null,
    deadlineDescription: '',
    strictDeadline: true,
    warningDays: 3
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [action, setAction] = useState('add'); // 'add', 'modify', 'extend', 'remove'

  const handleOpenDialog = (unit, actionType = 'modify') => {
    setSelectedUnit(unit);
    setAction(actionType);
    setDeadlineData({
      hasDeadline: unit.hasDeadline || false,
      deadline: unit.deadline ? new Date(unit.deadline) : new Date(),
      deadlineDescription: unit.deadlineDescription || '',
      strictDeadline: unit.strictDeadline !== undefined ? unit.strictDeadline : true,
      warningDays: unit.warningDays || 3
    });
    setOpen(true);
    setError('');
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setSelectedUnit(null);
    setError('');
  };

  const handleSubmit = async () => {
    if (!selectedUnit) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const updateData = {
        ...deadlineData,
        action: action,
        deadline: deadlineData.deadline ? deadlineData.deadline.toISOString() : null
      };

      const response = await axios.patch(
        `/api/admin/unit/${selectedUnit._id}/deadline`,
        updateData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('Deadline update response:', response.data);
      
      // Notify parent component to refresh unit list
      if (onDeadlineUpdate) {
        onDeadlineUpdate();
      }

      handleCloseDialog();
    } catch (err) {
      console.error('Error updating deadline:', err);
      setError(err.response?.data?.message || 'Failed to update deadline');
    } finally {
      setLoading(false);
    }
  };

  const getDeadlineStatus = (unit) => {
    if (!unit.hasDeadline || !unit.deadline) {
      return { status: 'none', color: 'default', text: 'No Deadline' };
    }

    const now = new Date();
    const deadline = new Date(unit.deadline);
    const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      return { status: 'expired', color: 'error', text: 'Expired' };
    } else if (daysRemaining <= unit.warningDays) {
      return { status: 'warning', color: 'warning', text: `${daysRemaining} days left` };
    } else {
      return { status: 'active', color: 'success', text: `${daysRemaining} days left` };
    }
  };

  const formatDeadlineDate = (dateString) => {
    if (!dateString) return 'No deadline set';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
  };

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <ScheduleIcon sx={{ mr: 1 }} />
          Deadline Management
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Manage deadlines for all units in this course. You can add, modify, extend, or remove deadlines.
        </Typography>

        <List>
          {units.map((unit) => {
            const deadlineStatus = getDeadlineStatus(unit);
            return (
              <ListItem key={unit._id} divider>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle1">{unit.title}</Typography>
                      <Chip
                        size="small"
                        label={deadlineStatus.text}
                        color={deadlineStatus.color}
                        icon={
                          deadlineStatus.status === 'expired' ? <WarningIcon /> :
                          deadlineStatus.status === 'active' ? <CheckCircleIcon /> : 
                          <ScheduleIcon />
                        }
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2">
                        Deadline: {formatDeadlineDate(unit.deadline)}
                      </Typography>
                      {unit.deadlineDescription && (
                        <Typography variant="body2" color="text.secondary">
                          {unit.deadlineDescription}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box display="flex" gap={1}>
                    {!unit.hasDeadline ? (
                      <Tooltip title="Add Deadline">
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenDialog(unit, 'add')}
                        >
                          <AddIcon />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <>
                        <Tooltip title="Modify Deadline">
                          <IconButton
                            color="primary"
                            onClick={() => handleOpenDialog(unit, 'modify')}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Extend Deadline">
                          <IconButton
                            color="warning"
                            onClick={() => handleOpenDialog(unit, 'extend')}
                          >
                            <ExtensionIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove Deadline">
                          <IconButton
                            color="error"
                            onClick={() => handleOpenDialog(unit, 'remove')}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>

        {/* Deadline Management Dialog */}
        <Dialog open={open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {action === 'add' && 'Add Deadline'}
            {action === 'modify' && 'Modify Deadline'}
            {action === 'extend' && 'Extend Deadline'}
            {action === 'remove' && 'Remove Deadline'}
            {selectedUnit && `: ${selectedUnit.title}`}
          </DialogTitle>
          
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {action === 'remove' ? (
              <Typography>
                Are you sure you want to remove the deadline from this unit? 
                Students will no longer be restricted by deadline enforcement.
              </Typography>
            ) : (
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={deadlineData.hasDeadline}
                          onChange={(e) => setDeadlineData({
                            ...deadlineData,
                            hasDeadline: e.target.checked
                          })}
                        />
                      }
                      label="Enable Deadline"
                    />
                  </Grid>

                  {deadlineData.hasDeadline && (
                    <>
                      <Grid item xs={12}>
                        <DateTimePicker
                          label="Deadline Date & Time"
                          value={deadlineData.deadline}
                          onChange={(newValue) => setDeadlineData({
                            ...deadlineData,
                            deadline: newValue
                          })}
                          renderInput={(params) => (
                            <TextField {...params} fullWidth required />
                          )}
                          minDateTime={action === 'extend' ? undefined : new Date()}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Deadline Description"
                          placeholder="e.g., Final submission deadline for Unit 1"
                          value={deadlineData.deadlineDescription}
                          onChange={(e) => setDeadlineData({
                            ...deadlineData,
                            deadlineDescription: e.target.value
                          })}
                          multiline
                          rows={2}
                        />
                      </Grid>

                      <Grid item xs={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={deadlineData.strictDeadline}
                              onChange={(e) => setDeadlineData({
                                ...deadlineData,
                                strictDeadline: e.target.checked
                              })}
                            />
                          }
                          label="Strict Deadline"
                        />
                        <Typography variant="caption" display="block" color="text.secondary">
                          If enabled, access will be completely blocked after deadline
                        </Typography>
                      </Grid>

                      <Grid item xs={6}>
                        <FormControl fullWidth>
                          <InputLabel>Warning Days</InputLabel>
                          <Select
                            value={deadlineData.warningDays}
                            label="Warning Days"
                            onChange={(e) => setDeadlineData({
                              ...deadlineData,
                              warningDays: e.target.value
                            })}
                          >
                            <MenuItem value={1}>1 day</MenuItem>
                            <MenuItem value={2}>2 days</MenuItem>
                            <MenuItem value={3}>3 days</MenuItem>
                            <MenuItem value={5}>5 days</MenuItem>
                            <MenuItem value={7}>7 days</MenuItem>
                          </Select>
                        </FormControl>
                        <Typography variant="caption" display="block" color="text.secondary">
                          Show warnings this many days before deadline
                        </Typography>
                      </Grid>
                    </>
                  )}
                </Grid>
              </LocalizationProvider>
            )}
          </DialogContent>

          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
              color={action === 'remove' ? 'error' : 'primary'}
            >
              {loading ? 'Processing...' : 
               action === 'add' ? 'Add Deadline' :
               action === 'modify' ? 'Update Deadline' :
               action === 'extend' ? 'Extend Deadline' :
               'Remove Deadline'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default DeadlineManager;