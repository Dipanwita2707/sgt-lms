import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  CircularProgress,
  Alert,
  Badge,
  Tabs,
  Tab,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon,
  Assignment as AssignmentIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const ComprehensiveAuditLogDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [suspiciousActivities, setSuspiciousActivities] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [filters, setFilters] = useState({
    action: '',
    category: '',
    status: '',
    severity: '',
    targetResource: '',
    ipAddress: '',
    startDate: null,
    endDate: null,
    isSuspicious: ''
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  const token = localStorage.getItem('token');
  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };
  
  // Categories for filter dropdown
  const categories = [
    'authentication', 'authorization', 'user_management', 'course_management',
    'student_management', 'teacher_management', 'content_management', 
    'analytics', 'settings', 'security', 'bulk_operations', 'data_export',
    'data_import', 'system', 'other'
  ];
  
  const statuses = ['success', 'failure', 'error', 'warning'];
  const severities = ['critical', 'high', 'medium', 'low', 'info'];
  const resources = ['course', 'student', 'teacher', 'user', 'quiz', 'announcement', 'video', 'unit'];
  
  // Fetch logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      const queryParams = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '' && value !== null)
        )
      });
      
      const response = await axios.get(
        `/api/admin/audit-logs?${queryParams.toString()}`,
        axiosConfig
      );
      
      setLogs(response.data.logs || []);
      setTotalCount(response.data.pagination?.totalCount || 0);
      
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      setStatsLoading(true);
      
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) queryParams.append('endDate', filters.endDate.toISOString());
      
      const response = await axios.get(
        `/api/admin/audit-logs/statistics?${queryParams.toString()}`,
        axiosConfig
      );
      
      setStatistics(response.data);
      
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setStatsLoading(false);
    }
  };
  
  // Fetch suspicious activities
  const fetchSuspiciousActivities = async () => {
    try {
      const response = await axios.get('/api/admin/audit-logs/suspicious', axiosConfig);
      setSuspiciousActivities(response.data.logs || []);
    } catch (error) {
      console.error('Error fetching suspicious activities:', error);
    }
  };
  
  // Fetch pending reviews
  const fetchPendingReviews = async () => {
    try {
      const response = await axios.get('/api/admin/audit-logs/pending-reviews', axiosConfig);
      setPendingReviews(response.data.logs || []);
    } catch (error) {
      console.error('Error fetching pending reviews:', error);
    }
  };
  
  // Mark as reviewed
  const markAsReviewed = async (logId) => {
    try {
      await axios.put(`/api/admin/audit-logs/${logId}/review`, {}, axiosConfig);
      fetchPendingReviews();
      fetchLogs();
    } catch (error) {
      console.error('Error marking as reviewed:', error);
    }
  };
  
  // Export logs
  const exportLogs = async () => {
    try {
      const queryParams = new URLSearchParams(
        Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '' && value !== null)
        )
      );
      
      const response = await axios.get(
        `/api/admin/audit-logs/export?${queryParams.toString()}`,
        { ...axiosConfig, responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_logs_${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
    } catch (error) {
      console.error('Error exporting logs:', error);
    }
  };
  
  useEffect(() => {
    fetchLogs();
  }, [page, rowsPerPage, filters]);
  
  useEffect(() => {
    fetchStatistics();
    fetchSuspiciousActivities();
    fetchPendingReviews();
  }, [filters.startDate, filters.endDate]);
  
  // Get status chip color
  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'success';
      case 'failure': return 'warning';
      case 'error': return 'error';
      case 'warning': return 'info';
      default: return 'default';
    }
  };
  
  // Get severity chip color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      case 'info': return 'success';
      default: return 'default';
    }
  };
  
  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircleIcon fontSize="small" />;
      case 'failure': return <WarningIcon fontSize="small" />;
      case 'error': return <ErrorIcon fontSize="small" />;
      default: return <InfoIcon fontSize="small" />;
    }
  };
  
  // Render statistics overview
  const renderStatistics = () => {
    if (statsLoading || !statistics) {
      return <CircularProgress />;
    }
    
    const statusData = Object.entries(statistics.statusCounts || {}).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
    
    const severityData = Object.entries(statistics.severityCounts || {}).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
    
    const categoryData = statistics.categoryCounts?.slice(0, 6).map(item => ({
      name: item._id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: item.count
    })) || [];
    
    return (
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="h6">Total Logs</Typography>
              <Typography variant="h3">{statistics.totalLogs?.toLocaleString()}</Typography>
              <Typography variant="body2">All tracked activities</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="h6">Suspicious</Typography>
              <Typography variant="h3">{statistics.suspiciousCount}</Typography>
              <Typography variant="body2">Requires attention</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="h6">Pending Reviews</Typography>
              <Typography variant="h3">{statistics.pendingReviews}</Typography>
              <Typography variant="body2">Need review</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="h6">Success Rate</Typography>
              <Typography variant="h3">
                {statistics.statusCounts?.success && statistics.totalLogs 
                  ? Math.round((statistics.statusCounts.success / statistics.totalLogs) * 100) 
                  : 0}%
              </Typography>
              <Typography variant="body2">Successful operations</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Charts */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6" gutterBottom>Status Distribution</Typography>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6" gutterBottom>Severity Levels</Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={severityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6" gutterBottom>Top Categories</Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <RechartsTooltip />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* Activity Timeline */}
        {statistics.timeline && statistics.timeline.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Activity Timeline (Last 7 Days)</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={statistics.timeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}
        
        {/* Top Users */}
        {statistics.topUsers && statistics.topUsers.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Most Active Users</Typography>
              <List>
                {statistics.topUsers.slice(0, 5).map((user, index) => (
                  <ListItem key={user._id} divider={index < 4}>
                    <ListItemText
                      primary={user.name || 'Unknown User'}
                      secondary={`${user.count} activities`}
                    />
                    <Chip label={`#${index + 1}`} size="small" color="primary" />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        )}
      </Grid>
    );
  };
  
  // Render filters
  const renderFilters = () => (
    <Collapse in={showFilters}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Search Action"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                label="Category"
              >
                <MenuItem value="">All</MenuItem>
                {categories.map(cat => (
                  <MenuItem key={cat} value={cat}>
                    {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="">All</MenuItem>
                {statuses.map(status => (
                  <MenuItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Severity</InputLabel>
              <Select
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                label="Severity"
              >
                <MenuItem value="">All</MenuItem>
                {severities.map(sev => (
                  <MenuItem key={sev} value={sev}>
                    {sev.charAt(0).toUpperCase() + sev.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Resource</InputLabel>
              <Select
                value={filters.targetResource}
                onChange={(e) => setFilters({ ...filters, targetResource: e.target.value })}
                label="Resource"
              >
                <MenuItem value="">All</MenuItem>
                {resources.map(res => (
                  <MenuItem key={res} value={res}>
                    {res.charAt(0).toUpperCase() + res.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={filters.startDate}
                onChange={(date) => setFilters({ ...filters, startDate: date })}
                renderInput={(params) => <TextField {...params} fullWidth size="small" />}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="End Date"
                value={filters.endDate}
                onChange={(date) => setFilters({ ...filters, endDate: date })}
                renderInput={(params) => <TextField {...params} fullWidth size="small" />}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Suspicious</InputLabel>
              <Select
                value={filters.isSuspicious}
                onChange={(e) => setFilters({ ...filters, isSuspicious: e.target.value })}
                label="Suspicious"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="true">Yes</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={() => {
                  setPage(0);
                  fetchLogs();
                }}
                startIcon={<SearchIcon />}
              >
                Apply Filters
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setFilters({
                    action: '',
                    category: '',
                    status: '',
                    severity: '',
                    targetResource: '',
                    ipAddress: '',
                    startDate: null,
                    endDate: null,
                    isSuspicious: ''
                  });
                  setPage(0);
                }}
              >
                Clear
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Collapse>
  );
  
  // Render logs table
  const renderLogsTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
            <TableCell><strong>Timestamp</strong></TableCell>
            <TableCell><strong>Action</strong></TableCell>
            <TableCell><strong>Performed By</strong></TableCell>
            <TableCell><strong>Category</strong></TableCell>
            <TableCell><strong>Status</strong></TableCell>
            <TableCell><strong>Severity</strong></TableCell>
            <TableCell><strong>IP Address</strong></TableCell>
            <TableCell><strong>Actions</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={8} align="center">
                <CircularProgress />
              </TableCell>
            </TableRow>
          ) : logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} align="center">
                <Typography color="textSecondary">No audit logs found</Typography>
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow
                key={log._id}
                sx={{
                  '&:hover': { backgroundColor: '#f9f9f9' },
                  backgroundColor: log.isSuspicious ? '#fff3cd' : 'inherit'
                }}
              >
                <TableCell>
                  <Typography variant="body2">
                    {new Date(log.createdAt).toLocaleString()}
                  </Typography>
                  {log.isSuspicious && (
                    <Chip
                      label="Suspicious"
                      size="small"
                      color="warning"
                      icon={<WarningIcon />}
                      sx={{ mt: 0.5 }}
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {log.action}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {log.actionType}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {log.performedByName || 'Unknown'}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {log.performedByRole}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={log.category.replace(/_/g, ' ')}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    icon={getStatusIcon(log.status)}
                    label={log.status}
                    size="small"
                    color={getStatusColor(log.status)}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={log.severity}
                    size="small"
                    color={getSeverityColor(log.severity)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {log.ipAddress}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedLog(log);
                        setDetailsDialogOpen(true);
                      }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {log.requiresReview && !log.reviewed && (
                    <Tooltip title="Mark as Reviewed">
                      <IconButton
                        size="small"
                        onClick={() => markAsReviewed(log._id)}
                        color="primary"
                      >
                        <CheckCircleIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </TableContainer>
  );
  
  // Render details dialog
  const renderDetailsDialog = () => (
    <Dialog
      open={detailsDialogOpen}
      onClose={() => setDetailsDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Audit Log Details</Typography>
          <IconButton onClick={() => setDetailsDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {selectedLog && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="textSecondary">Action</Typography>
              <Typography variant="body1" gutterBottom>{selectedLog.action}</Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="textSecondary">Action Type</Typography>
              <Typography variant="body1" gutterBottom>{selectedLog.actionType}</Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="textSecondary">Performed By</Typography>
              <Typography variant="body1">
                {selectedLog.performedByName} ({selectedLog.performedByEmail})
              </Typography>
              <Typography variant="caption">{selectedLog.performedByRole}</Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="textSecondary">Timestamp</Typography>
              <Typography variant="body1" gutterBottom>
                {new Date(selectedLog.createdAt).toLocaleString()}
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="textSecondary">IP Address</Typography>
              <Typography variant="body1" fontFamily="monospace" gutterBottom>
                {selectedLog.ipAddress}
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="textSecondary">User Agent</Typography>
              <Typography variant="body2" gutterBottom>
                {selectedLog.deviceInfo?.browser} on {selectedLog.deviceInfo?.os} ({selectedLog.deviceInfo?.device})
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="textSecondary">Category</Typography>
              <Chip label={selectedLog.category.replace(/_/g, ' ')} size="small" />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="textSecondary">Status</Typography>
              <Chip label={selectedLog.status} size="small" color={getStatusColor(selectedLog.status)} />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="textSecondary">Severity</Typography>
              <Chip label={selectedLog.severity} size="small" color={getSeverityColor(selectedLog.severity)} />
            </Grid>
            
            {selectedLog.targetUserName && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Target User</Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedLog.targetUserName} ({selectedLog.targetUserRole})
                </Typography>
              </Grid>
            )}
            
            {selectedLog.targetResource && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Target Resource</Typography>
                <Typography variant="body1" gutterBottom>{selectedLog.targetResource}</Typography>
              </Grid>
            )}
            
            {selectedLog.requestUrl && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Request URL</Typography>
                <Typography variant="body2" fontFamily="monospace" gutterBottom>
                  {selectedLog.requestMethod} {selectedLog.requestUrl}
                </Typography>
              </Grid>
            )}
            
            {selectedLog.duration && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Duration</Typography>
                <Typography variant="body1" gutterBottom>{selectedLog.duration}ms</Typography>
              </Grid>
            )}
            
            {selectedLog.errorMessage && (
              <Grid item xs={12}>
                <Alert severity="error">
                  <Typography variant="subtitle2">Error Message</Typography>
                  <Typography variant="body2">{selectedLog.errorMessage}</Typography>
                </Alert>
              </Grid>
            )}
            
            {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Additional Details
                </Typography>
                <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                  <pre style={{ margin: 0, fontSize: '12px', overflow: 'auto' }}>
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </Paper>
              </Grid>
            )}
            
            {selectedLog.changes && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Changes Made
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, backgroundColor: '#fff3cd' }}>
                      <Typography variant="caption" fontWeight="bold">Before</Typography>
                      <pre style={{ margin: 0, fontSize: '11px', overflow: 'auto' }}>
                        {JSON.stringify(selectedLog.changes.before, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, backgroundColor: '#d4edda' }}>
                      <Typography variant="caption" fontWeight="bold">After</Typography>
                      <pre style={{ margin: 0, fontSize: '11px', overflow: 'auto' }}>
                        {JSON.stringify(selectedLog.changes.after, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                </Grid>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        {selectedLog?.requiresReview && !selectedLog?.reviewed && (
          <Button
            onClick={() => {
              markAsReviewed(selectedLog._id);
              setDetailsDialogOpen(false);
            }}
            color="primary"
            startIcon={<CheckCircleIcon />}
          >
            Mark as Reviewed
          </Button>
        )}
        <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon fontSize="large" />
            Comprehensive Audit Log System
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Advanced activity tracking, monitoring, and security analysis
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh Data">
            <IconButton onClick={() => { fetchLogs(); fetchStatistics(); }} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export Logs">
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={exportLogs}
            >
              Export CSV
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<FilterListIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
        </Box>
      </Box>
      
      {/* Alert Badges */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        {statistics && statistics.suspiciousCount > 0 && (
          <Badge badgeContent={statistics.suspiciousCount} color="warning">
            <Alert severity="warning" sx={{ mb: 0 }}>
              <strong>{statistics.suspiciousCount}</strong> suspicious activities detected
            </Alert>
          </Badge>
        )}
        {statistics && statistics.pendingReviews > 0 && (
          <Badge badgeContent={statistics.pendingReviews} color="error">
            <Alert severity="info" sx={{ mb: 0 }}>
              <strong>{statistics.pendingReviews}</strong> logs pending review
            </Alert>
          </Badge>
        )}
      </Box>
      
      {/* Filters */}
      {renderFilters()}
      
      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab icon={<AssignmentIcon />} label="All Logs" />
          <Tab icon={<TimelineIcon />} label="Statistics" />
          <Tab icon={<SecurityIcon />} label={`Suspicious (${suspiciousActivities.length})`} />
          <Tab icon={<WarningIcon />} label={`Pending Reviews (${pendingReviews.length})`} />
        </Tabs>
      </Paper>
      
      {/* Tab Content */}
      {tabValue === 0 && renderLogsTable()}
      
      {tabValue === 1 && (
        <Box sx={{ mt: 2 }}>
          {renderStatistics()}
        </Box>
      )}
      
      {tabValue === 2 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#fff3cd' }}>
                <TableCell><strong>Timestamp</strong></TableCell>
                <TableCell><strong>Action</strong></TableCell>
                <TableCell><strong>Performed By</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>IP Address</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suspiciousActivities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="textSecondary">No suspicious activities</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                suspiciousActivities.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.performedByName}</TableCell>
                    <TableCell>
                      <Chip label={log.status} size="small" color={getStatusColor(log.status)} />
                    </TableCell>
                    <TableCell fontFamily="monospace">{log.ipAddress}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedLog(log);
                          setDetailsDialogOpen(true);
                        }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {tabValue === 3 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#d4edda' }}>
                <TableCell><strong>Timestamp</strong></TableCell>
                <TableCell><strong>Action</strong></TableCell>
                <TableCell><strong>Performed By</strong></TableCell>
                <TableCell><strong>Severity</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingReviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="textSecondary">No pending reviews</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                pendingReviews.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.performedByName}</TableCell>
                    <TableCell>
                      <Chip label={log.severity} size="small" color={getSeverityColor(log.severity)} />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View & Review">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedLog(log);
                            setDetailsDialogOpen(true);
                          }}
                          color="primary"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Mark as Reviewed">
                        <IconButton
                          size="small"
                          onClick={() => markAsReviewed(log._id)}
                          color="success"
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Details Dialog */}
      {renderDetailsDialog()}
    </Box>
  );
};

export default ComprehensiveAuditLogDashboard;
