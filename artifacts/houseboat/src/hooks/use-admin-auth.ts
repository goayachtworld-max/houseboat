import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, getGetMeQueryKey, useAdminLogout } from "@workspace/api-client-react";

export function useAdminAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useGetMe({
    query: {
      retry: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  });

  const logoutMutation = useAdminLogout({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        window.location.href = "/";
      },
    }
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    logout: () => logoutMutation.mutate({}),
    isLoggingOut: logoutMutation.isPending
  };
}
