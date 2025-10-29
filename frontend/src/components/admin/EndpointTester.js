import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Upload as UploadIcon
} from '@mui/icons-material';

const EndpointTester = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState({});
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [testData, setTestData] = useState({});
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCourseData, setNewCourseData] = useState({
    title: '',
    description: '',
    school: '',
    department: ''
  });

  // Comprehensive endpoint definitions
  const endpointCategories = {
    Authentication: [
      {
        name: 'Login',
        method: 'POST',
        url: '/api/auth/login',
        requiresAuth: false,
        testData: {
          email: 'sourav11092002@gmail.com',
          password: 'Admin@1234'
        }
      }
    ],
    
    Course_Management: [
      {
        name: 'Get All Courses (Admin)',
        method: 'GET',
        url: '/api/admin/courses',
        requiresAuth: true
      },
      {
        name: 'Get All Courses (Direct)',
        method: 'GET',
        url: '/api/courses',
        requiresAuth: true
      },
      {
        name: 'Get Course Details (Admin)',
        method: 'GET',
        url: '/api/admin/course/[courseId]/details',
        requiresAuth: true,
        usesCourseId: true
      },
      {
        name: 'Get Course Details (Direct)',
        method: 'GET',
        url: '/api/courses/[courseId]',
        requiresAuth: true,
        usesCourseId: true
      },
      {
        name: 'Get Course Videos',
        method: 'GET',
        url: '/api/admin/course/[courseId]/videos',
        requiresAuth: true,
        usesCourseId: true
      },
      {
        name: 'Get Course Students',
        method: 'GET',
        url: '/api/admin/course/[courseId]/students',
        requiresAuth: true,
        usesCourseId: true
      },
      {
        name: 'Create Course',
        method: 'POST',
        url: '/api/admin/course',
        requiresAuth: true,
        testData: {
          title: 'Test Course API',
          description: 'Testing course creation via endpoint tester',
          credits: 3
        }
      }
    ],

    Hierarchy_Management: [
      {
        name: 'Get Schools',
        method: 'GET',
        url: '/api/schools',
        requiresAuth: true
      },
      {
        name: 'Get Departments',
        method: 'GET',
        url: '/api/departments',
        requiresAuth: true
      },
      {
        name: 'Get Courses by Department',
        method: 'GET',
        url: '/api/hierarchy/courses-by-department/[departmentId]',
        requiresAuth: true,
        usesDepartmentId: true
      },
      {
        name: 'Get Teachers by Department',
        method: 'GET',
        url: '/api/hierarchy/teachers-by-department/[departmentId]',
        requiresAuth: true,
        usesDepartmentId: true
      },
      {
        name: 'Get Sections',
        method: 'GET',
        url: '/api/sections',
        requiresAuth: true
      }
    ],

    User_Management: [
      {
        name: 'Get All Teachers',
        method: 'GET',
        url: '/api/admin/teachers',
        requiresAuth: true
      },
      {
        name: 'Get All Students',
        method: 'GET',
        url: '/api/admin/students',
        requiresAuth: true
      },
      {
        name: 'Create Teacher',
        method: 'POST',
        url: '/api/admin/teacher',
        requiresAuth: true,
        testData: {
          name: 'Test Teacher',
          email: 'test.teacher@example.com',
          password: 'TestPass123',
          permissions: ['view_courses']
        }
      },
      {
        name: 'Create Student',
        method: 'POST',
        url: '/api/admin/student',
        requiresAuth: true,
        testData: {
          name: 'Test Student',
          email: 'test.student@example.com',
          password: 'TestPass123',
          regNo: 'TEST001'
        }
      }
    ],

    Analytics: [
      {
        name: 'Analytics Overview',
        method: 'GET',
        url: '/api/admin/analytics/overview',
        requiresAuth: true
      },
      {
        name: 'Database Status',
        method: 'GET',
        url: '/api/db-status',
        requiresAuth: false
      }
    ]
  };

  const makeRequest = async (endpoint, dynamicData = {}) => {
    const url = endpoint.url
      .replace('[courseId]', dynamicData.courseId || testData.courseId || 'test-id')
      .replace('[departmentId]', dynamicData.departmentId || testData.departmentId || 'test-id');

    const options = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (endpoint.requiresAuth && token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (endpoint.method !== 'GET' && (endpoint.testData || dynamicData.body)) {
      options.body = JSON.stringify({
        ...endpoint.testData,
        ...dynamicData.body,
        ...(endpoint.testData?.school && testData.schoolId ? { school: testData.schoolId } : {}),
        ...(endpoint.testData?.department && testData.departmentId ? { department: testData.departmentId } : {})
      });
    }

    const startTime = Date.now();
    
    try {
      const response = await fetch(`http://localhost:5000${url}`, options);
      const endTime = Date.now();
      
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data,
        responseTime: endTime - startTime,
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      const endTime = Date.now();
      return {
        success: false,
        status: 0,
        statusText: 'Network Error',
        error: error.message,
        responseTime: endTime - startTime
      };
    }
  };

  const runSingleTest = async (endpoint, category) => {
    const testKey = `${category}_${endpoint.name}`;
    
    setResults(prev => ({
      ...prev,
      [testKey]: { ...prev[testKey], testing: true }
    }));

    const result = await makeRequest(endpoint);
    
    // Extract useful data for subsequent tests
    if (result.success && result.data) {
      if (endpoint.name.includes('Login') && result.data.token) {
        setToken(result.data.token);
        localStorage.setItem('token', result.data.token);
      }
      
      if (endpoint.name.includes('Schools') && Array.isArray(result.data) && result.data.length > 0) {
        setTestData(prev => ({ ...prev, schoolId: result.data[0]._id }));
      }
      
      if (endpoint.name.includes('Departments') && Array.isArray(result.data) && result.data.length > 0) {
        setTestData(prev => ({ ...prev, departmentId: result.data[0]._id }));
      }
      
      if (endpoint.name.includes('Courses') && Array.isArray(result.data) && result.data.length > 0) {
        setTestData(prev => ({ ...prev, courseId: result.data[0]._id }));
      }
    }

    setResults(prev => ({
      ...prev,
      [testKey]: { ...result, testing: false, timestamp: new Date().toISOString() }
    }));
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults({});
    
    // Run tests in order, some depend on others
    const testOrder = [
      ['Authentication', 'Login'],
      ['Hierarchy_Management', 'Get Schools'],
      ['Hierarchy_Management', 'Get Departments'],
      ['Course_Management', 'Get All Courses (Admin)'],
      ['Course_Management', 'Get All Courses (Direct)']
    ];

    // Run prerequisite tests first
    for (const [category, endpointName] of testOrder) {
      const endpoint = endpointCategories[category].find(e => e.name === endpointName);
      if (endpoint) {
        await runSingleTest(endpoint, category);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      }
    }

    // Run remaining tests
    for (const [category, endpoints] of Object.entries(endpointCategories)) {
      for (const endpoint of endpoints) {
        const alreadyTested = testOrder.some(([cat, name]) => 
          cat === category && name === endpoint.name
        );
        
        if (!alreadyTested) {
          await runSingleTest(endpoint, category);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    }
    
    setTesting(false);
  };

  const exportResults = () => {
    const report = {
      timestamp: new Date().toISOString(),
      testData,
      results,
      summary: {
        total: Object.keys(results).length,
        passed: Object.values(results).filter(r => r.success).length,
        failed: Object.values(results).filter(r => !r.success).length
      }
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `endpoint-test-results-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (result) => {
    if (result.testing) return 'info';
    if (result.success) return 'success';
    if (result.status >= 400) return 'error';
    return 'warning';
  };

  const getStatusIcon = (result) => {
    if (result.testing) return <LinearProgress sx={{ width: 20 }} />;
    if (result.success) return <SuccessIcon color="success" />;
    if (result.status >= 400) return <ErrorIcon color="error" />;
    return <WarningIcon color="warning" />;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h4" gutterBottom>
              API Endpoint Tester
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Comprehensive testing utility for all backend endpoints
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayIcon />}
              onClick={runAllTests}
              disabled={testing}
              sx={{ mr: 1 }}
            >
              {testing ? 'Testing...' : 'Run All Tests'}
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={exportResults}
              disabled={Object.keys(results).length === 0}
            >
              Export Results
            </Button>
          </Grid>
        </Grid>

        {/* Test Summary */}
        {Object.keys(results).length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {Object.keys(results).length}
                    </Typography>
                    <Typography variant="body2">Total Tests</Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {Object.values(results).filter(r => r.success).length}
                    </Typography>
                    <Typography variant="body2">Passed</Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="error.main">
                      {Object.values(results).filter(r => !r.success).length}
                    </Typography>
                    <Typography variant="body2">Failed</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Test Results by Category */}
      {Object.entries(endpointCategories).map(([category, endpoints]) => (
        <Accordion key={category} defaultExpanded sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">
              {category.replace(/_/g, ' ')} ({endpoints.length} endpoints)
            </Typography>
          </AccordionSummary>
          
          <AccordionDetails>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell>Status</TableCell>
                    <TableCell>Endpoint</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Response Time</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {endpoints.map((endpoint) => {
                    const testKey = `${category}_${endpoint.name}`;
                    const result = results[testKey] || {};
                    
                    return (
                      <TableRow key={endpoint.name}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getStatusIcon(result)}
                            <Chip
                              label={result.testing ? 'Testing...' : result.status || 'Not Tested'}
                              color={getStatusColor(result)}
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {endpoint.name}
                          </Typography>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {endpoint.url}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Chip label={endpoint.method} size="small" variant="outlined" />
                        </TableCell>
                        
                        <TableCell>
                          {result.responseTime ? `${result.responseTime}ms` : '-'}
                        </TableCell>
                        
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => runSingleTest(endpoint, category)}
                            disabled={result.testing}
                          >
                            Test
                          </Button>
                          {result.data && (
                            <Button
                              size="small"
                              onClick={() => setSelectedEndpoint({ ...endpoint, result })}
                              sx={{ ml: 1 }}
                            >
                              View
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Result Detail Dialog */}
      <Dialog
        open={!!selectedEndpoint}
        onClose={() => setSelectedEndpoint(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedEndpoint?.name} - Response Details
        </DialogTitle>
        <DialogContent>
          {selectedEndpoint && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>Request:</Typography>
              <Box component="pre" sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mb: 2, fontSize: '0.8rem' }}>
                {`${selectedEndpoint.method} ${selectedEndpoint.url}\n${selectedEndpoint.requiresAuth ? `Authorization: Bearer ${token?.slice(0, 20)}...` : 'No auth required'}`}
              </Box>
              
              <Typography variant="subtitle2" gutterBottom>Response:</Typography>
              <Box component="pre" sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, overflow: 'auto', maxHeight: 400, fontSize: '0.8rem' }}>
                {JSON.stringify(selectedEndpoint.result.data, null, 2)}
              </Box>
              
              {selectedEndpoint.result.error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {selectedEndpoint.result.error}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedEndpoint(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EndpointTester;