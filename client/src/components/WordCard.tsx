import { useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatWB, formatPercentage } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TradeModal } from "./TradeModal";

interface WordCardProps {
  word: {
    id: string;
    textNormalized: string;
    intrinsicValue: string;
    sharesOutstanding: number;
    totalShares: number;
    change24h?: number;
  };
  userBalance: number;
  userShares: number;
  compact?: boolean;
}

export function WordCard({ word, userBalance, userShares, compact = false }: WordCardProps) {
  const [tradeModalOpen, setTradeModalOpen] = useState(false);

  const change = word.change24h ?? 0;
  const isPositive = change > 0;
  const isNegative = change < 0;

  if (compact) {
    return (
      <>
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-md border bg-card hover-elevate cursor-pointer gap-3"
          onClick={() => setTradeModalOpen(true)}
          data-testid={`word-card-${word.textNormalized}`}
        >
          <div className="flex items-center justify-between sm:justify-start gap-3 flex-1">
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-mono font-bold text-sm sm:text-base tracking-wider truncate">
                {word.textNormalized}
              </span>
              <span className="text-xs text-muted-foreground">
                {word.sharesOutstanding.toLocaleString()} / {word.totalShares.toLocaleString()} shares
              </span>
            </div>
            
            <div className="text-right sm:hidden">
              <div className="font-mono font-semibold text-sm">
                {formatWB(word.intrinsicValue)} WB
              </div>
              {word.change24h !== undefined && (
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs font-mono justify-end",
                    isPositive ? "text-gain" : isNegative ? "text-loss" : "text-muted-foreground"
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : isNegative ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  {formatPercentage(change)}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right hidden sm:block">
              <div className="font-mono font-semibold">
                {formatWB(word.intrinsicValue)} WB
              </div>
              {word.change24h !== undefined && (
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs font-mono justify-end",
                    isPositive ? "text-gain" : isNegative ? "text-loss" : "text-muted-foreground"
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : isNegative ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  {formatPercentage(change)}
                </div>
              )}
            </div>

            <Button 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); setTradeModalOpen(true); }} 
              data-testid={`button-trade-${word.textNormalized}`}
              className="w-full sm:w-auto"
            >
              Trade
            </Button>
          </div>
        </div>

        <TradeModal
          open={tradeModalOpen}
          onOpenChange={setTradeModalOpen}
          word={word}
          userBalance={userBalance}
          userShares={userShares}
        />
      </>
    );
  }

  return (
    <>
      <Card className="hover-elevate cursor-pointer" onClick={() => setTradeModalOpen(true)} data-testid={`word-card-${word.textNormalized}`}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-mono font-bold text-2xl tracking-wider">
                  {word.textNormalized}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {word.sharesOutstanding.toLocaleString()} of {word.totalShares.toLocaleString()} shares outstanding
                </p>
              </div>
              {word.change24h !== undefined && (
                <div
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-sm font-mono font-medium",
                    isPositive ? "bg-gain/10 text-gain" : isNegative ? "bg-loss/10 text-loss" : "bg-muted text-muted-foreground"
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : isNegative ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : (
                    <Minus className="h-4 w-4" />
                  )}
                  {formatPercentage(change)}
                </div>
              )}
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Intrinsic Value
                </div>
                <div className="font-mono font-bold text-3xl">
                  {formatWB(word.intrinsicValue)} WB
                </div>
              </div>

              <Button onClick={(e) => { e.stopPropagation(); setTradeModalOpen(true); }} data-testid={`button-trade-${word.textNormalized}`}>
                Trade Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <TradeModal
        open={tradeModalOpen}
        onOpenChange={setTradeModalOpen}
        word={word}
        userBalance={userBalance}
        userShares={userShares}
      />
    </>
  );
}
