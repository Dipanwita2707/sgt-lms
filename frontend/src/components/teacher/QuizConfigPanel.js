import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Grid,
  Alert,
  Chip,
  Divider,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  RestartAlt as ResetIcon,
  Schedule as ScheduleIcon,
  Quiz as QuizIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import axios from 'axios';

const QuizConfigPanel = ({ courseId, sectionId, unitId, unitTitle }) => {
  const [config, setConfig] = useState({
    timeLimit: 30,
    numberOfQuestions: 10,
    passingPercentage: 40,
    maxAttempts: 3,
    shuffleQuestions: true,
    showResultsImmediately: true,
    isDefault: true
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [configInfo, setConfigInfo] = useState(null);

  useEffect(() => {
    fetchConfiguration();
  }, [courseId, sectionId, unitId]);

  const fetchConfiguration = async () => {
    if (!courseId || !sectionId || !unitId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(
        `/api/quiz-configuration/${courseId}/${sectionId}/${unitId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      setConfig(response.data);
      if (!response.data.isDefault) {
        setConfigInfo(response.data);
      }
    } catch (error) {
      console.error('Error fetching quiz configuration:', error);
      setError('Failed to load quiz configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setSuccess('');
  };

  const handleSave = async () => {
    // Validation
    if (config.timeLimit < 5 || config.timeLimit > 180) {
      setError('Time limit must be between 5 and 180 minutes');
      return;
    }
    if (config.numberOfQuestions < 1 || config.numberOfQuestions > 50) {
      setError('Number of questions must be between 1 and 50');
      return;
    }
    if (config.passingPercentage < 0 || config.passingPercentage > 100) {
      setError('Passing percentage must be between 0 and 100');
      return;
    }
    if (config.maxAttempts < 1 || config.maxAttempts > 10) {
      setError('Max attempts must be between 1 and 10');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(
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

      setSuccess(response.data.message || 'Configuration saved successfully!');
      setConfig({ ...response.data.config, isDefault: false });
      setConfigInfo(response.data.config);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving configuration:', error);
      setError(error.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset to default settings?')) {
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

      setConfig({
        timeLimit: 30,
        numberOfQuestions: 10,
        passingPercentage: 40,
        maxAttempts: 3,
        shuffleQuestions: true,
        showResultsImmediately: true,
        isDefault: true
      });
      setConfigInfo(null);
      setSuccess('Configuration reset to default successfully!');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error resetting configuration:', error);
      setError(error.response?.data?.message || 'Failed to reset configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SettingsIcon sx={{ mr: 1, color: '#1976d2' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1976d2' }}>
            Quiz Configuration - {unitTitle}
          </Typography>
          {config.isDefault && (
            <Chip
              label="Using Defaults"
              size="small"
              color="warning"
              sx={{ ml: 2 }}
            />
          )}
          {!config.isDefault && (
            <Chip
              label="Configured"
              size="small"
              color="success"
              icon={<CheckIcon />}
              sx={{ ml: 2 }}
            />
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

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

        <Grid container spacing={3}>
          {/* Time Limit */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Time Limit (minutes)"
              type="number"
              fullWidth
              value={config.timeLimit}
              onChange={(e) => handleChange('timeLimit', e.target.value)}
              InputProps={{
                inputProps: { min: 5, max: 180 },
                startAdornment: <ScheduleIcon sx={{ mr: 1, color: '#1976d2' }} />
              }}
              helperText="5-180 minutes"
            />
          </Grid>

          {/* Number of Questions */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Number of Questions"
              type="number"
              fullWidth
              value={config.numberOfQuestions}
              onChange={(e) => handleChange('numberOfQuestions', e.target.value)}
              InputProps={{
                inputProps: { min: 1, max: 50 },
                startAdornment: <QuizIcon sx={{ mr: 1, color: '#1976d2' }} />
              }}
              helperText="1-50 questions"
            />
          </Grid>

          {/* Passing Percentage */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Passing Percentage (%)"
              type="number"
              fullWidth
              value={config.passingPercentage}
              onChange={(e) => handleChange('passingPercentage', e.target.value)}
              InputProps={{
                inputProps: { min: 0, max: 100 }
              }}
              helperText="0-100%"
            />
          </Grid>

          {/* Max Attempts */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Max Attempts"
              type="number"
              fullWidth
              value={config.maxAttempts}
              onChange={(e) => handleChange('maxAttempts', e.target.value)}
              InputProps={{
                inputProps: { min: 1, max: 10 }
              }}
              helperText="1-10 attempts"
            />
          </Grid>

          {/* Shuffle Questions */}
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.shuffleQuestions}
                  onChange={(e) => handleChange('shuffleQuestions', e.target.checked)}
                  color="primary"
                />
              }
              label="Shuffle Questions"
            />
            <Typography variant="caption" color="text.secondary" display="block">
              Randomize question order for each student
            </Typography>
          </Grid>

          {/* Show Results Immediately */}
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.showResultsImmediately}
                  onChange={(e) => handleChange('showResultsImmediately', e.target.checked)}
                  color="primary"
                />
              }
              label="Show Results Immediately"
            />
            <Typography variant="caption" color="text.secondary" display="block">
              Students see results right after quiz completion
            </Typography>
          </Grid>
        </Grid>

        {/* Configuration Info */}
        {configInfo && !config.isDefault && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(25, 118, 210, 0.08)', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Last updated by: <strong>{configInfo.updatedBy?.name || configInfo.createdBy?.name}</strong>
              {' '}({configInfo.updatedBy?.role || configInfo.createdBy?.role})
              {configInfo.updatedAt && ` on ${new Date(configInfo.updatedAt).toLocaleString()}`}
            </Typography>
          </Box>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<ResetIcon />}
            onClick={handleReset}
            disabled={saving || config.isDefault}
          >
            Reset to Default
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default QuizConfigPanel;
