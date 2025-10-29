import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  LinearProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Toolbar,
  AppBar,
  Tooltip,
  Divider,
  Badge
} from '@mui/material';
import {
  FullscreenExit,
  Warning,
  CheckCircle,
  RadioButtonUnchecked,
  BookmarkBorder,
  Bookmark,
  AccessTime,
  Quiz as QuizIcon,
  NavigateNext,
  NavigateBefore,
  Send,
  Flag,
  Security,
  VisibilityOff,
  Block
} from '@mui/icons-material';
import axios from 'axios';
import SecurityWarningDialog from '../../components/student/SecurityWarningDialog';
import { startSecurityMonitoring, startBypassResistantTabDetection } from '../../utils/securityUtils';

const DRAWER_WIDTH = 300;
const MAX_TAB_SWITCHES = 3;
const MAX_FULLSCREEN_EXITS = 3;
const TAB_SWITCH_TIMEOUT = 15000; // 15 seconds

const SecureQuizPage = ({ user, token }) => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const intervalRef = useRef(null);
  const tabSwitchTimeoutRef = useRef(null);
  const isTabSwitchAllowedRef = useRef(false);

  // Authentication & Quiz State
  const [localToken] = useState(token || localStorage.getItem('token'));
  const [quiz, setQuiz] = useState(null);
  const [courseId, setCourseId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  // Security State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [fsExitCount, setFsExitCount] = useState(0);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [isTabSwitchBlocked, setIsTabSwitchBlocked] = useState(false);
  const [securityViolations, setSecurityViolations] = useState([]);
  const [isQuizLocked, setIsQuizLocked] = useState(false);
  
  // Extension Security State
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const [securityReport, setSecurityReport] = useState(null);
  const [securityMonitor, setSecurityMonitor] = useState(null);
  const [bypassResistantDetection, setBypassResistantDetection] = useState(null);

  // Debug tab switch count changes
  useEffect(() => {
    console.log('🔢 TAB SWITCH COUNT CHANGED TO:', tabSwitchCount);
    
    // Auto-submit if count exceeds limit
    if (tabSwitchCount >= MAX_TAB_SWITCHES && !submitted && !submitting) {
      console.log('🚫 TAB SWITCH LIMIT EXCEEDED ON STATE CHANGE! Auto-submitting...');
      setIsQuizLocked(true);
      setSubmitting(true);
      autoSubmitQuiz();
    }
  }, [tabSwitchCount, submitted, submitting, autoSubmitQuiz]);
  
  useEffect(() => {
    console.log('🔢 FS EXIT COUNT CHANGED TO:', fsExitCount);
    
    // Auto-submit if count exceeds limit  
    if (fsExitCount >= MAX_FULLSCREEN_EXITS && !submitted && !submitting) {
      console.log('🚫 FS EXIT LIMIT EXCEEDED ON STATE CHANGE! Auto-submitting...');
      setIsQuizLocked(true);
      setSubmitting(true);
      autoSubmitQuiz();
    }
  }, [fsExitCount, submitted, submitting, autoSubmitQuiz]);

  // UI State
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  // Check if quiz should be locked due to failure
  const checkAndHandleQuizLock = async (submissionResult) => {
    try {
      if (!submissionResult || submissionResult.passed === undefined) {
        console.log('No submission result or passing status available');
        return;
      }

      const passingScore = quiz.passingScore || 60; // Default passing score if not set
      const studentScore = submissionResult.percentage || 0;

      console.log(`Checking quiz lock: Score=${studentScore}%, Passing=${passingScore}%, Passed=${submissionResult.passed}`);

      if (!submissionResult.passed && studentScore < passingScore) {
        console.log('Student failed quiz, checking lock status...');
        
        const token = localStorage.getItem('token');
        const lockResponse = await axios.post('/api/quiz-unlock/check-and-lock', {
          studentId: JSON.parse(localStorage.getItem('user')).id,
          quizId: quiz._id,
          courseId: quiz.course,
          score: studentScore,
          passingScore: passingScore
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (lockResponse.data.success && lockResponse.data.locked) {
          console.log('Quiz has been locked due to failing score');
          
          // Update local state
          setIsQuizLocked(true);
          
          // Show lock notification
          setError(null);
          setResult(prev => ({
            ...prev,
            isLocked: true,
            lockInfo: lockResponse.data.data,
            lockMessage: `Quiz locked due to failing score (${studentScore}% < ${passingScore}%). ${
              lockResponse.data.data.unlockAuthorizationLevel === 'TEACHER' 
                ? 'Your teacher can unlock this quiz.' 
                : 'Dean authorization required for unlock.'
            }`
          }));

          // Redirect to dashboard after showing result
          setTimeout(() => {
            navigate('/student/dashboard', { 
              state: { 
                quizLocked: true,
                lockMessage: lockResponse.data.data.unlockAuthorizationLevel === 'TEACHER'
                  ? 'Quiz locked due to failing score. Contact your teacher for unlock.'
                  : 'Quiz locked due to failing score. Teacher unlock limit exceeded - Dean authorization required.'
              }
            });
          }, 5000);
        }
      }
    } catch (error) {
      console.error('Error checking quiz lock status:', error);
      // Don't block the UI for lock check errors
    }
  };

  // Auto-submit quiz when security violations exceed limit
  const autoSubmitQuiz = useCallback(async () => {
    console.log('autoSubmitQuiz called - submitted:', submitted, 'submitting:', submitting, 'isQuizLocked:', isQuizLocked);
    if (submitted || submitting) return;
    
    setIsQuizLocked(true);
    setWarningMessage('Quiz auto-submitted due to security violations');
    setShowWarningDialog(true);
    
    await handleSubmitQuiz(true); // Force submit with security flag
  }, [submitted, submitting, isQuizLocked]);

  // Handle tab switch detection with improved detection and logging
  const handleVisibilityChange = useCallback(() => {
    console.log('🔍 Visibility change detected:', document.hidden ? 'Hidden' : 'Visible', 'Current tabSwitchCount:', tabSwitchCount);
    
    if (!quiz || submitted || submitting) {
      console.log('⚠️ Ignoring visibility change: Quiz not loaded, already submitted, or submitting');
      return;
    }

    if (document.hidden) {
      // Tab switch detected
      console.log('📱 Tab switch detected! Incrementing count...');
      incrementTabSwitchCount('standard-visibility-api');
    }
  }, [quiz, submitted, submitting, tabSwitchCount]);

  // Handle bypass-resistant tab detection
  const handleBypassResistantTabSwitch = useCallback((detection) => {
    console.log('🛡️ Bypass-resistant tab switch detected:', detection);
    
    if (!quiz || submitted || submitting) {
      console.log('⚠️ Ignoring bypass-resistant detection: Quiz not loaded, already submitted, or submitting');
      return;
    }

    // Only count high and medium confidence detections
    if (detection.confidence === 'high' || detection.confidence === 'medium') {
      incrementTabSwitchCount(detection.method, detection);
    }
  }, [quiz, submitted, submitting]);

  // Centralized function to handle tab switch counting
  const incrementTabSwitchCount = useCallback((method, detection = null) => {
    setTabSwitchCount(prevCount => {
      const newCount = prevCount + 1;
      console.log(`🔢 Tab switch #${newCount} detected via ${method} (was ${prevCount})`);
      
      const violation = {
        type: 'TAB_SWITCH',
        timestamp: new Date(),
        count: newCount,
        method: method,
        detection: detection,
        message: `Tab switch detected (#${newCount}) via ${method}`
      };

      setSecurityViolations(prev => {
        console.log('🚨 Adding violation to list, total will be:', prev.length + 1);
        return [...prev, violation];
      });

      if (newCount >= MAX_TAB_SWITCHES) {
        // Auto-submit after max violations
        console.log('🚫 MAXIMUM TAB SWITCHES REACHED! Auto-submitting quiz NOW!');
        console.log(`🔢 Tab count: ${newCount}/${MAX_TAB_SWITCHES} - EXCEEDED LIMIT`);
        
        // Force immediate submission - don't wait for timeout
        setIsQuizLocked(true);
        setSubmitting(true); // Prevent further actions
        setWarningMessage('QUIZ AUTO-SUBMITTED: Too many tab switches detected!');
        setShowWarningDialog(true);
        
        // Immediate auto-submit - no delay
        console.log('⚡ Calling autoSubmitQuiz IMMEDIATELY...');
        autoSubmitQuiz();
        return newCount; // Exit early to prevent further processing
      } else {
        // Show warning and start timeout
        console.log(`⚠️ Warning for tab switch ${newCount}/${MAX_TAB_SWITCHES}`);
        setWarningMessage(
          `Warning: Tab switching detected! (${newCount}/${MAX_TAB_SWITCHES})\n` +
          `You have ${15} seconds to return to the quiz or it will be auto-submitted.`
        );
        setShowWarningDialog(true);
        setIsTabSwitchBlocked(true);

        // Start 15-second timeout
        console.log(`⏰ Starting ${TAB_SWITCH_TIMEOUT/1000} second countdown for return to quiz`);
        tabSwitchTimeoutRef.current = setTimeout(() => {
          if (document.hidden) {
            console.log('⏰ Timeout expired! User did not return to tab, auto-submitting quiz');
            autoSubmitQuiz();
          }
        }, TAB_SWITCH_TIMEOUT);
      }

      return newCount;
    });
  }, [quiz, submitted, submitting, autoSubmitQuiz]);

  // Handle fullscreen change with improved detection and logging
  const handleFullscreenChange = useCallback(() => {
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
    
    console.log('Fullscreen state changed:', isCurrentlyFullscreen ? 'FULLSCREEN' : 'NOT FULLSCREEN');
    setIsFullscreen(isCurrentlyFullscreen);
    
    if (!isCurrentlyFullscreen && quiz && !submitted && !isQuizLocked) {
      // Fullscreen exit detected
      console.log('Fullscreen exit detected - security violation');
      const violation = {
        type: 'FULLSCREEN_EXIT',
        timestamp: new Date(),
        message: 'Fullscreen mode exited'
      };
      
      setSecurityViolations(prev => [...prev, violation]);
      setFsExitCount(prev => {
        const next = prev + 1;
        console.log(`🔢 Fullscreen exit count: ${next}/${MAX_FULLSCREEN_EXITS}`);
        if (next >= MAX_FULLSCREEN_EXITS) {
          console.log('🚫 MAXIMUM FULLSCREEN EXITS REACHED! Auto-submitting quiz NOW!');
          console.log(`🔢 FS Exit count: ${next}/${MAX_FULLSCREEN_EXITS} - EXCEEDED LIMIT`);
          
          setIsQuizLocked(true);
          setSubmitting(true); // Prevent further actions
          setWarningMessage('QUIZ AUTO-SUBMITTED: Too many fullscreen exits detected!');
          setShowWarningDialog(true);
          
          // Immediate auto-submit - no delay
          console.log('⚡ Calling autoSubmitQuiz IMMEDIATELY for FS exits...');
          autoSubmitQuiz();
          return next; // Exit early
        } else {
          setWarningMessage(`Warning: You exited fullscreen! (${next}/${MAX_FULLSCREEN_EXITS})`);
          setShowWarningDialog(true);
        }
        return next;
      });
      
      // Force fullscreen again after a short delay
      console.log('Attempting to re-enter fullscreen after delay');
      setTimeout(() => {
        enterFullscreen();
      }, 1000);
      
      // If user doesn't re-enter fullscreen after multiple attempts, consider it a violation
      setTimeout(() => {
        const stillNotFullscreen = !(
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
        );
        
        if (stillNotFullscreen) {
          console.log('User persistently avoiding fullscreen - adding serious violation');
          const seriousViolation = {
            type: 'FULLSCREEN_AVOIDANCE',
            timestamp: new Date(),
            message: 'Persistent avoidance of fullscreen mode'
          };
          
          setSecurityViolations(prev => [...prev, seriousViolation]);
        }
      }, 10000);
    }
  }, [quiz, submitted, isQuizLocked, enterFullscreen]);

  // Enter fullscreen mode
  const enterFullscreen = useCallback(() => {
    console.log('Attempting to enter fullscreen mode');
    const element = document.documentElement;
    try {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }
      console.log('Fullscreen request completed');
    } catch (error) {
      console.error('Error entering fullscreen:', error);
    }
  }, []);

  // Exit fullscreen mode
  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }, []);

  // Prevent context menu and key shortcuts
  useEffect(() => {
    // Function to prevent context menu
    const preventContextMenu = (e) => {
      console.log('Context menu prevented');
      e.preventDefault();
      
      const violation = {
        type: 'CONTEXT_MENU',
        timestamp: new Date(),
        message: 'Attempted to use context menu'
      };
      
      setSecurityViolations(prev => [...prev, violation]);
      
      setWarningMessage('Right-click menu is disabled during the quiz.');
      setShowWarningDialog(true);
      
      setTimeout(() => setShowWarningDialog(false), 3000);
    };
    
    // Function to prevent key shortcuts
    const preventKeyShortcuts = (e) => {
      // Prevent common shortcuts that could be used for cheating
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.key === 'u') ||
        (e.ctrlKey && e.key === 'U') ||
        (e.ctrlKey && e.key === 's') ||
        (e.ctrlKey && e.key === 'S') ||
        (e.ctrlKey && e.key === 'a') ||
        (e.ctrlKey && e.key === 'A') ||
        (e.ctrlKey && e.key === 'c') ||
        (e.ctrlKey && e.key === 'C') ||
        (e.ctrlKey && e.key === 'v') ||
        (e.ctrlKey && e.key === 'V') ||
        (e.ctrlKey && e.key === 'r') ||
        (e.ctrlKey && e.key === 'R') ||
        (e.ctrlKey && e.key === 'p') ||
        (e.ctrlKey && e.key === 'P') ||
        (e.ctrlKey && e.altKey) ||
        (e.altKey && e.key === 'Tab') ||
        e.key === 'F5' ||
        e.key === 'PrintScreen'
      ) {
        console.log(`Keyboard shortcut prevented: ${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.altKey ? 'Alt+' : ''}${e.key}`);
        e.preventDefault();
        e.stopPropagation();
        
        const violation = {
          type: 'KEYBOARD_SHORTCUT',
          timestamp: new Date(),
          key: e.key,
          message: `Attempted to use shortcut: ${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.altKey ? 'Alt+' : ''}${e.key}`
        };
        
        setSecurityViolations(prev => [...prev, violation]);
        
        setWarningMessage('Keyboard shortcuts are disabled during the quiz.');
        setShowWarningDialog(true);
        
        setTimeout(() => setShowWarningDialog(false), 3000);
        
        return false;
      }
    };
    
    // Function to detect window blur (user switches to another window)
    const handleWindowBlur = () => {
      console.log('🔍 Window blur detected (user switched to another window)');
      
      if (!quiz || submitted || submitting) {
        console.log('⚠️ Ignoring window blur: Quiz not loaded, already submitted, or submitting');
        return;
      }
      
      // Count this as a tab switch even if document.hidden is false
      // This handles cases where window is not maximized/fullscreen
      console.log('📱 Tab switch detected via window blur! Incrementing count...');
      incrementTabSwitchCount('window-blur-detection');
    };
    
    // Function to detect window focus (user returns to quiz window)
    const handleWindowFocus = () => {
      console.log('✅ Window focus detected (user returned to quiz window)');
      
      if (!quiz || submitted || submitting) {
        return;
      }
      
      // Optional: Show a reminder message when user returns
      console.log('👀 User returned to quiz after switching away');
    };
    
    // Force fullscreen check at intervals
    const fullscreenCheckInterval = setInterval(() => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      
      if (!isCurrentlyFullscreen && quiz && !submitted && !isQuizLocked) {
        console.log('Fullscreen check: Not in fullscreen, attempting to re-enter');
        enterFullscreen();
      }
    }, 5000);

    if (quiz && !submitted) {
      console.log('Setting up security event listeners');
      document.addEventListener('contextmenu', preventContextMenu, { capture: true });
      document.addEventListener('keydown', preventKeyShortcuts, { capture: true });
      document.addEventListener('visibilitychange', handleVisibilityChange);
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.addEventListener('mozfullscreenchange', handleFullscreenChange);
      document.addEventListener('MSFullscreenChange', handleFullscreenChange);
      window.addEventListener('blur', handleWindowBlur);
      window.addEventListener('focus', handleWindowFocus);
      
      // Start bypass-resistant tab detection
      console.log('🛡️ Starting bypass-resistant tab detection...');
      const bypassDetectionCleanup = startBypassResistantTabDetection(handleBypassResistantTabSwitch);
      setBypassResistantDetection(bypassDetectionCleanup);
      
      // Force initial fullscreen
      setTimeout(enterFullscreen, 500);
    }

    return () => {
      console.log('Cleaning up security event listeners');
      document.removeEventListener('contextmenu', preventContextMenu, { capture: true });
      document.removeEventListener('keydown', preventKeyShortcuts, { capture: true });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      clearInterval(fullscreenCheckInterval);
      
      // Cleanup bypass-resistant detection
      if (bypassResistantDetection) {
        console.log('🧹 Cleaning up bypass-resistant tab detection');
        bypassResistantDetection();
      }
    };
  }, [quiz, submitted, handleVisibilityChange, handleFullscreenChange, enterFullscreen, isQuizLocked, handleBypassResistantTabSwitch]);

  // Load quiz data - but show security dialog first
  useEffect(() => {
    // First show security dialog before loading quiz
    if (!showSecurityDialog && !securityReport) {
      setShowSecurityDialog(true);
      return;
    }
    
    // Only load quiz after security check is completed
    if (!securityReport) return;
    
    const fetchQuizAttempt = async () => {
      try {
        setLoading(true);
        
        if (!attemptId || !localToken) {
          setError('Missing quiz attempt ID or authentication token');
          setLoading(false);
          return;
        }

        const response = await axios.get(`/api/student/quiz/attempt/${attemptId}`, {
          headers: { Authorization: `Bearer ${localToken}` }
        });

        const processedQuizData = {
          ...response.data,
          questions: response.data.questions?.map(question => ({
            ...question,
            options: typeof question.options === 'string' 
              ? question.options.split(' ').filter(opt => opt.trim() !== '')
              : Array.isArray(question.options) ? question.options : []
          })) || []
        };
        
        setQuiz(processedQuizData);
        
        // Store courseId for navigation
        if (response.data.courseId) {
          setCourseId(response.data.courseId);
        }
        
        if (response.data.timeLimit) {
          setTimeLeft(response.data.timeLimit * 60);
        }
        
        setLoading(false);
        
        // Enter fullscreen mode when quiz loads - using multiple approaches for broader browser support
        console.log('Setting up fullscreen entry');
        setTimeout(() => {
          console.log('Attempting immediate fullscreen entry');
          enterFullscreen();
          
          // Add a button for user-initiated fullscreen (browsers often require user interaction)
          const fullscreenButton = document.createElement('button');
          fullscreenButton.innerText = 'Enter Fullscreen Mode';
          fullscreenButton.style.position = 'fixed';
          fullscreenButton.style.top = '50%';
          fullscreenButton.style.left = '50%';
          fullscreenButton.style.transform = 'translate(-50%, -50%)';
          fullscreenButton.style.zIndex = '9999';
          fullscreenButton.style.padding = '20px';
          fullscreenButton.style.fontSize = '24px';
          fullscreenButton.style.backgroundColor = '#1976d2';
          fullscreenButton.style.color = 'white';
          fullscreenButton.style.border = 'none';
          fullscreenButton.style.borderRadius = '5px';
          fullscreenButton.style.cursor = 'pointer';
          fullscreenButton.onclick = () => {
            enterFullscreen();
            document.body.removeChild(fullscreenButton);
          };
          
          document.body.appendChild(fullscreenButton);
          
          // Auto-remove button after 5 seconds
          setTimeout(() => {
            if (document.body.contains(fullscreenButton)) {
              document.body.removeChild(fullscreenButton);
            }
          }, 5000);
        }, 1000);
      } catch (err) {
        console.error('Error loading quiz:', err);
        setError('Failed to load quiz. Please try again.');
        setLoading(false);
      }
    };

    fetchQuizAttempt();
  }, [attemptId, localToken, enterFullscreen, showSecurityDialog, securityReport]);

  // Security dialog handlers
  const handleSecurityProceed = (report) => {
    setSecurityReport(report);
    setShowSecurityDialog(false);
    
    // Start security monitoring during quiz
    if (report) {
      const cleanup = startSecurityMonitoring((violation) => {
        console.log('Security violation detected during quiz:', violation);
        setSecurityViolations(prev => [...prev, violation]);
      });
      setSecurityMonitor(cleanup);
    }
  };

  const handleSecurityCancel = () => {
    setShowSecurityDialog(false);
    navigate(-1); // Go back to previous page
  };

  // Cleanup security monitoring on unmount
  useEffect(() => {
    return () => {
      if (securityMonitor) {
        securityMonitor();
      }
      if (bypassResistantDetection) {
        bypassResistantDetection();
      }
    };
  }, [securityMonitor, bypassResistantDetection]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && !submitted && !isQuizLocked) {
      intervalRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && !submitted && !isQuizLocked) {
      autoSubmitQuiz();
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [timeLeft, submitted, isQuizLocked, autoSubmitQuiz]);

  const handleAnswerChange = (questionId, selectedOption) => {
    if (isTabSwitchBlocked || isQuizLocked) return;
    
    setAnswers(prev => ({
      ...prev,
      [questionId]: parseInt(selectedOption)
    }));
  };

  const handleMarkForReview = (questionId) => {
    if (isTabSwitchBlocked || isQuizLocked) return;
    
    setMarkedForReview(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleQuestionNavigation = (index) => {
    if (isTabSwitchBlocked || isQuizLocked) return;
    setCurrentQuestion(index);
  };

  const handleSubmitQuiz = async (isAutoSubmit = false) => {
    console.log('handleSubmitQuiz called with isAutoSubmit:', isAutoSubmit);
    if (submitting || (isQuizLocked && !isAutoSubmit)) {
      console.log('Submit blocked - submitting:', submitting, 'isQuizLocked:', isQuizLocked, 'isAutoSubmit:', isAutoSubmit);
      return;
    }
    
    try {
      setSubmitting(true);
      console.log('Starting quiz submission...');
      
      const formattedAnswers = Object.entries(answers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption
      }));

      const submissionData = {
        answers: formattedAnswers,
        securityViolations,
        tabSwitchCount,
        isAutoSubmit,
        timeSpent: quiz.timeLimit ? (quiz.timeLimit * 60 - timeLeft) : 0
      };

      console.log('Submitting quiz with data:', submissionData);

      const response = await axios.post(`/api/student/quiz-attempt/${attemptId}/submit`, submissionData, {
        headers: { Authorization: `Bearer ${localToken}` }
      });

      console.log('Quiz submitted successfully:', response.data);
      setResult(response.data);
      setSubmitted(true);
      setSubmitting(false);
      
      // Check if quiz should be locked due to failure
      await checkAndHandleQuizLock(response.data);
      
      // Exit fullscreen after submission
      setTimeout(exitFullscreen, 1000);
    } catch (err) {
      console.error('Error submitting quiz:', err);
      
      if (isAutoSubmit) {
        // For auto-submit, force completion even if backend fails
        console.log('Auto-submit failed, forcing quiz completion locally');
        setResult({
          score: 0,
          maxScore: quiz.questions?.length || 10,
          percentage: 0,
          passed: false,
          message: 'Quiz auto-submitted due to security violations. Score could not be calculated due to server error.'
        });
        setSubmitted(true);
        setSubmitting(false);
        setTimeout(exitFullscreen, 1000);
      } else {
        setError('Failed to submit quiz. Please try again.');
        setSubmitting(false);
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getQuestionStatus = (questionId, index) => {
    if (answers.hasOwnProperty(questionId)) {
      return markedForReview.has(questionId) ? 'reviewed' : 'answered';
    }
    return markedForReview.has(questionId) ? 'marked' : 'unanswered';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'answered': return 'success';
      case 'reviewed': return 'warning';
      case 'marked': return 'info';
      default: return 'default';
    }
  };

  const getStatusCounts = () => {
    const answered = Object.keys(answers).length;
    const marked = markedForReview.size;
    const total = quiz?.questions?.length || 0;
    const unanswered = total - answered;
    
    return { answered, marked, unanswered, total };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading secure quiz...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error">{error}</Alert>
        <Button variant="contained" onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  if (submitted && result) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Paper sx={{ p: 4, maxWidth: 600 }}>
          <Box sx={{ mb: 3 }}>
            {result.passed ? (
              <CheckCircle color="success" sx={{ fontSize: 80 }} />
            ) : (
              <Block color="error" sx={{ fontSize: 80 }} />
            )}
          </Box>
          
          <Typography variant="h4" gutterBottom>
            Quiz {result.passed ? 'Completed!' : 'Submitted'}
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 2, mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Score</Typography>
                  <Typography variant="h4" color="primary">
                    {result.score}/{result.maxScore}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Percentage</Typography>
                  <Typography variant="h4" color={result.passed ? 'success.main' : 'error.main'}>
                    {result.percentage}%
                  </Typography>
                  {result.securityPenalty > 0 && (
                    <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
                      Original: {((result.score / result.maxScore) * 100).toFixed(1)}% 
                      <br />
                      Penalty: -{result.securityPenalty}%
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Status</Typography>
                  <Chip 
                    label={result.passed ? 'PASSED' : 'FAILED'} 
                    color={result.passed ? 'success' : 'error'}
                    size="large"
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {(securityViolations.length > 0 || result.violationsDetected > 0) && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Security violations detected: {result.violationsDetected || securityViolations.length}
                {result.securityPenalty > 0 && (
                  <>
                    <br />
                    Score penalty applied: -{result.securityPenalty}%
                  </>
                )}
              </Typography>
            </Alert>
          )}

          <Button 
            variant="contained" 
            onClick={() => navigate(courseId ? `/student/course/${courseId}/units` : '/student/courses')}
            size="large"
          >
            Continue
          </Button>
        </Paper>
      </Box>
    );
  }

  if (!quiz) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error">Quiz data not found.</Alert>
      </Box>
    );
  }

  const currentQ = quiz.questions[currentQuestion];
  const statusCounts = getStatusCounts();
  
  // Forced fullscreen effect that runs on each render
  useEffect(() => {
    if (quiz && !submitted && !isQuizLocked) {
      console.log('Forced fullscreen effect running');
      const fullscreenButton = document.createElement('button');
      fullscreenButton.id = 'forced-fullscreen-button';
      fullscreenButton.innerText = 'ENTER FULLSCREEN MODE TO CONTINUE';
      fullscreenButton.style.position = 'fixed';
      fullscreenButton.style.top = '50%';
      fullscreenButton.style.left = '50%';
      fullscreenButton.style.transform = 'translate(-50%, -50%)';
      fullscreenButton.style.zIndex = '9999';
      fullscreenButton.style.padding = '20px';
      fullscreenButton.style.fontSize = '24px';
      fullscreenButton.style.backgroundColor = '#f44336';
      fullscreenButton.style.color = 'white';
      fullscreenButton.style.border = 'none';
      fullscreenButton.style.borderRadius = '5px';
      fullscreenButton.style.cursor = 'pointer';
      
      fullscreenButton.onclick = () => {
        enterFullscreen();
        
        if (document.body.contains(fullscreenButton)) {
          document.body.removeChild(fullscreenButton);
        }
      };
      
      // Only add the button if it doesn't exist and we're not in fullscreen
      if (!document.getElementById('forced-fullscreen-button') && !isFullscreen) {
        document.body.appendChild(fullscreenButton);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
          if (document.body.contains(fullscreenButton)) {
            document.body.removeChild(fullscreenButton);
          }
        }, 5000);
      }
    }
    
    return () => {
      const fullscreenButton = document.getElementById('forced-fullscreen-button');
      if (fullscreenButton) {
        fullscreenButton.remove();
      }
    };
  }, [quiz, submitted, isQuizLocked, isFullscreen, enterFullscreen]);
  
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Security Warning Dialog */}
      <SecurityWarningDialog
        open={showSecurityDialog}
        onProceed={handleSecurityProceed}
        onCancel={handleSecurityCancel}
      />
      
      {/* Force auto-submit check */}
      {(tabSwitchCount >= MAX_TAB_SWITCHES || fsExitCount >= MAX_FULLSCREEN_EXITS) && !submitted && (
        <Box sx={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          bgcolor: 'rgba(0,0,0,0.9)', 
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 500 }}>
            <Typography variant="h5" color="error" gutterBottom>
              Quiz Auto-Submitted
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {tabSwitchCount >= MAX_TAB_SWITCHES 
                ? `Too many tab switches detected (${tabSwitchCount}/${MAX_TAB_SWITCHES})`
                : `Too many fullscreen exits detected (${fsExitCount}/${MAX_FULLSCREEN_EXITS})`
              }
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Your quiz has been automatically submitted due to security violations.
            </Typography>
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Processing submission...
            </Typography>
          </Paper>
        </Box>
      )}
      
      {/* Security Warning Dialog */}
      <Dialog open={showWarningDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="warning" />
          Security Alert
        </DialogTitle>
        <DialogContent>
          <Typography>{warningMessage}</Typography>
          {tabSwitchCount > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="error">
                Tab switches: {tabSwitchCount}/{MAX_TAB_SWITCHES}
              </Typography>
              {tabSwitchCount >= MAX_TAB_SWITCHES && (
                <Typography variant="body2" color="error">
                  Maximum violations reached. Quiz will be auto-submitted.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowWarningDialog(false)}>OK</Button>
        </DialogActions>
      </Dialog>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Submission</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to submit your quiz?
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2">
              Answered: {statusCounts.answered} / {statusCounts.total}
            </Typography>
            <Typography variant="body2">
              Marked for review: {statusCounts.marked}
            </Typography>
            <Typography variant="body2">
              Unanswered: {statusCounts.unanswered}
            </Typography>
          </Box>
          {statusCounts.unanswered > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              You have {statusCounts.unanswered} unanswered questions.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSubmitDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => {
            setShowSubmitDialog(false);
            handleSubmitQuiz();
          }}>
            Submit Quiz
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sidebar Navigation */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar>
          <Typography variant="h6">Questions</Typography>
        </Toolbar>
        <Divider />
        
        {/* Status Summary */}
        <Box sx={{ p: 2 }}>
          <Grid container spacing={1}>
            <Grid item xs={4}>
              <Box textAlign="center">
                <Typography variant="h6" color="success.main">
                  {statusCounts.answered}
                </Typography>
                <Typography variant="caption">Answered</Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box textAlign="center">
                <Typography variant="h6" color="warning.main">
                  {statusCounts.marked}
                </Typography>
                <Typography variant="caption">Marked</Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box textAlign="center">
                <Typography variant="h6" color="text.secondary">
                  {statusCounts.unanswered}
                </Typography>
                <Typography variant="caption">Unanswered</Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
        <Divider />

        {/* Question List */}
        <List sx={{ flexGrow: 1, overflow: 'auto' }}>
          {quiz.questions.map((question, index) => {
            const status = getQuestionStatus(question.questionId, index);
            const isActive = index === currentQuestion;
            
            return (
              <ListItem key={question.questionId} disablePadding>
                <ListItemButton
                  selected={isActive}
                  onClick={() => handleQuestionNavigation(index)}
                  disabled={isTabSwitchBlocked || isQuizLocked}
                >
                  <ListItemIcon>
                    <Chip
                      label={index + 1}
                      color={getStatusColor(status)}
                      size="small"
                      variant={isActive ? "filled" : "outlined"}
                    />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`Question ${index + 1}`}
                    secondary={status.charAt(0).toUpperCase() + status.slice(1)}
                  />
                  {markedForReview.has(question.questionId) && (
                    <Flag color="warning" fontSize="small" />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh'
        }}
      >
        {/* Top Bar */}
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar>
            <QuizIcon sx={{ mr: 2 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6">{quiz.unitTitle}</Typography>
              <Typography variant="subtitle2" color="text.secondary">
                {quiz.courseTitle}
              </Typography>
            </Box>
            
            {/* Security Indicators */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mr: 2 }}>
              <Tooltip title={`Tab switches: ${tabSwitchCount}/${MAX_TAB_SWITCHES}`}>
                <Badge badgeContent={tabSwitchCount} color="error">
                  <Security color={tabSwitchCount > 0 ? 'error' : 'action'} />
                </Badge>
              </Tooltip>
              
              <Tooltip title={isFullscreen ? 'Fullscreen active' : 'Not in fullscreen'}>
                <VisibilityOff color={isFullscreen ? 'success' : 'error'} />
              </Tooltip>
            </Box>

            {/* Timer */}
            {timeLeft !== null && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTime color={timeLeft < 300 ? 'error' : 'primary'} />
                <Typography 
                  variant="h6" 
                  color={timeLeft < 300 ? 'error.main' : 'text.primary'}
                >
                  {formatTime(timeLeft)}
                </Typography>
              </Box>
            )}

            {/* Exit Fullscreen Button (only shown when in fullscreen) */}
            {isFullscreen && (
              <IconButton onClick={exitFullscreen} sx={{ ml: 1 }}>
                <FullscreenExit />
              </IconButton>
            )}
          </Toolbar>
          
          <LinearProgress 
            variant="determinate" 
            value={(currentQuestion + 1) / quiz.questions.length * 100} 
            sx={{ height: 4 }}
          />
        </AppBar>

        {/* Question Content */}
        <Box sx={{ p: 3 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">
                Question {currentQuestion + 1} of {quiz.questions.length}
              </Typography>
              <Button
                variant="outlined"
                startIcon={markedForReview.has(currentQ.questionId) ? <Bookmark /> : <BookmarkBorder />}
                onClick={() => handleMarkForReview(currentQ.questionId)}
                disabled={isTabSwitchBlocked || isQuizLocked}
                color={markedForReview.has(currentQ.questionId) ? 'warning' : 'default'}
              >
                {markedForReview.has(currentQ.questionId) ? 'Unmark' : 'Mark for Review'}
              </Button>
            </Box>
            
            <Typography variant="body1" sx={{ mb: 3, fontSize: '1.1rem', lineHeight: 1.6 }}>
              {currentQ.questionText}
            </Typography>

            <FormControl component="fieldset" fullWidth disabled={isTabSwitchBlocked || isQuizLocked}>
              <RadioGroup
                value={answers[currentQ.questionId]?.toString() || ''}
                onChange={(e) => handleAnswerChange(currentQ.questionId, e.target.value)}
              >
                {currentQ.options.map((option, index) => (
                  <Paper
                    key={index}
                    variant="outlined"
                    sx={{
                      mb: 1,
                      p: 0.5,
                      border: answers[currentQ.questionId] === index ? '2px solid primary.main' : '1px solid divider',
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  >
                    <FormControlLabel
                      value={index.toString()}
                      control={<Radio />}
                      label={
                        <Typography sx={{ py: 1, fontSize: '1rem' }}>
                          {String.fromCharCode(65 + index)}. {option}
                        </Typography>
                      }
                      sx={{ width: '100%', margin: 0, padding: 1 }}
                    />
                  </Paper>
                ))}
              </RadioGroup>
            </FormControl>
          </Paper>

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<NavigateBefore />}
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0 || isTabSwitchBlocked || isQuizLocked}
            >
              Previous
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Progress: {statusCounts.answered} / {statusCounts.total} answered
              </Typography>
              {statusCounts.marked > 0 && (
                <Typography variant="body2" color="warning.main">
                  {statusCounts.marked} marked for review
                </Typography>
              )}
            </Box>

            {currentQuestion === quiz.questions.length - 1 ? (
              <Button
                variant="contained"
                size="large"
                startIcon={<Send />}
                onClick={() => setShowSubmitDialog(true)}
                disabled={isTabSwitchBlocked || isQuizLocked || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </Button>
            ) : (
              <Button
                variant="contained"
                endIcon={<NavigateNext />}
                onClick={() => setCurrentQuestion(Math.min(quiz.questions.length - 1, currentQuestion + 1))}
                disabled={isTabSwitchBlocked || isQuizLocked}
              >
                Next
              </Button>
            )}
          </Box>

          {/* Warning Messages */}
          {isTabSwitchBlocked && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Quiz is temporarily locked due to tab switching. Please wait or the quiz will be auto-submitted.
            </Alert>
          )}
          
          {!isFullscreen && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Please stay in fullscreen mode during the quiz.
            </Alert>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default SecureQuizPage;
