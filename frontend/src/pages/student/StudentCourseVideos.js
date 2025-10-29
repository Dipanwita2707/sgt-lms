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
import axios from 'axios';
import { formatVideoUrl, formatDuration } from '../../utils/videoUtils';
import CustomVideoPlayer from '../../components/student/CustomVideoPlayer';
import { getCourseVideos, updateWatchHistory, getStudentQuizResults, getDeadlineWarnings } from '../../api/studentVideoApi';

// Icons
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LockIcon from '@mui/icons-material/Lock';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import QuizIcon from '@mui/icons-material/Quiz';
import SchoolIcon from '@mui/icons-material/School';
import WarningIcon from '@mui/icons-material/Warning';

// Function to check if a video is locked (for non-unit based videos)
const isVideoLocked = (index, videos) => {
  // Find the last watched video
  let lastWatchedIndex = -1;
  for (let i = 0; i < videos.length; i++) {
    // Only count videos that have been fully watched
    if (videos[i].watched === true) {
      lastWatchedIndex = i;
    } else {
      // Found the first unwatched video
      break;
    }
  }
  
  // Only unlock the video right after the last watched video
  // or the first video if none are watched yet
  if (index === lastWatchedIndex + 1 || index === 0) {
    console.log(`Video at index ${index} is unlocked (next in sequence)`);
    return false;
  }
  
  console.log(`Video at index ${index} is locked. Last watched index: ${lastWatchedIndex}`);
  return true;
};

const StudentCourseVideos = () => {
  const { courseId, videoId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  const [course, setCourse] = useState(null);
  const [units, setUnits] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentVideo, setCurrentVideo] = useState(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [isUpdatingVideoState, setIsUpdatingVideoState] = useState(false);
  const [expandedUnit, setExpandedUnit] = useState(null);
  const [hasUnits, setHasUnits] = useState(false);
  const [latestUnitAttempts, setLatestUnitAttempts] = useState({}); // unitId -> latest attempt
  const [quizResultsLoading, setQuizResultsLoading] = useState(true);
  const [quizResultsError, setQuizResultsError] = useState(null);
  const [unitQuizStatus, setUnitQuizStatus] = useState({}); // unitId -> { quizCompleted, quizPassed }
  const [deadlineWarnings, setDeadlineWarnings] = useState([]);
  const [deadlineLoading, setDeadlineLoading] = useState(true);
  
  useEffect(() => {
    const fetchCourseAndVideos = async () => {
      try {
        setLoading(true);
        
        // Fetch videos for this course (this API returns both course and videos)
        const videosResponse = await getCourseVideos(courseId, token);
        
        console.log('Student videos response:', videosResponse);
        
        setCourse(videosResponse.course);
        
        // Handle both unit-based and direct video responses
        if (videosResponse.units && videosResponse.units.length > 0) {
          // Course has units - use unit-based display
          console.log('Course has units:', videosResponse.units.length);
          setUnits(videosResponse.units);
          setHasUnits(true);
          
          // Expand the first unlocked unit by default
          const firstUnlockedUnit = videosResponse.units.find(unit => unit.unlocked);
          if (firstUnlockedUnit) {
            setExpandedUnit(firstUnlockedUnit._id);
          }
          
          // Also extract all videos for backward compatibility
          let allVideos = [];
          videosResponse.units.forEach(unit => {
            if (unit.videos && unit.videos.length > 0) {
              allVideos.push(...unit.videos);
            }
          });
          setVideos(allVideos);
          
          console.log('Total videos found:', allVideos.length);
          console.log('Video URLs:', allVideos.map(v => ({ id: v._id, title: v.title, url: v.videoUrl })));

          // Prefetch availability for each unit to derive pass/completed fallback
          try {
            const statuses = {};
            await Promise.all(videosResponse.units.map(async (u) => {
              try {
                const avail = await axios.get(`/api/student/unit/${u._id}/quiz/availability`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                statuses[u._id] = {
                  quizCompleted: !!avail.data.quizCompleted,
                  quizPassed: !!avail.data.quizPassed,
                  attemptsTaken: typeof avail.data.attemptsTaken === 'number' ? avail.data.attemptsTaken : undefined,
                  remainingAttempts: typeof avail.data.remainingAttempts === 'number' ? avail.data.remainingAttempts : undefined,
                  attemptLimit: typeof avail.data.attemptLimit === 'number' ? avail.data.attemptLimit : 3,
                  isLocked: !!avail.data.isLocked,
                  lockInfo: avail.data.lockInfo || null
                };
              } catch (e) {
                // ignore per-unit errors; keep others
              }
            }));
            setUnitQuizStatus(statuses);
          } catch (availErr) {
            console.warn('Could not prefetch unit availability:', availErr?.response?.data || availErr.message);
          }
        } else if (videosResponse.videos) {
          // Course has direct videos - use old display
          console.log('Course has direct videos:', videosResponse.videos.length);
          setVideos(videosResponse.videos);
          setHasUnits(false);
        }
        
        // Fetch latest quiz results for this course to show marks per unit
        try {
          setQuizResultsLoading(true);
          setQuizResultsError(null);
          const results = await getStudentQuizResults(courseId, token);
          console.log('Quiz results for course:', { courseId, attempts: results?.attempts?.length || 0 });
          if (results && Array.isArray(results.attempts)) {
            const latest = {};
            results.attempts.forEach((a) => {
              if (a.unit && a.unit._id) {
                const uid = a.unit._id;
                const prev = latest[uid];
                if (!prev || new Date(a.completedAt || 0) > new Date(prev.completedAt || 0)) {
                  latest[uid] = a;
                }
              }
            });
            console.log('Latest attempts by unit:', Object.keys(latest));
            setLatestUnitAttempts(latest);
          }
        } catch (resErr) {
          console.warn('Could not load quiz results for marks display:', resErr?.response?.data || resErr.message);
          setQuizResultsError(resErr?.response?.data?.message || resErr.message || 'Failed to load results');
        } finally {
          setQuizResultsLoading(false);
        }

        // If videoId is provided in URL, find and open that video
        if (videoId) {
          let videoToPlay = null;
          if (hasUnits && units.length > 0) {
            // Search in units
            for (const unit of units) {
              videoToPlay = unit.videos.find(v => v._id === videoId);
              if (videoToPlay) break;
            }
          } else {
            // Search in direct videos
            videoToPlay = videos.find(v => v._id === videoId);
          }
          
          if (videoToPlay) {
            setCurrentVideo(videoToPlay);
            setVideoOpen(true);
            
            // Record initial video watch (don't override position)
            updateWatchHistory(videoId, {
              timeSpent: 0.1,
              duration: videoToPlay.duration
              // Don't send currentTime: 0 - let the backend keep existing position
            }, token).catch(err => {
              console.error('Error recording initial video watch:', err);
            });
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching course videos:', err);
        console.error('Error details:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          message: err.message
        });
        
        if (err.response?.status === 403) {
          setError('You are not assigned to this course or do not have permission to view videos.');
        } else if (err.response?.status === 404) {
          setError('Course not found. Please check the course ID.');
        } else if (err.response?.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else {
          setError(`Failed to load course videos: ${err.response?.data?.message || err.message}`);
        }
        setLoading(false);
      }
    };
    
    if (token && courseId) {
      fetchCourseAndVideos();
    }
  }, [token, courseId, videoId, videoCompleted]);

  // Fetch deadline warnings for this course
  useEffect(() => {
    const fetchDeadlineWarnings = async () => {
      try {
        console.log('🔍 CourseVideos: Fetching deadline warnings for course:', courseId);
        if (token && courseId) {
          const warnings = await getDeadlineWarnings(courseId, token);
          console.log('📋 Received course deadline warnings:', warnings);
          setDeadlineWarnings(warnings.warnings || []);
        }
      } catch (error) {
        console.error('❌ Error fetching course deadline warnings:', error);
        setDeadlineWarnings([]);
      } finally {
        setDeadlineLoading(false);
      }
    };

    if (token && courseId) {
      fetchDeadlineWarnings();
    }
  }, [token, courseId]);
  
  const handlePlayVideo = (video) => {
    setCurrentVideo(video);
    setVideoOpen(true);
    
    // Record initial video watch event with a minimal time spent (0.1s to pass validation)
    try {
      if (!token) {
        console.warn('Cannot update watch history: Token is missing');
        return;
      }
      
      updateWatchHistory(video._id, {
        timeSpent: 0.1, // Use 0.1 instead of 0 to pass backend validation
        duration: video.duration
        // Don't send currentTime: 0 - let the backend keep existing position
      }, token);
    } catch (err) {
      console.error('Error recording video watch:', err);
    }
  };

  const handleAccordionChange = (unitId) => (event, isExpanded) => {
    setExpandedUnit(isExpanded ? unitId : null);
  };

  const generateUnitQuiz = async (unitId) => {
    try {
      // Check if token exists
      if (!token) {
        console.error('No authentication token found');
        alert('Authentication token is missing. Please log in again.');
        navigate('/login');
        return;
      }

      console.log('Generating quiz for unit:', unitId);
      // First check if quiz is available
      const availabilityResponse = await axios.get(`/api/student/unit/${unitId}/quiz/availability`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Full quiz availability response:', availabilityResponse.data);
      if (!availabilityResponse.data.available) {
        // Show detailed information about why quiz is not available
        console.error('Quiz not available. Details:', availabilityResponse.data);
        alert(`Quiz is not available.\n\nReason: ${availabilityResponse.data.message || 'Unknown'}\n\nDetails:\n- Total Videos: ${availabilityResponse.data.totalVideos || 'N/A'}\n- Watched Videos: ${availabilityResponse.data.watchedVideos || 'N/A'}\n- All Videos Watched: ${availabilityResponse.data.allVideosWatched || 'false'}\n\nCheck console for more details.`);
        return;
      }
      // Try to generate the quiz
      let response = await axios.post(`/api/student/unit/${unitId}/quiz/generate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // If incomplete attempt is found, prompt user to destroy or continue
      if (response.data.incomplete && response.data.attemptId) {
        const destroy = window.confirm('You have an incomplete quiz attempt.\nClick OK to start a new quiz (your previous attempt will be deleted), or Cancel to continue your previous attempt.');
        if (destroy) {
          // Regenerate with destroyIncomplete param
          response = await axios.post(`/api/student/unit/${unitId}/quiz/generate?destroyIncomplete=true`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('After destroyIncomplete, quiz response:', response.data);
        } else {
          // Continue previous attempt
          console.log('Continuing previous attempt, navigating to:', `/student/course/${courseId}/quiz/${response.data.attemptId}`);
          // Explicitly set localStorage again to ensure it's available
          localStorage.setItem('token', token);
          navigate(`/student/course/${courseId}/quiz/${response.data.attemptId}`);
          return;
        }
      }
      // Navigate to quiz page with the attempt ID
      if (response.data && response.data.attemptId) {
        console.log('Quiz generated successfully, attemptId:', response.data.attemptId);
        console.log('About to navigate to:', `/student/course/${courseId}/quiz/${response.data.attemptId}`);
        
        // Debugging
        console.log('DEBUG Navigation: Current path:', window.location.pathname);
        console.log('DEBUG Navigation: Current user:', localStorage.getItem('user'));
        console.log('DEBUG Navigation: Token present:', !!token);
        
        // Force sync to ensure everything is saved to localStorage
        localStorage.setItem('token', token);
        const user = localStorage.getItem('user');
        if (user) {
          localStorage.setItem('user', user); // Re-save to ensure it's not corrupted
        }
        
        // Use direct window location instead of navigate
        try {
          console.log('Using window.location.href for navigation');
          window.location.href = `/student/course/${courseId}/quiz/${response.data.attemptId}`;
          return; // Important: stop execution after redirect
        } catch (navError) {
          console.error('Direct navigation failed:', navError);
          // Fallback to React Router navigate
          console.log('Falling back to React Router navigate');
          navigate(`/student/course/${courseId}/quiz/${response.data.attemptId}`);
        }
      } else {
        console.error('Quiz generation failed or no attemptId:', response.data);
        alert('Quiz generated but no attempt ID received. Please try again.');
      }
    } catch (err) {
      console.error('Error generating quiz:', err);
      if (err.response?.status === 403) {
        const responseData = err.response?.data;
        
        // Check if this is a quiz lock error
        if (responseData?.isLocked) {
          const lockInfo = responseData.lockInfo;
          const authLevel = lockInfo?.unlockAuthorizationLevel === 'DEAN' ? 'Dean' : 'Teacher';
          const remainingUnlocks = lockInfo?.remainingTeacherUnlocks || 0;
          
          let lockMessage = `🔒 Quiz Locked\n\n`;
          lockMessage += `Reason: ${responseData.message}\n\n`;
          lockMessage += `Authorization Required: ${authLevel}\n`;
          
          if (authLevel === 'Teacher' && remainingUnlocks > 0) {
            lockMessage += `Teacher Unlocks Remaining: ${remainingUnlocks}\n\n`;
            lockMessage += `Contact your teacher to request an unlock.`;
          } else if (authLevel === 'Dean') {
            lockMessage += `Teacher unlock limit exceeded.\n\n`;
            lockMessage += `Contact the Dean for authorization.`;
          } else {
            lockMessage += `\nContact your instructor for assistance.`;
          }
          
          alert(lockMessage);
        } else {
          // Regular authorization error
          alert(`Authorization Error: ${responseData?.message || 'You are not authorized to take this quiz. Please complete all videos first.'}\n\nCheck console for more details.`);
        }
      } else if (err.response?.status === 404) {
        alert('Quiz not found for this unit. Please contact your instructor.');
      } else if (err.response?.status === 400) {
        alert(err.response?.data?.message || 'Bad request. Please check if you meet the quiz requirements.');
      } else {
        alert(`Error: ${err.response?.data?.message || 'Error generating quiz. Please try again.'}\n\nStatus: ${err.response?.status || 'Unknown'}\nCheck console for more details.`);
      }
    }
  };

  const renderUnitProgress = (unit) => {
    const totalVideos = unit.videos.length;
    const backendCompletedVideos = unit.progress.videosCompleted;
    const frontendCompletedVideos = unit.videos.filter(v => v.watched).length;
    
    // Use backend count as the authoritative source, fallback to frontend calculation
    const completedVideos = typeof backendCompletedVideos === 'number' ? backendCompletedVideos : frontendCompletedVideos;
    const progressPercentage = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;
    
    console.log('Unit progress calculation:', {
      unitId: unit._id,
      totalVideos,
      backendCompletedVideos,
      frontendCompletedVideos,
      usingCompletedVideos: completedVideos,
      progressPercentage
    });
    
    return (
      <Box sx={{ mt: 1, mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          Progress: {completedVideos}/{totalVideos} videos completed ({Math.round(progressPercentage)}%)
          {backendCompletedVideos !== frontendCompletedVideos && (
            <Typography component="span" color="warning.main" sx={{ ml: 1, fontSize: '0.75rem' }}>
              (Frontend: {frontendCompletedVideos})
            </Typography>
          )}
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={progressPercentage} 
          sx={{ height: 8, borderRadius: 5 }}
        />
      </Box>
    );
  };

  const renderQuizSection = (unit) => {
    const frontendWatchedVideos = unit.videos.filter(v => v.watched).length;
    const backendCompletedVideos = unit.progress?.videosCompleted;
    
    // Use backend count as the authoritative source, fallback to frontend calculation
    const actualWatchedVideos = typeof backendCompletedVideos === 'number' ? backendCompletedVideos : frontendWatchedVideos;
    const allVideosWatched = actualWatchedVideos === unit.videos.length && unit.videos.length > 0;
    const hasCompletedVideos = actualWatchedVideos > 0;
    const quizCompleted = unit.progress && unit.progress.unitQuizCompleted;
    // Prefer central results API; fallback to unit.progress.latestQuizAttempt
    const latestAttempt = latestUnitAttempts[unit._id] || (unit.progress && unit.progress.latestQuizAttempt ? {
      percentage: unit.progress.latestQuizAttempt.percentage,
      passed: unit.progress.latestQuizAttempt.passed,
      completedAt: unit.progress.latestQuizAttempt.completedAt
    } : null);
    const quizPassedFlag = (unit.progress && unit.progress.unitQuizPassed) || (unitQuizStatus[unit._id]?.quizPassed) || false;
    const quizCompletedFlag = (unit.progress && unit.progress.unitQuizCompleted) || (unitQuizStatus[unit._id]?.quizCompleted) || false;

    // Derive a single attempt object if available from either source
  const attemptToShow = latestAttempt;
  const avail = unitQuizStatus[unit._id] || {};
  const attemptsTaken = typeof avail.attemptsTaken === 'number' ? avail.attemptsTaken : undefined;
  const remainingAttempts = typeof avail.remainingAttempts === 'number' ? avail.remainingAttempts : undefined;
  const attemptLimit = typeof avail.attemptLimit === 'number' ? avail.attemptLimit : 3;
  const isLocked = !!avail.isLocked;
  const lockInfo = avail.lockInfo;
    return (
      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <QuizIcon color={allVideosWatched ? "primary" : "disabled"} />
          <Typography variant="h6">Unit Quiz</Typography>
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
            {attemptToShow ? (
              <>
                <Chip
                  label={`${Math.round(attemptToShow.percentage)}%`}
                  color={attemptToShow.passed ? 'success' : 'error'}
                  size="small"
                />
                <Typography variant="body2" color="text.secondary">
                  {attemptToShow.completedAt ? new Date(attemptToShow.completedAt).toLocaleDateString() : ''}
                </Typography>
              </>
            ) : quizResultsLoading ? (
              <Typography variant="body2" color="text.secondary">Loading…</Typography>
            ) : (quizPassedFlag || quizCompletedFlag) ? (
              <>
                <Chip
                  label={quizPassedFlag ? 'Passed' : 'Failed'}
                  color={quizPassedFlag ? 'success' : 'error'}
                  size="small"
                />
              </>
            ) : quizResultsError ? (
              <Typography variant="body2" color="error">Results unavailable</Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No attempt yet
              </Typography>
            )}
            {/* Attempts counter (when available) */}
            {typeof attemptsTaken === 'number' && (
              <Chip
                label={`Attempts: ${attemptsTaken}/${attemptLimit}`}
                color={attemptsTaken >= attemptLimit ? 'error' : 'default'}
                size="small"
              />
            )}
          </Box>
        </Box>
        {!allVideosWatched ? (
          <Alert severity="info">
            Complete all {unit.videos.length} videos in this unit to unlock the quiz. 
            ({hasCompletedVideos}/{unit.videos.length} completed)
          </Alert>
        ) : quizPassedFlag ? (
          <Alert severity="success">
            You have passed this unit's quiz. The next unit is now unlocked!
          </Alert>
        ) : (
          <Box sx={{ mt: 1 }}>
            {isLocked && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                This unit quiz is locked due to security violations. {lockInfo?.reason ? `Reason: ${lockInfo.reason}.` : ''}
                Please contact your administrator to unlock this section.
              </Alert>
            )}
            {quizCompletedFlag && (
              <Alert severity="error" sx={{ mb: 1 }}>
                You completed the quiz but did not pass. Review the content and try again.
              </Alert>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              • 10 random questions<br/>
              • 70% passing score required<br/>
              • Unlock next unit upon passing
            </Typography>
            <Button
              variant="contained"
              startIcon={<QuizIcon />}
              onClick={() => generateUnitQuiz(unit._id)}
              color="primary"
              sx={{ mr: 2 }}
              disabled={quizPassedFlag || isLocked || (typeof remainingAttempts === 'number' && remainingAttempts <= 0)}
            >
              {typeof remainingAttempts === 'number' ? `Take Unit Quiz (${Math.max(0, remainingAttempts)} left)` : 'Take Unit Quiz'}
            </Button>
            {/* Temporary debug button to force update progress */}
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={async () => {
                try {
                  console.log('Force updating video progress for unit:', unit._id);
                  // Force update all videos in the unit as completed
                  for (const video of unit.videos) {
                    if (video.watched) {
                      console.log('Force updating video:', video._id);
                      const response = await axios.post(`/api/student/video/${video._id}/watch`, {
                        timeSpent: video.duration || 0,
                        currentTime: video.duration || 0,
                        duration: video.duration || 0,
                        completed: true
                      }, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      console.log('Force update response:', response.data);
                    }
                  }
                  alert('Force update completed. Try taking the quiz again.');
                  window.location.reload();
                } catch (err) {
                  console.error('Error during force update:', err);
                  alert('Error during force update: ' + (err.response?.data?.message || err.message));
                }
              }}
            >
              🔧 Force Update Progress
            </Button>
            <Button
              variant="outlined"
              color="info"
              size="small"
              sx={{ ml: 1 }}
              onClick={async () => {
                try {
                  console.log('Refreshing quiz status for unit:', unit._id);
                  
                  // Fetch fresh quiz availability
                  const token = localStorage.getItem('token');
                  const availabilityResponse = await axios.get(`/api/student/unit/${unit._id}/quiz/availability`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  
                  console.log('Fresh quiz availability:', availabilityResponse.data);
                  
                  // Update the unit quiz status for this specific unit
                  setUnitQuizStatus(prev => ({
                    ...prev,
                    [unit._id]: {
                      quizCompleted: !!availabilityResponse.data.quizCompleted,
                      quizPassed: !!availabilityResponse.data.quizPassed,
                      attemptsTaken: typeof availabilityResponse.data.attemptsTaken === 'number' ? availabilityResponse.data.attemptsTaken : undefined,
                      remainingAttempts: typeof availabilityResponse.data.remainingAttempts === 'number' ? availabilityResponse.data.remainingAttempts : undefined,
                      attemptLimit: typeof availabilityResponse.data.attemptLimit === 'number' ? availabilityResponse.data.attemptLimit : 3,
                      isLocked: !!availabilityResponse.data.isLocked,
                      lockInfo: availabilityResponse.data.lockInfo || null
                    }
                  }));
                  
                  alert(`Quiz status refreshed!\n\nAvailable: ${availabilityResponse.data.available}\nLocked: ${availabilityResponse.data.isLocked}\nRemaining Attempts: ${availabilityResponse.data.remainingAttempts || 'N/A'}`);
                } catch (err) {
                  console.error('Error refreshing quiz status:', err);
                  alert('Error refreshing quiz status: ' + (err.response?.data?.message || err.message));
                }
              }}
            >
              🔄 Refresh Quiz Status
            </Button>
          </Box>
        )}
      </Box>
    );
  };


  // Helper functions for the new Coursera-style layout
  const calculateUnitProgress = (unit) => {
    const totalVideos = unit.videos?.length || 0;
    const watchedVideos = unit.videos?.filter(v => v.watched).length || 0;
    return totalVideos > 0 ? Math.round((watchedVideos / totalVideos) * 100) : 0;
  };

  const isUnitUnlocked = (unit) => {
    // Unit is unlocked if all videos are watched
    if (!unit.videos || unit.videos.length === 0) return false;
    return unit.videos.every(v => v.watched);
  };

  const isVideoLockedInUnit = (video, unit, unitIndex, allUnits) => {
    // First unit videos: first video unlocked, rest sequential
    if (unitIndex === 0) {
      const videoIndexInUnit = unit.videos.findIndex(v => v._id === video._id);
      if (videoIndexInUnit === 0) return false;
      // Check if previous video is watched
      return !unit.videos[videoIndexInUnit - 1].watched;
    }
    
    // Other units: check if previous unit is completed
    const previousUnit = allUnits[unitIndex - 1];
    if (!previousUnit || !isUnitUnlocked(previousUnit)) {
      return true; // Lock entire unit if previous unit not completed
    }
    
    // Within unlocked unit, check sequential video access
    const videoIndexInUnit = unit.videos.findIndex(v => v._id === video._id);
    if (videoIndexInUnit === 0) return false;
    return !unit.videos[videoIndexInUnit - 1].watched;
  };

  const handleUnitToggle = (unitId) => {
    setExpandedUnit(expandedUnit === unitId ? null : unitId);
  };


  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Left Sidebar - Video/Unit List (Coursera-style) */}
      <Box
        sx={{
          width: { xs: '100%', md: '380px' },
          flexShrink: 0,
          backgroundColor: 'white',
          borderRight: { md: '1px solid #e0e0e0' },
          height: { md: '100vh' },
          overflowY: 'auto',
          position: { md: 'sticky' },
          top: 0,
          zIndex: 10
        }}
      >
        {/* Course Header in Sidebar */}
        <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
          <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2, fontSize: '0.75rem' }}>
            <Link component={RouterLink} to="/student" color="inherit">
              Dashboard
            </Link>
            <Link component={RouterLink} to="/student/courses" color="inherit">
              Courses
            </Link>
          </Breadcrumbs>
          
          {course && (
            <>
              <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.125rem' }, fontWeight: 600 }}>
                {course.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {course.courseCode}
              </Typography>
            </>
          )}
        </Box>

        {/* Deadline Warnings in Sidebar */}
        {!deadlineLoading && deadlineWarnings && deadlineWarnings.length > 0 && (
          <Alert 
            severity={deadlineWarnings.some(w => w.isExpired) ? "error" : "warning"} 
            sx={{ m: 2, fontSize: '0.75rem' }}
            icon={<WarningIcon fontSize="small" />}
          >
            <Typography variant="caption" fontWeight="600">
              {deadlineWarnings.length} deadline{deadlineWarnings.length !== 1 ? 's' : ''} pending
            </Typography>
          </Alert>
        )}

        {/* Video/Unit List */}
        <Box sx={{ pb: 4 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress size={40} />
            </Box>
          ) : hasUnits ? (
            // Unit-based curriculum
            units.map((unit, unitIndex) => {
              const unitProgress = calculateUnitProgress(unit);
              const isUnitLocked = unitIndex > 0 && !isUnitUnlocked(units[unitIndex - 1]);
              
              return (
                <Accordion 
                  key={unit._id}
                  expanded={expandedUnit === unit._id}
                  onChange={() => handleUnitToggle(unit._id)}
                  disableGutters
                  elevation={0}
                  sx={{
                    '&:before': { display: 'none' },
                    borderBottom: '1px solid #e0e0e0'
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      px: 2,
                      py: 1.5,
                      '&:hover': { backgroundColor: '#f5f5f5' }
                    }}
                  >
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight="600" sx={{ fontSize: '0.875rem' }}>
                          Week {unitIndex + 1}: {unit.title}
                        </Typography>
                        {isUnitLocked && <LockIcon fontSize="small" color="disabled" />}
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={unitProgress} 
                        sx={{ height: 4, borderRadius: 2, mb: 0.5 }}
                        color={unitProgress === 100 ? "success" : "primary"}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {unitProgress}% complete • {unit.videos?.length || 0} videos
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  
                  <AccordionDetails sx={{ p: 0 }}>
                    <List disablePadding>
                      {unit.videos && unit.videos.map((video, videoIndex) => {
                        const locked = isVideoLockedInUnit(video, unit, unitIndex, units);
                        const isCurrentVideo = currentVideo?._id === video._id;
                        
                        return (
                          <ListItem
                            key={video._id}
                            button
                            disabled={locked}
                            onClick={() => !locked && handlePlayVideo(video)}
                            sx={{
                              pl: 4,
                              pr: 2,
                              py: 1.5,
                              backgroundColor: isCurrentVideo ? '#e3f2fd' : 'transparent',
                              borderLeft: isCurrentVideo ? '4px solid #1976d2' : '4px solid transparent',
                              '&:hover': { backgroundColor: locked ? 'transparent' : '#f5f5f5' }
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              {locked ? (
                                <LockIcon fontSize="small" color="disabled" />
                              ) : video.watched ? (
                                <CheckCircleIcon fontSize="small" color="success" />
                              ) : (
                                <PlayCircleOutlineIcon fontSize="small" color="primary" />
                              )}
                            </ListItemIcon>
                            
                            <ListItemText
                              primary={
                                <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: isCurrentVideo ? 600 : 400 }}>
                                  {videoIndex + 1}. {video.title}
                                </Typography>
                              }
                              secondary={
                                <Typography variant="caption" color="text.secondary">
                                  {formatDuration(video.duration || 0)}
                                  {video.watched && " • Completed"}
                                </Typography>
                              }
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                    
                    {/* Quiz Section */}
                    {renderQuizSection(unit)}
                  </AccordionDetails>
                </Accordion>
              );
            })
          ) : (
            // Simple video list (no units)
            <List disablePadding>
              {videos.map((video, index) => {
                const locked = isVideoLocked(index, videos);
                const isCurrentVideo = currentVideo?._id === video._id;
                
                return (
                  <ListItem
                    key={video._id}
                    button
                    disabled={locked}
                    onClick={() => !locked && handlePlayVideo(video)}
                    sx={{
                      px: 2,
                      py: 1.5,
                      backgroundColor: isCurrentVideo ? '#e3f2fd' : 'transparent',
                      borderLeft: isCurrentVideo ? '4px solid #1976d2' : '4px solid transparent',
                      '&:hover': { backgroundColor: locked ? 'transparent' : '#f5f5f5' },
                      borderBottom: '1px solid #f0f0f0'
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {locked ? (
                        <LockIcon fontSize="small" color="disabled" />
                      ) : video.watched ? (
                        <CheckCircleIcon fontSize="small" color="success" />
                      ) : (
                        <PlayCircleOutlineIcon fontSize="small" color="primary" />
                      )}
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: isCurrentVideo ? 600 : 400 }}>
                          {index + 1}. {video.title}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {formatDuration(video.duration || 0)}
                          {video.watched && " • Completed"}
                          {video.timeSpent > 0 && ` • ${Math.round((video.timeSpent / video.duration) * 100)}% watched`}
                        </Typography>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>
      </Box>

      {/* Right Main Content - Video Player */}
      <Box
        sx={{
          flexGrow: 1,
          width: { xs: '100%', md: 'calc(100% - 380px)' },
          overflowY: 'auto'
        }}
      >
      {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <CircularProgress size={60} />
          </Box>
        ) : error ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="error" variant="h6">{error}</Typography>
          </Box>
        ) : !course ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1">
              Course not found or you don't have access to this course.
            </Typography>
          </Box>
        ) : currentVideo ? (
          // Video Player View
          <Box sx={{ backgroundColor: 'white', minHeight: '100vh' }}>
            {/* Video Player Container */}
            <Box sx={{ position: 'relative', backgroundColor: '#000' }}>
              <CustomVideoPlayer 
                videoId={currentVideo._id}
                videoUrl={currentVideo.videoUrl.startsWith('http') ? currentVideo.videoUrl : formatVideoUrl(currentVideo.videoUrl)}
                title={currentVideo.title}
                token={token}
                onTimeUpdate={(currentTime, duration) => {
                  if (duration > 0 && Math.abs(currentVideo.duration - duration) > 1) {
                    setCurrentVideo(prev => ({ ...prev, duration: duration }));
                  }
                }}
                onVideoComplete={(videoId, duration) => {
                  if (isUpdatingVideoState) return;
                  setIsUpdatingVideoState(true);
                  setCurrentVideo(prev => ({ ...prev, watched: true }));
                  if (hasUnits) {
                    setUnits(prevUnits => prevUnits.map(unit => ({
                      ...unit,
                      videos: unit.videos.map(video => video._id === videoId ? { ...video, watched: true, completedAt: new Date().toISOString() } : video)
                    })));
                  } else {
                    setVideos(prevVideos => prevVideos.map(video => video._id === videoId ? { ...video, watched: true, completedAt: new Date().toISOString() } : video));
                  }
                  const payload = {
                    timeSpent: duration || currentVideo.duration || 0,
                    currentTime: duration || currentVideo.duration || 0,
                    duration: currentVideo.duration || duration || 0,
                    completed: true,
                    isCompleted: true
                  };
                  updateWatchHistory(videoId, payload, token)
                    .then(response => {
                      setVideoCompleted(prev => !prev);
                      setTimeout(() => window.location.reload(), 500);
                    })
                    .catch(error => console.error('Error updating watch history:', error))
                    .finally(() => setTimeout(() => setIsUpdatingVideoState(false), 1000));
                }}
              />
            </Box>

            {/* Video Info Section */}
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: '1200px', mx: 'auto' }}>
              {/* Video Title and Description */}
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                {currentVideo.title}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Chip 
                  icon={<AccessTimeIcon />} 
                  label={`${formatDuration(currentVideo.duration)}`}
                  size="small"
                  variant="outlined"
                />
                {currentVideo.watched && (
                  <Chip 
                    icon={<CheckCircleIcon />} 
                    color="success" 
                    label="Completed"
                    size="small"
                  />
                )}
              </Box>

              {currentVideo.description && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600 }}>
                    About this video
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentVideo.description}
                  </Typography>
                </Box>
              )}

              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Your progress is automatically tracked while watching. 
                  {hasUnits && ' Complete all videos in a unit to unlock the quiz.'}
                </Typography>
              </Alert>

              {/* Deadline Warnings */}
              {!deadlineLoading && deadlineWarnings && deadlineWarnings.length > 0 && (
                <Alert severity="warning" sx={{ mb: 3 }} icon={<WarningIcon />}>
                  <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                    Course Deadlines
                  </Typography>
                  {deadlineWarnings.slice(0, 2).map((warning) => (
                    <Typography key={warning.unitId} variant="caption" display="block">
                      • {warning.unitTitle}: {warning.isExpired ? 'EXPIRED' : `${warning.daysLeft} days left`}
                    </Typography>
                  ))}
                </Alert>
              )}
            </Box>
          </Box>
        ) : (
          // No Video Selected - Show Welcome Message
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: '80vh',
            p: 4,
            textAlign: 'center'
          }}>
            <SchoolIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Welcome to {course?.title}
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph sx={{ maxWidth: 600 }}>
              Select a video from the {hasUnits ? 'units' : 'playlist'} on the left to begin learning.
            </Typography>
            {hasUnits && (
              <Alert severity="info" sx={{ mt: 2, maxWidth: 600 }}>
                <Typography variant="body2">
                  💡 Videos are unlocked sequentially. Complete each video to access the next one, 
                  and finish all videos in a unit to unlock the quiz!
                </Typography>
              </Alert>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default StudentCourseVideos;
