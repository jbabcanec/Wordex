import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatWB } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, X, TrendingUp, TrendingDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Order {
  id: string;
  side: string;
  orderType: string;
  quantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  limitPrice: string | null;
  status: string;
  createdAt: string;
}

interface OrderWithWord {
  order: Order;
  word: {
    id: string;
    textNormalized: string;
    currentPrice: string;
  };
}

export function MyOrders() {
  const { toast } = useToast();

  const { data: orders, isLoading } = useQuery<OrderWithWord[]>({
    queryKey: ["/api/orders/my"],
    refetchInterval: 5000,
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to cancel order");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Order Cancelled",
        description: "Your order has been removed from the queue",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancel Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Open Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-20 rounded-md bg-muted/30 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Open Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 px-6">
            <div className="p-4 rounded-full bg-muted/30 w-fit mx-auto mb-4">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2 text-sm">No Open Orders</h3>
            <p className="text-xs text-muted-foreground">
              Your limit orders will appear here while they wait in the queue
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-display">Open Orders</CardTitle>
          <Badge variant="secondary">{orders.length} in queue</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {orders.map(({ order, word }) => (
          <div
            key={order.id}
            className="flex flex-col gap-2 p-3 rounded-md border bg-card"
            data-testid={`order-${order.id}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold tracking-wider text-sm truncate">
                    {word.textNormalized}
                  </span>
                  <Badge
                    variant={order.side === "BUY" ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {order.side === "BUY" ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {order.side}
                  </Badge>
                  {order.status === "PARTIALLY_FILLED" && (
                    <Badge variant="outline" className="text-xs">
                      Partial
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <div>
                    {order.orderType} @ {formatWB(order.limitPrice || "0")} WB/share
                  </div>
                  <div>
                    {order.remainingQuantity.toLocaleString()} of{" "}
                    {order.quantity.toLocaleString()} shares waiting
                    {order.filledQuantity > 0 && (
                      <span className="text-green-600 dark:text-green-400">
                        {" "}
                        ({order.filledQuantity} filled)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(order.createdAt), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono font-semibold text-sm mb-2">
                  {formatWB(
                    parseFloat(order.limitPrice || "0") * order.remainingQuantity
                  )}{" "}
                  WB
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => cancelOrderMutation.mutate(order.id)}
                  disabled={cancelOrderMutation.isPending}
                  data-testid={`button-cancel-${order.id}`}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>

            {order.side === "SELL" && (
              <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
                💡 Your shares are locked until this order fills or is cancelled
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
