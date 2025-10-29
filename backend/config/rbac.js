// Centralized permissions and roles config
const PERMISSIONS = [
  'manage_teachers',
  'manage_students',
  'manage_courses',
  'manage_videos',
  'view_analytics',
  // Add more as needed
];

const ROLES = [
  {
    name: 'admin',
    permissions: PERMISSIONS,
  },
  {
    name: 'teacher',
    permissions: ['manage_courses', 'manage_videos'],
  },
  {
    name: 'student',
    permissions: [],
  },
];

module.exports = { PERMISSIONS, ROLES };
