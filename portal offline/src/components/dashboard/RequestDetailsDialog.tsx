import { useState, useEffect, useCallback } from "react";
import {
  FeeRequest,
  RequestDocument,
  getRequest,
  listDocuments,
  getDocumentData,
  downloadDocument,
  getStatusBadgeVariant,
  getStatusLabel,
} from "@/lib/db";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RequestDetailsDialogProps {
  requestId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RequestDetailsDialog = ({ requestId, open, onOpenChange }: RequestDetailsDialogProps) => {
  const [request, setRequest] = useState<FeeRequest | null>(null);
  const [documents, setDocuments] = useState<RequestDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequestDetails = useCallback(async () => {
    try {
      setLoading(true);
      const [r, docs] = await Promise.all([getRequest(requestId), listDocuments(requestId)]);
      setRequest(r);
      setDocuments(docs);
    } catch {
      toast.error("Failed to load request details");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    if (open && requestId) fetchRequestDetails();
  }, [open, requestId, fetchRequestDetails]);

  const handleDownload = async (docId: string) => {
    const data = await getDocumentData(docId);
    if (!data) return toast.error("Document not found");
    downloadDocument(data);
  };

  if (loading || !request) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Request Details</span>
            <Badge variant={getStatusBadgeVariant(request.status)}>
              {getStatusLabel(request.status)}
            </Badge>
          </DialogTitle>
          <DialogDescription>Complete information about this fee approval request</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">School Name</p>
                  <p className="font-semibold">{request.school_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fee Type</p>
                  <p className="font-semibold">{request.fee_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Term</p>
                  <p className="font-semibold">
                    {request.term} {request.year}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-semibold text-lg">${request.total_amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Number of Students</p>
                  <p className="font-semibold">{request.number_of_students}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-semibold">
                    {new Date(request.submitted_at).toLocaleString()}
                  </p>
                </div>
              </div>
              {request.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{request.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {documents.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Supporting Documents ({documents.length})</h3>
              <Card>
                <CardContent className="pt-6 space-y-2">
                  {documents.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{d.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(d.size_bytes / 1024).toFixed(1)} KB · {d.mime_type}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleDownload(d.id)}>
                        Download
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {request.accountant_approved_at && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success"></span>
                  Chief Accountant Review
                </h3>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Approved on</p>
                    <p className="font-semibold mb-3">
                      {new Date(request.accountant_approved_at).toLocaleString()}
                    </p>
                    {request.accountant_comments && (
                      <>
                        <p className="text-sm text-muted-foreground mb-1">Comments</p>
                        <p className="text-sm">{request.accountant_comments}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {request.director_approved_at && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success"></span>
                  Director Review
                </h3>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Approved on</p>
                    <p className="font-semibold mb-3">
                      {new Date(request.director_approved_at).toLocaleString()}
                    </p>
                    {request.director_comments && (
                      <>
                        <p className="text-sm text-muted-foreground mb-1">Comments</p>
                        <p className="text-sm">{request.director_comments}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {request.final_approved_at && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success"></span>
                  Permanent Secretary - Final Approval
                </h3>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Approved on</p>
                    <p className="font-semibold mb-3">
                      {new Date(request.final_approved_at).toLocaleString()}
                    </p>
                    {request.final_comments && (
                      <>
                        <p className="text-sm text-muted-foreground mb-1">Comments</p>
                        <p className="text-sm">{request.final_comments}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {request.rejected_at && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-destructive">
                  <span className="h-2 w-2 rounded-full bg-destructive"></span>
                  Request Rejected
                </h3>
                <Card className="border-destructive">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Rejected on</p>
                    <p className="font-semibold mb-3">
                      {new Date(request.rejected_at).toLocaleString()}
                    </p>
                    {request.rejection_reason && (
                      <>
                        <p className="text-sm text-muted-foreground mb-1">Reason</p>
                        <p className="text-sm">{request.rejection_reason}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RequestDetailsDialog;
