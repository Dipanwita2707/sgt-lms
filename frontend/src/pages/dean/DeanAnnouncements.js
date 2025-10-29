import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  InputLabel,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
  School as SchoolIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Class as ClassIcon
} from '@mui/icons-material';
import axios from 'axios';
import CrossSchoolApprovalBoard from '../../components/dean/CrossSchoolApprovalBoard';

const DeanAnnouncements = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState(null);
  const [mainTab, setMainTab] = useState(0); // 0 = Create Announcements, 1 = Cross-School Approvals
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    schoolScope: 'mySchool', // 'mySchool' or 'otherSchools'
    targetRoles: [],
    targetSchools: [],
    teachers: [],
    hods: [],
    sections: []
  });

  // UI state
  const [selectedTab, setSelectedTab] = useState(0);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');

  // Load announcement options when dialog opens
  const loadOptions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/dean/announcement/options');
      setOptions(response.data);
    } catch (error) {
      console.error('Error loading announcement options:', error);
      setErrors({ general: 'Failed to load announcement options' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    loadOptions();
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({
      title: '',
      message: '',
      schoolScope: 'mySchool',
      targetRoles: [],
      targetSchools: [],
      teachers: [],
      hods: [],
      sections: []
    });
    setErrors({});
    setSuccess('');
    setSelectedTab(0);
  };

  const handleRoleChange = (role) => {
    const newRoles = formData.targetRoles.includes(role)
      ? formData.targetRoles.filter(r => r !== role)
      : [...formData.targetRoles, role];
    
    setFormData(prev => ({
      ...prev,
      targetRoles: newRoles,
      // Reset selections when roles change
      teachers: [],
      hods: [],
      sections: []
    }));
  };

  const handleDepartmentChange = (deptId) => {
    // Remove this function as departments are no longer used
  };

  const handleTeacherToggle = (teacherId) => {
    const newTeachers = formData.teachers.includes(teacherId)
      ? formData.teachers.filter(t => t !== teacherId)
      : [...formData.teachers, teacherId];
    
    setFormData(prev => ({
      ...prev,
      teachers: newTeachers
    }));
  };

  const handleHODToggle = (hodId) => {
    const newHODs = formData.hods.includes(hodId)
      ? formData.hods.filter(h => h !== hodId)
      : [...formData.hods, hodId];
    
    setFormData(prev => ({
      ...prev,
      hods: newHODs
    }));
  };

  const handleSectionChange = (sectionId) => {
    const newSections = formData.sections.includes(sectionId)
      ? formData.sections.filter(s => s !== sectionId)
      : [...formData.sections, sectionId];
    
    setFormData(prev => ({
      ...prev,
      sections: newSections
    }));
  };

  const handleSchoolChange = (schoolId) => {
    const newSchools = formData.targetSchools.includes(schoolId)
      ? formData.targetSchools.filter(s => s !== schoolId)
      : [...formData.targetSchools, schoolId];
    
    setFormData(prev => ({
      ...prev,
      targetSchools: newSchools
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setErrors({});
      
      if (!formData.title.trim() || !formData.message.trim()) {
        setErrors({ general: 'Title and message are required' });
        return;
      }
      
      if (formData.targetRoles.length === 0) {
        setErrors({ general: 'Please select at least one target role' });
        return;
      }

      const response = await axios.post('/api/dean/announcement', formData);
      setSuccess(`Announcement created successfully! Sent to ${response.data.recipientsCount} recipients.`);
      
      // Close dialog after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
      
    } catch (error) {
      console.error('Error creating announcement:', error);
      setErrors({ 
        general: error.response?.data?.message || 'Failed to create announcement' 
      });
    } finally {
      setLoading(false);
    }
  };

  const getAvailableTeachers = () => {
    if (!options?.mySchool?.teachers) return [];
    return options.mySchool.teachers;
  };

  const getAvailableHODs = () => {
    if (!options?.mySchool?.hods) return [];
    return options.mySchool.hods;
  };

  const getAvailableSections = () => {
    if (!options?.mySchool?.sections) return [];
    return options.mySchool.sections;
  };

  const renderOtherSchoolSelection = () => {
    if (!options?.otherSchools || options.otherSchools.length === 0) {
      return (
        <Alert severity="info" sx={{ mb: 2 }}>
          No other schools available for inter-school announcements.
        </Alert>
      );
    }

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
          🏫 Select Target Schools
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Select schools to send announcement requests to. The target school deans will need to approve before distribution.
        </Typography>
        <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, maxHeight: 250, overflow: 'auto' }}>
          <FormGroup>
            {options.otherSchools.map(school => (
              <FormControlLabel
                key={school._id}
                control={
                  <Checkbox
                    checked={formData.targetSchools.includes(school._id)}
                    onChange={() => handleSchoolChange(school._id)}
                    color="primary"
                  />
                }
                label={school.name}
                sx={{ display: 'block', mb: 1 }}
              />
            ))}
          </FormGroup>
        </Box>
      </Box>
    );
  };

  const renderRoleSelection = () => (
    <Box sx={{ mb: 3 }}>
      <FormControl component="fieldset">
        <FormLabel component="legend" sx={{ fontWeight: 'bold', fontSize: '1.1rem', mb: 1 }}>
          Target Audience (Select one or more)
        </FormLabel>
        <FormGroup row>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.targetRoles.includes('hod')}
                onChange={() => handleRoleChange('hod')}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1, color: '#1976d2' }} />
                HODs (Department Heads)
              </Box>
            }
            sx={{ mr: 3 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.targetRoles.includes('teacher')}
                onChange={() => handleRoleChange('teacher')}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <GroupIcon sx={{ mr: 1, color: '#1976d2' }} />
                Teachers
              </Box>
            }
            sx={{ mr: 3 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.targetRoles.includes('student')}
                onChange={() => handleRoleChange('student')}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ClassIcon sx={{ mr: 1, color: '#1976d2' }} />
                Students
              </Box>
            }
          />
        </FormGroup>
      </FormControl>
    </Box>
  );

  const renderHODSelection = () => {
    const availableHODs = getAvailableHODs();
    
    if (availableHODs.length === 0) {
      return (
        <Alert severity="info" sx={{ mb: 2 }}>
          No HODs available in your school.
        </Alert>
      );
    }

    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
            � Select HODs ({formData.hods.length} of {availableHODs.length} selected)
          </Typography>
          <Box>
            <Button 
              size="small" 
              onClick={() => setFormData(prev => ({ ...prev, hods: availableHODs.map(h => h._id) }))}
              sx={{ mr: 1 }}
            >
              Select All
            </Button>
            <Button 
              size="small" 
              onClick={() => setFormData(prev => ({ ...prev, hods: [] }))}
              color="secondary"
            >
              Clear All
            </Button>
          </Box>
        </Box>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Select individual HODs to receive the announcement. Leave empty to include all HODs.
        </Typography>
        <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, maxHeight: 250, overflow: 'auto' }}>
          {availableHODs.map(hod => (
            <ListItem key={hod._id} dense sx={{ borderBottom: '1px solid #f0f0f0' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.hods.includes(hod._id)}
                    onChange={() => handleHODToggle(hod._id)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {hod.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {hod.email} • {hod.department?.name}
                    </Typography>
                  </Box>
                }
                sx={{ flexGrow: 1, margin: 0 }}
              />
            </ListItem>
          ))}
        </Box>
      </Box>
    );
  };

  const renderTeacherSelection = () => {
    const availableTeachers = getAvailableTeachers();
    
    if (availableTeachers.length === 0) {
      return (
        <Alert severity="info" sx={{ mb: 2 }}>
          No teachers available in your school.
        </Alert>
      );
    }

    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
            👥 Select Teachers ({formData.teachers.length} of {availableTeachers.length} selected)
          </Typography>
          <Box>
            <Button 
              size="small" 
              onClick={() => setFormData(prev => ({ ...prev, teachers: availableTeachers.map(t => t._id) }))}
              sx={{ mr: 1 }}
            >
              Select All
            </Button>
            <Button 
              size="small" 
              onClick={() => setFormData(prev => ({ ...prev, teachers: [] }))}
              color="secondary"
            >
              Clear All
            </Button>
          </Box>
        </Box>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Select individual teachers to receive the announcement. Leave empty to include all teachers.
        </Typography>
        <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, maxHeight: 300, overflow: 'auto' }}>
          {availableTeachers.map(teacher => (
            <ListItem key={teacher._id} dense sx={{ borderBottom: '1px solid #f0f0f0' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.teachers.includes(teacher._id)}
                    onChange={() => handleTeacherToggle(teacher._id)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {teacher.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      ID: {teacher.teacherId} • {teacher.department?.name}
                    </Typography>
                  </Box>
                }
                sx={{ flexGrow: 1, margin: 0 }}
              />
            </ListItem>
          ))}
        </Box>
      </Box>
    );
  };

  const renderSectionSelection = () => {
    const availableSections = getAvailableSections();
    
    if (availableSections.length === 0) {
      return (
        <Alert severity="info" sx={{ mb: 2 }}>
          No sections available in your school.
        </Alert>
      );
    }

    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
            🎓 Select Sections ({formData.sections.length} of {availableSections.length} selected)
          </Typography>
          <Box>
            <Button 
              size="small" 
              onClick={() => setFormData(prev => ({ ...prev, sections: availableSections.map(s => s._id) }))}
              sx={{ mr: 1 }}
            >
              Select All
            </Button>
            <Button 
              size="small" 
              onClick={() => setFormData(prev => ({ ...prev, sections: [] }))}
              color="secondary"
            >
              Clear All
            </Button>
          </Box>
        </Box>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Select specific sections to target students. Leave empty to include all sections.
        </Typography>
        <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, maxHeight: 250, overflow: 'auto' }}>
          <FormGroup>
            {availableSections.map(section => (
              <FormControlLabel
                key={section._id}
                control={
                  <Checkbox
                    checked={formData.sections.includes(section._id)}
                    onChange={() => handleSectionChange(section._id)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {section.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {section.studentCount || 0} students
                    </Typography>
                  </Box>
                }
                sx={{ display: 'block', mb: 1 }}
              />
            ))}
          </FormGroup>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Dean Announcements
        </Typography>
        {mainTab === 0 && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpen}
            sx={{ bgcolor: '#1976d2' }}
          >
            Create Announcement
          </Button>
        )}
      </Box>

      {/* Tabs for Create vs Cross-School Approvals */}
      <Tabs value={mainTab} onChange={(e, newValue) => setMainTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Create Announcements" />
        <Tab label="Cross-School Approvals" />
      </Tabs>

      {/* Tab Content */}
      {mainTab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="body1" color="textSecondary">
              Use the "Create Announcement" button to send targeted announcements to HODs, Teachers, and Students in your school.
              You can select specific departments, individual teachers, and sections for precise targeting.
            </Typography>
          </CardContent>
        </Card>
      )}

      {mainTab === 1 && (
        <CrossSchoolApprovalBoard />
      )}

      {/* Create Announcement Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '70vh' }
        }}
      >
        <DialogTitle>
          Create Dean Announcement
        </DialogTitle>
        <DialogContent>
          {loading && !options ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              {/* Basic Information */}
              <TextField
                fullWidth
                label="Announcement Title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                sx={{ mb: 2 }}
                required
              />
              
              <TextField
                fullWidth
                label="Announcement Message"
                multiline
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                sx={{ mb: 3 }}
                required
              />

              {/* School Scope */}
              <Card sx={{ mb: 3, border: '2px solid #e3f2fd' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                    🏫 School Selection
                  </Typography>
                  <FormControl fullWidth>
                    <InputLabel>Select School Scope</InputLabel>
                    <Select
                      value={formData.schoolScope}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        schoolScope: e.target.value,
                        // Reset selections when scope changes
                        targetRoles: [],
                        departments: [],
                        teachers: [],
                        sections: []
                      }))}
                      label="Select School Scope"
                    >
                      <MenuItem value="mySchool">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <SchoolIcon sx={{ mr: 1 }} />
                          My School
                        </Box>
                      </MenuItem>
                      <MenuItem value="otherSchools">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <SchoolIcon sx={{ mr: 1 }} />
                          Other Schools
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>

              {options && formData.schoolScope === 'mySchool' && (
                <>
                  {/* Role Selection */}
                  <Card sx={{ mb: 3, border: '2px solid #e8f5e8' }}>
                    <CardContent>
                      {renderRoleSelection()}
                    </CardContent>
                  </Card>

                  {/* HOD Selection - Show only if hod role selected */}
                  {formData.targetRoles.includes('hod') && (
                    <Card sx={{ mb: 3, border: '2px solid #e3f2fd' }}>
                      <CardContent>
                        <Accordion defaultExpanded={false}>
                          <AccordionSummary 
                            expandIcon={<ExpandMoreIcon />}
                            sx={{ '&.Mui-expanded': { minHeight: 48 } }}
                          >
                            <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                              👤 HOD Selection (Optional)
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            {renderHODSelection()}
                          </AccordionDetails>
                        </Accordion>
                      </CardContent>
                    </Card>
                  )}

                  {/* Teachers Selection - Show only if teacher role selected */}
                  {formData.targetRoles.includes('teacher') && (
                    <Card sx={{ mb: 3, border: '2px solid #f3e5f5' }}>
                      <CardContent>
                        <Accordion defaultExpanded={false}>
                          <AccordionSummary 
                            expandIcon={<ExpandMoreIcon />}
                            sx={{ '&.Mui-expanded': { minHeight: 48 } }}
                          >
                            <Typography variant="h6" sx={{ color: '#7b1fa2', fontWeight: 'bold' }}>
                              👥 Teacher Selection (Optional)
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            {renderTeacherSelection()}
                          </AccordionDetails>
                        </Accordion>
                      </CardContent>
                    </Card>
                  )}

                  {/* Section Selection - Show only if student role selected */}
                  {formData.targetRoles.includes('student') && (
                    <Card sx={{ mb: 3, border: '2px solid #e0f2f1' }}>
                      <CardContent>
                        <Accordion defaultExpanded={false}>
                          <AccordionSummary 
                            expandIcon={<ExpandMoreIcon />}
                            sx={{ '&.Mui-expanded': { minHeight: 48 } }}
                          >
                            <Typography variant="h6" sx={{ color: '#00695c', fontWeight: 'bold' }}>
                              🎓 Section Selection (Optional)
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            {renderSectionSelection()}
                          </AccordionDetails>
                        </Accordion>
                      </CardContent>
                    </Card>
                  )}

                  {/* Summary */}
                  {formData.targetRoles.length > 0 && (
                    <Card sx={{ mb: 3, bgcolor: '#f5f5f5', border: '1px solid #ddd' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ color: '#424242' }}>
                          📊 Announcement Summary
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {formData.targetRoles.map(role => (
                            <Chip 
                              key={role} 
                              label={role.toUpperCase()} 
                              color="primary" 
                              size="small"
                            />
                          ))}
                        </Box>
                        {formData.targetRoles.includes('hod') && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>HODs:</strong> {formData.hods.length === 0 ? 'All HODs' : `${formData.hods.length} specific HODs`}
                          </Typography>
                        )}
                        {formData.targetRoles.includes('teacher') && (
                          <Typography variant="body2">
                            <strong>Teachers:</strong> {formData.teachers.length === 0 ? 'All teachers' : `${formData.teachers.length} specific teachers`}
                          </Typography>
                        )}
                        {formData.targetRoles.includes('student') && (
                          <Typography variant="body2">
                            <strong>Sections:</strong> {formData.sections.length === 0 ? 'All sections' : `${formData.sections.length} specific sections`}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* Other Schools Selection */}
              {options && formData.schoolScope === 'otherSchools' && (
                <>
                  {/* Role Selection */}
                  <Card sx={{ mb: 3, border: '2px solid #e8f5e8' }}>
                    <CardContent>
                      {renderRoleSelection()}
                    </CardContent>
                  </Card>

                  {/* School Selection */}
                  <Card sx={{ mb: 3, border: '2px solid #fff3e0' }}>
                    <CardContent>
                      {renderOtherSchoolSelection()}
                    </CardContent>
                  </Card>

                  {/* Info about inter-school process */}
                  {formData.targetSchools.length > 0 && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                      <Typography variant="body2">
                        <strong>Inter-School Announcement Process:</strong><br/>
                        1. Your announcement will be sent to the selected school deans for approval<br/>
                        2. Once approved, you'll receive a notification<br/>
                        3. The target school dean will distribute the announcement to their school
                      </Typography>
                    </Alert>
                  )}

                  {/* Summary for other schools */}
                  {formData.targetRoles.length > 0 && formData.targetSchools.length > 0 && (
                    <Card sx={{ mb: 3, bgcolor: '#f5f5f5', border: '1px solid #ddd' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ color: '#424242' }}>
                          📊 Inter-School Announcement Summary
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                          {formData.targetRoles.map(role => (
                            <Chip 
                              key={role} 
                              label={role.toUpperCase()} 
                              color="primary" 
                              size="small"
                            />
                          ))}
                        </Box>
                        <Typography variant="body2">
                          <strong>Target Schools:</strong> {formData.targetSchools.length} selected
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                          This will send approval requests to the deans of the selected schools.
                        </Typography>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* Error and Success Messages */}
              {errors.general && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {errors.general}
                </Alert>
              )}
              
              {success && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  {success}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Creating...' : 'Create Announcement'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeanAnnouncements;