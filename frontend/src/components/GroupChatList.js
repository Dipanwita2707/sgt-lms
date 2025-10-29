import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Chat as ChatIcon,
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const GroupChatListPage = () => {
  const navigate = useNavigate();
  const [chatRooms, setChatRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Color scheme
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

  useEffect(() => {
    // Filter chat rooms based on search term
    if (searchTerm.trim() === '') {
      setFilteredRooms(chatRooms);
    } else {
      const filtered = chatRooms.filter(room =>
        room.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.sectionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.schoolName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.departmentName?.toLowerCase().includes(searchTerm.toLowerCase())
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
      setChatRooms(response.data.chatRooms);
      setFilteredRooms(response.data.chatRooms);
    } catch (error) {
      console.error('Error loading chat rooms:', error);
      setError('Failed to load chat rooms');
    } finally {
      setLoading(false);
    }
  };

  const groupRoomsByDepartment = () => {
    const grouped = {};
    filteredRooms.forEach(room => {
      const key = room.departmentName || 'Other';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(room);
    });
    return grouped;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  const groupedRooms = groupRoomsByDepartment();

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ mr: 2, color: colors.primary }}
          >
            Back
          </Button>
          <Typography variant="h4" sx={{ color: colors.primary, fontWeight: 600 }}>
            Group Chat Rooms
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Access all available group chats across different courses and sections
        </Typography>
      </Box>

      {/* Search */}
      <Card sx={{ mb: 3, bgcolor: colors.background }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search by course, section, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: colors.text }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: colors.secondary },
                '&:hover fieldset': { borderColor: colors.primary },
                '&.Mui-focused fieldset': { borderColor: colors.primary }
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Chat Rooms */}
      {Object.keys(groupedRooms).length === 0 ? (
        <Card sx={{ bgcolor: colors.background }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <ChatIcon sx={{ fontSize: 64, color: colors.text, mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No chat rooms found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchTerm ? 'Try adjusting your search terms' : 'No chat rooms are available yet'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedRooms).map(([departmentName, rooms]) => (
          <Card key={departmentName} sx={{ mb: 3, bgcolor: colors.background }}>
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ color: colors.primary, fontWeight: 600 }}>
                  {departmentName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {rooms.length} chat room{rooms.length !== 1 ? 's' : ''} available
                </Typography>
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                {rooms.map((room) => (
                  <Grid item xs={12} sm={6} md={4} key={`${room.courseId}_${room.sectionId}`}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        bgcolor: 'white',
                        border: `1px solid ${colors.tertiary}`,
                        '&:hover': {
                          boxShadow: 3,
                          transform: 'translateY(-2px)',
                          transition: 'all 0.2s ease-in-out'
                        }
                      }}
                    >
                      <CardContent sx={{ pb: 1 }}>
                        <Typography variant="h6" sx={{ 
                          color: colors.primary, 
                          fontWeight: 600,
                          fontSize: '1rem',
                          mb: 1
                        }}>
                          {room.courseCode}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1, minHeight: 40 }}>
                          {room.courseName}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                          <Chip 
                            label={room.sectionName} 
                            size="small" 
                            sx={{ bgcolor: colors.tertiary, color: colors.primary }}
                          />
                          {room.schoolName && (
                            <Chip 
                              label={room.schoolName} 
                              size="small" 
                              variant="outlined"
                              sx={{ borderColor: colors.secondary, color: colors.primary }}
                            />
                          )}
                        </Box>
                      </CardContent>
                      <Box sx={{ p: 1, pt: 0 }}>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<ChatIcon />}
                          onClick={() => navigate(`/group-chat/${room.courseId}/${room.sectionId}`)}
                          sx={{
                            bgcolor: colors.primary,
                            '&:hover': { bgcolor: colors.secondary },
                            textTransform: 'none'
                          }}
                        >
                          Join Chat Room
                        </Button>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        ))
      )}

      {/* Summary */}
      {Object.keys(groupedRooms).length > 0 && (
        <Card sx={{ mt: 3, bgcolor: colors.background }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Total: {filteredRooms.length} chat room{filteredRooms.length !== 1 ? 's' : ''} 
              {searchTerm && ` matching "${searchTerm}"`}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default GroupChatListPage;