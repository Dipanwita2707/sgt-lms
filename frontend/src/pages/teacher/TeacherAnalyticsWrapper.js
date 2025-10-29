import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import TeacherCourseAnalytics from '../../components/teacher/TeacherCourseAnalytics';
import OldTeacherAnalytics from './TeacherAnalyticsOld'; // We'll rename the old file

const TeacherAnalyticsWrapper = ({ viewType }) => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Box>
      <Tabs value={currentTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tab label="Course Analytics" />
        <Tab label="Overview Analytics" />
      </Tabs>

      {currentTab === 0 && <TeacherCourseAnalytics />}
      {currentTab === 1 && <OldTeacherAnalytics viewType={viewType} />}
    </Box>
  );
};

export default TeacherAnalyticsWrapper;
