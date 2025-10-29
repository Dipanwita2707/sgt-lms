import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  IconButton
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Save as SaveIcon,
  RestartAlt as ResetIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import axios from 'axios';

const QuizConfigurationDialog = ({ open, onClose, courseId, unitId, unitTitle, sections = [], userRole = 'teacher' }) => {
  const [configurations, setConfigurations] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedSection, setExpandedSection] = useState(false);

  useEffect(() => {
    if (open && courseId && unitId && sections.length > 0) {
      fetchConfigurations();
    }
  }, [open, courseId, unitId, sections]);

  const fetchConfigurations = async () => {
    setLoading(true);
    setError('');
    
    try {
      const configPromises = sections.map(section =>
        axios.get(
          `/api/quiz-configuration/${courseId}/${section._id}/${unitId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        ).catch(err => {
          console.error(`Error fetching config for section ${section.name}:`, err);
          return {
            data: {
              timeLimit: 30,
              numberOfQuestions: 10,
              passingPercentage: 40,
              maxAttempts: 3,
              shuffleQuestions: true,
              showResultsImmediately: true,
              isDefault: true
            }
          };
        })
      );

      const results = await Promise.all(configPromises);
      
      const configsMap = {};
      sections.forEach((section, index) => {
        configsMap[section._id] = results[index].data;
      });
      
      setConfigurations(configsMap);
    } catch (err) {
      console.error('Error fetching configurations:', err);
      setError('Failed to load quiz configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (sectionId, field, value) => {
    setConfigurations(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [field]: value
      }
    }));
    setSuccess('');
  };

  const handleSave = async (sectionId) => {
    const config = configurations[sectionId];
    
    // Validation
    if (config.timeLimit < 5 || config.timeLimit > 180) {
      setError('Time limit must be between 5 and 180 minutes');
      return;
    }
    if (config.numberOfQuestions < 1 || config.numberOfQuestions > 50) {
      setError('Number of questions must be between 1 and 50');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(
        `/api/quiz-configuration/${courseId}/${sectionId}/${unitId}`,
        {
          timeLimit: Number(config.timeLimit),
          numberOfQuestions: Number(config.numberOfQuestions),
          passingPercentage: Number(config.passingPercentage),
          maxAttempts: Number(config.maxAttempts),
          shuffleQuestions: config.shuffleQuestions,
          showResultsImmediately: config.showResultsImmediately
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      setSuccess(`Configuration saved for ${sections.find(s => s._id === sectionId)?.name || 'section'}!`);
      
      // Refresh configurations
      await fetchConfigurations();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving configuration:', err);
      setError(err.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (sectionId) => {
    if (!window.confirm('Reset to default settings (30 min, 10 questions)?')) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await axios.delete(
        `/api/quiz-configuration/${courseId}/${sectionId}/${unitId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      setSuccess(`Configuration reset for ${sections.find(s => s._id === sectionId)?.name || 'section'}!`);
      
      // Refresh configurations
      await fetchConfigurations();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error resetting configuration:', err);
      setError(err.response?.data?.message || 'Failed to reset configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon color="primary" />
            <Typography variant="h6">Quiz Settings - {unitTitle}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
                {success}
              </Alert>
            )}

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Default Settings:</strong> 30 minutes, 10 questions. Configure specific settings for each section below.
              </Typography>
            </Alert>

            {sections.map((section) => {
              const config = configurations[section._id] || {};
              const isDefault = config.isDefault;

              return (
                <Accordion
                  key={section._id}
                  expanded={expandedSection === section._id}
                  onChange={(e, isExpanded) => setExpandedSection(isExpanded ? section._id : false)}
                  sx={{ mb: 1 }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {section.name}
                      </Typography>
                      {isDefault ? (
                        <Chip
                          icon={<WarningIcon />}
                          label="Using Defaults"
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          icon={<CheckIcon />}
                          label={`${config.timeLimit}min / ${config.numberOfQuestions}Q`}
                          size="small"
                          color="success"
                        />
                      )}
                    </Box>
                  </AccordionSummary>

                  <AccordionDetails>
                    <Grid container spacing={2}>
                      {/* Time Limit */}
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Time Limit (minutes)"
                          type="number"
                          fullWidth
                          size="small"
                          value={config.timeLimit || 30}
                          onChange={(e) => handleConfigChange(section._id, 'timeLimit', e.target.value)}
                          InputProps={{ inputProps: { min: 5, max: 180 } }}
                          helperText="5-180 minutes"
                        />
                      </Grid>

                      {/* Number of Questions */}
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Number of Questions"
                          type="number"
                          fullWidth
                          size="small"
                          value={config.numberOfQuestions || 10}
                          onChange={(e) => handleConfigChange(section._id, 'numberOfQuestions', e.target.value)}
                          InputProps={{ inputProps: { min: 1, max: 50 } }}
                          helperText="1-50 questions"
                        />
                      </Grid>

                      {/* Passing Percentage */}
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Passing Percentage (%)"
                          type="number"
                          fullWidth
                          size="small"
                          value={config.passingPercentage || 40}
                          onChange={(e) => handleConfigChange(section._id, 'passingPercentage', e.target.value)}
                          InputProps={{ inputProps: { min: 0, max: 100 } }}
                          helperText="0-100%"
                        />
                      </Grid>

                      {/* Max Attempts */}
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Max Attempts"
                          type="number"
                          fullWidth
                          size="small"
                          value={config.maxAttempts || 3}
                          onChange={(e) => handleConfigChange(section._id, 'maxAttempts', e.target.value)}
                          InputProps={{ inputProps: { min: 1, max: 10 } }}
                          helperText="1-10 attempts"
                        />
                      </Grid>

                      {/* Shuffle Questions */}
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={config.shuffleQuestions !== undefined ? config.shuffleQuestions : true}
                              onChange={(e) => handleConfigChange(section._id, 'shuffleQuestions', e.target.checked)}
                              color="primary"
                            />
                          }
                          label="Shuffle Questions"
                        />
                      </Grid>

                      {/* Show Results Immediately */}
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={config.showResultsImmediately !== undefined ? config.showResultsImmediately : true}
                              onChange={(e) => handleConfigChange(section._id, 'showResultsImmediately', e.target.checked)}
                              color="primary"
                            />
                          }
                          label="Show Results Immediately"
                        />
                      </Grid>

                      {/* Info Box */}
                      {!isDefault && config.updatedBy && (
                        <Grid item xs={12}>
                          <Box sx={{ p: 1.5, bgcolor: 'rgba(25, 118, 210, 0.08)', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Last updated by: <strong>{config.updatedBy?.name}</strong> ({config.updatedBy?.role})
                              {config.updatedAt && ` on ${new Date(config.updatedAt).toLocaleString()}`}
                            </Typography>
                          </Box>
                        </Grid>
                      )}

                      {/* Action Buttons */}
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<ResetIcon />}
                            onClick={() => handleReset(section._id)}
                            disabled={saving || isDefault}
                          >
                            Reset
                          </Button>
                          <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            startIcon={<SaveIcon />}
                            onClick={() => handleSave(section._id)}
                            disabled={saving}
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuizConfigurationDialog;
