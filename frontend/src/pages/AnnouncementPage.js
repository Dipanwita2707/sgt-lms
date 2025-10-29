import React from 'react';
import AnnouncementBoard from '../components/AnnouncementBoard';
import { parseJwt } from '../utils/jwt';

const AnnouncementPage = ({ role, teacherCourses, userId }) => {
  const token = localStorage.getItem('token');
  return (
    <div style={{ maxWidth: 600, margin: '2rem auto' }}>
      <AnnouncementBoard role={role} token={token} teacherCourses={teacherCourses} userId={userId} />
    </div>
  );
};

export default AnnouncementPage;
