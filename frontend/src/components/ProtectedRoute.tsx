import { useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Redirect to waiting page if not approved and not superuser
  if (!user.is_approved && !user.is_superuser) {
    if (window.location.pathname !== '/waiting-for-approval') {
      // We can't easily redirect here inside the render efficiently without flashing
      // But actually we are inside a Router context, so we can use Navigate
      return <Navigate to="/waiting-for-approval" />;
    }
    return <>{children}</>;
  }

  // If user is accessing admin page but is not superuser
  if (location.pathname === '/admin' && !user.is_superuser) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}
