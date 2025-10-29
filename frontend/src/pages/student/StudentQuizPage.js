import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  LinearProgress,
  Alert,
  AlertTitle,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Grid,
  Breadcrumbs,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Tooltip,
  IconButton,
  Collapse
} from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import QuizIcon from '@mui/icons-material/Quiz';
import SecurityIcon from '@mui/icons-material/Security';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import axios from 'axios';
import { Link as RouterLink } from 'react-router-dom';
import { restoreUserFromToken, isAuthenticated, getCurrentUser } from '../../utils/authService';
import SecurityViolationDialog from '../../components/student/SecurityViolationDialog';
import { 
  performComprehensiveSecurityCheck, 
  detectRemoteConnections, 
  disableBrowserExtensions,
  getExtensionDisableInstructions 
} from '../../utils/securityUtils';

const StudentQuizPage = ({ user: userProp, token: tokenProp }) => {
  const { attemptId, courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get token from various sources in priority order
  const getToken = () => {
    // 1. From props
    if (tokenProp) return tokenProp;
    
    // 2. From localStorage
    const localToken = localStorage.getItem('token');
    if (localToken) return localToken;
    
    // 3. No token found
    console.error('No authentication token found from any source');
    return null;
  };
  
  // Initialize token state
  const [token, setToken] = useState(getToken());
  // Track user state
  const [user, setUser] = useState(userProp || getCurrentUser());
  // Debug mode
  const [debug] = useState(true);
  
  // Log important information when in debug mode
  useEffect(() => {
    if (debug) {
      console.group('StudentQuizPage Debug Info');
      console.log('Page Load Time:', new Date().toISOString());
      console.log('Attempt ID:', attemptId);
      console.log('Course ID:', courseId);
      console.log('Token present:', !!token);
      console.log('User present:', !!user);
      console.log('Current path:', window.location.pathname);
      console.log('isAuthenticated():', isAuthenticated());
      console.log('localStorage token present:', !!localStorage.getItem('token'));
      console.log('localStorage user present:', !!localStorage.getItem('user'));
      console.groupEnd();
    }
  }, [debug, attemptId, courseId, token, user]);
  
  // Check authentication on mount and restore user from token if needed
  useEffect(() => {
    console.log('StudentQuizPage: Authentication check running');
    
    // If no token, try to restore it
    if (!token) {
      console.warn('StudentQuizPage: No token in state, trying to restore');
      const restoredToken = getToken();
      if (restoredToken) {
        console.log('StudentQuizPage: Token restored from alternate source');
        setToken(restoredToken);
        return; // Exit early as the next effect run will handle user restoration
      } else {
        console.error('StudentQuizPage: Failed to restore token, redirecting to login');
        navigate('/login', { state: { from: location } });
        return;
      }
    }
    
    // Restore user from token if not already available
    if (!user && token) {
      console.log('StudentQuizPage: Attempting to restore user from token');
      const restoredUser = restoreUserFromToken();
      console.log('StudentQuizPage: User restored from token:', !!restoredUser);
      
      if (restoredUser) {
        setUser(restoredUser);
      } else {
        console.error('StudentQuizPage: Failed to restore user from token');
        navigate('/login', { state: { from: location } });
      }
    }
  }, [token, navigate, user, location]);
  
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [endsAtTs, setEndsAtTs] = useState(null); // absolute end timestamp (ms)
  // Security monitoring state
  const [violations, setViolations] = useState([]);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(0);
  const [windowMinimizeCount, setWindowMinimizeCount] = useState(0);
  const [currentViolationType, setCurrentViolationType] = useState('');
  const [showViolationDetails, setShowViolationDetails] = useState(false);
  const [violationAttempts, setViolationAttempts] = useState({
    'tab-switch': 0,
    'alt-tab': 0,
    'fullscreen-exit': 0,
    'window-minimize': 0,
    'suspicious-timing': 0,
    'keyboard-shortcut': 0,
    'context-menu': 0,
    'clipboard': 0,
    'remote-connection': 0,
    'browser-extensions': 0,
    'devtools-open-heuristic': 0
  });
  const MAX_ATTEMPTS = 8; // Maximum attempts allowed for each violation type (increased from 3 to 8 for less restrictive security)
  const quizContainerRef = useRef(null);
  const keyBlockCountRef = useRef(0);
  const awayTimerRef = useRef(null);
  const awayStartRef = useRef(null);
  const fsExitCountRef = useRef(0);
  const prevFsRef = useRef(false);
  const quizActiveRef = useRef(true);
  const wasHiddenRef = useRef(false);
  const warningTimerRef = useRef(null);
  
  // Enhanced security states
  const [securityCheck, setSecurityCheck] = useState(null);
  const [securityBlocked, setSecurityBlocked] = useState(false);
  const [remoteConnectionWarning, setRemoteConnectionWarning] = useState(false);
  const [extensionWarning, setExtensionWarning] = useState(false);
  const [securityRecommendations, setSecurityRecommendations] = useState([]);

  // Monitor violation attempts for auto-submit (using the new system)
  useEffect(() => {
    const totalTabSwitches = (violationAttempts['tab-switch'] || 0) + (violationAttempts['alt-tab'] || 0);
    console.log('🔢 TOTAL TAB SWITCHES:', totalTabSwitches);
    
    if (totalTabSwitches >= 3 && !autoSubmitted && !submitted) {
      console.log('🚫 TAB SWITCH LIMIT EXCEEDED! Triggering auto-submit...');
      triggerAutoSubmit(`Tab switch limit exceeded (${totalTabSwitches}/3)`);
    }
  }, [violationAttempts, autoSubmitted, submitted]);
  
  // Legacy tab switch count monitoring is no longer needed
  // The new violationAttempts system handles all tab switch detection

  // Security state persistence functions
  const getSecurityStateKey = () => `quiz_security_${attemptId}`;
  
  const saveSecurityState = (customValues = {}) => {
    const securityState = {
      violations: customValues.violations || violations,
      tabSwitchCount: customValues.tabSwitchCount || tabSwitchCount,
      warningCount: customValues.warningCount !== undefined ? customValues.warningCount : warningCount,
      fsExitCount: customValues.fsExitCount !== undefined ? customValues.fsExitCount : fsExitCountRef.current,
      keyBlockCount: customValues.keyBlockCount !== undefined ? customValues.keyBlockCount : keyBlockCountRef.current,
      windowMinimizeCount: customValues.windowMinimizeCount || windowMinimizeCount,
      violationAttempts: customValues.violationAttempts || violationAttempts,
      timestamp: Date.now()
    };
    localStorage.setItem(getSecurityStateKey(), JSON.stringify(securityState));
    console.log('💾 Security state saved:', securityState);
    console.log('🚨 Warning count saved:', securityState.warningCount);
  };
  
  const restoreSecurityState = () => {
    try {
      const saved = localStorage.getItem(getSecurityStateKey());
      if (saved) {
        const state = JSON.parse(saved);
        setViolations(state.violations || []);
        setTabSwitchCount(state.tabSwitchCount || 0);
        setWarningCount(state.warningCount || 0);
        setWindowMinimizeCount(state.windowMinimizeCount || 0);
        setViolationAttempts(state.violationAttempts || {
          'tab-switch': 0,
          'alt-tab': 0,
          'fullscreen-exit': 0,
          'window-minimize': 0,
          'suspicious-timing': 0,
          'keyboard-shortcut': 0,
          'context-menu': 0,
          'clipboard': 0,
          'devtools-open-heuristic': 0
        });
        fsExitCountRef.current = state.fsExitCount || 0;
        keyBlockCountRef.current = state.keyBlockCount || 0;
        console.log('🔒 Security state restored:', state);
        console.log('🚨 Warning count restored:', state.warningCount || 0);
      } else {
        console.log('🔒 No security state found to restore');
      }
    } catch (error) {
      console.error('❌ Failed to restore security state:', error);
    }
  };
  
  const clearSecurityState = () => {
    localStorage.removeItem(getSecurityStateKey());
  };

  const showSecurityWarning = (violationType, message) => {
    console.log(`🚨🚨🚨 SHOW SECURITY WARNING CALLED: ${violationType} - ${message}`);
    
    // Debug: Check current states
    console.log('🔍 Current states before update:', {
      showWarning,
      currentViolationType,
      autoSubmitted,
      submitted,
      violationAttempts
    });
    
    // Update violation attempt count for this specific type
    setViolationAttempts(prev => {
      const newAttempts = {
        ...prev,
        [violationType]: (prev[violationType] || 0) + 1
      };
      
      const currentAttempt = newAttempts[violationType];
      console.log(`📊 ${violationType} attempt: ${currentAttempt}/${MAX_ATTEMPTS}`);
      
      // Check if this violation type has reached max attempts
      if (currentAttempt >= MAX_ATTEMPTS) {
        console.log(`🚫 ${violationType} max attempts reached! Auto-submitting...`);
        
        // Add the final violation that triggered the limit
        const finalViolation = { 
          type: violationType, 
          details: { 
            attempt: currentAttempt,
            maxAttempts: MAX_ATTEMPTS,
            message,
            trigger: 'max_attempts_reached'
          }, 
          at: Date.now() 
        };
        const updatedViolations = [...violations, finalViolation];
        
        // Save state before auto-submit
        saveSecurityState({ violationAttempts: newAttempts, violations: updatedViolations });
        
        // Trigger auto-submit with the current violations
        setTimeout(() => {
          triggerAutoSubmit(
            `Maximum attempts for ${violationType} reached (${currentAttempt}/${MAX_ATTEMPTS})`,
            null, // currentTabCount 
            updatedViolations // pass the violations we just created
          );
        }, 100); // Small delay to ensure state is saved
        
        return newAttempts;
      }
      
      // Show the popup with current attempt info
      console.log(`✅ Setting dialog to show: violationType=${violationType}, currentAttempt=${currentAttempt}`);
      setCurrentViolationType(violationType);
      setShowWarning(true);
      setWarningCountdown(15);
      
      console.log('✅ Dialog state should now be: showWarning=true, currentViolationType=' + violationType);
      
      // Add violation to history
      addViolation(violationType, { 
        attempt: currentAttempt,
        maxAttempts: MAX_ATTEMPTS,
        message,
        countdown: 15
      });
      
      // Save security state immediately with the new attempt count
      saveSecurityState({ violationAttempts: newAttempts });
      
      // Clear any existing warning timer
      if (warningTimerRef.current) {
        clearInterval(warningTimerRef.current);
      }
      
      // Start countdown timer
      let countdown = 15;
      console.log('⏰ Starting countdown timer at 15 seconds');
      warningTimerRef.current = setInterval(() => {
        countdown--;
        console.log('⏰ Countdown:', countdown);
        setWarningCountdown(countdown);
        
        if (countdown <= 0) {
          console.log('⏰ Countdown finished - hiding dialog');
          clearInterval(warningTimerRef.current);
          setShowWarning(false);
        }
      }, 1000);
      
      return newAttempts;
    });
  };

  const dismissWarning = () => {
    console.log('🚨 dismissWarning called - hiding dialog');
    if (warningTimerRef.current) {
      clearInterval(warningTimerRef.current);
    }
    setShowWarning(false);
    setWarningCountdown(0);
    setCurrentViolationType('');
  };

  const addViolation = (type, details = {}) => {
    const newViolation = { type, details, at: Date.now() };
    const newViolations = [...violations, newViolation];
    setViolations(newViolations);
    
    // Save security state with the new violation
    saveSecurityState({ violations: newViolations });
  };

  const triggerAutoSubmit = (reason, currentTabCount = null, existingViolations = null) => {
    if (autoSubmitted || submitted || submitting) {
      console.log('⚠️ Auto-submit blocked - already submitted or in progress:', { autoSubmitted, submitted, submitting });
      return;
    }
    console.log('🚨 Triggering auto-submit:', reason);
    setAutoSubmitted(true);
    
    // Clear any warning timers
    if (warningTimerRef.current) {
      clearInterval(warningTimerRef.current);
    }
    setShowWarning(false);
    
    // Use the provided tab count or current state
    const actualTabCount = currentTabCount !== null ? currentTabCount : tabSwitchCount;
    console.log(`🚨 Auto-submit triggered with tab count: ${actualTabCount}. Reason: ${reason}`);
    
    // Use existing violations if provided, otherwise use current state
    const baseViolations = existingViolations || violations;
    
    // Add the auto-submit violation
    const autoSubmitViolation = { type: 'auto-submit', details: { reason }, at: Date.now() };
    const finalViolations = [...baseViolations, autoSubmitViolation];
    
    console.log(`🔍 Auto-submit violations being sent:`, finalViolations);
    console.log(`🔍 Total violations count: ${finalViolations.length}`);
    
    // Update state and submit immediately with the collected violations
    setViolations(finalViolations);
    saveSecurityState({ violations: finalViolations, tabSwitchCount: actualTabCount });
    
    // Submit with the violations we just collected
    handleSubmitQuizWithViolations(finalViolations, actualTabCount);
  };

  // Simple fullscreen support for legacy page
  const enterFullscreen = async () => {
    const el = quizContainerRef.current || document.documentElement;
    try {
      let p;
      if (el.requestFullscreen) {
        p = el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        p = el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        p = el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        p = el.msRequestFullscreen();
      }
      
      if (p && typeof p.then === 'function') {
        await p;
      }
      return true;
    } catch (err) {
      // Only record as violation if it's not a permission issue
      const errorMessage = err?.message || String(err);
      if (!errorMessage.includes('Permissions check failed') && 
          !errorMessage.includes('Permission denied') &&
          !errorMessage.includes('denied by the user agent') &&
          !errorMessage.includes('not allowed')) {
        addViolation('fullscreen-error', { message: errorMessage });
      }
      console.log('Fullscreen request failed (not counted as violation):', errorMessage);
      return false;
    }
  };
  const exitFullscreen = () => {
    try {
      const p = document.exitFullscreen
        ? document.exitFullscreen()
        : document.webkitExitFullscreen
        ? document.webkitExitFullscreen()
        : document.mozCancelFullScreen
        ? document.mozCancelFullScreen()
        : document.msExitFullscreen
        ? document.msExitFullscreen()
        : undefined;
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) {}
  };

  // Important: this hook must be declared before any conditional returns
  useEffect(() => {
    const onFsChange = () => {
      const fs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      setIsFullscreen(fs);
      // Detect FS exit events for violation logging
      if (prevFsRef.current && !fs) {
        fsExitCountRef.current += 1;
        // Save the new fullscreen exit count immediately
        saveSecurityState({ fsExitCount: fsExitCountRef.current });
        showSecurityWarning(
          'fullscreen-exit', 
          'You exited fullscreen mode. The quiz must be taken in fullscreen mode.'
        );
      }
      prevFsRef.current = fs;
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('mozfullscreenchange', onFsChange);
    document.addEventListener('MSFullscreenChange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      document.removeEventListener('mozfullscreenchange', onFsChange);
      document.removeEventListener('MSFullscreenChange', onFsChange);
    };
  }, []);

  // Auto-enter fullscreen: arm one-time user-gesture listeners after quiz loads
  useEffect(() => {
    if (!quiz) return;
    const attemptAutoFs = () => {
      if (!document.fullscreenElement && quizContainerRef.current) {
        enterFullscreen();
      }
      window.removeEventListener('pointerdown', attemptAutoFs, true);
      window.removeEventListener('keydown', attemptAutoFs, true);
    };
    // In case navigation click still counts as gesture in some browsers
    setTimeout(() => {
      if (!document.fullscreenElement && quizContainerRef.current) {
        enterFullscreen();
      }
    }, 100);
    window.addEventListener('pointerdown', attemptAutoFs, true);
    window.addEventListener('keydown', attemptAutoFs, true);
    return () => {
      window.removeEventListener('pointerdown', attemptAutoFs, true);
      window.removeEventListener('keydown', attemptAutoFs, true);
    };
  }, [quiz]);

  // Security: monitor tab switching, keyboard, context menu, clipboard, and basic devtools
  useEffect(() => {
    quizActiveRef.current = !submitted;
    console.log('🎯 Quiz active state changed:', {
      submitted,
      quizActiveRef: quizActiveRef.current
    });
  }, [submitted]);

  useEffect(() => {
    console.log('🔐 Security monitoring effect - quizActive:', quizActiveRef.current, 'submitted:', submitted);
    if (!quizActiveRef.current) {
      console.log('⚠️ Security monitoring DISABLED - quiz not active (submitted:', submitted, ')');
      return;
    }
    console.log('✅ Security monitoring ENABLED - Attaching event listeners...');

    const startAwayTimer = () => {
      awayStartRef.current = Date.now();
      // Auto-submit if away for >= 15s
      if (awayTimerRef.current) clearTimeout(awayTimerRef.current);
      awayTimerRef.current = setTimeout(() => {
        showSecurityWarning(
          'suspicious-timing', 
          'You have been away from the quiz for too long. Stay focused on the quiz at all times.'
        );
      }, 15000);
    };

    const clearAwayTimer = () => {
      if (awayTimerRef.current) {
        clearTimeout(awayTimerRef.current);
        awayTimerRef.current = null;
      }
    };

    const onVisibility = () => {
      const currentlyHidden = document.hidden;
      const wasHidden = wasHiddenRef.current;
      
      console.log('👀 Visibility change detected:', { 
        currentlyHidden,
        wasHidden,
        quizActive: quizActiveRef.current,
        submitted,
        autoSubmitted,
        timestamp: new Date().toLocaleTimeString()
      });
      
      // Update the ref to current state
      wasHiddenRef.current = currentlyHidden;
      
      if (currentlyHidden) {
        console.log('📱 Tab became hidden');
        startAwayTimer();
        
        // Additional check for minimization when page becomes hidden
        if (window.outerHeight <= 100 || window.outerWidth <= 100) {
          showSecurityWarning(
            'window-minimize', 
            'Do not minimize the browser window during the quiz.'
          );
        }
      } else {
        console.log('👁️ Tab became visible');
        
        // If tab was hidden and now becomes visible, that's a tab switch
        if (wasHidden) {
          console.log('✅ TAB SWITCH DETECTED! (was hidden, now visible)');
          
          const awayMs = awayStartRef.current ? Date.now() - awayStartRef.current : 0;
          clearAwayTimer();
          
          // Show warning popup - this will handle the counting
          showSecurityWarning(
            'tab-switch', 
            'You switched tabs or windows. Stay on the quiz page at all times.'
          );
        } else {
          console.log('❌ No tab switch - tab was not previously hidden (probably initial load)');
        }
      }
    };

    const onBlur = () => {
      console.log('🔍 Window blur detected - checking if user actually switched away...');
      
      // Check for recent system key presses that might indicate Alt+Tab or Windows key navigation
      const recentSystemKeyPress = window.lastSystemKeyPress && (Date.now() - window.lastSystemKeyPress < 500);
      
      // Add a shorter delay for system key scenarios, longer for regular blur
      const delay = recentSystemKeyPress ? 50 : 250;
      
      setTimeout(() => {
        // Enhanced detection for various navigation scenarios
        const isActuallyHidden = document.hidden || document.visibilityState === 'hidden';
        const isMinimized = window.outerHeight === 0 || window.outerWidth === 0;
        const lostFocus = !document.hasFocus();
        const inFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || 
                                document.mozFullScreenElement || document.msFullscreenElement);
        
        // In fullscreen mode, be more sensitive to focus changes
        const shouldTrigger = inFullscreen ? 
          (isActuallyHidden || isMinimized || lostFocus) :
          (isActuallyHidden || isMinimized);
        
        if (shouldTrigger) {
          console.log('🚨 Confirmed: User actually switched away from quiz');
          console.log('📊 Detection details:', {
            isActuallyHidden,
            isMinimized,
            lostFocus,
            inFullscreen,
            recentSystemKeyPress,
            lastSystemKey: window.lastSystemKeyType
          });
          
          // Enhanced violation categorization
          let violationType = 'tab-switch';
          let message = 'Tab switching detected. Stay focused on the quiz.';
          
          if (isMinimized) {
            violationType = 'window-minimize';
            message = 'Do not minimize the browser window during the quiz.';
          } else if (recentSystemKeyPress) {
            if (window.lastSystemKeyType === 'alt-tab') {
              violationType = 'alt-tab';
              message = 'Alt+Tab navigation detected. Do not switch between applications during the quiz.';
            } else if (window.lastSystemKeyType === 'windows-key') {
              violationType = 'windows-key';
              message = 'Windows key navigation detected. Do not use system shortcuts during the quiz.';
            }
          } else if (inFullscreen && lostFocus) {
            violationType = 'fullscreen-navigation';
            message = 'Navigation away from fullscreen quiz detected. Stay in the quiz window.';
          }
          
          showSecurityWarning(violationType, message);
          
          // Start away timer
          if (!document.hidden) startAwayTimer();
        } else {
          console.log('✅ False alarm: Window blur but quiz still visible, ignoring');
        }
      }, delay);
    };
    const onFocus = () => {
      console.log('✅ Window focus detected (user returned to quiz window)');
      
      if (awayStartRef.current) {
        const awayMs = Date.now() - awayStartRef.current;
        clearAwayTimer();
        addViolation('window-focus-return', { awayMs });
        console.log(`👀 User returned to quiz after being away for ${awayMs}ms`);
      }
    };

    const forbiddenCombo = (e) => {
      const k = e.key?.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;
      const keyCode = e.keyCode || e.which;
      
      // Track system key presses for enhanced blur detection
      if (alt && k === 'tab') {
        console.log('🚨 Alt+Tab detected in keydown!');
        window.lastSystemKeyPress = Date.now();
        window.lastSystemKeyType = 'alt-tab';
        e.preventDefault();
        showSecurityWarning('alt-tab', 'Alt+Tab navigation detected. Do not switch between applications during the quiz.');
        return false;
      }
      
      // Track Windows/Meta key presses
      if (k === 'meta' || k === 'os' || keyCode === 91 || keyCode === 92) {
        console.log('🚨 Windows key detected!');
        window.lastSystemKeyPress = Date.now();
        window.lastSystemKeyType = 'windows-key';
        // Don't prevent default here as it might cause issues, but track it
        setTimeout(() => {
          // Check if focus was lost after Windows key press
          if (!document.hasFocus() || document.hidden) {
            showSecurityWarning('windows-key', 'Windows key navigation detected. Do not use system shortcuts during the quiz.');
          }
        }, 100);
      }
      
      // Track Ctrl+Shift+Tab (reverse tab switching)
      if (ctrl && shift && k === 'tab') {
        console.log('🚨 Ctrl+Shift+Tab detected!');
        window.lastSystemKeyPress = Date.now();
        window.lastSystemKeyType = 'ctrl-shift-tab';
        e.preventDefault();
        showSecurityWarning('keyboard-shortcut', 'Ctrl+Shift+Tab navigation detected. Do not switch between tabs during the quiz.');
        return false;
      }
      
      // Track F11 (fullscreen toggle)
      if (k === 'f11' || keyCode === 122) {
        console.log('🚨 F11 fullscreen toggle detected!');
        window.lastSystemKeyPress = Date.now();
        window.lastSystemKeyType = 'f11';
        // Check if exiting fullscreen
        setTimeout(() => {
          const inFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || 
                                  document.mozFullScreenElement || document.msFullscreenElement);
          if (!inFullscreen) {
            showSecurityWarning('fullscreen-exit', 'Exiting fullscreen mode is not allowed during the quiz.');
          }
        }, 100);
      }
      
      // Alt+Tab (tab switching)
      if (alt && k === 'tab') {
        // Show warning popup - this will handle the counting
        showSecurityWarning(
          'alt-tab', 
          'Alt+Tab detected. Stay focused on the quiz without switching applications.'
        );
        return 'alt-tab';
      }
      
      // Developer tools and disruptive shortcuts
      if (
        k === 'f12' ||
        (ctrl && shift && (k === 'i' || k === 'j' || k === 'c')) ||
        (ctrl && (k === 's' || k === 'p'))
      ) {
        return 'devtools-or-system-shortcut';
      }
      // Clipboard
      if (ctrl && (k === 'c' || k === 'v' || k === 'x')) return 'clipboard';
      return null;
    };

    const onKeyDown = (e) => {
      const category = forbiddenCombo(e);
      if (category) {
        e.preventDefault();
        e.stopPropagation();
        keyBlockCountRef.current += 1;
        addViolation('keyboard-shortcut', { category, key: e.key, count: keyBlockCountRef.current });
        showSecurityWarning(
          'keyboard-shortcut',
          `Forbidden keyboard shortcut detected: ${e.key}. Do not use developer tools or system shortcuts.`
        );
      }
    };

    const onContextMenu = (e) => {
      e.preventDefault();
      addViolation('context-menu');
      showSecurityWarning(
        'context-menu',
        'Right-click is disabled during the quiz. Do not attempt to open the context menu.'
      );
    };

    const onCopy = (e) => {
      e.preventDefault();
      addViolation('clipboard', { action: 'copy' });
      showSecurityWarning(
        'clipboard',
        'Copy operation is not allowed during the quiz.'
      );
    };
    const onPaste = (e) => {
      e.preventDefault();
      addViolation('clipboard', { action: 'paste' });
      showSecurityWarning(
        'clipboard',
        'Paste operation is not allowed during the quiz.'
      );
    };
    const onCut = (e) => {
      e.preventDefault();
      addViolation('clipboard', { action: 'cut' });
      showSecurityWarning(
        'clipboard',
        'Cut operation is not allowed during the quiz.'
      );
    };

    let resizeFlagged = false;
    const onResize = () => {
      // Basic devtools heuristic: large diff between outer and inner sizes
      const wDiff = (window.outerWidth || 0) - (window.innerWidth || 0);
      const hDiff = (window.outerHeight || 0) - (window.innerHeight || 0);
      if ((wDiff > 160 || hDiff > 160) && !resizeFlagged) {
        resizeFlagged = true;
        addViolation('devtools-open-heuristic', { wDiff, hDiff });
        showSecurityWarning(
          'devtools-open-heuristic',
          'Developer tools may be open. Close all developer tools immediately.'
        );
      }
      
      // Check for window minimization (outer dimensions become 0 or very small)
      if (window.outerHeight <= 100 || window.outerWidth <= 100) {
        const newMinimizeCount = windowMinimizeCount + 1;
        setWindowMinimizeCount(newMinimizeCount);
        // Save the new minimize count immediately
        saveSecurityState({ windowMinimizeCount: newMinimizeCount });
        showSecurityWarning(
          'window-minimize', 
          'Do not minimize or resize the browser window too small.'
        );
      }
    };

    console.log('📋 Attaching security event listeners...');
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('keydown', onKeyDown, { capture: true });
    document.addEventListener('contextmenu', onContextMenu, { capture: true });
    document.addEventListener('copy', onCopy, { capture: true });
    document.addEventListener('paste', onPaste, { capture: true });
    document.addEventListener('cut', onCut, { capture: true });
    window.addEventListener('resize', onResize);
    console.log('✅ Security event listeners attached successfully!');

    return () => {
      console.log('🧹 Cleaning up security event listeners...');
      clearAwayTimer();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('keydown', onKeyDown, { capture: true });
      document.removeEventListener('contextmenu', onContextMenu, { capture: true });
      document.removeEventListener('copy', onCopy, { capture: true });
      document.removeEventListener('paste', onPaste, { capture: true });
      document.removeEventListener('cut', onCut, { capture: true });
      window.removeEventListener('resize', onResize);
    };
  }, [submitted]);

  // Load quiz attempt data
  useEffect(() => {
    const fetchQuizAttempt = async () => {
      try {
        console.log('Fetching quiz attempt:', attemptId, 'with token:', !!token);
        setLoading(true);
        
        // Early validation of inputs
        if (!attemptId) {
          console.error('Cannot fetch quiz: No attempt ID provided');
          setError('Quiz attempt ID is missing. Please return to the course page and try again.');
          setLoading(false);
          return;
        }
        
        if (!token) {
          console.error('Cannot fetch quiz: No token available');
          setError('Authentication token is missing. Please log in again.');
          setLoading(false);
          
          // Try to restore token one more time
          const restoredToken = localStorage.getItem('token');
          if (restoredToken) {
            console.log('Restored token at last chance, trying again');
            setToken(restoredToken);
            return; // Exit and let the effect run again with the new token
          }
          
          setTimeout(() => navigate('/login', { state: { from: location } }), 2000);
          return;
        }
        
        // Make the API request with exponential backoff retry
        let retries = 0;
        const maxRetries = 2;
        
        const makeRequest = async () => {
          try {
            const response = await axios.get(`/api/student/quiz/attempt/${attemptId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('Quiz attempt API response:', response);
            console.log('Quiz attempt data:', response.data);
            
            if (!response.data || !response.data.attemptId) {
              console.error('Quiz API returned no attemptId:', response.data);
              setError('Quiz data is missing or invalid.');
              setLoading(false);
              return false;
            }
            
            // Process quiz data to ensure options are arrays
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
            // Establish an absolute endsAt (preferred from server). Fallback to startedAt + timeLimit.
            const { remainingSeconds, timeLimit, startedAt, endsAt } = response.data || {};
            let ends = null;
            if (endsAt) {
              const parsed = Date.parse(endsAt);
              if (!Number.isNaN(parsed)) ends = parsed;
            }
            if (!ends) {
              const startMs = startedAt ? Date.parse(startedAt) : Date.now();
              const tlMin = typeof timeLimit === 'number' ? timeLimit : null;
              if (tlMin !== null) ends = startMs + tlMin * 60 * 1000;
            }
            if (ends) {
              setEndsAtTs(ends);
              const remain = Math.max(0, Math.ceil((ends - Date.now()) / 1000));
              setTimeLeft(remain);
              try {
                localStorage.setItem(`quiz-endsAt-${attemptId}`, String(ends));
              } catch (_) {}
            } else if (typeof remainingSeconds === 'number') {
              // As a last resort, use remainingSeconds
              setTimeLeft(remainingSeconds);
            }
            setLoading(false);
            return true;
          } catch (err) {
            if (retries < maxRetries) {
              retries++;
              console.log(`Request failed, retrying (${retries}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
              return await makeRequest();
            }
            throw err;
          }
        };
        
        await makeRequest();
      } catch (err) {
        console.error('Error loading quiz after retries:', err.response || err);
        setLoading(false);
        
        if (err.response?.status === 401) {
          console.log('Unauthorized access (401). Redirecting to login...');
          setError('Your session has expired. Please log in again.');
          setTimeout(() => navigate('/login', { state: { from: location } }), 1500);
          return;
        }
        
        if (err.response?.status === 404) {
          console.log('Quiz not found (404).');
          setError('This quiz attempt does not exist or has been deleted.');
          setTimeout(() => navigate('/student'), 3000);
          return;
        }
        
        if (err.response?.data?.completed) {
          // Quiz already completed, show result summary
          console.log('Quiz already completed, showing results');
          setResult(err.response.data.attempt);
          setSubmitted(true);
        } else {
          setError(`Failed to load quiz: ${err.response?.data?.message || err.message}. Please try again.`);
          
          // Add a retry button
          setTimeout(() => {
            if (document.getElementById('retry-button')) return;
            
            const retryBtn = document.createElement('button');
            retryBtn.id = 'retry-button';
            retryBtn.innerText = 'Retry Loading Quiz';
            retryBtn.style.padding = '10px 20px';
            retryBtn.style.margin = '20px auto';
            retryBtn.style.display = 'block';
            retryBtn.onclick = () => window.location.reload();
            
            document.querySelector('main')?.appendChild(retryBtn);
          }, 1000);
        }
      }
    };
    
    if (attemptId && token) {
      fetchQuizAttempt();
    } else if (!attemptId) {
      setError('No quiz attempt ID provided');
      setLoading(false);
    }
  }, [attemptId, token, navigate, location]);

  // Comprehensive security check when quiz loads
  useEffect(() => {
    const runSecurityCheck = async () => {
      if (!quiz) return;
      
      console.log('🔒 Running comprehensive security check...');
      
      try {
        const securityResult = await performComprehensiveSecurityCheck();
        setSecurityCheck(securityResult);
        
        console.log('🔍 Security check results:', securityResult);
        
        // Handle security violations
        if (securityResult.blocking) {
          console.error('🚫 Quiz blocked due to security violations');
          setSecurityBlocked(true);
          setError('Quiz cannot proceed due to security violations. Please resolve the security issues and try again.');
          return;
        }
        
        // Handle warnings
        if (securityResult.violations.length > 0) {
          securityResult.violations.forEach(violation => {
            if (violation.type === 'REMOTE_CONNECTION_DETECTED') {
              setRemoteConnectionWarning(true);
              showSecurityWarning(
                'remote-connection',
                'Remote desktop software detected. Please close all remote connection applications.'
              );
            } else if (violation.type === 'EXTENSIONS_DETECTED') {
              setExtensionWarning(true);
              showSecurityWarning(
                'browser-extensions',
                'Browser extensions detected. Consider using incognito mode for better security.'
              );
            }
          });
        }
        
        // Set recommendations
        setSecurityRecommendations(securityResult.recommendations);
        
        // Try to disable extensions if possible
        const extensionsDisabled = await disableBrowserExtensions();
        if (!extensionsDisabled) {
          console.warn('⚠️ Could not disable browser extensions automatically');
        }
        
      } catch (error) {
        console.error('Security check failed:', error);
        setSecurityRecommendations([{
          type: 'SECURITY_CHECK_ERROR',
          message: 'Could not verify security environment',
          priority: 'MEDIUM'
        }]);
      }
    };
    
    runSecurityCheck();
  }, [quiz]);

  // Timer countdown driven by endsAtTs to survive refresh and avoid drift
  useEffect(() => {
    if (!endsAtTs || submitted) return;
    const tick = () => {
      const remain = Math.max(0, Math.ceil((endsAtTs - Date.now()) / 1000));
      setTimeLeft(remain);
      if (remain === 0) {
        handleSubmitQuiz();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAtTs, submitted]);

  // On mount, try to restore endsAt from localStorage quickly while API loads
  useEffect(() => {
    if (!attemptId) return;
    try {
      const ends = localStorage.getItem(`quiz-endsAt-${attemptId}`);
      if (ends) {
        const endsNum = parseInt(ends, 10);
        if (!Number.isNaN(endsNum)) {
          setEndsAtTs(endsNum);
          const remain = Math.max(0, Math.ceil((endsNum - Date.now()) / 1000));
          setTimeLeft(remain);
        }
      }
    } catch (_) {}
  }, [attemptId]);

  // Restore security state on mount
  useEffect(() => {
    if (!attemptId) return;
    restoreSecurityState();
  }, [attemptId]);

  const handleAnswerChange = (questionId, selectedOption) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: parseInt(selectedOption)
    }));
  };

  const handleNextQuestion = async () => {
    // Check if fullscreen is active, if not, enter it first
    if (!isFullscreen) {
      const success = await enterFullscreen();
      if (success) {
        // Give a moment for fullscreen to activate
        setTimeout(() => {
          if (currentQuestion < quiz.questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
          }
        }, 100);
      } else {
        addViolation('fullscreen-required-navigation', { button: 'next' });
        // Still navigate but record violation
        if (currentQuestion < quiz.questions.length - 1) {
          setCurrentQuestion(currentQuestion + 1);
        }
      }
    } else {
      if (currentQuestion < quiz.questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      }
    }
  };

  const handlePreviousQuestion = async () => {
    // Check if fullscreen is active, if not, enter it first
    if (!isFullscreen) {
      const success = await enterFullscreen();
      if (success) {
        // Give a moment for fullscreen to activate
        setTimeout(() => {
          if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1);
          }
        }, 100);
      } else {
        addViolation('fullscreen-required-navigation', { button: 'previous' });
        // Still navigate but record violation
        if (currentQuestion > 0) {
          setCurrentQuestion(currentQuestion - 1);
        }
      }
    } else {
      if (currentQuestion > 0) {
        setCurrentQuestion(currentQuestion - 1);
      }
    }
  };

  const handleQuestionNavigation = async (index) => {
    if (index >= 0 && index < quiz.questions.length) {
      // Check if fullscreen is active, if not, enter it first
      if (!isFullscreen) {
        const success = await enterFullscreen();
        if (success) {
          // Give a moment for fullscreen to activate
          setTimeout(() => {
            setCurrentQuestion(index);
          }, 100);
        } else {
          addViolation('fullscreen-required-navigation', { button: 'question-number', questionIndex: index });
          // Don't navigate if fullscreen failed
          return;
        }
      } else {
        setCurrentQuestion(index);
      }
    }
  };

  const handleToggleFlag = (questionId) => {
    setMarkedForReview(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const handleClearResponse = (questionId) => {
    setAnswers(prev => {
      const n = { ...prev };
      delete n[questionId];
      return n;
    });
  };

  // Helper function to submit quiz with specific violations (avoids race conditions)
  const handleSubmitQuizWithViolations = async (specificViolations, tabCount) => {
    return handleSubmitQuiz(true, tabCount, specificViolations);
  };

  const handleSubmitQuiz = async (auto = false, overrideTabCount = null, specificViolations = null) => {
    // Prevent multiple submissions
    if (submitted || submitting) {
      console.log('⚠️ Submission already in progress or completed, ignoring');
      return;
    }
    
    try {
      setSubmitting(true);
      console.log('🚀 Starting quiz submission...', { auto, overrideTabCount, hasSpecificViolations: !!specificViolations });
      
      // Convert answers to the expected format
      const formattedAnswers = Object.entries(answers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption
      }));

      // For auto-submit, ensure we have at least empty answers for all questions to satisfy validation
      if (auto && formattedAnswers.length === 0 && quiz?.questions) {
        quiz.questions.forEach((question, index) => {
          formattedAnswers.push({
            questionId: question._id || question.id || `question_${index}`,
            selectedOption: null // or -1 to indicate no answer
          });
        });
        console.log('Auto-submit: Added empty answers for validation');
      }

      // Use override tab count if provided (for auto-submit), otherwise derive from violations
      const derivedTabCount = (violationAttempts['tab-switch'] || 0) + (violationAttempts['alt-tab'] || 0);
      const actualTabCount = overrideTabCount !== null ? overrideTabCount : Math.max(tabSwitchCount, derivedTabCount);

      console.log('Submitting quiz answers:', formattedAnswers);
      console.log('Auto-submit mode:', auto);
      console.log('Tab switch count:', actualTabCount);

      // Use specific violations if provided (for auto-submit) or current state
      const violationsToUse = specificViolations || violations;
      
      // Convert violations to match backend schema - convert to strings instead of objects
      const formattedViolations = violationsToUse.map(violation => 
        `${violation.type || 'unknown'}: ${violation.details ? JSON.stringify(violation.details) : violation.message || 'Security violation detected'} at ${new Date(violation.at || Date.now()).toISOString()}`
      );

      console.log('🔍 Original violations:', violationsToUse);
      console.log('🔍 Formatted violations:', formattedViolations);

      const submissionData = {
        answers: formattedAnswers,
        securityViolations: formattedViolations,
        tabSwitchCount: actualTabCount,
        isAutoSubmit: auto,
        fsExitCount: fsExitCountRef.current,
        timeSpent: quiz?.timeLimit ? Math.max(0, (quiz.timeLimit * 60) - (timeLeft || 0)) : 0
      };

      console.log('Submission data being sent:', submissionData);
      console.log('🔍 Security violations type:', typeof submissionData.securityViolations);
      console.log('🔍 Security violations Array.isArray:', Array.isArray(submissionData.securityViolations));
      console.log('🔍 Security violations JSON.stringify:', JSON.stringify(submissionData.securityViolations, null, 2));

      // Test backend connectivity
      console.log('🔍 Testing backend connectivity...');
      try {
        const testResponse = await axios.get('/api/notifications/unread-count', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Backend connectivity test passed:', testResponse.status);
      } catch (testErr) {
        console.error('❌ Backend connectivity test failed:', testErr);
      }

      console.log('📤 Submitting quiz to:', `/api/student/quiz-attempt/${attemptId}/submit`);
      const response = await axios.post(`/api/student/quiz-attempt/${attemptId}/submit`, submissionData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ Quiz submission successful!');
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
      
      setResult(response.data);
      setSubmitted(true);
      setSubmitting(false);
      
      // Clear security state after successful submission
      clearSecurityState();
    } catch (err) {
      console.error('❌ Error submitting quiz:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      // Handle "Quiz already submitted" case
      if (err.response?.status === 400 && err.response?.data?.completed) {
        console.log('✅ Quiz was already submitted, treating as success');
        setResult(err.response.data.attempt);
        setSubmitted(true);
        setSubmitting(false);
        clearSecurityState();
        return;
      }
      
      setError('Failed to submit quiz. Please try again.');
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnsweredCount = () => {
    if (!quiz?.questions) return 0;
    return quiz.questions.reduce((count, q) => (
      answers[q.questionId] !== undefined ? count + 1 : count
    ), 0);
  };

  const getFlaggedCount = () => markedForReview.size;
  const getPendingCount = () => {
    const total = quiz?.questions?.length || 0;
    const answered = getAnsweredCount();
    return Math.max(0, total - answered);
  };

  // Security status calculation functions
  const getTotalViolations = () => {
    return Object.values(violationAttempts).reduce((sum, count) => sum + count, 0);
  };

  const getHighRiskViolations = () => {
    return Object.entries(violationAttempts).filter(([type, count]) => 
      count >= Math.floor(MAX_ATTEMPTS * 0.75) // 75% of max attempts
    );
  };

  const getCriticalViolations = () => {
    return Object.entries(violationAttempts).filter(([type, count]) => 
      count >= MAX_ATTEMPTS
    );
  };

  const getSecurityStatus = () => {
    const total = getTotalViolations();
    const critical = getCriticalViolations();
    const highRisk = getHighRiskViolations();
    
    if (critical.length > 0) {
      return { status: 'critical', color: 'error', icon: ErrorIcon };
    } else if (highRisk.length > 0) {
      return { status: 'warning', color: 'warning', icon: WarningIcon };
    } else if (total > 0) {
      return { status: 'caution', color: 'info', icon: InfoIcon };
    } else {
      return { status: 'secure', color: 'success', icon: SecurityIcon };
    }
  };

  const getFailureReasons = () => {
    const reasons = [];
    const critical = getCriticalViolations();
    
    if (critical.length > 0) {
      critical.forEach(([type, count]) => {
        switch(type) {
          case 'tab-switch':
            reasons.push('Excessive tab switching detected');
            break;
          case 'alt-tab':
            reasons.push('Alt+Tab navigation attempts exceeded');
            break;
          case 'fullscreen-exit':
            reasons.push('Repeated fullscreen exit attempts');
            break;
          case 'window-minimize':
            reasons.push('Window minimization limit exceeded');
            break;
          case 'keyboard-shortcut':
            reasons.push('Forbidden keyboard shortcuts used');
            break;
          case 'context-menu':
            reasons.push('Right-click context menu violations');
            break;
          case 'clipboard':
            reasons.push('Copy/paste attempts detected');
            break;
          case 'devtools-open-heuristic':
            reasons.push('Developer tools detection');
            break;
          default:
            reasons.push(`Security violation: ${type}`);
        }
      });
    }
    
    // Check for low score failure
    if (result && result.percentage < 70) {
      reasons.push('Score below passing threshold (70%)');
    }
    
    return reasons;
  };

  const getViolationTypeLabel = (type) => {
    const labels = {
      'tab-switch': 'Tab Switch',
      'alt-tab': 'Alt+Tab',
      'fullscreen-exit': 'Fullscreen Exit',
      'window-minimize': 'Window Minimize',
      'keyboard-shortcut': 'Forbidden Keys',
      'context-menu': 'Right Click',
      'clipboard': 'Copy/Paste',
      'devtools-open-heuristic': 'DevTools',
      'suspicious-timing': 'Timing Issues',
      'remote-connection': 'Remote Access',
      'browser-extensions': 'Extensions'
    };
    return labels[type] || type;
  };

  const getQuestionStatus = (questionId) => {
    const isAnswered = Object.prototype.hasOwnProperty.call(answers, questionId);
    const isFlagged = markedForReview.has(questionId);
    return { isAnswered, isFlagged };
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading quiz...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          variant="contained" 
          onClick={() => navigate(-1)} 
          sx={{ mt: 2 }}
        >
          Go Back
        </Button>
      </Container>
    );
  }

  if (submitted && result) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link component={RouterLink} to="/student" color="inherit">
            Dashboard
          </Link>
          <Link component={RouterLink} to="/student/courses" color="inherit">
            My Courses
          </Link>
          {courseId && (
            <Link component={RouterLink} to={`/student/course/${courseId}/videos`} color="inherit">
              Course
            </Link>
          )}
          <Typography color="text.primary">Quiz Results</Typography>
        </Breadcrumbs>

        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ mb: 3 }}>
            {result.passed ? (
              <CheckCircleIcon color="success" sx={{ fontSize: 80 }} />
            ) : (
              <CancelIcon color="error" sx={{ fontSize: 80 }} />
            )}
          </Box>
          
          <Typography variant="h4" gutterBottom>
            Quiz {result.passed ? 'Passed!' : 'Not Passed'}
          </Typography>
          
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {quiz.unitTitle} - {quiz.courseTitle}
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

          {/* Security Summary Card */}
          {getTotalViolations() > 0 && (
            <Card variant="outlined" sx={{ mt: 2, mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon color={result.passed ? 'warning' : 'error'} />
                  Security Summary
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Total Violations:</Typography>
                    <Typography variant="h6" color={getTotalViolations() > MAX_ATTEMPTS ? 'error' : 'warning'}>
                      {getTotalViolations()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Critical Issues:</Typography>
                    <Typography variant="h6" color="error">
                      {getCriticalViolations().length}
                    </Typography>
                  </Grid>
                  {getCriticalViolations().length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Critical Violations:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {getCriticalViolations().map(([type, count]) => (
                          <Chip
                            key={type}
                            size="small"
                            label={`${getViolationTypeLabel(type)}: ${count}`}
                            color="error"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          )}

          <Typography variant="body1" sx={{ mb: 3 }}>
            {result.passed 
              ? 'Congratulations! You have successfully completed this unit quiz.' 
              : `You need at least 70% to pass. Please review the material and try again.`
            }
          </Typography>

          {/* Failure Analysis */}
          {!result.passed && (
            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                Quiz Failed - Detailed Analysis:
              </Typography>
              {(() => {
                const failureReasons = getFailureReasons();
                const totalViolations = getTotalViolations();
                const criticalViolations = getCriticalViolations();
                
                return (
                  <Box>
                    {/* Score-based failure */}
                    {result.percentage < 70 && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        • <strong>Score:</strong> {result.percentage}% (Need 70% to pass)
                      </Typography>
                    )}
                    
                    {/* Security violations */}
                    {totalViolations > 0 && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        • <strong>Security Violations:</strong> {totalViolations} total violations detected
                      </Typography>
                    )}
                    
                    {/* Critical violations that caused failure */}
                    {criticalViolations.length > 0 && (
                      <Box sx={{ ml: 2, mb: 1 }}>
                        <Typography variant="body2" fontWeight="bold" color="error.dark">
                          Critical Security Issues:
                        </Typography>
                        {criticalViolations.map(([type, count]) => (
                          <Typography key={type} variant="body2" sx={{ ml: 1 }}>
                            • {getViolationTypeLabel(type)}: {count}/{MAX_ATTEMPTS} attempts
                          </Typography>
                        ))}
                      </Box>
                    )}
                    
                    {/* Specific failure reasons */}
                    {failureReasons.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          Specific Issues:
                        </Typography>
                        {failureReasons.map((reason, index) => (
                          <Typography key={index} variant="body2" sx={{ ml: 1 }}>
                            • {reason}
                          </Typography>
                        ))}
                      </Box>
                    )}
                    
                    <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
                      <strong>Next Steps:</strong> {
                        criticalViolations.length > 0 
                          ? 'Contact your instructor to resolve security violations before retaking the quiz.'
                          : 'Review the course material and ensure a stable testing environment for your next attempt.'
                      }
                    </Typography>
                  </Box>
                );
              })()}
            </Alert>
          )}

          {/* Success details */}
          {result.passed && getTotalViolations() > 0 && (
            <Alert severity="success" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                <strong>Note:</strong> Quiz passed successfully despite {getTotalViolations()} minor security notifications. 
                For future quizzes, please maintain a secure testing environment.
              </Typography>
            </Alert>
          )}

          <Button 
            variant="contained" 
            onClick={() => navigate(courseId ? `/student/course/${courseId}/videos` : '/student/courses')}
            size="large"
          >
            {result.passed ? 'Continue to Next Unit' : 'Back to Course'}
          </Button>
        </Paper>
      </Container>
    );
  }

  if (!quiz) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">Quiz data not found.</Alert>
      </Container>
    );
  }

  const currentQ = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
  const answeredCount = getAnsweredCount();
  const flaggedCount = getFlaggedCount();
  const pendingCount = getPendingCount();
  const isLastQuestion = currentQuestion === quiz.questions.length - 1;
  const allAnswered = quiz.questions.every(q => answers[q.questionId] !== undefined);


  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/student" color="inherit">
          Dashboard
        </Link>
        <Link component={RouterLink} to="/student/courses" color="inherit">
          My Courses
        </Link>
        {courseId && (
          <Link component={RouterLink} to={`/student/course/${courseId}/videos`} color="inherit">
            Course
          </Link>
        )}
        <Typography color="text.primary">Quiz</Typography>
      </Breadcrumbs>

      {/* Security Warnings */}
      {remoteConnectionWarning && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Remote Connection Detected</AlertTitle>
          Remote desktop software detected. Please close all remote access applications and refresh the page to continue.
        </Alert>
      )}

      {extensionWarning && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Browser Extensions Detected</AlertTitle>
          Some browser extensions may interfere with quiz security. Consider using incognito mode or disabling extensions.
        </Alert>
      )}

      {securityRecommendations.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <AlertTitle>Security Recommendations</AlertTitle>
          <Box component="ul" sx={{ mt: 1, mb: 0 }}>
            {securityRecommendations.map((recommendation, index) => (
              <li key={index}>{recommendation}</li>
            ))}
          </Box>
        </Alert>
      )}

      {/* Main two-column layout (Fullscreen target wrapper) */}
      <Box
        ref={quizContainerRef}
        sx={{
          outline: 'none',
          '&:fullscreen': {
            width: '100vw',
            height: '100vh',
            overflow: 'auto',
            backgroundColor: '#fff',
          },
          '&:-webkit-full-screen': {
            width: '100vw',
            height: '100vh',
            overflow: 'auto',
            backgroundColor: '#fff',
          },
        }}
      >
      <Grid container spacing={2}>
        {/* Left: Question Navigator */}
        <Grid item xs={12} md={4} lg={3}>
          <Paper sx={{ p: 2, position: 'sticky', top: 16 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Attempt Status
            </Typography>
            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs={4}>
                <Box sx={{ p: 1, bgcolor: 'success.light', color: 'success.contrastText', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="caption">Answered</Typography>
                  <Typography variant="h6" sx={{ m: 0 }}>{answeredCount}</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ p: 1, bgcolor: 'warning.light', color: 'warning.contrastText', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="caption">Flagged</Typography>
                  <Typography variant="h6" sx={{ m: 0 }}>{flaggedCount}</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ p: 1, bgcolor: 'info.light', color: 'info.contrastText', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="caption">Pending</Typography>
                  <Typography variant="h6" sx={{ m: 0 }}>{pendingCount}</Typography>
                </Box>
              </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={{ mb: 1 }}>Questions</Typography>
            {!isFullscreen && (
              <Typography variant="caption" color="error" sx={{ display: 'block', fontSize: '0.7rem', mb: 1 }}>
                Enter fullscreen to navigate
              </Typography>
            )}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1, maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
              {quiz.questions.map((q, idx) => {
                const { isAnswered, isFlagged } = getQuestionStatus(q.questionId);
                const isActive = idx === currentQuestion;
                return (
                  <Button
                    key={q.questionId}
                    variant={isActive ? 'contained' : 'outlined'}
                    color={isFlagged ? 'warning' : isAnswered ? 'success' : 'inherit'}
                    size="small"
                    onClick={() => handleQuestionNavigation(idx)}
                    disabled={!isFullscreen}
                    sx={{ 
                      minWidth: 0, 
                      p: 0.5,
                      opacity: !isFullscreen ? 0.5 : 1,
                    }}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </Button>
                );
              })}
            </Box>
          </Paper>
        </Grid>

  {/* Right: Quiz Content */}
  <Grid item xs={12} md={8} lg={9}>
          {/* Quiz Header */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container alignItems="center" spacing={2}>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <QuizIcon color="primary" />
                  <Typography variant="h5">{quiz.unitTitle}</Typography>
                </Box>
                <Typography variant="subtitle1" color="text.secondary">
                  {quiz.courseTitle}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6} sx={{ textAlign: { xs: 'left', md: 'right' }, display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1 }}>
                {timeLeft !== null && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTimeIcon color={timeLeft < 300 ? 'error' : 'primary'} />
                    <Typography 
                      variant="h6" 
                      color={timeLeft < 300 ? 'error.main' : 'text.primary'}
                    >
                      {formatTime(timeLeft)}
                    </Typography>
                  </Box>
                )}
                <Button size="small" variant="outlined" onClick={() => (isFullscreen ? exitFullscreen() : enterFullscreen())}>
                  {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                </Button>
              </Grid>
            </Grid>
            
            {/* Enhanced Security & Status Bar */}
            <Box sx={{ mt: 2 }}>
              {(() => {
                const securityStatus = getSecurityStatus();
                const totalViolations = getTotalViolations();
                const criticalViolations = getCriticalViolations();
                const failureReasons = getFailureReasons();
                const SecurityStatusIcon = securityStatus.icon;
                
                return (
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      border: `2px solid`,
                      borderColor: `${securityStatus.color}.main`,
                      bgcolor: `${securityStatus.color}.light`,
                      bgcolor: securityStatus.status === 'critical' ? 'error.light' : 
                               securityStatus.status === 'warning' ? 'warning.light' :
                               securityStatus.status === 'caution' ? 'info.light' : 'success.light',
                      opacity: 0.9
                    }}
                  >
                    <CardContent sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <SecurityStatusIcon color={securityStatus.color} />
                          <Typography variant="subtitle2" fontWeight="bold" color={`${securityStatus.color}.dark`}>
                            Security Status: {securityStatus.status.toUpperCase()}
                          </Typography>
                          {totalViolations > 0 && (
                            <Chip 
                              size="small" 
                              label={`${totalViolations} Violations`}
                              color={securityStatus.color}
                              variant="filled"
                            />
                          )}
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {failureReasons.length > 0 && (
                            <Chip 
                              size="small" 
                              label={`${failureReasons.length} Issues`}
                              color="error"
                              variant="outlined"
                            />
                          )}
                          <Tooltip title={showViolationDetails ? "Hide Details" : "Show Details"}>
                            <IconButton 
                              size="small" 
                              onClick={() => setShowViolationDetails(!showViolationDetails)}
                            >
                              {showViolationDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                      
                      {/* Quick status overview */}
                      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {Object.entries(violationAttempts).map(([type, count]) => {
                          if (count === 0) return null;
                          const isHigh = count >= Math.floor(MAX_ATTEMPTS * 0.75);
                          const isCritical = count >= MAX_ATTEMPTS;
                          
                          return (
                            <Chip
                              key={type}
                              size="small"
                              label={`${getViolationTypeLabel(type)}: ${count}/${MAX_ATTEMPTS}`}
                              color={isCritical ? 'error' : isHigh ? 'warning' : 'default'}
                              variant={isCritical ? 'filled' : 'outlined'}
                            />
                          );
                        })}
                      </Box>
                      
                      {/* Detailed violation breakdown */}
                      <Collapse in={showViolationDetails}>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="body2" fontWeight="bold" color="text.primary" sx={{ mb: 1 }}>
                          Detailed Security Report:
                        </Typography>
                        
                        {/* Failure reasons */}
                        {failureReasons.length > 0 && (
                          <Alert severity="error" sx={{ mb: 2, py: 0 }}>
                            <Typography variant="body2" fontWeight="bold">Failure Reasons:</Typography>
                            <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2 }}>
                              {failureReasons.map((reason, index) => (
                                <li key={index}>
                                  <Typography variant="body2">{reason}</Typography>
                                </li>
                              ))}
                            </Box>
                          </Alert>
                        )}
                        
                        {/* All violation types with details */}
                        <Grid container spacing={1}>
                          {Object.entries(violationAttempts).map(([type, count]) => {
                            const isHigh = count >= Math.floor(MAX_ATTEMPTS * 0.75);
                            const isCritical = count >= MAX_ATTEMPTS;
                            const percentage = Math.round((count / MAX_ATTEMPTS) * 100);
                            
                            return (
                              <Grid item xs={6} sm={4} md={3} key={type}>
                                <Box sx={{ 
                                  p: 1, 
                                  border: '1px solid', 
                                  borderColor: isCritical ? 'error.main' : isHigh ? 'warning.main' : 'grey.300',
                                  borderRadius: 1,
                                  bgcolor: count > 0 ? (isCritical ? 'error.light' : isHigh ? 'warning.light' : 'grey.50') : 'transparent'
                                }}>
                                  <Typography variant="caption" fontWeight="bold" color="text.primary">
                                    {getViolationTypeLabel(type)}
                                  </Typography>
                                  <Typography variant="body2" color={isCritical ? 'error.main' : isHigh ? 'warning.main' : 'text.secondary'}>
                                    {count}/{MAX_ATTEMPTS} ({percentage}%)
                                  </Typography>
                                  {count > 0 && (
                                    <LinearProgress 
                                      variant="determinate" 
                                      value={percentage} 
                                      color={isCritical ? 'error' : isHigh ? 'warning' : 'primary'}
                                      sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
                                    />
                                  )}
                                </Box>
                              </Grid>
                            );
                          })}
                        </Grid>
                        
                        {/* Debug info for developers */}
                        {debug && (
                          <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                              🔒 Debug Info: Total Violations: {violations.length} | 
                              Tab Count: {tabSwitchCount} | 
                              Away Time: {awayStartRef.current ? 'Away' : 'Present'} | 
                              Window Minimized: {windowMinimizeCount} times
                            </Typography>
                          </Box>
                        )}
                      </Collapse>
                    </CardContent>
                  </Card>
                );
              })()}
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Question {currentQuestion + 1} of {quiz.questions.length} • {answeredCount} answered
              </Typography>
              <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 5 }} />
            </Box>
          </Paper>

          {/* Question */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">
                Question {currentQuestion + 1}
              </Typography>
              <Button
                variant={markedForReview.has(currentQ.questionId) ? 'contained' : 'outlined'}
                color={markedForReview.has(currentQ.questionId) ? 'warning' : 'inherit'}
                size="small"
                startIcon={<FlagIcon />}
                onClick={() => handleToggleFlag(currentQ.questionId)}
              >
                {markedForReview.has(currentQ.questionId) ? 'Flagged' : 'Flag'}
              </Button>
            </Box>

            <Typography variant="body1" sx={{ mb: 3 }}>
              {currentQ.questionText}
            </Typography>

            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={answers[currentQ.questionId]?.toString() || ''}
                onChange={(e) => handleAnswerChange(currentQ.questionId, e.target.value)}
              >
                {currentQ.options.map((option, index) => (
                  <FormControlLabel
                    key={index}
                    value={index.toString()}
                    control={<Radio />}
                    label={`${index + 1}. ${option}`}
                    sx={{ 
                      mb: 1,
                      p: 1,
                      border: '1px solid transparent',
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  />
                ))}
              </RadioGroup>
            </FormControl>

            <Box sx={{ mt: 1 }}>
              <Button size="small" color="info" onClick={() => handleClearResponse(currentQ.questionId)}>
                Clear Response
              </Button>
            </Box>
          </Paper>

          {/* Navigation */}
          <Paper sx={{ p: 3 }}>
            <Grid container justifyContent="space-between" alignItems="center">
              <Grid item>
                <Button
                  variant="outlined"
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestion === 0 || !isFullscreen}
                  sx={{
                    opacity: !isFullscreen ? 0.5 : 1,
                  }}
                >
                  Previous
                </Button>
                {!isFullscreen && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', fontSize: '0.7rem', mt: 0.5 }}>
                    Fullscreen required
                  </Typography>
                )}
              </Grid>
              
              <Grid item>
                <Typography variant="body2" color="text.secondary">
                  {answeredCount} answered • {flaggedCount} flagged • {pendingCount} pending
                </Typography>
              </Grid>
              
              <Grid item>
        {isLastQuestion ? (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleSubmitQuiz()}
          disabled={submitting || !allAnswered || !isFullscreen}
                    startIcon={submitting ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          sx={{
            opacity: !isFullscreen ? 0.5 : 1,
          }}
                  >
                    {submitting ? 'Submitting...' : 'Submit Quiz'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNextQuestion}
            disabled={!isFullscreen}
            sx={{
              opacity: !isFullscreen ? 0.5 : 1,
            }}
                  >
            {!isFullscreen ? 'Next (Enter Fullscreen)' : 'Next'}
                  </Button>
                )}
                {!isFullscreen && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', fontSize: '0.7rem', mt: 0.5 }}>
                    Fullscreen required for navigation
                  </Typography>
                )}
              </Grid>
            </Grid>
            
            {!allAnswered && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Please answer all questions before submitting the quiz.
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>



      {/* Security Violation Dialog - MOVED INSIDE FULLSCREEN CONTAINER */}
      {console.log('🔍 Rendering SecurityViolationDialog with props:', {
        open: showWarning,
        violationType: currentViolationType,
        currentAttempt: violationAttempts[currentViolationType] || 0,
        maxAttempts: MAX_ATTEMPTS,
        countdown: warningCountdown,
        autoSubmitting: autoSubmitted
      })}
      <SecurityViolationDialog
        open={showWarning || false} // Force boolean to avoid undefined issues
        violationType={currentViolationType || 'tab-switch'}
        currentAttempt={violationAttempts[currentViolationType] || 0}
        maxAttempts={MAX_ATTEMPTS}
        countdown={warningCountdown}
        onDismiss={dismissWarning}
        autoSubmitting={autoSubmitted}
      />
  </Box>

      
      {/* Debug: Show dialog state */}
      {debug && (
        <div style={{
          position: 'fixed',
          bottom: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 9999
        }}>
          <div>showWarning: {String(showWarning)}</div>
          <div>currentViolationType: {currentViolationType || 'none'}</div>
          <div>violationAttempts: {JSON.stringify(violationAttempts)}</div>
          <div>autoSubmitted: {String(autoSubmitted)}</div>
          <div>submitted: {String(submitted)}</div>
        </div>
      )}

    </Container>
  );
};

export default StudentQuizPage;
