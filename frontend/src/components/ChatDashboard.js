import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  Divider,
  Badge
} from '@mui/material';
import {
  Chat as ChatIcon,
  Search as SearchIcon,
  School as SchoolIcon,
  Class as ClassIcon,
  Business as BusinessIcon,
  AccountBalance as AccountBalanceIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ChatDashboard = () => {
  const [chatRooms, setChatRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [totalUnread, setTotalUnread] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadChatRooms();
    loadUnreadCounts();
    
    // Refresh unread counts every 30 seconds
    const interval = setInterval(() => {
      loadUnreadCounts();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredRooms(chatRooms);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = chatRooms.filter(room =>
        (room.courseName || '').toLowerCase().includes(term) ||
        (room.courseCode || '').toLowerCase().includes(term) ||
        (room.sectionName || '').toLowerCase().includes(term) ||
        (room.departmentName || '').toLowerCase().includes(term) ||
        (room.schoolName || '').toLowerCase().includes(term)
      );
      setFilteredRooms(filtered);
    }
  }, [searchTerm, chatRooms]);

  const loadChatRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/group-chat/rooms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setChatRooms(response.data.chatRooms || []);
      setFilteredRooms(response.data.chatRooms || []);
    } catch (error) {
      console.error('Error loading chat rooms:', error);
      setError('Failed to load chat rooms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/group-chat/unread-counts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUnreadCounts(response.data.unreadCounts || {});
      setTotalUnread(response.data.totalUnread || 0);
    } catch (error) {
      console.error('Error loading unread counts:', error);
      // Don't show error to user, just fail silently
    }
  };

  const handleJoinChat = (courseId, sectionId) => {
    navigate(`/group-chat/${courseId}/${sectionId}`);
  };

  // Group rooms by school and department
  const groupedRooms = filteredRooms.reduce((acc, room) => {
    const schoolKey = room.schoolName || 'Unknown School';
    const deptKey = room.departmentName || 'Unknown Department';

    if (!acc[schoolKey]) acc[schoolKey] = {};
    if (!acc[schoolKey][deptKey]) acc[schoolKey][deptKey] = [];

    acc[schoolKey][deptKey].push(room);
    return acc;
  }, {});

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h4" sx={{ 
            fontWeight: 700,
            color: '#005b96',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <ChatIcon sx={{ fontSize: 40 }} />
            Group Chats
            {totalUnread > 0 && (
              <Badge 
                badgeContent={totalUnread} 
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '1rem',
                    height: '28px',
                    minWidth: '28px',
                    borderRadius: '14px',
                    fontWeight: 700
                  }
                }}
              >
                <Box sx={{ width: 20 }} />
              </Badge>
            )}
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ color: '#666', mb: 3 }}>
          Join course-section group chats to collaborate with your classmates and instructors
          {totalUnread > 0 && (
            <Chip 
              label={`${totalUnread} unread message${totalUnread !== 1 ? 's' : ''}`}
              color="error"
              size="small"
              sx={{ ml: 2, fontWeight: 600 }}
            />
          )}
        </Typography>

        {/* Search Bar */}
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by course, section, department, or school..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#005b96' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            maxWidth: 600,
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: '#005b96',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#005b96',
              },
            },
          }}
        />
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* No Results */}
      {filteredRooms.length === 0 && !error && (
        <Alert severity="info">
          {searchTerm ? 'No chat rooms match your search.' : 'No chat rooms available.'}
        </Alert>
      )}

      {/* Chat Rooms Grid */}
      {Object.entries(groupedRooms).map(([schoolName, departments]) => (
        <Box key={schoolName} sx={{ mb: 4 }}>
          {/* School Header */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            mb: 2,
            pb: 1,
            borderBottom: '2px solid #005b96'
          }}>
            <AccountBalanceIcon sx={{ color: '#005b96', fontSize: 28 }} />
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#005b96' }}>
              {schoolName}
            </Typography>
          </Box>

          {Object.entries(departments).map(([departmentName, rooms]) => (
            <Box key={`${schoolName}-${departmentName}`} sx={{ mb: 3, ml: 2 }}>
              {/* Department Header */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                mb: 2 
              }}>
                <BusinessIcon sx={{ color: '#03396c', fontSize: 24 }} />
                <Typography variant="h6" sx={{ fontWeight: 500, color: '#03396c' }}>
                  {departmentName}
                </Typography>
                <Chip 
                  label={`${rooms.length} chat${rooms.length !== 1 ? 's' : ''}`} 
                  size="small" 
                  sx={{ 
                    bgcolor: '#e3f2fd', 
                    color: '#005b96',
                    fontWeight: 600 
                  }} 
                />
              </Box>

              {/* Chat Room Cards */}
              <Grid container spacing={2} sx={{ ml: 2 }}>
                {rooms.map((room) => {
                  const unreadKey = `${room.courseId}_${room.sectionId}`;
                  const unreadCount = unreadCounts[unreadKey] || 0;
                  
                  return (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={`${room.courseId}-${room.sectionId}`}>
                      <Badge
                        badgeContent={unreadCount}
                        color="error"
                        sx={{
                          width: '100%',
                          '& .MuiBadge-badge': {
                            top: 12,
                            right: 12,
                            fontSize: '0.85rem',
                            height: '24px',
                            minWidth: '24px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            border: '2px solid white'
                          }
                        }}
                      >
                        <Card 
                          sx={{ 
                            width: '100%',
                            height: '100%',
                            transition: 'all 0.3s ease',
                            border: '1px solid #e0e0e0',
                            position: 'relative',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: '0 8px 16px rgba(0, 91, 150, 0.2)',
                              borderColor: '#005b96',
                            }
                          }}
                        >
                          <CardActionArea 
                            onClick={() => handleJoinChat(room.courseId, room.sectionId)}
                            sx={{ height: '100%' }}
                          >
                            <CardContent>
                          {/* Course Icon and Code */}
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            mb: 1.5 
                          }}>
                            <Avatar sx={{ 
                              bgcolor: '#005b96', 
                              width: 40, 
                              height: 40 
                            }}>
                              <ClassIcon />
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography 
                                variant="subtitle2" 
                                sx={{ 
                                  fontWeight: 700,
                                  color: '#005b96',
                                  fontSize: '0.95rem'
                                }}
                              >
                                {room.courseCode}
                              </Typography>
                            </Box>
                            {room.isCoordinator && (
                              <Chip 
                                label="CC" 
                                size="small" 
                                sx={{ 
                                  bgcolor: '#4caf50', 
                                  color: 'white',
                                  fontSize: '0.7rem',
                                  height: 20
                                }} 
                              />
                            )}
                          </Box>

                          <Divider sx={{ mb: 1.5 }} />

                          {/* Course Name */}
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 600,
                              color: '#333',
                              mb: 1,
                              minHeight: 40,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {room.courseName}
                          </Typography>

                          {/* Section Info */}
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.5,
                            mb: 1
                          }}>
                            <SchoolIcon sx={{ fontSize: 16, color: '#666' }} />
                            <Typography variant="caption" sx={{ color: '#666' }}>
                              {room.sectionName}
                            </Typography>
                          </Box>

                          {/* Semester/Year Info */}
                          {(room.semester || room.year) && (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {room.semester && (
                                <Chip 
                                  label={`Sem ${room.semester}`} 
                                  size="small" 
                                  sx={{ 
                                    height: 22,
                                    fontSize: '0.7rem',
                                    bgcolor: '#f5f5f5' 
                                  }} 
                                />
                              )}
                              {room.year && (
                                <Chip 
                                  label={room.year} 
                                  size="small" 
                                  sx={{ 
                                    height: 22,
                                    fontSize: '0.7rem',
                                    bgcolor: '#f5f5f5' 
                                  }} 
                                />
                              )}
                            </Box>
                          )}
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Badge>
                </Grid>
              );
            })}
          </Grid>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
};

export default ChatDashboard;
