import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'professor' | 'student';

export function useUserRole(userId: string | undefined) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data, error } = await supabase
        .from('user_roles' as any)
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching role:', error);
        setRole(null);
      } else if (data) {
        setRole((data as any).role as AppRole);
      }
      setLoading(false);
    };

    fetchRole();
  }, [userId]);

  return { role, loading, isProfessor: role === 'professor', isStudent: role === 'student' };
}
