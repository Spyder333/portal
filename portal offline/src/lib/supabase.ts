import { supabase } from "@/integrations/supabase/client";

export type UserRole = "school" | "chief_accountant" | "director" | "permanent_secretary";

export const getRoleName = (role: UserRole): string => {
  const roleNames: Record<UserRole, string> = {
    school: "School",
    chief_accountant: "Chief Accountant (Revenue)",
    director: "Director",
    permanent_secretary: "Permanent Secretary",
  };
  return roleNames[role];
};

export const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "pending":
      return "warning";
    case "approved_by_accountant":
    case "approved_by_director":
      return "default";
    case "approved":
      return "success";
    case "rejected":
      return "destructive";
    default:
      return "outline";
  }
};

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: "Pending Review",
    approved_by_accountant: "Approved by Accountant",
    approved_by_director: "Approved by Director",
    approved: "Final Approval",
    rejected: "Rejected",
  };
  return labels[status] || status;
};

export { supabase };
