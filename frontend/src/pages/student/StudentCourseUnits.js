import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  CircularProgress, 
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Breadcrumbs,
  Link,
  Paper,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress
} from '@mui/material';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { getCourseUnits } from '../../api/studentVideoApi';
import axiosConfig from '../../utils/axiosConfig';
import { formatDuration } from '../../utils/videoUtils';

// Icons
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LockIcon from '@mui/icons-material/Lock';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SchoolIcon from '@mui/icons-material/School';

const StudentCourseUnits = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  const [course, setCourse] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizLocks, setQuizLocks] = useState({}); // Track quiz locks by unit ID

  // Check quiz availability for a unit
  const checkQuizAvailability = async (unitId) => {
    try {
      const response = await axiosConfig.get(`/api/student/unit/${unitId}/quiz/availability`);
      return response.data;
    } catch (error) {
      console.error('Error checking quiz availability:', error);
      return { available: false, locked: true, reason: 'Error checking availability' };
    }
  };

  // Fetch quiz locks for all units
  const fetchQuizLocks = async (units) => {
    const locks = {};
    for (const unit of units) {
      if (unit.quizPool) {
        const availability = await checkQuizAvailability(unit._id);
        locks[unit._id] = availability;
      }
    }
    setQuizLocks(locks);
  };
  
  useEffect(() => {
    const fetchCourseAndUnits = async () => {
      try {
        setLoading(true);
        
        // Fetch units for this course
        const unitsResponse = await getCourseUnits(courseId, token);
        
        // Set course data if available from the response
        if (unitsResponse && unitsResponse.length > 0) {
          // Fetch course information from the first unit's course reference
          const firstUnit = unitsResponse[0];
          setCourse({
            _id: firstUnit.course._id,
            title: firstUnit.course.title,
            courseCode: firstUnit.course.courseCode,
            description: firstUnit.course.description
          });
        }
        
        setUnits(unitsResponse);
        
        // Fetch quiz locks for units with quizzes
        await fetchQuizLocks(unitsResponse);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching course units:', err);
        setError('Failed to load course units. Please try again.');
        setLoading(false);
      }
    };
    
    if (token && courseId) {
      fetchCourseAndUnits();
    }
  }, [token, courseId]);
  
  const handleWatchVideo = (unitId, videoId) => {
    navigate(`/student/course/${courseId}/unit/${unitId}/video/${videoId}`);
  };
  
  // Calculate unit progress percentage
  const calculateUnitProgress = (unit) => {
    if (!unit.progress) return 0;
    
    const { videosCompleted, totalVideos } = unit.progress;
    if (totalVideos === 0) return 0;
    
    return Math.round((videosCompleted / totalVideos) * 100);
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 3, md: 4 }, mb: 4, px: { xs: 1, sm: 2, md: 3 } }}>
      {/* Breadcrumbs - Hide on mobile */}
      <Breadcrumbs 
        aria-label="breadcrumb" 
        sx={{ 
          mb: 2, 
          display: { xs: 'none', sm: 'flex' }
        }}
      >
        <Link component={RouterLink} to="/student" color="inherit">
          Dashboard
        </Link>
        <Link component={RouterLink} to="/student/courses" color="inherit">
          My Courses
        </Link>
        <Typography color="text.primary">Course Units</Typography>
      </Breadcrumbs>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : units.length === 0 ? (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            This course doesn't have any units yet. Please check back later or contact your instructor.
          </Alert>
          <Button 
            component={RouterLink} 
            to={`/student/course/${courseId}/videos`}
            variant="contained"
            color="primary"
          >
            View Course Videos
          </Button>
        </Box>
      ) : (
        <>
          <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
            {course?.title || 'Course Units'}
          </Typography>
          
          {course?.courseCode && (
            <Typography variant="subtitle1" color="text.secondary" paragraph sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              Course Code: {course.courseCode}
            </Typography>
          )}
          
          <Alert severity="info" sx={{ mb: 3, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            Each unit contains videos and other learning materials. Complete units in order to unlock subsequent units.
          </Alert>
          
          {units.map((unit, index) => (
            <Accordion 
              key={unit._id}
              defaultExpanded={index === 0}
              disabled={!unit.unlocked}
              sx={{
                mb: 2,
                opacity: unit.unlocked ? 1 : 0.7,
                '& .MuiAccordionSummary-root': {
                  bgcolor: unit.unlocked 
                    ? (calculateUnitProgress(unit) === 100 ? 'success.light' : 'primary.light') 
                    : 'action.disabledBackground',
                  px: { xs: 1, sm: 2 },
                  py: { xs: 0.5, sm: 1 },
                  cursor: unit.unlocked ? 'pointer' : 'not-allowed'
                },
                '& .MuiAccordionDetails-root': {
                  px: { xs: 1, sm: 2, md: 3 },
                  py: { xs: 1.5, sm: 2 }
                }
              }}
            >
              <AccordionSummary
                expandIcon={unit.unlocked ? <ExpandMoreIcon /> : <LockIcon />}
                aria-controls={`unit-${unit._id}-content`}
                id={`unit-${unit._id}-header`}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', pr: 1 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    width: '100%',
                    flexWrap: { xs: 'wrap', sm: 'nowrap' }
                  }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' },
                        mb: { xs: 1, sm: 0 },
                        flex: { xs: '1 1 100%', sm: '1 1 auto' },
                        fontWeight: 600
                      }}
                    >
                      Week {index + 1}: {unit.title}
                    </Typography>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      flexWrap: 'wrap',
                      justifyContent: { xs: 'flex-start', sm: 'flex-end' }
                    }}>
                      {/* Deadline Warning */}
                      {unit.deadlineInfo && unit.deadlineInfo.hasDeadline && (
                        <Chip 
                          label={
                            unit.deadlineInfo.isExpired 
                              ? 'Deadline Passed' 
                              : `${unit.deadlineInfo.daysLeft} days left`
                          }
                          color={
                            unit.deadlineInfo.isExpired 
                              ? 'error' 
                              : unit.deadlineInfo.daysLeft <= 2 
                                ? 'error' 
                                : unit.deadlineInfo.daysLeft <= 5 
                                  ? 'warning' 
                                  : 'info'
                          }
                          size="small"
                          variant={unit.deadlineInfo.isExpired ? 'filled' : 'outlined'}
                          sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                        />
                      )}
                      {unit.unlocked && unit.progress && (
                        <Chip 
                          label={`${calculateUnitProgress(unit)}% complete`}
                          color={calculateUnitProgress(unit) === 100 ? 'success' : 'primary'}
                          size="small"
                          sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                        />
                      )}
                      {!unit.unlocked && (
                        <Chip 
                          icon={<LockIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />}
                          label="Locked" 
                          size="small"
                          sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                        />
                      )}
                    </Box>
                  </Box>
                  
                  {unit.unlocked && (
                    <LinearProgress 
                      variant="determinate" 
                      value={calculateUnitProgress(unit)} 
                      sx={{ 
                        mt: 1, 
                        mb: 1, 
                        height: { xs: 6, sm: 8 }, 
                        borderRadius: 1 
                      }}
                    />
                  )}
                  
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ 
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      display: { xs: 'none', sm: 'block' }
                    }}
                  >
                    {unit.description}
                  </Typography>
                </Box>
              </AccordionSummary>
              
              <AccordionDetails>
                {/* Deadline Warning for Expired Units */}
                {unit.deadlineInfo && unit.deadlineInfo.hasDeadline && unit.deadlineInfo.isExpired && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>This unit has passed its deadline</strong> 
                      {unit.deadlineInfo.strictDeadline && ' and is no longer accessible'}.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Deadline was: {new Date(unit.deadlineInfo.deadline).toLocaleDateString()} at{' '}
                      {new Date(unit.deadlineInfo.deadline).toLocaleTimeString()}
                    </Typography>
                    {unit.deadlineInfo.deadlineDescription && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {unit.deadlineInfo.deadlineDescription}
                      </Typography>
                    )}
                  </Alert>
                )}
                
                {unit.videos && unit.videos.length > 0 ? (
                  <List>
                    {unit.videos.map((video, videoIndex) => (
                      <React.Fragment key={video._id}>
                        <ListItem 
                          alignItems="flex-start"
                          sx={{ 
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' },
                            flexDirection: { xs: 'column', sm: 'row' },
                            px: { xs: 1, sm: 2 },
                            py: { xs: 1.5, sm: 2 }
                          }}
                          onClick={() => handleWatchVideo(unit._id, video._id)}
                        >
                          <ListItemIcon sx={{ minWidth: { xs: 36, sm: 56 }, mt: { xs: 0, sm: '4px' } }}>
                            {video.watched ? (
                              <CheckCircleIcon color="success" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                            ) : (
                              <PlayCircleOutlineIcon color="primary" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                            )}
                          </ListItemIcon>
                          
                          <ListItemText
                            sx={{ m: 0, flex: 1 }}
                            primary={
                              <Typography variant="subtitle1" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                {videoIndex + 1}. {video.title}
                                {video.watched && (
                                  <Chip 
                                    size="small" 
                                    label="Watched" 
                                    color="success" 
                                    sx={{ ml: 1, height: { xs: 18, sm: 24 }, fontSize: { xs: '0.65rem', sm: '0.75rem' } }} 
                                  />
                                )}
                              </Typography>
                            }
                            secondary={
                              <>
                                <Typography 
                                  component="span" 
                                  variant="body2" 
                                  color="text.primary"
                                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                                >
                                  {formatDuration(video.duration || 0)}
                                </Typography>
                                
                                {/* Add progress bar for each video */}
                                {video.duration > 0 && (
                                  <Box sx={{ mt: 1, mb: 1 }}>
                                    <Typography 
                                      variant="body2" 
                                      color="text.secondary" 
                                      sx={{ mb: 0.5, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                    >
                                      Progress: {Math.min(100, Math.round((video.timeSpent / video.duration) * 100))}%
                                    </Typography>
                                    <Box sx={{ width: '100%', mr: 1 }}>
                                      <Box
                                        sx={{
                                          width: '100%',
                                          height: { xs: 6, sm: 8 },
                                          bgcolor: 'grey.300',
                                          borderRadius: 5,
                                          position: 'relative'
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            height: '100%',
                                            borderRadius: 5,
                                            bgcolor: video.watched ? 'success.main' : 'primary.main',
                                            width: `${Math.min(100, Math.round((video.timeSpent / video.duration) * 100))}%`,
                                            transition: 'width 0.5s ease-in-out'
                                          }}
                                        />
                                      </Box>
                                    </Box>
                                  </Box>
                                )}
                                
                                {video.description && (
                                  <Typography 
                                    variant="body2" 
                                    color="text.secondary"
                                    sx={{ 
                                      fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                      display: { xs: 'none', sm: 'block' }
                                    }}
                                  >
                                    {video.description.substring(0, 100)}
                                    {video.description.length > 100 ? '...' : ''}
                                  </Typography>
                                )}
                              </>
                            }
                          />
                          
                          <Button 
                            variant="outlined" 
                            color="primary" 
                            size="small"
                            sx={{ 
                              mt: { xs: 1, sm: 1 },
                              ml: { xs: 0, sm: 2 },
                              width: { xs: '100%', sm: 'auto' },
                              fontSize: { xs: '0.75rem', sm: '0.875rem' },
                              px: { xs: 2, sm: 3 }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWatchVideo(unit._id, video._id);
                            }}
                          >
                            {video.watched ? 'Rewatch' : 'Watch'}
                          </Button>
                        </ListItem>
                        
                        {videoIndex < unit.videos.length - 1 && <Divider variant="inset" component="li" />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Typography 
                    variant="body1" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                  >
                    No videos available in this unit yet.
                  </Typography>
                )}
                
                {/* Add other unit content types like reading materials and quizzes here */}
                {unit.readingMaterials && unit.readingMaterials.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Reading Materials
                    </Typography>
                    <List>
                      {unit.readingMaterials.map((material, index) => (
                        <ListItem key={material._id}>
                          <ListItemIcon>
                            <MenuBookIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={material.title}
                            secondary={material.description}
                          />
                          {material.completed && (
                            <Chip 
                              size="small" 
                              label="Completed" 
                              color="success" 
                            />
                          )}
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
                
                {/* Display Quiz Pool if available */}
                {unit.quizPool && (
                  <Box sx={{ mt: 2 }}>
                    <Typography 
                      variant="subtitle1" 
                      gutterBottom
                      sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}
                    >
                      Unit Quiz
                    </Typography>
                    <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: 2
                      }}>
                        <ListItemIcon sx={{ minWidth: { xs: 36, sm: 56 } }}>
                          <SchoolIcon 
                            color={quizLocks[unit._id]?.isLocked ? 'error' : 'primary'}
                            sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
                          />
                        </ListItemIcon>
                        
                        <Box sx={{ flex: 1 }}>
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              fontWeight: 'bold',
                              fontSize: { xs: '0.875rem', sm: '1rem' },
                              mb: 0.5
                            }}
                          >
                            {unit.quizPool.title || `${unit.title} Quiz`}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                          >
                            {quizLocks[unit._id]?.isLocked 
                              ? `🔒 ${quizLocks[unit._id]?.lockInfo?.reason || 'Complete all 1 videos in this unit to unlock the quiz'}`
                              : unit.quizPool.description || `Complete this quiz to test your knowledge`
                            }
                          </Typography>
                          
                          {unit.quizPool.attempts !== undefined && (
                            <Chip 
                              label={`Attempts: ${unit.quizPool.attempts || 0}/3`}
                              size="small"
                              color={unit.quizPool.attempts >= 3 ? 'error' : 'default'}
                              sx={{ 
                                mt: 1,
                                fontSize: { xs: '0.65rem', sm: '0.75rem' }
                              }}
                            />
                          )}
                        </Box>
                        
                        <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
                          {quizLocks[unit._id]?.isLocked ? (
                            <Alert 
                              severity="warning" 
                              sx={{ 
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                py: { xs: 0.5, sm: 1 }
                              }}
                            >
                              Quiz Locked
                            </Alert>
                          ) : (
                            <Button 
                              variant="contained" 
                              color="primary" 
                              size={window.innerWidth < 600 ? "medium" : "large"}
                              fullWidth={window.innerWidth < 600}
                              sx={{ 
                                fontSize: { xs: '0.875rem', sm: '1rem' },
                                px: { xs: 3, sm: 4 },
                                py: { xs: 1, sm: 1.5 }
                              }}
                              onClick={async () => {
                                // Check quiz availability before starting
                                const availability = await checkQuizAvailability(unit._id);
                                if (availability.isLocked) {
                                  alert(`Quiz is locked: ${availability.lockInfo?.reason || 'Contact admin to unlock'}`);
                                  return;
                                }
                                
                                // Attempt to enter fullscreen using the user click gesture
                                const el = document.documentElement;
                                try {
                                  let p;
                                  if (el.requestFullscreen) p = el.requestFullscreen();
                                  else if (el.webkitRequestFullscreen) p = el.webkitRequestFullscreen();
                                  else if (el.mozRequestFullScreen) p = el.mozRequestFullScreen();
                                  else if (el.msRequestFullscreen) p = el.msRequestFullscreen();
                                  if (p && typeof p.catch === 'function') {
                                    try { await p; } catch (_) { /* ignore permission errors */ }
                                  }
                                } catch (_) { /* ignore */ }
                                // Navigate to secure launcher so the quiz opens in secure/FS flow
                                navigate(`/student/course/${courseId}/quiz/${unit.quizPool._id}`);
                              }}
                            >
                              Start Quiz
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  </Box>
                )}

                {/* Legacy: Show individual quizzes if no quiz pool */}
                {!unit.quizPool && unit.quizzes && unit.quizzes.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Quizzes
                    </Typography>
                    <List>
                      {unit.quizzes.map((quiz, index) => (
                        <ListItem key={quiz._id}>
                          <ListItemIcon>
                            <SchoolIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={quiz.title}
                            secondary={quiz.description}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </>
      )}
    </Container>
  );
};

export default StudentCourseUnits;
