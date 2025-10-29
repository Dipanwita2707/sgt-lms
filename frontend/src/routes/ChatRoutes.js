import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import GroupChatPageEnhanced from '../components/GroupChatPageEnhanced';
import GroupChatPage from '../components/GroupChatPage'; // Legacy fallback
import GroupChatListPage from '../components/GroupChatListPage';
import ProtectedRoute from '../components/ProtectedRoute';

const ChatRoutes = () => {
  return (
    <Routes>
      {/* Enhanced Group Chat (Default) */}
      <Route 
        path="/group-chat/:courseId/:sectionId" 
        element={
          <ProtectedRoute>
            <GroupChatPageEnhanced />
          </ProtectedRoute>
        } 
      />
      
      {/* Original Group Chat (Legacy) */}
      <Route 
        path="/group-chat-legacy/:courseId/:sectionId" 
        element={
          <ProtectedRoute>
            <GroupChatPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Group Chat List */}
      <Route 
        path="/group-chat" 
        element={
          <ProtectedRoute>
            <GroupChatListPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Redirect to list */}
      <Route path="/chat" element={<Navigate to="/group-chat" replace />} />
    </Routes>
  );
};

export default ChatRoutes;