import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export function useAuthRole() {
  return useQuery({
    queryKey: ['auth-role'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/auth/role');
      if (!res.ok) {
        return { isSimulated: false, role: null, workspaceId: null, workspaceInfo: null, email: session?.user?.email, user: session?.user || null };
      }
      
      const data = await res.json();
      return {
        ...data,
        user: session?.user || null,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
