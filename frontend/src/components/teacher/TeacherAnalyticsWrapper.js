import React, { useState, useEffect } from 'react';
import TeacherAnalytics from './TeacherAnalytics';

// This wrapper component handles the compatibility between the TeacherAnalytics component
// and the current backend implementation
const TeacherAnalyticsWrapper = ({ user, token }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default empty structures for missing data
  const defaultHeatmap = {
    byDay: {
      'Sunday': 0,
      'Monday': 0,
      'Tuesday': 0,
      'Wednesday': 0,
      'Thursday': 0,
      'Friday': 0,
      'Saturday': 0
    },
    byHour: {}
  };

  // Initialize hours
  for (let i = 0; i < 24; i++) {
    defaultHeatmap.byHour[i] = 0;
  }

  // Create a compatibility layer for the student analytics data
  const wrapStudentAnalytics = (studentData) => {
    // If there's real data from the backend, use it as is
    if (studentData && studentData.activityHeatmap) {
      return studentData;
    }

    // If the data exists but is missing the expected structure, add it
    if (studentData) {
      return {
        ...studentData,
        activityHeatmap: defaultHeatmap
      };
    }

    // If no data at all, return null
    return null;
  };

  // Intercept the axios request to modify the response data if needed
  useEffect(() => {
    // We're not actually doing anything with the data here
    // This is just a placeholder for the wrapper functionality
    // The actual wrapper logic happens in the TeacherAnalytics component
    setLoading(false);
  }, []);

  // Pass both the original props and our wrapped data to the component
  return (
    <TeacherAnalytics 
      user={user} 
      token={token}
      wrappedAnalytics={analyticsData}
      defaultHeatmap={defaultHeatmap}
    />
  );
};

export default TeacherAnalyticsWrapper;
