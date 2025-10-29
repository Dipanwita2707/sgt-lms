import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import DepartmentIcon from '@mui/icons-material/Domain';
import CourseIcon from '@mui/icons-material/Book';
import SectionIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import AdminIcon from '@mui/icons-material/AccountBalance';
import DeanIcon from '@mui/icons-material/ManageAccounts';
import HODIcon from '@mui/icons-material/SupervisorAccount';
import StudentsIcon from '@mui/icons-material/Groups';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ViewIcon from '@mui/icons-material/Visibility';
import AssignIcon from '@mui/icons-material/Assignment';
import HierarchyIcon from '@mui/icons-material/AccountTree';
import { 
  getHierarchyOverview, 
  getAllSchools, 
  assignDeanToSchool,
  assignHODToDepartment,
  getAvailableDeansForSchool,
  getAvailableHODsForDepartment
} from '../../api/hierarchyApi';

const HierarchyOverview = () => {
  const [hierarchyData, setHierarchyData] = useState(null);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState('');
  
  // Dialog states
  const [assignDeanDialog, setAssignDeanDialog] = useState(false);
  const [assignHODDialog, setAssignHODDialog] = useState(false);
  const [selectedSchoolForDean, setSelectedSchoolForDean] = useState('');
  const [selectedDepartmentForHOD, setSelectedDepartmentForHOD] = useState('');
  const [availableDeans, setAvailableDeansState] = useState([]);
  const [availableHODs, setAvailableHODs] = useState([]);
  const [selectedDean, setSelectedDean] = useState('');
  const [selectedHOD, setSelectedHOD] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedSchool) {
      loadHierarchyData();
    } else {
      loadHierarchyData();
    }
  }, [selectedSchool]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const schoolsData = await getAllSchools();
      setSchools(schoolsData);
      await loadHierarchyData();
    } catch (err) {
      setError('Failed to load initial data');
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHierarchyData = async () => {
    try {
      const data = await getHierarchyOverview(selectedSchool || null);
      setHierarchyData(data);
    } catch (err) {
      setError('Failed to load hierarchy data');
      console.error('Error loading hierarchy data:', err);
    }
  };

  const handleAssignDean = async () => {
    if (!selectedSchoolForDean || !selectedDean) return;
    
    try {
      setActionLoading(true);
      await assignDeanToSchool(selectedSchoolForDean, selectedDean);
      setAssignDeanDialog(false);
      setSelectedSchoolForDean('');
      setSelectedDean('');
      await loadHierarchyData();
    } catch (err) {
      setError('Failed to assign dean');
      console.error('Error assigning dean:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignHOD = async () => {
    if (!selectedDepartmentForHOD || !selectedHOD) return;
    
    try {
      setActionLoading(true);
      await assignHODToDepartment(selectedDepartmentForHOD, selectedHOD);
      setAssignHODDialog(false);
      setSelectedDepartmentForHOD('');
      setSelectedHOD('');
      await loadHierarchyData();
    } catch (err) {
      setError('Failed to assign HOD');
      console.error('Error assigning HOD:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const openAssignDeanDialog = async (schoolId) => {
    try {
      setSelectedSchoolForDean(schoolId);
      const deans = await getAvailableDeansForSchool(schoolId);
      setAvailableDeansState(deans);
      setAssignDeanDialog(true);
    } catch (err) {
      setError('Failed to load available deans');
    }
  };

  const openAssignHODDialog = async (departmentId) => {
    try {
      setSelectedDepartmentForHOD(departmentId);
      const hods = await getAvailableHODsForDepartment(departmentId);
      setAvailableHODs(hods);
      setAssignHODDialog(true);
    } catch (err) {
      setError('Failed to load available HODs');
    }
  };

  const getStatsCards = () => {
    if (!hierarchyData) return [];
    
    return [
      {
        title: 'Total Schools',
        value: hierarchyData.totalSchools || 0,
        icon: <SchoolIcon />,
        color: 'primary'
      },
      {
        title: 'Total Departments',
        value: hierarchyData.totalDepartments || 0,
        icon: <DepartmentIcon />,
        color: 'secondary'
      },
      {
        title: 'Total Courses',
        value: hierarchyData.totalCourses || 0,
        icon: <CourseIcon />,
        color: 'success'
      },
      {
        title: 'Total Sections',
        value: hierarchyData.totalSections || 0,
        icon: <SectionIcon />,
        color: 'warning'
      }
    ];
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HierarchyIcon color="primary" />
          Educational Hierarchy Overview
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by School</InputLabel>
            <Select
              value={selectedSchool}
              label="Filter by School"
              onChange={(e) => setSelectedSchool(e.target.value)}
            >
              <MenuItem value="">All Schools</MenuItem>
              {schools.map((school) => (
                <MenuItem key={school._id} value={school._id}>
                  {school.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAssignDeanDialog(true)}
          >
            Assign Dean
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {getStatsCards().map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" component="div">
                      {stat.value}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: `${stat.color}.main` }}>
                    {stat.icon}
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Hierarchy Tree */}
      {hierarchyData && hierarchyData.schools && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <SchoolIcon color="primary" />
            Schools & Departments Hierarchy
          </Typography>

          {hierarchyData.schools.map((school) => (
            <Accordion key={school._id} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <SchoolIcon color="primary" />
                  <Typography variant="h6">{school.name}</Typography>
                  <Chip 
                    label={school.dean ? `Dean: ${school.dean.name}` : 'No Dean Assigned'} 
                    color={school.dean ? 'success' : 'error'}
                    size="small"
                  />
                  <Box sx={{ ml: 'auto' }}>
                    <Tooltip title="Assign Dean">
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAssignDeanDialog(school._id);
                        }}
                      >
                        <AssignIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ pl: 4 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Departments ({school.departments.length})
                  </Typography>
                  
                  {school.departments.map((department) => (
                    <Card key={department._id} sx={{ mb: 2, ml: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <DepartmentIcon color="secondary" />
                            <Typography variant="h6">{department.name}</Typography>
                            <Chip 
                              label={department.hod ? `HOD: ${department.hod.name}` : 'No HOD Assigned'} 
                              color={department.hod ? 'success' : 'warning'}
                              size="small"
                            />
                          </Box>
                          <Tooltip title="Assign HOD">
                            <IconButton 
                              size="small"
                              onClick={() => openAssignHODDialog(department._id)}
                            >
                              <AssignIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                              Courses ({department.courses.length})
                            </Typography>
                            <List dense>
                              {department.courses.map((course) => (
                                <ListItem key={course._id}>
                                  <ListItemIcon>
                                    <CourseIcon fontSize="small" />
                                  </ListItemIcon>
                                  <ListItemText 
                                    primary={course.title}
                                    secondary={`Code: ${course.code} | Credits: ${course.credits}`}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                              Teachers ({department.teachers.length})
                            </Typography>
                            <List dense>
                              {department.teachers.map((teacher) => (
                                <ListItem key={teacher._id}>
                                  <ListItemIcon>
                                    <PersonIcon fontSize="small" />
                                  </ListItemIcon>
                                  <ListItemText 
                                    primary={teacher.name}
                                    secondary={teacher.email}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>
      )}

      {/* Assign Dean Dialog */}
      <Dialog open={assignDeanDialog} onClose={() => setAssignDeanDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Dean to School</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Select School</InputLabel>
            <Select
              value={selectedSchoolForDean}
              label="Select School"
              onChange={(e) => setSelectedSchoolForDean(e.target.value)}
            >
              {schools.map((school) => (
                <MenuItem key={school._id} value={school._id}>
                  {school.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Dean</InputLabel>
            <Select
              value={selectedDean}
              label="Select Dean"
              onChange={(e) => setSelectedDean(e.target.value)}
              disabled={!selectedSchoolForDean}
            >
              {availableDeans.map((dean) => (
                <MenuItem key={dean._id} value={dean._id}>
                  {dean.name} ({dean.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDeanDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAssignDean} 
            variant="contained"
            disabled={!selectedSchoolForDean || !selectedDean || actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Assign Dean'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign HOD Dialog */}
      <Dialog open={assignHODDialog} onClose={() => setAssignHODDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign HOD to Department</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2, mt: 2 }}>
            <InputLabel>Select HOD</InputLabel>
            <Select
              value={selectedHOD}
              label="Select HOD"
              onChange={(e) => setSelectedHOD(e.target.value)}
            >
              {availableHODs.map((hod) => (
                <MenuItem key={hod._id} value={hod._id}>
                  {hod.name} ({hod.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignHODDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAssignHOD} 
            variant="contained"
            disabled={!selectedHOD || actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Assign HOD'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HierarchyOverview;