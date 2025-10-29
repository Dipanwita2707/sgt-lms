import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Divider
} from '@mui/material';
import { Chat as ChatIcon, School as SchoolIcon, Class as ClassIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const GroupChatListPage = () => {
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const colors = {
    primary: '#395a7f', // YInMn Blue
    secondary: '#6e9fc1', // Air superiority blue
    tertiary: '#a3cae9', // Uranian Blue
    background: '#e9ecee', // Anti-flash white
    text: '#acacac' // Silver
  };

  useEffect(() => {
    loadChatRooms();
  }, []);

  const loadChatRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/group-chat/rooms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChatRooms(response.data.chatRooms);
    } catch (error) {
      console.error('Error loading chat rooms:', error);
      setError('Failed to load chat rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChat = (courseId, sectionId) => {
    navigate(`/group-chat/${courseId}/${sectionId}`);
  };

  const groupedRooms = chatRooms.reduce((acc, room) => {
    const schoolKey = room.schoolName || 'Unknown School';
    const deptKey = room.departmentName || 'Unknown Department';
    const sectionKey = room.sectionName;

    if (!acc[schoolKey]) acc[schoolKey] = {};
    if (!acc[schoolKey][deptKey]) acc[schoolKey][deptKey] = {};
    if (!acc[schoolKey][deptKey][sectionKey]) acc[schoolKey][deptKey][sectionKey] = [];

    acc[schoolKey][deptKey][sectionKey].push(room);
    return acc;
  }, {});

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
      <Paper elevation={3} sx={{ p: 3, bgcolor: colors.background }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ color: colors.primary, mb: 1 }}>
            Group Chat Rooms
          </Typography>
          <Typography variant="body1" sx={{ color: colors.text }}>
            Select a course-section combination to join the group chat
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {Object.keys(groupedRooms).length === 0 ? (
          <Alert severity="info">
            No chat rooms available
          </Alert>
        ) : (
          Object.entries(groupedRooms).map(([schoolName, departments]) => (
            <Box key={schoolName} sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ color: colors.primary, mb: 2, display: 'flex', alignItems: 'center' }}>
                <SchoolIcon sx={{ mr: 1 }} />
                {schoolName}
              </Typography>
              
              {Object.entries(departments).map(([deptName, sections]) => (
                <Box key={deptName} sx={{ ml: 2, mb: 3 }}>
                  <Typography variant="h6" sx={{ color: colors.secondary, mb: 1, display: 'flex', alignItems: 'center' }}>
                    <ClassIcon sx={{ mr: 1 }} />
                    {deptName}
                  </Typography>
                  
                  {Object.entries(sections).map(([sectionName, courses]) => (
                    <Paper key={sectionName} sx={{ ml: 2, mb: 2, p: 2, bgcolor: 'white' }}>
                      <Typography variant="subtitle1" sx={{ color: colors.primary, mb: 1, fontWeight: 600 }}>
                        Section: {sectionName}
                      </Typography>
                      
                      <List>
                        {courses.map((room, index) => (
                          <React.Fragment key={room.courseId}>
                            <ListItem
                              sx={{
                                border: `1px solid ${colors.tertiary}`,
                                borderRadius: 1,
                                mb: 1,
                                bgcolor: colors.background
                              }}
                            >
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: colors.primary }}>
                                        {room.courseCode}
                                      </Typography>
                                      <Typography variant="body2" sx={{ color: '#333' }}>
                                        {room.courseName}
                                      </Typography>
                                    </Box>
                                    <Button
                                      variant="contained"
                                      size="small"
                                      startIcon={<ChatIcon />}
                                      onClick={() => handleJoinChat(room.courseId, room.sectionId)}
                                      sx={{
                                        bgcolor: colors.primary,
                                        '&:hover': { bgcolor: colors.secondary }
                                      }}
                                    >
                                      Join Chat
                                    </Button>
                                  </Box>
                                }
                              />
                            </ListItem>
                          </React.Fragment>
                        ))}
                      </List>
                    </Paper>
                  ))}
                </Box>
              ))}
            </Box>
          ))
        )}
      </Paper>
    </Container>
  );
};

export default GroupChatListPage;