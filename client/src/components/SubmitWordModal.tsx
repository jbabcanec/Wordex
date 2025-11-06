import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { normalizeWord } from "@/lib/utils";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

interface SubmitWordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmitWordModal({ open, onOpenChange }: SubmitWordModalProps) {
  const [wordInput, setWordInput] = useState("");
  const { toast } = useToast();

  const submitWordMutation = useMutation({
    mutationFn: async (text: string) => {
      return await apiRequest("POST", "/api/words", { text });
    },
    onSuccess: () => {
      toast({
        title: "IPO Launched!",
        description: "Your word is now in a 24-hour Dutch auction. You'll receive 20 creator shares that vest over 60 days.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/words/top"] });
      queryClient.invalidateQueries({ queryKey: ["/api/words/trending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ipos/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      setWordInput("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const normalizedWord = normalizeWord(wordInput);
  const costInWB = 50;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wordInput.trim()) return;
    if (normalizedWord.length === 0) {
      toast({
        title: "Invalid Word",
        description: "Please enter a valid word.",
        variant: "destructive",
      });
      return;
    }
    submitWordMutation.mutate(wordInput);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[calc(100dvh-2rem)] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <DialogTitle className="font-display text-xl sm:text-2xl">Submit a Word</DialogTitle>
          <DialogDescription className="text-sm">
            Submit any word to the marketplace. Cost: {costInWB} WB
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 pb-4">
          <div className="space-y-2 sm:space-y-3">
            <Label htmlFor="word" className="text-sm font-medium">
              Word or Phrase
            </Label>
            <Input
              id="word"
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              placeholder="Enter any word..."
              className="text-base sm:text-lg font-mono uppercase"
              maxLength={100}
              autoFocus
              data-testid="input-submit-word"
            />
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <div>
                Words are automatically converted to ALL CAPS with no spaces.
                {normalizedWord && (
                  <div className="mt-1 font-mono font-semibold text-foreground">
                    Preview: {normalizedWord}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-md bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Submission Fee</span>
              <span className="font-mono font-medium">-{costInWB}.00 WB</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Creator Shares (Vesting)</span>
              <span className="font-mono font-medium text-gain">+20 shares</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-sm font-medium">
                <span>IPO Details</span>
                <span className="font-mono">980 shares @ $2.00→$0.10</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              24-hour Dutch auction. Your 20 shares vest over 60 days.
            </div>
          </div>

          </form>
        </div>

        <div className="flex-shrink-0 bg-background border-t px-6 py-4">
          <div className="flex gap-2 sm:gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-submit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!wordInput.trim() || submitWordMutation.isPending}
              data-testid="button-confirm-submit"
            >
              {submitWordMutation.isPending ? "Submitting..." : `Submit Word`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
