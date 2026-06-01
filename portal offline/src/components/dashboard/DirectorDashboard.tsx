import { useState, useEffect, useCallback } from "react";
import {
  LocalUser,
  FeeRequest,
  listAllRequests,
  directorApprove,
  rejectRequest,
  getStatusBadgeVariant,
  getStatusLabel,
} from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import RequestDetailsDialog from "./RequestDetailsDialog";

const DirectorDashboard = ({ user }: { user: LocalUser }) => {
  const [requests, setRequests] = useState<FeeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [comments, setComments] = useState("");

  const fetchRequests = useCallback(async () => {
    try {
      setRequests(await listAllRequests());
    } catch {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (requestId: string) => {
    if (!comments.trim()) return toast.error("Please add comments before approving");
    setProcessingId(requestId);
    try {
      await directorApprove(requestId, user.id, comments);
      toast.success("Request approved successfully!");
      setComments("");
      fetchRequests();
    } catch {
      toast.error("Failed to approve request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!comments.trim()) return toast.error("Please provide a reason for rejection");
    setProcessingId(requestId);
    try {
      await rejectRequest(requestId, user.id, comments);
      toast.success("Request rejected");
      setComments("");
      fetchRequests();
    } catch {
      toast.error("Failed to reject request");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "approved_by_accountant");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">Director Dashboard</h2>
        <p className="text-muted-foreground">Review accountant-approved fee requests</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : (
        <div className="grid gap-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">
              Awaiting Director Approval ({pendingRequests.length})
            </h3>
            {pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No requests awaiting approval</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingRequests.map((request) => (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{request.school_name}</CardTitle>
                          <CardDescription>
                            {request.fee_type} - {request.term} {request.year}
                          </CardDescription>
                        </div>
                        <Badge variant={getStatusBadgeVariant(request.status)}>
                          {getStatusLabel(request.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Amount:</span>
                          <p className="font-semibold text-lg">${request.total_amount.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Students:</span>
                          <p className="font-semibold">{request.number_of_students}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Submitted:</span>
                          <p className="font-semibold">
                            {new Date(request.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`comments-${request.id}`}>Comments</Label>
                        <Textarea
                          id={`comments-${request.id}`}
                          placeholder="Add your review comments..."
                          value={processingId === request.id ? comments : ""}
                          onChange={(e) => {
                            setProcessingId(request.id);
                            setComments(e.target.value);
                          }}
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => setSelectedRequest(request.id)} variant="outline">
                          View Details
                        </Button>
                        <Button onClick={() => handleApprove(request.id)} disabled={processingId !== null}>
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleReject(request.id)}
                          variant="destructive"
                          disabled={processingId !== null}
                        >
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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

export default DirectorDashboard;
