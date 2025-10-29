import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Paper,
  Tabs,
  Tab,
  Collapse,
  IconButton,
  Grid,
  CircularProgress,
  InputAdornment,
  Pagination
} from '@mui/material';
import {
  CalendarToday,
  AccessTime,
  People,
  Visibility,
  ExpandMore,
  ExpandLess,
  FilterList,
  Search,
  Clear
} from '@mui/icons-material';
import { format } from 'date-fns';

const AnnouncementHistory = ({ userRole, title }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [activeTab, setActiveTab] = useState('created'); // 'created' or 'approved'
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, [currentPage, statusFilter, dateFromFilter, dateToFilter, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        page: currentPage,
        limit: itemsPerPage,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(dateFromFilter && { dateFrom: dateFromFilter }),
        ...(dateToFilter && { dateTo: dateToFilter })
      };

      let endpoint = '';
      
      if (activeTab === 'created') {
        // Get announcements created by this user
        if (userRole === 'teacher') {
          endpoint = '/api/teacher/announcements/history';
        } else if (userRole === 'dean') {
          endpoint = '/api/dean/announcements/history';
        } else if (userRole === 'hod') {
          endpoint = '/api/hod/announcements/history';
        }
      } else if (activeTab === 'approved' && userRole === 'hod') {
        // Only HODs approve teacher announcements
        endpoint = '/api/hod/approvals/history';
      }

      if (!endpoint) return;

      const response = await axios.get(endpoint, { params });
      
      if (activeTab === 'created') {
        setAnnouncements(response.data.announcements || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
      } else {
        setApprovals(response.data.approvals || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching announcement history:', err);
      setError('Failed to load announcement history');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (id) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getStatusChip = (status) => {
    const colors = {
      pending: 'warning',
      approved: 'success',
      rejected: 'error'
    };

    return (
      <Chip 
        label={status?.toUpperCase() || 'UNKNOWN'} 
        color={colors[status] || 'default'}
        size="small"
      />
    );
  };

  const getRoleChip = (role) => {
    const colors = {
      student: 'primary',
      teacher: 'secondary',
      hod: 'info',
      dean: 'error'
    };

    return (
      <Chip 
        label={role?.toUpperCase() || 'UNKNOWN'} 
        color={colors[role] || 'default'}
        size="small"
        variant="outlined"
      />
    );
  };

  const formatParticipantStats = (stats) => {
    if (!stats || stats.total === 0) return 'No participants';
    
    const parts = [];
    if (stats.student) parts.push(`${stats.student} Students`);
    if (stats.teacher) parts.push(`${stats.teacher} Teachers`);
    if (stats.hod) parts.push(`${stats.hod} HODs`);
    if (stats.dean) parts.push(`${stats.dean} Deans`);
    
    return parts.join(', ') + ` (Total: ${stats.total})`;
  };

  const filteredItems = () => {
    const items = activeTab === 'created' ? announcements : approvals;
    if (!searchTerm) return items;
    
    return items.filter(item =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.message.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const shouldShowTabs = userRole === 'hod'; // Only HOD has approval tabs, Dean only creates announcements

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Typography variant="h5" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarToday />
            {title || 'Announcement History'}
          </Typography>
        </CardHeader>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" height={128}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Typography variant="h5" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarToday />
          {title || 'Announcement History'}
        </Typography>
        
        {/* Tabs for HOD */}
        {shouldShowTabs && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => {
                setActiveTab(newValue);
                setCurrentPage(1);
              }}
            >
              <Tab label="My Announcements" value="created" />
              <Tab label="Approved by Me" value="approved" />
            </Tabs>
          </Box>
        )}
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search announcements"
                placeholder="Search by title or message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {activeTab === 'created' && (
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="From Date"
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="To Date"
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <Button 
                variant="outlined" 
                onClick={clearFilters}
                startIcon={<Clear />}
                fullWidth
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </Box>

        {error && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
            <Typography>{error}</Typography>
          </Paper>
        )}

        {/* Announcement List */}
        <Box sx={{ mb: 3 }}>
          {filteredItems().map((item) => (
            <Paper
              key={item._id}
              sx={{ 
                p: 3, 
                mb: 2, 
                border: 1, 
                borderColor: 'grey.300',
                '&:hover': { boxShadow: 2 }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Typography variant="h6" component="h3">
                      {item.title}
                    </Typography>
                    {activeTab === 'created' && getStatusChip(item.approvalStatus)}
                    {item.interSchoolRequest && (
                      <Chip label="Inter-School" color="secondary" size="small" />
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2, color: 'text.secondary' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccessTime fontSize="small" />
                      <Typography variant="body2">
                        {format(new Date(activeTab === 'created' ? item.createdAt : item.approvedAt), 'PPp')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <People fontSize="small" />
                      <Typography variant="body2">
                        {formatParticipantStats(item.participantStats)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Sender info for approved tab */}
                  {activeTab === 'approved' && item.sender && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Requested by:
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {item.sender.name}
                      </Typography>
                      {getRoleChip(item.sender.role)}
                      <Typography variant="body2" color="text.secondary">
                        ({item.sender.uid})
                      </Typography>
                    </Box>
                  )}

                  {/* Approval info for created tab */}
                  {activeTab === 'created' && item.approvedBy && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Approved by:
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {item.approvedBy.name}
                      </Typography>
                      {getRoleChip(item.approvedBy.role)}
                      {item.approvedAt && (
                        <Typography variant="body2" color="text.secondary">
                          on {format(new Date(item.approvedAt), 'PP')}
                        </Typography>
                      )}
                    </Box>
                  )}

                  <Typography variant="body1" color="text.primary" sx={{ mb: 2 }}>
                    {item.message}
                  </Typography>

                  {item.targetRoles && item.targetRoles.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                      {item.targetRoles.map((role) => (
                        <Chip 
                          key={role} 
                          label={role} 
                          variant="outlined" 
                          size="small"
                        />
                      ))}
                    </Box>
                  )}
                </Box>

                <IconButton
                  onClick={() => toggleExpanded(item._id)}
                  sx={{ ml: 1 }}
                >
                  {expandedItems.has(item._id) ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>

              {/* Expanded Details */}
              <Collapse in={expandedItems.has(item._id)}>
                <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'grey.200' }}>
                  <Grid container spacing={3}>
                    {/* Participant Details */}
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" gutterBottom>
                        Participants ({item.participantStats?.total || 0})
                      </Typography>
                      <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                        {item.participantDetails && item.participantDetails.length > 0 ? (
                          item.participantDetails.map((participant, index) => (
                            <Paper 
                              key={index} 
                              sx={{ 
                                p: 1, 
                                mb: 1, 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                bgcolor: 'grey.50'
                              }}
                            >
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {participant.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  ({participant.uid})
                                </Typography>
                              </Box>
                              {getRoleChip(participant.role)}
                            </Paper>
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No participants
                          </Typography>
                        )}
                      </Box>
                    </Grid>

                    {/* Additional Details */}
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" gutterBottom>
                        Details
                      </Typography>
                      <Box sx={{ '& > *': { mb: 1 } }}>
                        {activeTab === 'created' && (
                          <>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                Status:
                              </Typography>
                              {getStatusChip(item.approvalStatus)}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                Requires Approval:
                              </Typography>
                              <Typography variant="body2">
                                {item.requiresApproval ? 'Yes' : 'No'}
                              </Typography>
                            </Box>
                          </>
                        )}
                        {item.approvalComments && (
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Comments:
                            </Typography>
                            <Paper sx={{ p: 1, mt: 0.5, bgcolor: 'grey.50' }}>
                              <Typography variant="body2">
                                {item.approvalComments}
                              </Typography>
                            </Paper>
                          </Box>
                        )}
                        {item.sourceSchool && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Source School:
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {item.sourceSchool.name}
                            </Typography>
                          </Box>
                        )}
                        {item.targetSchool && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Target School:
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {item.targetSchool.name}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </Collapse>
            </Paper>
          ))}
        </Box>

        {/* Empty State */}
        {filteredItems().length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CalendarToday sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No announcements found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {activeTab === 'created' 
                ? "You haven't created any announcements yet." 
                : userRole === 'hod' 
                  ? "You haven't approved any announcements yet."
                  : "No announcements found."
              }
            </Typography>
          </Box>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={(e, page) => setCurrentPage(page)}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AnnouncementHistory;