import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  Paper,
  IconButton,
  Collapse,
  LinearProgress
} from '@mui/material';
import {
  Security,
  Warning,
  Error,
  CheckCircle,
  Extension,
  ExpandMore,
  ExpandLess,
  Refresh,
  Block,
  Info
} from '@mui/icons-material';
import { createSecurityReport, getExtensionDisableInstructions } from '../../utils/securityUtils';

const SecurityWarningDialog = ({ open, onProceed, onCancel }) => {
  const [securityReport, setSecurityReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (open) {
      performSecurityCheck();
    }
  }, [open]);

  const performSecurityCheck = async () => {
    setLoading(true);
    try {
      // Give browser time to settle before checking
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const report = await createSecurityReport();
      setSecurityReport(report);
      
      // Auto-show instructions if extensions detected
      if (report.extensions.extensionsDetected || report.realTimeTest?.extensionInterference) {
        setShowInstructions(true);
      }
    } catch (error) {
      console.error('Security check failed:', error);
      setSecurityReport({
        overallRisk: 'high',
        extensions: { extensionsDetected: true, count: 0, details: [], warnings: ['Security check failed'] },
        environment: { isValid: false, issues: ['Unable to validate environment'], recommendations: [] },
        realTimeTest: { overallWorking: false, extensionInterference: true, details: ['Security check failed'] },
        canProceed: false,
        recommendations: ['Please refresh and try again']
      });
    }
    setLoading(false);
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'success';
    }
  };

  const getRiskIcon = (risk) => {
    switch (risk) {
      case 'critical': return <Block />;
      case 'high': return <Error />;
      case 'medium': return <Warning />;
      case 'low': return <Info />;
      default: return <CheckCircle />;
    }
  };

  const handleProceed = () => {
    if (securityReport && (securityReport.canProceed || acknowledged)) {
      onProceed(securityReport);
    }
  };

  const disableInstructions = getExtensionDisableInstructions();

  if (loading) {
    return (
      <Dialog open={open} maxWidth="sm" fullWidth disableEscapeKeyDown>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <Security />
            Security Check in Progress
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box textAlign="center" py={3}>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography>
              Scanning browser environment for security compliance...
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog 
      open={open} 
      maxWidth="md" 
      fullWidth 
      disableEscapeKeyDown
      PaperProps={{ sx: { minHeight: '70vh' } }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Security color="primary" />
          Quiz Security Verification
          <Chip 
            label={securityReport?.overallRisk?.toUpperCase() || 'UNKNOWN'} 
            color={getRiskColor(securityReport?.overallRisk)}
            size="small"
          />
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {securityReport && (
          <Box>
            {/* Overall Status */}
            <Alert 
              severity={getRiskColor(securityReport.overallRisk)} 
              icon={getRiskIcon(securityReport.overallRisk)}
              sx={{ mb: 3 }}
            >
              <AlertTitle>
                {securityReport.overallRisk === 'high' ? 'Security Issues Detected' :
                 securityReport.overallRisk === 'medium' ? 'Security Warnings' :
                 securityReport.overallRisk === 'low' ? 'Minor Security Notes' :
                 'Environment Verified'}
              </AlertTitle>
              {securityReport.overallRisk === 'high' && 
                'Critical security issues detected. Please resolve before proceeding.'}
              {securityReport.overallRisk === 'medium' && 
                'Some security concerns detected. Review and address if possible.'}
              {securityReport.overallRisk === 'low' && 
                'Minor security notes detected. Generally safe to proceed.'}
              {securityReport.overallRisk === 'none' && 
                'No security issues detected. Environment is secure.'}
            </Alert>

            {/* Extension Detection Results */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Extension />
                <Typography variant="h6">Browser Extensions</Typography>
                <Chip 
                  label={securityReport.extensions.extensionsDetected ? 
                    `${securityReport.extensions.count} detected` : 'None detected'} 
                  color={securityReport.extensions.extensionsDetected ? 'warning' : 'success'}
                  size="small"
                />
              </Box>

              {securityReport.extensions.extensionsDetected && (
                <Box>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Browser extensions have been detected that may interfere with quiz security.
                    It is strongly recommended to disable all extensions before proceeding.
                  </Alert>

                  {securityReport.extensions.details.length > 0 && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" gutterBottom>
                        Detected Extensions/Modifications:
                      </Typography>
                      <List dense>
                        {securityReport.extensions.details.slice(0, 5).map((detail, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <Block color="warning" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={detail} />
                          </ListItem>
                        ))}
                        {securityReport.extensions.details.length > 5 && (
                          <ListItem>
                            <ListItemText 
                              primary={`... and ${securityReport.extensions.details.length - 5} more`} 
                            />
                          </ListItem>
                        )}
                      </List>
                    </Box>
                  )}

                  <Button
                    variant="outlined"
                    startIcon={showInstructions ? <ExpandLess /> : <ExpandMore />}
                    onClick={() => setShowInstructions(!showInstructions)}
                    size="small"
                  >
                    How to Disable Extensions
                  </Button>

                  <Collapse in={showInstructions}>
                    <Box mt={2}>
                      <Typography variant="subtitle2" gutterBottom>
                        Steps to disable Chrome extensions:
                      </Typography>
                      <List dense>
                        {disableInstructions.map((instruction, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <Typography variant="body2" color="primary">
                                {index + 1}.
                              </Typography>
                            </ListItemIcon>
                            <ListItemText primary={instruction} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </Collapse>
                </Box>
              )}
            </Paper>

            {/* Real-Time Tab Switching Test Results */}
            {securityReport.realTimeTest && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  <Box display="flex" alignItems="center" gap={1}>
                    {securityReport.realTimeTest.overallWorking ? (
                      <CheckCircle color="success" />
                    ) : (
                      <Error color="error" />
                    )}
                    Tab Switching Detection Test
                  </Box>
                </Typography>
                
                <Alert 
                  severity={securityReport.realTimeTest.overallWorking ? "success" : "error"} 
                  sx={{ mb: 2 }}
                >
                  <AlertTitle>
                    {securityReport.realTimeTest.overallWorking ? 
                      "Tab switching detection is working properly" : 
                      "Tab switching detection is compromised"}
                  </AlertTitle>
                  {securityReport.realTimeTest.extensionInterference && (
                    <Typography variant="body2">
                      <strong>CRITICAL:</strong> Extension interference detected. This indicates an extension like 
                      "Always Active Window" is preventing proper quiz monitoring.
                    </Typography>
                  )}
                </Alert>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Test Details:
                  </Typography>
                  <List dense>
                    {securityReport.realTimeTest.details.map((detail, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Info fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={detail}
                          primaryTypographyProps={{
                            variant: "body2",
                            color: detail.includes('CRITICAL') ? 'error' : 'textPrimary'
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Paper>
            )}

            {/* Direct Always Active Window Test Results */}
            {securityReport.directTest && securityReport.directTest.detected && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Block color="error" />
                    Always Active Window Extension Detected
                  </Box>
                </Typography>
                
                <Alert severity="error" sx={{ mb: 2 }}>
                  <AlertTitle>CRITICAL: Always Active Window Extension Confirmed</AlertTitle>
                  <Typography variant="body2">
                    Direct behavioral testing has confirmed the presence of the Always Active Window extension.
                    <strong> This extension MUST be disabled before you can access the quiz.</strong>
                  </Typography>
                  <Box mt={1}>
                    <Typography variant="body2" fontWeight="bold">
                      Confidence Level: {securityReport.directTest.confidence.toUpperCase()}
                    </Typography>
                  </Box>
                </Alert>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Detection Evidence:
                  </Typography>
                  <List dense>
                    {securityReport.directTest.evidence.map((evidence, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Error color="error" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={evidence}
                          primaryTypographyProps={{
                            variant: "body2",
                            color: "error"
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                  
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Technical Details:
                  </Typography>
                  <List dense>
                    {securityReport.directTest.details.map((detail, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Info fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={detail}
                          primaryTypographyProps={{
                            variant: "body2",
                            color: "textSecondary"
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Paper>
            )}

            {/* Environment Issues */}
            {securityReport.environment.issues.length > 0 && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Environment Issues
                </Typography>
                <List dense>
                  {securityReport.environment.issues.map((issue, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Warning color="warning" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={issue} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}

            {/* Recommendations */}
            {securityReport.recommendations.length > 0 && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Recommendations
                </Typography>
                <List dense>
                  {securityReport.recommendations.map((rec, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Info color="info" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={rec} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}

            {/* Critical/High Risk Warning */}
            {(securityReport.overallRisk === 'critical' || securityReport.overallRisk === 'high') && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <AlertTitle>
                  {securityReport.overallRisk === 'critical' ? 'Quiz Access Blocked' : 'Cannot Proceed'}
                </AlertTitle>
                {securityReport.overallRisk === 'critical' ? (
                  <>
                    Critical security extensions have been detected that prevent proper quiz monitoring.
                    <strong> These extensions MUST be disabled before you can access the quiz.</strong>
                    {securityReport.blockedExtensions && securityReport.blockedExtensions.length > 0 && (
                      <Box mt={2}>
                        <Typography variant="subtitle2" color="error" gutterBottom>
                          Blocked Extensions:
                        </Typography>
                        {securityReport.blockedExtensions.map((ext, index) => (
                          <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'rgba(211, 47, 47, 0.1)', borderRadius: 1 }}>
                            <Typography variant="body2" color="error" fontWeight="bold">
                              {ext.name} ({ext.severity} RISK)
                            </Typography>
                            <Typography variant="caption" color="error">
                              {ext.reason}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                    <Typography variant="body2" sx={{ mt: 2, fontWeight: 'bold' }}>
                      To proceed: Disable these extensions and refresh this page.
                    </Typography>
                  </>
                ) : (
                  <>
                    Critical security issues must be resolved before taking the quiz. 
                    Please address the issues above and refresh the page.
                    <Box mt={2}>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => setAcknowledged(!acknowledged)}
                        size="small"
                      >
                        {acknowledged ? '✓ Acknowledged' : 'I understand the risks and want to proceed anyway'}
                      </Button>
                    </Box>
                  </>
                )}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <Divider />
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onCancel} color="inherit">
          Cancel Quiz
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={performSecurityCheck}
        >
          Re-check
        </Button>

        <Button
          variant="contained"
          onClick={handleProceed}
          disabled={!securityReport || 
                   securityReport.overallRisk === 'critical' || 
                   (securityReport.overallRisk === 'high' && !acknowledged)}
          color={securityReport?.overallRisk === 'high' ? 'error' : 'primary'}
        >
          {securityReport?.overallRisk === 'critical' ? 
            'Extensions Must Be Disabled' :
            securityReport?.overallRisk === 'high' && !acknowledged ? 
            'Resolve Issues First' : 
            'Proceed to Quiz'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SecurityWarningDialog;