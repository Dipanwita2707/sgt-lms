import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Paper, Alert, LinearProgress } from '@mui/material';

const BypassResistantDetectionTest = () => {
    const [detectionActive, setDetectionActive] = useState(false);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [detectionLog, setDetectionLog] = useState([]);
    const detectionCleanupRef = useRef(null);

    // Bypass-resistant tab switching detection
    const startBypassResistantTabDetection = (onTabSwitch) => {
        let isActive = true;
        let lastActiveTime = Date.now();
        let mouseMovementTimeout;
        let keyboardActivityTimeout;
        
        // Method 1: Mouse movement tracking
        let mouseMovementDetected = false;
        const mouseHandler = () => {
            mouseMovementDetected = true;
            lastActiveTime = Date.now();
            clearTimeout(mouseMovementTimeout);
            mouseMovementTimeout = setTimeout(() => {
                mouseMovementDetected = false;
            }, 2000);
        };
        
        // Method 2: Keyboard activity tracking
        let keyboardActivityDetected = false;
        const keyboardHandler = () => {
            keyboardActivityDetected = true;
            lastActiveTime = Date.now();
            clearTimeout(keyboardActivityTimeout);
            keyboardActivityTimeout = setTimeout(() => {
                keyboardActivityDetected = false;
            }, 2000);
        };
        
        // Method 3: Page focus tracking using requestAnimationFrame
        let lastFrameTime = Date.now();
        
        const frameTracker = () => {
            if (!isActive) return;
            
            const now = Date.now();
            const timeSinceLastFrame = now - lastFrameTime;
            
            // If animation frame interval is too long, tab might be hidden
            if (timeSinceLastFrame > 2000) {
                onTabSwitch({
                    method: 'animation-frame',
                    evidence: `Frame gap: ${timeSinceLastFrame}ms`,
                    confidence: 'medium'
                });
            }
            
            lastFrameTime = now;
            requestAnimationFrame(frameTracker);
        };
        
        // Method 4: Performance timing analysis
        const performanceCheck = () => {
            if (!isActive) return;
            
            const timeSinceActivity = Date.now() - lastActiveTime;
            
            // If no user activity for a while, likely tab switch
            if (timeSinceActivity > 3000 && !mouseMovementDetected && !keyboardActivityDetected) {
                onTabSwitch({
                    method: 'inactivity',
                    evidence: `No activity for ${timeSinceActivity}ms`,
                    confidence: 'low'
                });
            }
        };
        
        // Method 5: Document state polling (bypasses event blocking)
        let lastDocumentState = {
            hasFocus: document.hasFocus(),
            hidden: document.hidden,
            visibilityState: document.visibilityState
        };
        
        const documentStatePoller = () => {
            if (!isActive) return;
            
            const currentState = {
                hasFocus: document.hasFocus(),
                hidden: document.hidden,
                visibilityState: document.visibilityState
            };
            
            // Check for state changes that indicate tab switching
            if (currentState.hasFocus !== lastDocumentState.hasFocus && !currentState.hasFocus) {
                onTabSwitch({
                    method: 'document-focus',
                    evidence: 'Document lost focus',
                    confidence: 'high'
                });
            }
            
            if (currentState.hidden !== lastDocumentState.hidden && currentState.hidden) {
                onTabSwitch({
                    method: 'document-hidden',
                    evidence: 'Document became hidden',
                    confidence: 'high'
                });
            }
            
            lastDocumentState = currentState;
        };
        
        // Method 6: Network request timing
        const networkActivityTest = () => {
            if (!isActive) return;
            
            const startTime = performance.now();
            
            fetch('data:text/plain,test', { method: 'HEAD' })
                .then(() => {
                    const endTime = performance.now();
                    const duration = endTime - startTime;
                    
                    if (duration > 50) {
                        onTabSwitch({
                            method: 'network-timing',
                            evidence: `Request delay: ${duration}ms`,
                            confidence: 'low'
                        });
                    }
                })
                .catch(() => {
                    // Ignore network errors
                });
        };
        
        // Method 7: Intersection Observer
        const setupIntersectionObserver = () => {
            const observedElement = document.createElement('div');
            observedElement.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
            document.body.appendChild(observedElement);
            
            const intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting && isActive) {
                        onTabSwitch({
                            method: 'intersection-observer',
                            evidence: 'Page elements not intersecting viewport',
                            confidence: 'medium'
                        });
                    }
                });
            });
            
            intersectionObserver.observe(observedElement);
            
            return () => {
                intersectionObserver.disconnect();
                document.body.removeChild(observedElement);
            };
        };
        
        // Start all detection methods
        document.addEventListener('mousemove', mouseHandler);
        document.addEventListener('keydown', keyboardHandler);
        document.addEventListener('keyup', keyboardHandler);
        
        frameTracker();
        
        const performanceInterval = setInterval(performanceCheck, 1000);
        const documentInterval = setInterval(documentStatePoller, 500);
        const networkInterval = setInterval(networkActivityTest, 5000);
        
        const intersectionCleanup = setupIntersectionObserver();
        
        // Cleanup function
        return () => {
            isActive = false;
            
            document.removeEventListener('mousemove', mouseHandler);
            document.removeEventListener('keydown', keyboardHandler);
            document.removeEventListener('keyup', keyboardHandler);
            
            clearInterval(performanceInterval);
            clearInterval(documentInterval);
            clearInterval(networkInterval);
            clearTimeout(mouseMovementTimeout);
            clearTimeout(keyboardActivityTimeout);
            
            intersectionCleanup();
        };
    };

    const addToLog = (message, level = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setDetectionLog(prev => [...prev, { 
            message, 
            level, 
            timestamp,
            id: Date.now() + Math.random()
        }]);
    };

    const handleTabSwitch = (detection) => {
        setTabSwitchCount(prev => {
            const newCount = prev + 1;
            addToLog(
                `TAB SWITCH #${newCount} DETECTED via ${detection.method} - ${detection.evidence}`,
                detection.confidence === 'high' ? 'error' : detection.confidence === 'medium' ? 'warning' : 'info'
            );

            if (newCount >= 3) {
                addToLog('MAXIMUM TAB SWITCHES REACHED! Quiz would be auto-submitted!', 'error');
            }
            
            return newCount;
        });
    };

    const startDetection = () => {
        if (detectionActive) return;
        
        setDetectionActive(true);
        addToLog('Starting bypass-resistant tab detection...', 'success');
        detectionCleanupRef.current = startBypassResistantTabDetection(handleTabSwitch);
    };

    const stopDetection = () => {
        if (!detectionActive) return;
        
        setDetectionActive(false);
        if (detectionCleanupRef.current) {
            detectionCleanupRef.current();
            detectionCleanupRef.current = null;
        }
        addToLog('Detection stopped by user', 'info');
    };

    const clearLog = () => {
        setDetectionLog([]);
        setTabSwitchCount(0);
    };

    const simulateAlwaysActive = () => {
        // Simulate the Always Active Window extension
        Object.defineProperty(document, 'hidden', {
            get: () => false,
            configurable: true
        });
        
        document.hasFocus = () => true;
        
        addToLog('Simulated Always Active Window extension - standard detection should be blocked', 'warning');
    };

    useEffect(() => {
        // Standard event listeners for comparison
        const handleVisibilityChange = () => {
            addToLog(`Standard visibilitychange event: hidden=${document.hidden}`, 'info');
        };

        const handleBlur = () => {
            addToLog('Standard window blur event', 'info');
        };

        const handleFocus = () => {
            addToLog('Standard window focus event', 'info');
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            
            if (detectionCleanupRef.current) {
                detectionCleanupRef.current();
            }
        };
    }, []);

    const getTabCountColor = () => {
        if (tabSwitchCount >= 3) return 'error';
        if (tabSwitchCount >= 2) return 'warning';
        return 'primary';
    };

    const getLogColor = (level) => {
        switch (level) {
            case 'error': return '#d32f2f';
            case 'warning': return '#f57c00';
            case 'success': return '#388e3c';
            default: return '#1976d2';
        }
    };

    return (
        <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
            <Typography variant="h3" component="h1" gutterBottom align="center">
                🛡️ Bypass-Resistant Tab Detection Test
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>📋 Test Instructions:</Typography>
                <Typography>1. Click "Start Detection" to begin monitoring</Typography>
                <Typography>2. Try switching tabs, minimizing the window, or using Alt+Tab</Typography>
                <Typography>3. The system should detect tab switches even with "Always Active Window" extension active</Typography>
                <Typography>4. Check the detection log for detailed information about each detection method</Typography>
            </Alert>

            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h5" gutterBottom>🎯 Detection Controls</Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={startDetection}
                        disabled={detectionActive}
                    >
                        Start Detection
                    </Button>
                    <Button 
                        variant="contained" 
                        color="error" 
                        onClick={stopDetection}
                        disabled={!detectionActive}
                    >
                        Stop Detection
                    </Button>
                    <Button 
                        variant="contained" 
                        color="warning" 
                        onClick={simulateAlwaysActive}
                    >
                        Simulate Always Active Window
                    </Button>
                    <Button 
                        variant="outlined" 
                        onClick={clearLog}
                    >
                        Clear Log
                    </Button>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            px: 2, 
                            py: 1, 
                            borderRadius: 3, 
                            color: 'white',
                            bgcolor: getTabCountColor() === 'error' ? '#d32f2f' : 
                                    getTabCountColor() === 'warning' ? '#f57c00' : '#1976d2'
                        }}
                    >
                        Tab Switches: {tabSwitchCount}
                    </Typography>
                    <Typography 
                        variant="body1" 
                        fontWeight="bold"
                        color={detectionActive ? 'success.main' : 'text.secondary'}
                    >
                        {detectionActive ? 'Monitoring Active' : 'Not Monitoring'}
                    </Typography>
                </Box>
                
                {tabSwitchCount > 0 && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            Detection Progress
                        </Typography>
                        <LinearProgress 
                            variant="determinate" 
                            value={(tabSwitchCount / 3) * 100} 
                            color={getTabCountColor()}
                            sx={{ height: 8, borderRadius: 4 }}
                        />
                    </Box>
                )}
            </Paper>

            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>📊 Detection Log</Typography>
                <Box 
                    sx={{ 
                        maxHeight: 400, 
                        overflow: 'auto', 
                        bgcolor: '#f5f5f5', 
                        p: 2, 
                        borderRadius: 1,
                        border: '1px solid #ddd'
                    }}
                >
                    {detectionLog.length === 0 ? (
                        <Typography color="text.secondary">
                            Click "Start Detection" to begin monitoring...
                        </Typography>
                    ) : (
                        detectionLog.map((log) => (
                            <Box 
                                key={log.id}
                                sx={{ 
                                    mb: 1, 
                                    p: 1, 
                                    bgcolor: 'white', 
                                    borderRadius: 1,
                                    borderLeft: `3px solid ${getLogColor(log.level)}`,
                                    fontFamily: 'monospace',
                                    fontSize: '0.875rem'
                                }}
                            >
                                <Typography component="span" color={getLogColor(log.level)}>
                                    [{log.timestamp}] {log.message}
                                </Typography>
                            </Box>
                        ))
                    )}
                </Box>
            </Paper>
        </Box>
    );
};

export default BypassResistantDetectionTest;