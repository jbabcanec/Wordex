import { useQuery } from "@tanstack/react-query";
import { formatWB, formatPercentage } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortfolioHolding {
  word: {
    id: string;
    textNormalized: string;
    intrinsicValue: string;
  };
  quantity: number;
  costBasis: string;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
}

export function Portfolio() {
  const { data: holdings, isLoading } = useQuery<PortfolioHolding[]>({
    queryKey: ["/api/portfolio"],
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Your Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-md bg-muted/30 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!holdings || holdings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Your Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 px-6">
            <div className="p-4 rounded-full bg-muted/30 w-fit mx-auto mb-4">
              <Wallet className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">Build Your Position</h3>
            <p className="text-sm text-muted-foreground">
              Your portfolio will track all your word holdings, cost basis, and profits.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalCost = holdings.reduce((sum, h) => sum + parseFloat(h.costBasis), 0);
  const totalProfitLoss = totalValue - totalCost;
  const totalProfitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Your Portfolio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4 rounded-md bg-muted/30">
          <div>
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Total Value
            </div>
            <div className="font-mono font-bold text-base sm:text-lg">
              {formatWB(totalValue)} WB
            </div>
          </div>
          <div>
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Cost Basis
            </div>
            <div className="font-mono font-bold text-base sm:text-lg">
              {formatWB(totalCost)} WB
            </div>
          </div>
          <div>
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Profit/Loss
            </div>
            <div
              className={cn(
                "font-mono font-bold text-base sm:text-lg flex items-center gap-1 flex-wrap",
                totalProfitLoss >= 0 ? "text-gain" : "text-loss"
              )}
            >
              {totalProfitLoss >= 0 ? (
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
              ) : (
                <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
              <span className="truncate">{formatWB(Math.abs(totalProfitLoss))} WB</span>
              <span className="text-xs sm:text-sm">
                ({formatPercentage(totalProfitLossPercent)})
              </span>
            </div>
          </div>
        </div>

        {/* Holdings List */}
        <div className="space-y-2">
          {holdings.map((holding) => (
            <div
              key={holding.word.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-md border bg-card hover-elevate gap-2"
              data-testid={`holding-${holding.word.textNormalized}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold tracking-wider text-sm sm:text-base truncate">
                    {holding.word.textNormalized}
                  </span>
                  <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                    {holding.quantity.toLocaleString()} shares
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Avg cost: {formatWB(parseFloat(holding.costBasis) / holding.quantity)} WB/share
                </div>
              </div>

              <div className="text-right sm:text-left flex sm:flex-col justify-between sm:justify-start">
                <div className="font-mono font-semibold">
                  {formatWB(holding.currentValue)} WB
                </div>
                <div
                  className={cn(
                    "text-xs font-mono flex items-center gap-1 justify-end",
                    holding.profitLoss >= 0 ? "text-gain" : "text-loss"
                  )}
                >
                  {holding.profitLoss >= 0 ? "+" : ""}
                  {formatWB(holding.profitLoss)} WB ({formatPercentage(holding.profitLossPercent)})
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
