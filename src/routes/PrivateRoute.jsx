import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children, allowedRoles = [] }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'kasir' ? '/cashier' : '/dashboard'} replace />;
  }

  return children;
}
