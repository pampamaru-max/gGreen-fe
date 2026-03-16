import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "evaluator" | "user";

interface UserRoleState {
  role: AppRole | null;
  accessibleProgramIds: string[];
  isAdmin: boolean;
  loading: boolean;
}

export function useUserRole(): UserRoleState {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [accessibleProgramIds, setAccessibleProgramIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setAccessibleProgramIds([]);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      setLoading(true);

      // Fetch role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const userRole = (roles?.[0]?.role as AppRole) || null;
      setRole(userRole);

      if (userRole === "admin") {
        // Admin sees all programs
        setAccessibleProgramIds([]);
      } else {
        // Fetch assigned programs
        const { data: access } = await supabase
          .from("user_program_access")
          .select("program_id")
          .eq("user_id", user.id);

        setAccessibleProgramIds(access?.map((a) => a.program_id) || []);
      }

      setLoading(false);
    };

    fetch();
  }, [user]);

  return {
    role,
    accessibleProgramIds,
    isAdmin: role === "admin",
    loading,
  };
}
