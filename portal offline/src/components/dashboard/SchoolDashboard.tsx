import { useState, useEffect, useCallback } from "react";
import {
  LocalUser,
  FeeRequest,
  listRequestsForSchool,
  getStatusBadgeVariant,
  getStatusLabel,
} from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import SubmitRequestDialog from "./SubmitRequestDialog";
import RequestDetailsDialog from "./RequestDetailsDialog";

const SchoolDashboard = ({ user }: { user: LocalUser }) => {
  const [requests, setRequests] = useState<FeeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const data = await listRequestsForSchool(user.id);
      setRequests(data);
    } catch {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleRequestSubmitted = () => {
    setShowSubmitDialog(false);
    fetchRequests();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">School Dashboard</h2>
        <p className="text-muted-foreground">Submit and track fee approval requests</p>
      </div>

      <div className="mb-6">
        <Button onClick={() => setShowSubmitDialog(true)}>Submit New Fee Request</Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No requests submitted yet</p>
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => (
              <Card
                key={request.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedRequest(request.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{request.fee_type}</CardTitle>
                      <CardDescription>
                        {request.term} {request.year} - {request.number_of_students} students
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusBadgeVariant(request.status)}>
                      {getStatusLabel(request.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <p className="font-semibold">${request.total_amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Submitted:</span>
                      <p className="font-semibold">
                        {new Date(request.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <SubmitRequestDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        user={user}
        onSuccess={handleRequestSubmitted}
      />

      {selectedRequest && (
        <RequestDetailsDialog
          requestId={selectedRequest}
          open={!!selectedRequest}
          onOpenChange={(open) => !open && setSelectedRequest(null)}
        />
      )}
    </div>
  );
};

export default SchoolDashboard;
