import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatWB } from "@/lib/utils";
import { TRADING_FEE_PERCENT } from "@shared/constants";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, TrendingDown, AlertCircle, Zap } from "lucide-react";

interface TradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  word: {
    id: string;
    textNormalized: string;
    currentPrice: string;
    outstandingShares?: number;
    totalShares: number;
  };
  userBalance: number;
  userShares: number;
}

interface OrderBookEntry {
  price: string;
  totalShares: number;
}

interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export function TradeModal({ open, onOpenChange, word, userBalance, userShares }: TradeModalProps) {
  const [orderType, setOrderType] = useState<"limit" | "market">("market");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [shares, setShares] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const { toast } = useToast();

  // Fetch order book
  const { data: orderBook } = useQuery<OrderBook>({
    queryKey: [`/api/words/${word.id}/orderbook`],
    enabled: open,
    refetchInterval: 5000,
  });

  const numShares = parseInt(shares) || 0;
  const limitPriceNum = parseFloat(limitPrice) || 0;

  // Calculate order book data
  const bestBid = orderBook?.bids?.[0]?.price ? parseFloat(orderBook.bids[0].price) : 0;
  const bestAsk = orderBook?.asks?.[0]?.price ? parseFloat(orderBook.asks[0].price) : 0;
  const spread = bestAsk && bestBid ? bestAsk - bestBid : 0;
  const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0;

  // Use limit price for limit orders, market price for market orders
  const estimatedPrice = orderType === "limit"
    ? limitPriceNum
    : (side === "buy" ? bestAsk : bestBid);
  const estimatedCost = numShares * estimatedPrice;
  const fee = estimatedCost * TRADING_FEE_PERCENT;
  const totalCost = side === "buy" ? estimatedCost + fee : estimatedCost - fee;

  // Auto-switch to limit order if market order becomes unavailable
  useEffect(() => {
    if (orderType === "market" && (side === "buy" ? !bestAsk : !bestBid)) {
      setOrderType("limit");
    }
  }, [orderType, side, bestAsk, bestBid]);

  const canAffordMarket = side === "buy" ? totalCost <= userBalance : numShares <= userShares;
  const canAffordLimit = side === "buy"
    ? (numShares * limitPriceNum * (1 + TRADING_FEE_PERCENT)) <= userBalance
    : numShares <= userShares;

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordId: word.id,
          side: side.toUpperCase(),
          orderType: orderType.toUpperCase(),
          quantity: numShares,
          limitPrice: orderType === "limit" ? limitPriceNum : undefined,
        }),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create order");
      }
      return response.json();
    },
    onSuccess: (data) => {
      const { matched, order } = data;
      if (matched && matched.length > 0) {
        toast({
          title: "Order Executed!",
          description: `${side === "buy" ? "Bought" : "Sold"} ${matched.reduce((sum: number, m: any) => sum + m.shares, 0)} shares`,
        });
      } else if (order) {
        toast({
          title: "Order Placed",
          description: `Limit ${side} order for ${numShares} shares at ${formatWB(limitPriceNum)} WB`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/words"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
      setShares("");
      setLimitPrice("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Order Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (numShares <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid number of shares",
        variant: "destructive",
      });
      return;
    }

    if (orderType === "limit" && limitPriceNum <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid limit price",
        variant: "destructive",
      });
      return;
    }

    if (side === "buy" && orderType === "market" && !canAffordMarket) {
      toast({
        title: "Insufficient Funds",
        description: "You don't have enough WB for this purchase",
        variant: "destructive",
      });
      return;
    }

    if (side === "buy" && orderType === "limit" && !canAffordLimit) {
      toast({
        title: "Insufficient Funds",
        description: "You don't have enough WB for this limit order",
        variant: "destructive",
      });
      return;
    }

    if (side === "sell" && numShares > userShares) {
      toast({
        title: "Insufficient Shares",
        description: `You only have ${userShares} shares`,
        variant: "destructive",
      });
      return;
    }

    createOrderMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col sm:max-w-2xl max-h-[calc(100dvh-2rem)] p-0" data-testid="modal-trade">
        <DialogHeader className="flex-shrink-0 px-6 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="font-display text-2xl font-bold tracking-wide">
                {word.textNormalized}
              </DialogTitle>
              <DialogDescription className="text-sm mt-1">
                {(word.outstandingShares || 0).toLocaleString()} / {word.totalShares.toLocaleString()} shares outstanding
              </DialogDescription>
            </div>
            {bestBid > 0 && bestAsk > 0 && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Spread</div>
                <div className="font-mono font-semibold text-sm">
                  {formatWB(spread)} <span className="text-xs text-muted-foreground">({spreadPercent.toFixed(2)}%)</span>
                </div>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* Order Book */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Order Book
            </h3>
            
            <div className="border rounded-md overflow-hidden">
              {/* Asks (Sell Orders) */}
              <div className="bg-red-500/5 p-2 space-y-0.5 max-h-32 overflow-y-auto">
                <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Asks (Sellers)
                </div>
                {orderBook?.asks && orderBook.asks.length > 0 ? (
                  orderBook.asks.slice(0, 5).reverse().map((ask, i) => (
                    <div key={i} className="flex justify-between text-xs font-mono">
                      <span className="text-red-600 dark:text-red-400">{formatWB(ask.price)}</span>
                      <span className="text-muted-foreground">{ask.totalShares}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground italic">No sellers - Use limit order to be first!</div>
                )}
              </div>

              {/* Current Price */}
              <div className="bg-muted/50 p-2 border-y">
                <div className="text-xs text-muted-foreground mb-0.5">Last Price</div>
                <div className="font-mono font-bold text-lg">{formatWB(word.currentPrice)}</div>
              </div>

              {/* Bids (Buy Orders) */}
              <div className="bg-green-500/5 p-2 space-y-0.5 max-h-32 overflow-y-auto">
                <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  Bids (Buyers)
                </div>
                {orderBook?.bids && orderBook.bids.length > 0 ? (
                  orderBook.bids.slice(0, 5).map((bid, i) => (
                    <div key={i} className="flex justify-between text-xs font-mono">
                      <span className="text-green-600 dark:text-green-400">{formatWB(bid.price)}</span>
                      <span className="text-muted-foreground">{bid.totalShares}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground italic">No buyers - Use limit order to be first!</div>
                )}
              </div>
            </div>
          </div>

          {/* Order Form */}
          <div className="space-y-4">
            <Tabs value={side} onValueChange={(v) => setSide(v as "buy" | "sell")}>
              <TabsList className="grid w-full grid-cols-2 h-12 sm:h-10">
                <TabsTrigger value="buy" className="data-[state=active]:bg-green-600 data-[state=active]:text-white min-h-[44px] sm:min-h-0" data-testid="tab-buy">
                  Buy
                </TabsTrigger>
                <TabsTrigger value="sell" className="data-[state=active]:bg-red-600 data-[state=active]:text-white min-h-[44px] sm:min-h-0" data-testid="tab-sell">
                  Sell
                </TabsTrigger>
              </TabsList>

              <TabsContent value={side} className="space-y-4 mt-4">
                {/* Order Type */}
                <div className="space-y-2">
                  <Label>Order Type</Label>
                  <Select value={orderType} onValueChange={(v) => setOrderType(v as "limit" | "market")}>
                    <SelectTrigger data-testid="select-order-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="market" disabled={side === "buy" ? !bestAsk : !bestBid}>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <Zap className="h-3 w-3" />
                            Market Order {(side === "buy" ? !bestAsk : !bestBid) && "(Unavailable)"}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {(side === "buy" ? !bestAsk : !bestBid)
                              ? `No ${side === "buy" ? "sellers" : "buyers"} available`
                              : `Trade instantly at current price`}
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="limit">
                        <div className="flex flex-col">
                          <span>Limit Order</span>
                          <span className="text-[10px] text-muted-foreground">Set your price, wait for match (recommended)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {orderType === "market"
                      ? "⚡ Instant trade at best available price"
                      : "⏱️ Trade executes when someone matches your price"}
                  </p>
                </div>

                {/* Shares */}
                <div className="space-y-2">
                  <Label htmlFor="shares">Shares</Label>
                  <Input
                    id="shares"
                    type="number"
                    min="1"
                    placeholder="Enter shares"
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                    className="font-mono"
                    data-testid="input-shares"
                  />
                  <div className="text-xs text-muted-foreground">
                    {side === "buy" ? `Balance: ${formatWB(userBalance)} WB` : `You have: ${userShares} shares`}
                  </div>
                </div>

                {/* Limit Price (only for limit orders) */}
                {orderType === "limit" && (
                  <div className="space-y-2">
                    <Label htmlFor="limit-price">Limit Price (per share)</Label>
                    <Input
                      id="limit-price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Enter price"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      className="font-mono"
                      data-testid="input-limit-price"
                    />
                  </div>
                )}

                {/* Order Preview */}
                {numShares > 0 && (
                  <div className="p-3 rounded-md bg-muted/50 border space-y-2">
                    <div className="text-xs font-semibold">Order Summary</div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {orderType === "market" ? "Est. Price" : "Limit Price"}
                      </span>
                      <span className="font-mono">
                        {orderType === "market" ? formatWB(estimatedPrice) : formatWB(limitPriceNum)} WB
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shares</span>
                      <span className="font-mono">{numShares}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-mono">
                        {orderType === "market" ? formatWB(estimatedCost) : formatWB(numShares * limitPriceNum)} WB
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fee ({(TRADING_FEE_PERCENT * 100).toFixed(1)}%)</span>
                      <span className="font-mono">{formatWB(fee)} WB</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="font-mono text-lg">
                        {side === "buy" ? "+" : "-"}{formatWB(Math.abs(totalCost))} WB
                      </span>
                    </div>

                    {orderType === "market" && (side === "buy" ? !bestAsk : !bestBid) && (
                      <Alert className="bg-yellow-500/10 border-yellow-500/30">
                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                        <AlertDescription className="text-xs">
                          No {side === "buy" ? "sellers" : "buyers"} available. Place a limit order instead.
                        </AlertDescription>
                      </Alert>
                    )}

                    {orderType === "limit" && (
                      <Alert className="bg-blue-500/10 border-blue-500/30">
                        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                        <AlertDescription className="text-xs">
                          {side === "buy"
                            ? "Your buy order will be filled when a seller matches your price."
                            : "Your sell order will be filled when a buyer matches your price."}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="flex-1"
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      createOrderMutation.isPending ||
                      numShares <= 0 ||
                      (orderType === "limit" && limitPriceNum <= 0) ||
                      (orderType === "market" && !canAffordMarket) ||
                      (orderType === "limit" && !canAffordLimit)
                    }
                    className={side === "buy" ? "flex-1 bg-green-600 hover:bg-green-700" : "flex-1 bg-red-600 hover:bg-red-700"}
                    data-testid="button-submit-order"
                  >
                    {createOrderMutation.isPending
                      ? "Processing..."
                      : orderType === "market"
                      ? `${side === "buy" ? "Buy" : "Sell"} Now`
                      : `Place ${side === "buy" ? "Buy" : "Sell"} Order`}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BarChart3({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
}
