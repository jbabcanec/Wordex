import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatWB, calculateTradePrice, calculateFee } from "@/lib/utils";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface TradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  word: {
    id: string;
    textNormalized: string;
    intrinsicValue: string;
    sharesOutstanding: number;
    totalShares: number;
  };
  userBalance: number;
  userShares: number;
}

export function TradeModal({ open, onOpenChange, word, userBalance, userShares }: TradeModalProps) {
  const [quantity, setQuantity] = useState("");
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const { toast } = useToast();

  const tradeMutation = useMutation({
    mutationFn: async (data: { wordId: string; quantity: number; action: "buy" | "sell" }) => {
      return await apiRequest("POST", "/api/trade", data);
    },
    onSuccess: (data) => {
      toast({
        title: "Trade Successful",
        description: `Transaction completed. Receipt #${data.receiptId.slice(0, 8)}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/words/top"] });
      queryClient.invalidateQueries({ queryKey: ["/api/words/trending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setQuantity("");
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
        title: "Trade Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const intrinsicValue = parseFloat(word.intrinsicValue);
  const quantityNum = parseInt(quantity) || 0;
  const isBuy = activeTab === "buy";
  const pricePerShare = calculateTradePrice(intrinsicValue, isBuy);
  const subtotal = pricePerShare * quantityNum;
  const fee = calculateFee(subtotal);
  const total = subtotal + fee;

  const availableShares = isBuy 
    ? word.totalShares - word.sharesOutstanding // Platform's remaining shares
    : userShares; // User's shares

  const canTrade = quantityNum > 0 && quantityNum <= availableShares && (!isBuy || total <= userBalance);

  const handleTrade = () => {
    if (!canTrade) return;
    tradeMutation.mutate({
      wordId: word.id,
      quantity: quantityNum,
      action: activeTab,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-bold tracking-wide">
            {word.textNormalized}
          </DialogTitle>
          <DialogDescription>
            Intrinsic Value: {formatWB(intrinsicValue)} WB
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "buy" | "sell")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy" data-testid="tab-buy">Buy</TabsTrigger>
            <TabsTrigger value="sell" data-testid="tab-sell">Sell</TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-4 mt-6">
            <div className="space-y-3">
              <Label htmlFor="buy-quantity">Quantity (shares)</Label>
              <Input
                id="buy-quantity"
                type="number"
                min="1"
                max={availableShares}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="font-mono text-lg"
                data-testid="input-quantity"
              />
              <div className="text-xs text-muted-foreground">
                Available from platform: {availableShares.toLocaleString()} shares
              </div>
            </div>

            <div className="rounded-md bg-muted/30 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price per share</span>
                <span className="font-mono">{formatWB(pricePerShare)} WB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{formatWB(subtotal)} WB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fee (0.5%)</span>
                <span className="font-mono">{formatWB(fee)} WB</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-medium">
                  <span>Total Cost</span>
                  <span className="font-mono text-lg">{formatWB(total)} WB</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Your balance: {formatWB(userBalance)} WB
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sell" className="space-y-4 mt-6">
            <div className="space-y-3">
              <Label htmlFor="sell-quantity">Quantity (shares)</Label>
              <Input
                id="sell-quantity"
                type="number"
                min="1"
                max={availableShares}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="font-mono text-lg"
                data-testid="input-quantity"
              />
              <div className="text-xs text-muted-foreground">
                You own: {userShares.toLocaleString()} shares
              </div>
            </div>

            <div className="rounded-md bg-muted/30 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price per share</span>
                <span className="font-mono">{formatWB(pricePerShare)} WB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{formatWB(subtotal)} WB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fee (0.5%)</span>
                <span className="font-mono">-{formatWB(fee)} WB</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-medium">
                  <span>You Receive</span>
                  <span className="font-mono text-lg text-gain">+{formatWB(subtotal - fee)} WB</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-trade"
          >
            Cancel
          </Button>
          <Button
            onClick={handleTrade}
            disabled={!canTrade || tradeMutation.isPending}
            data-testid="button-confirm-trade"
          >
            {tradeMutation.isPending 
              ? "Processing..." 
              : isBuy 
                ? `Buy ${quantityNum || 0} Shares` 
                : `Sell ${quantityNum || 0} Shares`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
