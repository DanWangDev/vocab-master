import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface RoleRouteProps {
  allowedRoles: Array<'student' | 'parent' | 'admin'>;
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { state } = useAuth();

  // Check if user's role is in the allowed roles
  const userRole = state.user?.role;

  if (!userRole || !allowedRoles.includes(userRole)) {
    // Redirect to home if unauthorized
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
