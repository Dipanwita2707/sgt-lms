import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Chip,
  Fade
} from '@mui/material';
import {
  VolumeOff as VolumeOffIcon,
  VolumeUp as VolumeUpIcon,
  Fullscreen as FullscreenIcon,
  Settings as SettingsIcon,
  Palette as PaletteIcon
} from '@mui/icons-material';

const ChatSettings = ({ 
  soundEnabled, 
  setSoundEnabled, 
  theme, 
  setTheme, 
  fontSize, 
  setFontSize,
  onClose 
}) => {
  const themes = [
    { name: 'Modern', value: 'modern', colors: ['#667eea', '#764ba2'] },
    { name: 'Ocean', value: 'ocean', colors: ['#00c6ff', '#0072ff'] },
    { name: 'Sunset', value: 'sunset', colors: ['#ff7e5f', '#feb47b'] },
    { name: 'Forest', value: 'forest', colors: ['#11998e', '#38ef7d'] },
    { name: 'Royal', value: 'royal', colors: ['#667eea', '#764ba2'] }
  ];

  const fontSizes = [
    { name: 'Small', value: 'small' },
    { name: 'Medium', value: 'medium' },
    { name: 'Large', value: 'large' }
  ];

  return (
    <Fade in timeout={300}>
      <Card sx={{ maxWidth: 320, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Chat Settings
          </Typography>
          
          {/* Sound Settings */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Notifications
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title={soundEnabled ? "Disable sounds" : "Enable sounds"}>
                <IconButton 
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  color={soundEnabled ? "primary" : "default"}
                >
                  {soundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
                </IconButton>
              </Tooltip>
              <Typography variant="body2">
                {soundEnabled ? 'Sound enabled' : 'Sound disabled'}
              </Typography>
            </Box>
          </Box>

          {/* Theme Settings */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Theme
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {themes.map((themeOption) => (
                <Chip
                  key={themeOption.value}
                  label={themeOption.name}
                  onClick={() => setTheme(themeOption.value)}
                  variant={theme === themeOption.value ? "filled" : "outlined"}
                  sx={{
                    background: theme === themeOption.value 
                      ? `linear-gradient(45deg, ${themeOption.colors[0]}, ${themeOption.colors[1]})`
                      : 'transparent',
                    color: theme === themeOption.value ? 'white' : 'inherit',
                    '&:hover': {
                      background: `linear-gradient(45deg, ${themeOption.colors[0]}80, ${themeOption.colors[1]}80)`
                    }
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Font Size Settings */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Font Size
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {fontSizes.map((sizeOption) => (
                <Chip
                  key={sizeOption.value}
                  label={sizeOption.name}
                  onClick={() => setFontSize(sizeOption.value)}
                  variant={fontSize === sizeOption.value ? "filled" : "outlined"}
                  color="primary"
                />
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Fade>
  );
};

export default ChatSettings;