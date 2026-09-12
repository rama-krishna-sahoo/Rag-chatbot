import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export function useAuthRole() {
  return useQuery({
    queryKey: ['auth-role'],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const supabase = createClient();
        
        // Fast getSession with 2.5s timeout so local storage / lock contention never deadlocks
        const sessionPromise = supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => 
          setTimeout(() => resolve({ data: { session: null } }), 2500)
        );
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

        const res = await fetch('/api/auth/role', {
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache' }
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          const fallbackUser = session?.user || null;
          return {
            isSimulated: false,
            role: null,
            workspaceId: null,
            workspaceInfo: null,
            email: fallbackUser?.email || null,
            user: fallbackUser,
            authenticated: Boolean(fallbackUser),
          };
        }

        const data = await res.json();
        const effectiveUser = session?.user || (data?.user?.id && !data.user.id.startsWith("00000000") && !data.user.id.startsWith("mock-") ? data.user : null);
        return {
          ...data,
          user: effectiveUser,
          email: effectiveUser?.email || data?.email || null,
          authenticated: Boolean(effectiveUser || data?.isSimulated),
        };
      } catch (err: any) {
        clearTimeout(timeoutId);
        // If aborted or network dropped during tab switch, try reading client session directly
        try {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            return {
              isSimulated: false,
              role: "Knowledge Admin",
              workspaceId: null,
              workspaceInfo: null,
              email: session.user.email,
              user: session.user,
            };
          }
        } catch (_) {}
        throw err;
      }
    },
    staleTime: 1000 * 60 * 3, // 3 minutes
    refetchOnWindowFocus: true, // Auto-refetch when user focuses/switches back to this tab
    refetchOnReconnect: true,
    retry: 2,
    retryDelay: 1000,
  });
}
