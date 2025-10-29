import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Slider,
  IconButton,
  Paper,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogContent,
  AppBar,
  Toolbar,
  Container
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  VolumeUp,
  VolumeOff,
  Speed as SpeedIcon,
  Fullscreen,
  FullscreenExit,
  Close
} from '@mui/icons-material';
import { formatDuration } from '../../utils/videoUtils';

const TeacherVideoPlayer = ({ videoUrl, title }) => {
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Speed options
  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  // Initialize the video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Function to handle canplay event
    const handleCanPlay = () => setLoading(false);
    
    // Function to directly handle duration changes
    const handleDurationChange = () => {
      const newDuration = video.duration;
      if (!isNaN(newDuration) && newDuration > 0) {
        console.log(`Duration changed to: ${newDuration}s`);
        setDuration(newDuration);
      }
    };
    
    // Handle visibility change to prevent flickering when switching tabs
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is now hidden
        if (video.paused === false) {
          video.dataset.wasPlaying = "true";
        }
      } else {
        // Tab is now visible again
        if (video.dataset.wasPlaying === "true") {
          // Clear the flag
          video.dataset.wasPlaying = "";
          
          // Only try to play if the component still thinks it's playing
          if (isPlaying) {
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.error("Error resuming video after tab switch:", error);
              });
            }
          }
        }
      }
    };
    
    // Set initial volume and playback rate
    video.volume = volume;
    video.playbackRate = playbackRate;
    video.muted = isMuted;

    // Event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('durationchange', handleDurationChange); 
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleVideoError);
    video.addEventListener('play', () => setIsPlaying(true));
    video.addEventListener('pause', () => setIsPlaying(false));
    
    // Add visibility change listener to handle tab switching
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Force loading of metadata if already loaded
    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }
    
    // Force duration update if already available
    if (video.duration > 0 && !isNaN(video.duration)) {
      handleDurationChange();
    }
    
    // Force loading indicator off if already can play
    if (video.readyState >= 3) {
      setLoading(false);
    }

    return () => {
      // Clean up event listeners
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleVideoError);
      video.removeEventListener('play', () => setIsPlaying(true));
      video.removeEventListener('pause', () => setIsPlaying(false));
      
      // Remove visibility change listener
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // We're intentionally excluding some dependencies like volume, playbackRate, isMuted,
    // isPlaying, duration, and currentTime because we don't want to reinitialize the
    // video player every time these values change
    // eslint-disable-next-line
  }, [videoUrl]);

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;

    // Get duration directly from the video element
    const videoDuration = videoRef.current.duration;
    
    // Check if we have a valid duration
    if (!isNaN(videoDuration) && videoDuration > 0) {
      setDuration(videoDuration);
      
      // Also store the duration as a data attribute on the video element
      videoRef.current.dataset.duration = videoDuration;
    } else {
      // Try to get duration using a different approach - try to read it after a delay
      setTimeout(() => {
        if (videoRef.current) {
          const retryDuration = videoRef.current.duration;
          
          if (!isNaN(retryDuration) && retryDuration > 0) {
            setDuration(retryDuration);
            videoRef.current.dataset.duration = retryDuration;
          } else {
            // Default fallback duration
            setDuration(100);
          }
        }
      }, 1000);
    }
    
    // Turn off loading indicator if appropriate
    if (videoRef.current.readyState >= 3) {
      setLoading(false);
    }
    
    // Set playback properties
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.muted = isMuted;
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    
    // Update current position
    const newCurrentTime = video.currentTime;
    setCurrentTime(newCurrentTime);
    
    // Update duration if it's not set correctly yet
    const videoDuration = video.duration;
    if ((duration === 0 || isNaN(duration)) && videoDuration > 0 && !isNaN(videoDuration)) {
      setDuration(videoDuration);
      video.dataset.duration = videoDuration;
    }
    
    // Even if we already have a duration, check if it needs updating
    if (!isNaN(videoDuration) && videoDuration > 0 && Math.abs(duration - videoDuration) > 1) {
      setDuration(videoDuration);
    }
  };

  const handleVideoError = (e) => {
    console.error('Video error:', e);
    setError('Error loading video. Please try again later.');
    setLoading(false);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    
    try {
      if (isPlaying) {
        // Pause the video
        video.pause();
      } else {
        // Try to play and handle any errors
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error("Error in togglePlay:", error);
            // Reset state if play fails
            setIsPlaying(false);
          });
        }
      }
    } catch (error) {
      console.error("Exception in togglePlay:", error);
      // Ensure state is consistent in case of errors
      setIsPlaying(video.paused === false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (event, newValue) => {
    const video = videoRef.current;
    if (video) {
      video.volume = newValue;
      setVolume(newValue);
      setIsMuted(newValue === 0);
    }
  };

  const handleSpeedChange = (speed) => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = speed;
      setPlaybackRate(speed);
    }
  };

  const handleProgressChange = (event, newValue) => {
    if (videoRef.current) {
      // Update the video position to the new value
      videoRef.current.currentTime = newValue;
      // Update state to reflect the new position
      setCurrentTime(newValue);
    }
  };

  // Toggle fullscreen mode
  const toggleFullScreen = () => {
    if (!isFullScreen) {
      // Remember the current state before entering fullscreen
      const currentPosition = videoRef.current ? videoRef.current.currentTime : 0;
      const wasPlaying = isPlaying;
      const currentDuration = duration;
      
      // First pause the video (to prevent flickering during transition)
      if (videoRef.current && isPlaying) {
        videoRef.current.pause();
      }
      
      // Set the states
      setIsFullScreen(true);
      
      // Open dialog after a brief delay to ensure state changes have been applied
      setTimeout(() => {
        setIsDialogOpen(true);
        
        // After dialog is open, restore video state
        setTimeout(() => {
          if (videoRef.current) {
            // Restore position
            videoRef.current.currentTime = currentPosition;
            
            // Make sure duration is properly set
            if (currentDuration > 0) {
              setDuration(currentDuration);
            } else if (videoRef.current.duration > 0) {
              setDuration(videoRef.current.duration);
            }
            
            // Force a refresh of the current position display
            setCurrentTime(videoRef.current.currentTime);
            
            // Resume playing if it was playing before
            if (wasPlaying) {
              try {
                videoRef.current.play().catch(error => {
                  console.error("Error playing video in fullscreen:", error);
                });
              } catch (e) {
                console.error("Error in play() call:", e);
              }
            }
          }
        }, 300); // Delay after dialog opens
      }, 50); // Delay before opening dialog
    } else {
      // Remember the current state before exiting fullscreen
      const currentPosition = videoRef.current ? videoRef.current.currentTime : 0;
      const wasPlaying = isPlaying;
      const currentDuration = duration;
      
      // First pause the video
      if (videoRef.current && isPlaying) {
        videoRef.current.pause();
      }
      
      // First close dialog
      setIsDialogOpen(false);
      
      // After dialog is closed, exit fullscreen and restore state
      setTimeout(() => {
        setIsFullScreen(false);
        
        // After a short delay, restore video state
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.currentTime = currentPosition;
            
            // Make sure duration is properly set
            if (currentDuration > 0) {
              setDuration(currentDuration);
            } else if (videoRef.current.duration > 0) {
              setDuration(videoRef.current.duration);
            }
            
            // Force a refresh of the current position display
            setCurrentTime(videoRef.current.currentTime);
            
            if (wasPlaying) {
              try {
                videoRef.current.play().catch(error => {
                  console.error("Error playing video after fullscreen:", error);
                });
              } catch (e) {
                console.error("Error in play() call:", e);
              }
            }
          }
        }, 300); // Delay after state changes
      }, 100); // Delay after dialog closes
    }
  };

  // Check if we have a valid duration
  const getDisplayDuration = () => {
    // Use the most reliable source for duration
    if (videoRef.current && videoRef.current.duration && !isNaN(videoRef.current.duration) && videoRef.current.duration > 0) {
      return videoRef.current.duration;
    } else if (duration && !isNaN(duration) && duration > 0) {
      return duration;
    } else if (videoRef.current && videoRef.current.dataset.duration) {
      const storedDuration = parseFloat(videoRef.current.dataset.duration);
      if (!isNaN(storedDuration) && storedDuration > 0) {
        return storedDuration;
      }
    }
    // Fallback to a reasonable default (2 minutes)
    return 120;
  };

  // Get a valid current time value
  const getDisplayCurrentTime = () => {
    if (videoRef.current && !isNaN(videoRef.current.currentTime)) {
      return videoRef.current.currentTime;
    } else if (!isNaN(currentTime)) {
      return currentTime;
    }
    return 0;
  };
  
  // Show controls when mouse moves over video
  const handleMouseMove = () => {
    setShowControls(true);
    
    // Clear any existing timeout
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    
    // Set timeout to hide controls after 3 seconds of inactivity
    const timeout = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
    
    setControlsTimeout(timeout);
  };

  // Clear timeout when component unmounts
  useEffect(() => {
    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [controlsTimeout]);

  return (
    <>
      {/* Regular Player */}
      <Paper 
        elevation={2} 
        sx={{ borderRadius: 2, overflow: 'hidden' }}
        ref={videoContainerRef}
      >
        {/* Video Player */}
        <Box 
          sx={{ 
            position: 'relative', 
            width: '100%', 
            backgroundColor: '#000',
            overflow: 'hidden',
            willChange: 'transform',
            transform: 'translateZ(0)'
          }}
          onMouseMove={handleMouseMove}
        >
          {loading && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10,
                backgroundColor: 'rgba(0,0,0,0.5)'
              }}
            >
              <CircularProgress color="secondary" />
            </Box>
          )}

          <video
            ref={videoRef}
            key="main-video-player"
            src={videoUrl}
            style={{ 
              width: '100%', 
              display: isFullScreen ? 'none' : 'block', 
              maxHeight: '500px',
              height: 'auto',
              transform: 'translateZ(0)',
              willChange: 'transform',
              imageRendering: 'optimizeQuality'
            }}
            playsInline
            preload="metadata"
            autoPlay={false}
            muted={isMuted}
            poster=""
            onLoadedMetadata={handleLoadedMetadata}
            onLoadedData={() => {
              if (videoRef.current && videoRef.current.duration > 0) {
                setDuration(videoRef.current.duration);
              }
            }}
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            controlsList="nodownload"
          />

          {error && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: 'white',
                p: 2
              }}
            >
              <Typography variant="h6">{error}</Typography>
            </Box>
          )}

          {/* Overlay Controls - Only show when showControls is true */}
          {showControls && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                p: { xs: 1, sm: 1.5 },
                backgroundColor: 'rgba(0,0,0,0.7)',
                transition: 'opacity 0.3s',
                opacity: showControls ? 1 : 0,
                pointerEvents: showControls ? 'auto' : 'none',
              }}
            >
              {/* Progress bar */}
              <Slider
                value={getDisplayCurrentTime()}
                max={getDisplayDuration()}
                onChange={handleProgressChange}
                aria-label="video progress"
                sx={{ 
                  color: 'secondary.main',
                  height: { xs: 6, sm: 8 },
                  '& .MuiSlider-thumb': {
                    width: { xs: 12, sm: 16 },
                    height: { xs: 12, sm: 16 },
                    transition: '0.3s cubic-bezier(.47,1.64,.41,.8)',
                    '&::before': {
                      boxShadow: '0 2px 12px 0 rgba(0,0,0,0.4)',
                    },
                    '&:hover, &.Mui-focusVisible': {
                      boxShadow: '0px 0px 0px 8px rgb(245 0 87 / 16%)',
                    },
                  },
                  '& .MuiSlider-rail': {
                    opacity: 0.5,
                  },
                }}
              />

              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mt: { xs: 0.5, sm: 1 },
                flexWrap: { xs: 'wrap', md: 'nowrap' }
              }}>
                {/* Left controls: Play/Pause and time */}
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton 
                    onClick={togglePlay} 
                    size={{ xs: 'small', sm: 'large' }}
                    sx={{ 
                      color: 'white',
                      p: { xs: 0.5, sm: 1 }
                    }}
                  >
                    {isPlaying ? <Pause /> : <PlayArrow />}
                  </IconButton>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      ml: { xs: 0.5, sm: 1 }, 
                      color: 'white',
                      fontSize: { xs: '0.7rem', sm: '0.875rem' }
                    }}
                  >
                    {formatDuration(getDisplayCurrentTime())} / {formatDuration(getDisplayDuration())}
                  </Typography>
                </Box>

                {/* Right controls: Volume, Speed, and Fullscreen */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: { xs: 0.5, sm: 1 }
                }}>
                  {/* Volume control - Hide on very small screens */}
                  <Box sx={{ 
                    display: { xs: 'none', sm: 'flex' }, 
                    alignItems: 'center', 
                    width: { sm: 100, md: 150 }, 
                    mr: { sm: 1, md: 2 }
                  }}>
                    <IconButton onClick={toggleMute} size="small" sx={{ color: 'white' }}>
                      {isMuted ? <VolumeOff /> : <VolumeUp />}
                    </IconButton>
                    <Slider
                      min={0}
                      max={1}
                      step={0.1}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      aria-label="Volume"
                      sx={{ ml: 1, color: 'secondary.main' }}
                      size="small"
                    />
                  </Box>

                  {/* Mobile mute button */}
                  <IconButton 
                    onClick={toggleMute} 
                    size="small" 
                    sx={{ 
                      display: { xs: 'inline-flex', sm: 'none' },
                      color: 'white',
                      p: 0.5
                    }}
                  >
                    {isMuted ? <VolumeOff fontSize="small" /> : <VolumeUp fontSize="small" />}
                  </IconButton>

                  {/* Playback speed control - Simplified for mobile */}
                  <Tooltip title="Playback Speed">
                    <Box sx={{ 
                      display: { xs: 'none', md: 'flex' }, 
                      alignItems: 'center', 
                      mr: 2 
                    }}>
                      <IconButton size="small" sx={{ color: 'white' }}>
                        <SpeedIcon />
                      </IconButton>
                      <Box component="span" sx={{ ml: 0.5 }}>
                        {speedOptions.map((speed) => (
                          <Tooltip key={speed} title={`${speed}x`}>
                            <IconButton
                              size="small"
                              onClick={() => handleSpeedChange(speed)}
                              sx={{
                                mx: 0.2,
                                backgroundColor: playbackRate === speed ? 'secondary.main' : 'rgba(255,255,255,0.1)',
                                color: 'white',
                                '&:hover': {
                                  backgroundColor: playbackRate === speed ? 'secondary.dark' : 'rgba(255,255,255,0.2)'
                                },
                                width: 30,
                                height: 24,
                                fontSize: '0.75rem'
                              }}
                            >
                              {speed}x
                            </IconButton>
                          </Tooltip>
                        ))}
                      </Box>
                    </Box>
                  </Tooltip>

                  {/* Mobile speed indicator */}
                  <Box sx={{ 
                    display: { xs: 'inline-flex', md: 'none' },
                    alignItems: 'center'
                  }}>
                    <IconButton 
                      size="small"
                      onClick={() => {
                        const currentIndex = speedOptions.indexOf(playbackRate);
                        const nextIndex = (currentIndex + 1) % speedOptions.length;
                        handleSpeedChange(speedOptions[nextIndex]);
                      }}
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        fontSize: { xs: '0.65rem', sm: '0.75rem' },
                        minWidth: { xs: '32px', sm: '40px' },
                        height: { xs: '24px', sm: '28px' },
                        p: { xs: 0.5, sm: 1 },
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.2)'
                        }
                      }}
                    >
                      {playbackRate}x
                    </IconButton>
                  </Box>

                  {/* Fullscreen toggle */}
                  <IconButton 
                    onClick={toggleFullScreen} 
                    size="small"
                    sx={{ 
                      color: 'white',
                      p: { xs: 0.5, sm: 1 }
                    }}
                  >
                    {isFullScreen ? <FullscreenExit /> : <Fullscreen />}
                  </IconButton>
                </Box>
              </Box>
            </Box>
          )}
        </Box>

        {/* Title and description (only show in regular view) */}
        {!isFullScreen && (
          <Box sx={{ p: 1.5, backgroundColor: '#f5f5f5' }}>
            <Typography variant="subtitle1" gutterBottom>
              {title}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Fullscreen Dialog */}
      <Dialog
        fullScreen
        open={isDialogOpen}
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
        onClose={() => {
          if (isFullScreen) {
            toggleFullScreen();
          }
        }}
        TransitionProps={{
          timeout: 300,
          mountOnEnter: true,
          unmountOnExit: false
        }}
        sx={{ 
          '& .MuiDialog-paper': { 
            backgroundColor: '#000',
            margin: 0
          },
          '& .MuiDialog-container': {
            backgroundColor: '#000'
          }
        }}
      >
        <AppBar position="fixed" color="transparent" elevation={0} sx={{ top: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'white' }}>
              {title}
            </Typography>
            <IconButton
              edge="end"
              color="inherit"
              onClick={toggleFullScreen}
              aria-label="close"
              sx={{
                backgroundColor: 'rgba(0,0,0,0.3)',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.5)',
                }
              }}
            >
              <Close />
            </IconButton>
          </Toolbar>
        </AppBar>
        
        <Box 
          sx={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            bgcolor: '#000',
            position: 'relative',
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
          onMouseMove={handleMouseMove}
        >
          {loading && (
            <CircularProgress 
              color="secondary" 
              sx={{ position: 'absolute', zIndex: 10 }}
            />
          )}
          
          {isDialogOpen && (
            <video
              src={videoUrl}
              key="fullscreen-video-player"
              ref={videoRef}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain',
                cursor: 'pointer',
                transform: 'translateZ(0)',
                willChange: 'transform',
                imageRendering: 'optimizeQuality'
              }}
              playsInline
              preload="metadata"
              autoPlay={false}
              muted={isMuted}
              poster=""
              onLoadedMetadata={handleLoadedMetadata}
              onLoadedData={() => {
                if (videoRef.current && videoRef.current.duration > 0) {
                  setDuration(videoRef.current.duration);
                }
              }}
              onClick={togglePlay}
              onTimeUpdate={handleTimeUpdate}
              controlsList="nodownload"
            />
          )}

          {/* Overlay Controls */}
          {showControls && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                p: 3,
                backgroundColor: 'rgba(0,0,0,0.7)',
                transition: 'opacity 0.3s',
                opacity: showControls ? 1 : 0,
                pointerEvents: showControls ? 'auto' : 'none',
              }}
            >
              <Container maxWidth="lg">
                <Slider
                  value={getDisplayCurrentTime()}
                  max={getDisplayDuration()}
                  onChange={handleProgressChange}
                  aria-label="video progress"
                  sx={{ 
                    color: 'secondary.main',
                    height: 10,
                    '& .MuiSlider-thumb': {
                      width: 20,
                      height: 20,
                      transition: '0.3s cubic-bezier(.47,1.64,.41,.8)',
                      '&::before': {
                        boxShadow: '0 2px 12px 0 rgba(0,0,0,0.4)',
                      },
                      '&:hover, &.Mui-focusVisible': {
                        boxShadow: '0px 0px 0px 8px rgb(245 0 87 / 16%)',
                      },
                    },
                    '& .MuiSlider-rail': {
                      opacity: 0.5,
                    },
                  }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                  {/* Left controls */}
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton onClick={togglePlay} size="large" sx={{ color: 'white' }}>
                      {isPlaying ? <Pause fontSize="large" /> : <PlayArrow fontSize="large" />}
                    </IconButton>
                    <Typography variant="body1" sx={{ ml: 2, color: 'white' }}>
                      {formatDuration(getDisplayCurrentTime())} / {formatDuration(getDisplayDuration())}
                    </Typography>
                  </Box>

                  {/* Right controls */}
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {/* Volume control */}
                    <Box sx={{ display: 'flex', alignItems: 'center', width: 150, mr: 3 }}>
                      <IconButton onClick={toggleMute} size="medium" sx={{ color: 'white' }}>
                        {isMuted ? <VolumeOff /> : <VolumeUp />}
                      </IconButton>
                      <Slider
                        min={0}
                        max={1}
                        step={0.1}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        aria-label="Volume"
                        sx={{ ml: 1, color: 'secondary.main' }}
                      />
                    </Box>

                    {/* Playback speed control */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
                      <IconButton size="medium" sx={{ color: 'white' }}>
                        <SpeedIcon />
                      </IconButton>
                      <Box component="span" sx={{ ml: 1 }}>
                        {speedOptions.map((speed) => (
                          <Tooltip key={speed} title={`${speed}x`}>
                            <IconButton
                              size="small"
                              onClick={() => handleSpeedChange(speed)}
                              sx={{
                                mx: 0.5,
                                backgroundColor: playbackRate === speed ? 'secondary.main' : 'rgba(255,255,255,0.1)',
                                color: 'white',
                                '&:hover': {
                                  backgroundColor: playbackRate === speed ? 'secondary.dark' : 'rgba(255,255,255,0.2)'
                                },
                                width: 36,
                                height: 36,
                                fontSize: '0.875rem'
                              }}
                            >
                              {speed}x
                            </IconButton>
                          </Tooltip>
                        ))}
                      </Box>
                    </Box>

                    {/* Fullscreen toggle */}
                    <IconButton 
                      onClick={toggleFullScreen} 
                      size="medium"
                      sx={{ color: 'white' }}
                    >
                      <FullscreenExit />
                    </IconButton>
                  </Box>
                </Box>
              </Container>
            </Box>
          )}
        </Box>
      </Dialog>
    </>
  );
};

export default TeacherVideoPlayer;
