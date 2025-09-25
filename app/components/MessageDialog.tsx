// components/MessageDialog.tsx
"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";

interface MessageDialogProps {
  open: boolean;
  title?: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

const MessageDialog = ({
  open,
  title = "הודעה",
  message,
  onConfirm,
  onCancel,
  confirmText = "המשך",
  cancelText = "בטל",
}: MessageDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="text-center">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="text-gray-700 text-lg mb-4">{message}</div>
        <div className="flex justify-center gap-4">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              {cancelText}
            </Button>
          )}
          {onConfirm && <Button onClick={onConfirm}>{confirmText}</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessageDialog;
