import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import SchoolDashboard from "@/components/dashboard/SchoolDashboard";
import AccountantDashboard from "@/components/dashboard/AccountantDashboard";
import DirectorDashboard from "@/components/dashboard/DirectorDashboard";
import SecretaryDashboard from "@/components/dashboard/SecretaryDashboard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const renderDashboard = () => {
    switch (user.role) {
      case "school":
        return <SchoolDashboard user={user} />;
      case "chief_accountant":
        return <AccountantDashboard user={user} />;
      case "director":
        return <DirectorDashboard user={user} />;
      case "permanent_secretary":
        return <SecretaryDashboard user={user} />;
      default:
        return <div>Invalid role</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Ministry of Primary and Secondary Education
            </h1>
            <p className="text-sm text-muted-foreground">
              Fees Approval System - Zimbabwe · Signed in as {user.full_name}
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>
      </header>
      <main>{renderDashboard()}</main>
    </div>
  );
};

export default Dashboard;
