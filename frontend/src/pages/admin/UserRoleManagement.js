import React, { useEffect, useState } from 'react';
import RoleUpdateNotificationDialog from '../../components/RoleUpdateNotificationDialog';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Avatar,
  Divider,
  InputAdornment
} from '@mui/material';
import {
  Edit as EditIcon,
  Person as PersonIcon,
  SupervisorAccount as SupervisorAccountIcon,
  School as SchoolIcon,
  Business as BusinessIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';

const AVAILABLE_ROLES = [
  { value: 'admin', label: 'Admin', icon: '🔧', color: '#f44336' },
  { value: 'dean', label: 'Dean', icon: '🎓', color: '#9c27b0' },
  { value: 'hod', label: 'HOD', icon: '📋', color: '#3f51b5' },
  { value: 'teacher', label: 'Teacher', icon: '👨‍🏫', color: '#2196f3' },
  { value: 'student', label: 'Student', icon: '🎒', color: '#4caf50' }
];

const UserRoleManagement = () => {
  console.log('🎯 UserRoleManagement component loading...');
  
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newUserDialogOpen, setNewUserDialogOpen] = useState(false);
  const [userRoles, setUserRoles] = useState([]);
  const [primaryRole, setPrimaryRole] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    roles: [],
    primaryRole: ''
  });

  // Hierarchical data
  const [schools, setSchools] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  
  // Role update notification dialog
  const [roleUpdateDialog, setRoleUpdateDialog] = useState({
    open: false,
    updatedUser: null
  });
  const [selectedDepartments, setSelectedDepartments] = useState([]);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchUsers();
    fetchSchools();
    fetchDepartments();
  }, []);

  useEffect(() => {
    // Filter users based on search term
    const filtered = users.filter(user =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.regNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.teacherId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.roles || [user.role]).some(role => 
        role?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    setFilteredUsers(filtered);
  }, [users, searchTerm]);

  const fetchUsers = async () => {
    console.log('📡 Fetching users...');
    try {
      setLoading(true);
      // Fetch all users from the new unified endpoint
      const response = await axios.get('/api/admin/users', { 
        headers: { Authorization: `Bearer ${token}` } 
      });

      console.log('✅ Users response:', response.data);
      // The API now returns { users: [...], usersByRole: {...}, totalCount: number, roleCounts: {...} }
      const allUsers = response.data.users || response.data || [];
      console.log('👥 Total users loaded:', allUsers.length);
      setUsers(allUsers);
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      showSnackbar('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await axios.get('/api/admin/schools', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchools(response.data);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/api/admin/departments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('🏢 Departments fetched:', response.data);
      setDepartments(response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUserRoles(user.roles || [user.role]);
    setPrimaryRole(user.primaryRole || user.role);
    setSelectedSchool(user.school?._id || user.school || '');
    // Handle both single department (legacy) and multiple departments (new)
    if (user.departments && Array.isArray(user.departments)) {
      setSelectedDepartments(user.departments.map(dept => dept._id || dept));
    } else if (user.department) {
      setSelectedDepartments([user.department._id || user.department]);
    } else {
      setSelectedDepartments([]);
    }
    setEditDialogOpen(true);
  };

  const handleSaveUserRoles = async () => {
    try {
      // Validate hierarchical requirements
      if (userRoles.includes('dean') && !selectedSchool) {
        showSnackbar('Please select a school for Dean role', 'error');
        return;
      }
      
      // HODs can now have multiple departments or no departments
      // Remove the strict requirement for departments

      const updateData = {
        roles: userRoles,
        primaryRole: primaryRole
      };

      // Add hierarchical assignments
      if (userRoles.includes('dean') || userRoles.includes('hod') || userRoles.includes('teacher')) {
        if (selectedSchool) updateData.school = selectedSchool;
      }
      
      if (userRoles.includes('hod') || userRoles.includes('teacher')) {
        if (selectedDepartments.length > 0) {
          updateData.departments = selectedDepartments;
        }
      }

      const response = await axios.patch(`/api/admin/users/${selectedUser._id}/roles`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Show role update notification dialog
      setRoleUpdateDialog({
        open: true,
        updatedUser: {
          ...selectedUser,
          roles: userRoles,
          primaryRole: primaryRole
        }
      });
      
      setEditDialogOpen(false);
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error updating user roles:', error);
      showSnackbar('Failed to update user roles', 'error');
    }
  };

  const handleCreateUser = async () => {
    try {
      if (!newUser.name || !newUser.email || !newUser.password || newUser.roles.length === 0) {
        showSnackbar('Please fill all required fields', 'error');
        return;
      }

      await axios.post('/api/admin/users/multi-role', newUser, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSnackbar('Multi-role user created successfully');
      setNewUserDialogOpen(false);
      setNewUser({ name: '', email: '', password: '', roles: [], primaryRole: '' });
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error creating user:', error);
      showSnackbar(error.response?.data?.message || 'Failed to create user', 'error');
    }
  };

  const getRoleChips = (user) => {
    const roles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
    const primaryRole = user.primaryRole || user.role;

    return roles.map(role => {
      const roleConfig = AVAILABLE_ROLES.find(r => r.value === role) || { label: role, color: '#666' };
      const isPrimary = role === primaryRole;

      return (
        <Chip
          key={role}
          label={`${roleConfig.icon || ''} ${roleConfig.label}`}
          size="small"
          variant={isPrimary ? 'filled' : 'outlined'}
          sx={{
            mr: 0.5,
            mb: 0.5,
            backgroundColor: isPrimary ? roleConfig.color : 'transparent',
            borderColor: roleConfig.color,
            color: isPrimary ? 'white' : roleConfig.color,
            fontWeight: isPrimary ? 'bold' : 'normal'
          }}
        />
      );
    });
  };

  const getUserIcon = (user) => {
    const primaryRole = user.primaryRole || user.role;
    switch (primaryRole) {
      case 'admin':
        return <SupervisorAccountIcon />;
      case 'dean':
        return <SchoolIcon />;
      case 'hod':
        return <BusinessIcon />;
      case 'teacher':
        return <PersonIcon />;
      case 'student':
        return <PersonIcon />;
      default:
        return <PersonIcon />;
    }
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
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          User Role Management
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchUsers}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setNewUserDialogOpen(true)}
          >
            Create Multi-Role User
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {AVAILABLE_ROLES.map(role => {
          const count = users.filter(user => 
            (user.roles && user.roles.includes(role.value)) || user.role === role.value
          ).length;
          
          return (
            <Grid item xs={12} sm={6} md={3} key={role.value}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: role.color, mr: 2 }}>
                      <span style={{ fontSize: '1.2rem' }}>{role.icon}</span>
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{count}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {role.label}s
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search users by name, email, registration number, or role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Users Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>ID/RegNo</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Hierarchy</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user._id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        {getUserIcon(user)}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {user.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {user.primaryRole || user.role}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.teacherId || user.regNo || '-'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                      {getRoleChips(user)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      {user.school && (
                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                          🏫 {user.school.name || user.school}
                        </Typography>
                      )}
                      {user.department && (
                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                          🏢 {user.department.name || user.department}
                        </Typography>
                      )}
                      {!user.school && !user.department && (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          -
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit Roles">
                      <IconButton
                        color="primary"
                        onClick={() => handleEditUser(user)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredUsers.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No users found matching your search criteria.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Edit User Roles Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Edit Roles for {selectedUser?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select multiple roles for this user. The primary role will be used for default dashboard navigation.
            </Typography>
            
            <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1, mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                🏛️ Hierarchical Role Requirements:
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                • <strong>Dean:</strong> Must be assigned to a School<br/>
                • <strong>HOD:</strong> Can be assigned to multiple Departments (optional)<br/>
                • <strong>Teacher:</strong> Can be assigned to School and Department for context<br/>
                • When promoting Teacher → HOD, they can manage multiple departments<br/>
                • When promoting HOD → Dean, they inherit school responsibilities
              </Typography>
            </Box>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Roles</InputLabel>
              <Select
                multiple
                value={userRoles}
                onChange={(e) => setUserRoles(e.target.value)}
                input={<OutlinedInput label="Roles" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const roleConfig = AVAILABLE_ROLES.find(r => r.value === value);
                      return (
                        <Chip
                          key={value}
                          label={`${roleConfig?.icon || ''} ${roleConfig?.label || value}`}
                          size="small"
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {AVAILABLE_ROLES.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    <Checkbox checked={userRoles.indexOf(role.value) > -1} />
                    <ListItemText primary={`${role.icon} ${role.label}`} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Primary Role</InputLabel>
              <Select
                value={primaryRole}
                onChange={(e) => setPrimaryRole(e.target.value)}
                label="Primary Role"
              >
                {userRoles.map((role) => {
                  const roleConfig = AVAILABLE_ROLES.find(r => r.value === role);
                  return (
                    <MenuItem key={role} value={role}>
                      {roleConfig?.icon} {roleConfig?.label}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {/* Hierarchical Assignments */}
            {(userRoles.includes('dean') || userRoles.includes('hod') || userRoles.includes('teacher')) && (
              <Divider sx={{ my: 2 }}>
                <Chip label="Hierarchical Assignments" size="small" />
              </Divider>
            )}

            {/* School Selection for Dean, HOD, and Teacher */}
            {(userRoles.includes('dean') || userRoles.includes('hod') || userRoles.includes('teacher')) && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>School {userRoles.includes('dean') ? '(Required for Dean)' : ''}</InputLabel>
                <Select
                  value={selectedSchool}
                  onChange={(e) => {
                    console.log('🏫 School selected:', e.target.value);
                    setSelectedSchool(e.target.value);
                    setSelectedDepartments([]); // Reset departments when school changes
                  }}
                  label={`School ${userRoles.includes('dean') ? '(Required for Dean)' : ''}`}
                  required={userRoles.includes('dean')}
                >
                  <MenuItem value="">
                    <em>Select School</em>
                  </MenuItem>
                  {schools.map((school) => (
                    <MenuItem key={school._id} value={school._id}>
                      {school.name} ({school.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Department Selection for HOD and Teacher */}
            {(userRoles.includes('hod') || userRoles.includes('teacher')) && (
              <FormControl fullWidth>
                <InputLabel>
                  Departments {userRoles.includes('hod') ? '(Optional - can manage multiple)' : ''}
                </InputLabel>
                <Select
                  multiple
                  value={selectedDepartments}
                  onChange={(e) => setSelectedDepartments(e.target.value)}
                  label={`Departments ${userRoles.includes('hod') ? '(Optional - can manage multiple)' : ''}`}
                  renderValue={(selected) => {
                    if (selected.length === 0) return 'No departments selected';
                    const selectedDeptNames = departments
                      .filter(dept => selected.includes(dept._id))
                      .map(dept => dept.name);
                    return selectedDeptNames.join(', ');
                  }}
                >
                  <MenuItem value="">
                    <em>Select Departments</em>
                  </MenuItem>
                  {(() => {
                    const filteredDepts = departments.filter(dept => {
                      const match = !selectedSchool || 
                                   dept.school === selectedSchool || 
                                   dept.school?._id === selectedSchool ||
                                   (typeof dept.school === 'object' && dept.school._id === selectedSchool);
                      console.log('🔍 Department filter:', {
                        deptName: dept.name,
                        deptSchool: dept.school,
                        selectedSchool: selectedSchool,
                        match: match
                      });
                      return match;
                    });
                    console.log('📋 Filtered departments:', filteredDepts.length, 'out of', departments.length);
                    return filteredDepts.map((department) => (
                      <MenuItem key={department._id} value={department._id}>
                        {department.name} ({department.code})
                      </MenuItem>
                    ));
                  })()}
                </Select>
              </FormControl>
            )}

            {/* Current Assignments Display */}
            {selectedUser && (
              <>
                <Divider sx={{ my: 2 }}>
                  <Chip label="Current Assignments" size="small" />
                </Divider>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Current School: {selectedUser.school?.name || 'None'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Current Department: {selectedUser.department?.name || 'None'}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveUserRoles} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create New User Dialog */}
      <Dialog open={newUserDialogOpen} onClose={() => setNewUserDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Create Multi-Role User
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              sx={{ mb: 2 }}
              required
            />
            
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              sx={{ mb: 2 }}
              required
            />
            
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              sx={{ mb: 2 }}
              required
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Roles</InputLabel>
              <Select
                multiple
                value={newUser.roles}
                onChange={(e) => {
                  const roles = e.target.value;
                  setNewUser({ 
                    ...newUser, 
                    roles,
                    primaryRole: roles.length === 1 ? roles[0] : newUser.primaryRole
                  });
                }}
                input={<OutlinedInput label="Roles" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const roleConfig = AVAILABLE_ROLES.find(r => r.value === value);
                      return (
                        <Chip
                          key={value}
                          label={`${roleConfig?.icon || ''} ${roleConfig?.label || value}`}
                          size="small"
                        />
                      );
                    })}
                  </Box>
                )}
                required
              >
                {AVAILABLE_ROLES.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    <Checkbox checked={newUser.roles.indexOf(role.value) > -1} />
                    <ListItemText primary={`${role.icon} ${role.label}`} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {newUser.roles.length > 0 && (
              <FormControl fullWidth>
                <InputLabel>Primary Role</InputLabel>
                <Select
                  value={newUser.primaryRole}
                  onChange={(e) => setNewUser({ ...newUser, primaryRole: e.target.value })}
                  label="Primary Role"
                  required
                >
                  {newUser.roles.map((role) => {
                    const roleConfig = AVAILABLE_ROLES.find(r => r.value === role);
                    return (
                      <MenuItem key={role} value={role}>
                        {roleConfig?.icon} {roleConfig?.label}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewUserDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateUser} variant="contained">
            Create User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Role Update Notification Dialog */}
      <RoleUpdateNotificationDialog
        open={roleUpdateDialog.open}
        onClose={() => setRoleUpdateDialog({ open: false, updatedUser: null })}
        updatedUser={roleUpdateDialog.updatedUser}
        onForceLogout={async (user) => {
          // Could implement email notification or forced logout here
          console.log(`Should notify ${user.email} to re-login`);
          showSnackbar(`Notification sent to ${user.name} about role changes`, 'info');
          setRoleUpdateDialog({ open: false, updatedUser: null });
        }}
      />
    </Box>
  );
};

export default UserRoleManagement;