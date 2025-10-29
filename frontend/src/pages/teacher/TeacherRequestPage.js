// Add this route to your frontend router if not already present
import React from 'react';
import TeacherRequestPanel from '../../components/teacher/TeacherRequestPanel';
import { parseJwt } from '../../utils/jwt';

const TeacherRequestPage = () => {
  const token = localStorage.getItem('token');
  const user = parseJwt(token);
  if (!user || user.role !== 'teacher') {
    return <div>Unauthorized</div>;
  }
  return <TeacherRequestPanel token={token} />;
};

export default TeacherRequestPage;
