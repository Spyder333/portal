import { useState } from "react";
import { LocalUser, createRequest, addDocument } from "@/lib/db";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface SubmitRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: LocalUser;
  onSuccess: () => void;
}

const SubmitRequestDialog = ({ open, onOpenChange, user, onSuccess }: SubmitRequestDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    school_name: user.school_name ?? "",
    term: "",
    year: new Date().getFullYear(),
    total_amount: "",
    number_of_students: "",
    fee_type: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const requestId = await createRequest({
        school_id: user.id,
        school_name: formData.school_name,
        term: formData.term,
        year: formData.year,
        total_amount: parseFloat(formData.total_amount),
        number_of_students: parseInt(formData.number_of_students, 10),
        fee_type: formData.fee_type,
        description: formData.description,
      });

      for (const f of files) {
        await addDocument(requestId, f);
      }

      toast.success("Fee request submitted successfully!");
      onSuccess();
      setFormData({
        school_name: user.school_name ?? "",
        term: "",
        year: new Date().getFullYear(),
        total_amount: "",
        number_of_students: "",
        fee_type: "",
        description: "",
      });
      setFiles([]);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Fee Approval Request</DialogTitle>
          <DialogDescription>Fill in the details for the fee approval request</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="school_name">School Name</Label>
              <Input
                id="school_name"
                value={formData.school_name}
                onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee_type">Fee Type</Label>
              <Select value={formData.fee_type} onValueChange={(value) => setFormData({ ...formData, fee_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fee type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tuition Fees">Tuition Fees</SelectItem>
                  <SelectItem value="Examination Fees">Examination Fees</SelectItem>
                  <SelectItem value="Development Levy">Development Levy</SelectItem>
                  <SelectItem value="Sports Levy">Sports Levy</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="term">Term</Label>
              <Select value={formData.term} onValueChange={(value) => setFormData({ ...formData, term: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Term 1">Term 1</SelectItem>
                  <SelectItem value="Term 2">Term 2</SelectItem>
                  <SelectItem value="Term 3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value, 10) })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_amount">Total Amount ($)</Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number_of_students">Number of Students</Label>
              <Input
                id="number_of_students"
                type="number"
                value={formData.number_of_students}
                onChange={(e) => setFormData({ ...formData, number_of_students: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="documents">Supporting Documents (optional)</Label>
            <Input
              id="documents"
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
            {files.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {files.length} file(s) selected: {files.map((f) => f.name).join(", ")}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SubmitRequestDialog;
