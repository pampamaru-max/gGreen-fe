import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "evaluator" | "user";

interface UserRoleState {
  role: AppRole | null;
  accessibleProgramIds: string[];
  isAdmin: boolean;
  loading: boolean;
}

function mapRole(backendRole: string | undefined): AppRole | null {
  if (!backendRole) return null;
  const r = backendRole.toUpperCase();
  if (r === "SUPERADMIN" || r === "ADMIN") return "admin";
  if (r === "EVALUATOR") return "evaluator";
  if (r === "EVALUATEE") return "user";
  return null;
}

export function useUserRole(): UserRoleState {
  const { user, loading } = useAuth();

  if (loading) {
    return { role: null, accessibleProgramIds: [], isAdmin: false, loading: true };
  }

  const role = mapRole(user?.role);

  return {
    role,
    accessibleProgramIds: user?.programAccess ?? [],
    isAdmin: role === "admin",
    loading: false,
  };
}
