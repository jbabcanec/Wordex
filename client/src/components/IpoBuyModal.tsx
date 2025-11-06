import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatWB } from "@/lib/utils";
import { Flame, Clock, TrendingDown, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface IpoBuyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  word: {
    id: string;
    textNormalized: string;
    ipoCurrentPrice?: string;
    ipoSharesOffered?: number;
    ipoSharesSold?: number;
    ipoEndsAt?: Date | string | null;
  };
  userBalance: number;
}

function formatTimeRemaining(endsAt: Date | string): string {
  const end = new Date(endsAt);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return "Ended";
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function IpoBuyModal({ open, onOpenChange, word, userBalance }: IpoBuyModalProps) {
  const [shares, setShares] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentPrice = parseFloat(word.ipoCurrentPrice || "0");
  const numShares = parseInt(shares) || 0;
  const totalCost = numShares * currentPrice;
  const canAfford = totalCost <= userBalance;
  const sharesRemaining = (word.ipoSharesOffered || 0) - (word.ipoSharesSold || 0);

  const buyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/words/${word.id}/ipo/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: numShares }),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to buy IPO shares");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "IPO Purchase Successful!",
        description: `Bought ${numShares} shares of ${word.textNormalized} for ${formatWB(totalCost)} WB`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/words"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ipos/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      setShares("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBuy = () => {
    if (numShares <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid number of shares",
        variant: "destructive",
      });
      return;
    }
    if (numShares > sharesRemaining) {
      toast({
        title: "Not Enough Shares",
        description: `Only ${sharesRemaining} shares remaining`,
        variant: "destructive",
      });
      return;
    }
    if (!canAfford) {
      toast({
        title: "Insufficient Funds",
        description: "You don't have enough WB for this purchase",
        variant: "destructive",
      });
      return;
    }
    buyMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col sm:max-w-md max-h-[calc(100dvh-2rem)] p-0" data-testid="modal-ipo-buy">
        <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-md bg-blue-500/10 flex-shrink-0">
              <Flame className="h-5 w-5 text-blue-500" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="font-display text-lg sm:text-xl truncate">
                IPO: {word.textNormalized}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Dutch Auction - Price declining hourly
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="space-y-4 mt-4">
          {/* IPO Info */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-md bg-blue-500/5 border border-blue-500/20">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Current Price</div>
              <div className="font-mono font-bold text-lg text-blue-600 dark:text-blue-400">
                {formatWB(currentPrice)} WB
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Time Left
              </div>
              <div className="font-mono font-semibold text-sm">
                {word.ipoEndsAt ? formatTimeRemaining(word.ipoEndsAt) : "N/A"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Shares Left</div>
              <div className="font-mono font-semibold text-sm">
                {sharesRemaining.toLocaleString()} / {(word.ipoSharesOffered || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Your Balance</div>
              <div className="font-mono font-semibold text-sm">
                {formatWB(userBalance)} WB
              </div>
            </div>
          </div>

          {/* Price Warning */}
          <Alert className="bg-yellow-500/10 border-yellow-500/30">
            <TrendingDown className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            <AlertDescription className="text-xs">
              Price drops every hour. Early buyers pay more but secure shares.
            </AlertDescription>
          </Alert>

          {/* Buy Form */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="shares">Number of Shares</Label>
              <Input
                id="shares"
                type="number"
                min="1"
                max={sharesRemaining}
                placeholder="Enter shares to buy"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                data-testid="input-ipo-shares"
              />
            </div>

            {/* Cost Preview */}
            {numShares > 0 && (
              <div className="p-3 rounded-md bg-muted/50 border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Cost</span>
                  <span className="font-mono font-bold text-lg">
                    {formatWB(totalCost)} WB
                  </span>
                </div>
                {!canAfford && (
                  <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="h-3 w-3" />
                    Insufficient balance
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              data-testid="button-cancel-ipo"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBuy}
              disabled={buyMutation.isPending || !canAfford || numShares <= 0 || numShares > sharesRemaining}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              data-testid="button-confirm-ipo-buy"
            >
              {buyMutation.isPending ? "Processing..." : "Buy Shares"}
            </Button>
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
