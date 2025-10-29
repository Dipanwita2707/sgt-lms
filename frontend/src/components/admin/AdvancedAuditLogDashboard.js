import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Tooltip,
  InputAdornment,
  Collapse,
  Divider,
  Stack,
  Avatar,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  GetApp as ExportIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Person as PersonIcon,
  Event as EventIcon,
  Description as DescriptionIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';

const AdvancedAuditLogDashboard = () => {
  // State Management
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalLogs, setTotalLogs] = useState(0);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    performedBy: '',
    severity: '',
    status: '',
    startDate: '',
    endDate: '',
    entity: ''
  });
  
  // Dialog
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Statistics
  const [statistics, setStatistics] = useState({
    total: 0,
    today: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    byAction: {},
    byUser: {}
  });
  
  // Filter panel collapse
  const [filterExpanded, setFilterExpanded] = useState(false);

  // Fetch Logs
  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value) acc[key] = value;
          return acc;
        }, {})
      });

      const response = await axios.get(`/api/admin/audit-logs/advanced?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setLogs(response.data.logs || []);
      setTotalLogs(response.data.pagination?.total || 0);
      
      if (response.data.statistics) {
        setStatistics(response.data.statistics);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError(err.response?.data?.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchLogs();
  }, [page, rowsPerPage]);

  // Handle Filter Change
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // Apply Filters
  const applyFilters = () => {
    setPage(0);
    fetchLogs();
  };

  // Clear Filters
  const clearFilters = () => {
    setFilters({
      search: '',
      action: '',
      performedBy: '',
      severity: '',
      status: '',
      startDate: '',
      endDate: '',
      entity: ''
    });
    setPage(0);
    setTimeout(fetchLogs, 100);
  };

  // Export Logs
  const exportLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value) acc[key] = value;
          return acc;
        }, {})
      });

      const response = await axios.get(`/api/admin/audit-logs/export?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting logs:', err);
      alert('Failed to export logs');
    }
  };

  // View Details
  const viewDetails = (log) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  // Severity Badge
  const getSeverityBadge = (severity) => {
    const config = {
      critical: { color: 'error', icon: <ErrorIcon fontSize="small" /> },
      high: { color: 'error', icon: <WarningIcon fontSize="small" /> },
      medium: { color: 'warning', icon: <WarningIcon fontSize="small" /> },
      low: { color: 'info', icon: <InfoIcon fontSize="small" /> },
      info: { color: 'info', icon: <InfoIcon fontSize="small" /> }
    };

    const { color, icon } = config[severity] || config.info;
    
    return (
      <Chip
        label={severity?.toUpperCase()}
        color={color}
        size="small"
        icon={icon}
        sx={{ fontWeight: 600 }}
      />
    );
  };

  // Status Badge
  const getStatusBadge = (status) => {
    const colors = {
      success: 'success',
      failure: 'error',
      pending: 'warning'
    };

    return (
      <Chip
        label={status?.toUpperCase()}
        color={colors[status] || 'default'}
        size="small"
        variant="outlined"
      />
    );
  };

  // Pagination Handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#005b96', display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon fontSize="large" />
            Comprehensive Audit Logs & Activity Tracking
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Track all system activities, user actions, and security events in real-time
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh Logs">
            <IconButton onClick={fetchLogs} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={exportLogs}
            disabled={logs.length === 0}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#e3f2fd' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Logs</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#005b96' }}>
                {statistics.total.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#e8f5e9' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Today's Activity</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                {statistics.today.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#ffebee' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Critical</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#c62828' }}>
                {statistics.critical.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#fff3e0' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">High Priority</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ef6c00' }}>
                {statistics.high.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#fff9c4' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Medium</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#f57c00' }}>
                {statistics.medium.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters Panel */}
      <Paper sx={{ mb: 2 }}>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            bgcolor: '#f5f5f5'
          }}
          onClick={() => setFilterExpanded(!filterExpanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon />
            <Typography variant="h6">Advanced Filters</Typography>
          </Box>
          {filterExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
        
        <Collapse in={filterExpanded}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Search"
                  placeholder="Search logs..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Action Type</InputLabel>
                  <Select
                    value={filters.action}
                    onChange={(e) => handleFilterChange('action', e.target.value)}
                    label="Action Type"
                  >
                    <MenuItem value="">All Actions</MenuItem>
                    <MenuItem value="LOGIN">Login</MenuItem>
                    <MenuItem value="LOGOUT">Logout</MenuItem>
                    <MenuItem value="CREATE">Create</MenuItem>
                    <MenuItem value="UPDATE">Update</MenuItem>
                    <MenuItem value="DELETE">Delete</MenuItem>
                    <MenuItem value="ROLE_CHANGE">Role Change</MenuItem>
                    <MenuItem value="BULK_UPLOAD">Bulk Upload</MenuItem>
                    <MenuItem value="EXPORT">Export</MenuItem>
                    <MenuItem value="QUIZ_UNLOCK">Quiz Unlock</MenuItem>
                    <MenuItem value="COURSE_ASSIGNMENT">Course Assignment</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Severity</InputLabel>
                  <Select
                    value={filters.severity}
                    onChange={(e) => handleFilterChange('severity', e.target.value)}
                    label="Severity"
                  >
                    <MenuItem value="">All Severities</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="info">Info</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    <MenuItem value="success">Success</MenuItem>
                    <MenuItem value="failure">Failure</MenuItem>
                    <MenuItem value="error">Error</MenuItem>
                    <MenuItem value="warning">Warning</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Entity Type</InputLabel>
                  <Select
                    value={filters.entity}
                    onChange={(e) => handleFilterChange('entity', e.target.value)}
                    label="Entity Type"
                  >
                    <MenuItem value="">All Entities</MenuItem>
                    <MenuItem value="User">User</MenuItem>
                    <MenuItem value="Course">Course</MenuItem>
                    <MenuItem value="Quiz">Quiz</MenuItem>
                    <MenuItem value="Section">Section</MenuItem>
                    <MenuItem value="Department">Department</MenuItem>
                    <MenuItem value="School">School</MenuItem>
                    <MenuItem value="Video">Video</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="date"
                  label="Start Date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="date"
                  label="End Date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="User Email"
                  placeholder="Filter by user..."
                  value={filters.performedBy}
                  onChange={(e) => handleFilterChange('performedBy', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Stack direction="row" spacing={1}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={applyFilters}
                    startIcon={<SearchIcon />}
                  >
                    Apply Filters
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={clearFilters}
                  >
                    Clear
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Paper>

      {/* Logs Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Entity</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>IP Address</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 5 }}>
                  <CircularProgress />
                  <Typography sx={{ mt: 2 }}>Loading audit logs...</Typography>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 5 }}>
                  <Typography color="text.secondary">
                    No audit logs found. Try adjusting your filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log._id} hover>
                  <TableCell>
                    <Typography variant="body2">
                      {format(new Date(log.timestamp || log.createdAt), 'MMM dd, yyyy')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(log.timestamp || log.createdAt), 'HH:mm:ss')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {log.action}
                    </Typography>
                    {log.description && (
                      <Typography variant="caption" color="text.secondary">
                        {log.description.substring(0, 50)}...
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: '#005b96' }}>
                        {log.performedBy?.name?.[0] || log.performedBy?.email?.[0] || 'U'}
                      </Avatar>
                      <Box>
                        <Typography variant="body2">
                          {log.performedBy?.name || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {log.performedBy?.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {log.entityType || '-'}
                    </Typography>
                    {log.entityId && (
                      <Typography variant="caption" color="text.secondary">
                        ID: {log.entityId.substring(0, 8)}...
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {log.ipAddress || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => viewDetails(log)} color="primary">
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        <TablePagination
          component="div"
          count={totalLogs}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </TableContainer>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Audit Log Details</Typography>
            <IconButton onClick={() => setDetailsOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedLog && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Action</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedLog.action}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Timestamp</Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedLog.timestamp || selectedLog.createdAt), 'PPpp')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Severity</Typography>
                  <Box sx={{ mt: 0.5 }}>{getSeverityBadge(selectedLog.severity)}</Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedLog.status)}</Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Performed By</Typography>
                  <Typography variant="body1">{selectedLog.performedBy?.name || 'Unknown'}</Typography>
                  <Typography variant="caption" color="text.secondary">{selectedLog.performedBy?.email}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Role</Typography>
                  <Typography variant="body1">{selectedLog.performedBy?.role || '-'}</Typography>
                </Grid>
                
                {selectedLog.targetUser && (
                  <>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Target User</Typography>
                      <Typography variant="body1">{selectedLog.targetUser?.name || 'Unknown'}</Typography>
                      <Typography variant="caption" color="text.secondary">{selectedLog.targetUser?.email}</Typography>
                    </Grid>
                  </>
                )}
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">IP Address</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    {selectedLog.ipAddress || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">User Agent</Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                    {selectedLog.userAgent ? selectedLog.userAgent.substring(0, 50) + '...' : '-'}
                  </Typography>
                </Grid>
                
                {selectedLog.entityType && (
                  <>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Entity Type</Typography>
                      <Typography variant="body1">{selectedLog.entityType}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Entity ID</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {selectedLog.entityId || '-'}
                      </Typography>
                    </Grid>
                  </>
                )}
                
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Description</Typography>
                  <Typography variant="body1">{selectedLog.description || '-'}</Typography>
                </Grid>
                
                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Additional Details</Typography>
                    <Paper sx={{ p: 2, mt: 1, bgcolor: '#f5f5f5' }}>
                      <pre style={{ margin: 0, fontSize: '0.85rem', overflow: 'auto' }}>
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                )}
                
                {selectedLog.changes && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Changes Made</Typography>
                    <Paper sx={{ p: 2, mt: 1, bgcolor: '#f5f5f5' }}>
                      <pre style={{ margin: 0, fontSize: '0.85rem', overflow: 'auto' }}>
                        {JSON.stringify(selectedLog.changes, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdvancedAuditLogDashboard;
