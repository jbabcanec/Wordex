import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Clock, CheckCircle2, XCircle, Flame } from "lucide-react";
import { formatWB, formatPercentage } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TradeModal } from "./TradeModal";
import { IpoBuyModal } from "./IpoBuyModal";

interface WordCardProps {
  word: {
    id: string;
    textNormalized: string;
    currentPrice: string;
    ipoStatus: string;
    ipoCurrentPrice?: string;
    ipoSharesOffered?: number;
    ipoSharesSold?: number;
    ipoEndsAt?: Date | string;
    outstandingShares?: number;
    totalShares: number;
    change24h?: number;
  };
  userBalance: number;
  userShares: number;
  compact?: boolean;
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

export function WordCard({ word, userBalance, userShares, compact = false }: WordCardProps) {
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [ipoBuyModalOpen, setIpoBuyModalOpen] = useState(false);

  const isIpoActive = word.ipoStatus === 'IPO_ACTIVE';
  const isTrading = word.ipoStatus === 'TRADING';
  const isFailed = word.ipoStatus === 'IPO_FAILED';

  const change = word.change24h ?? 0;
  const isPositive = change > 0;
  const isNegative = change < 0;

  // IPO progress
  const ipoProgress = isIpoActive && word.ipoSharesOffered && word.ipoSharesSold 
    ? (word.ipoSharesSold / word.ipoSharesOffered) * 100 
    : 0;

  if (compact) {
    return (
      <>
        <div
          className={cn(
            "flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-md border bg-card hover-elevate cursor-pointer gap-3",
            isIpoActive && "border-blue-500/30 bg-blue-500/5",
            isFailed && "border-red-500/30 bg-red-500/5 opacity-60"
          )}
          onClick={() => {
            if (isIpoActive) {
              setIpoBuyModalOpen(true);
            } else if (isTrading) {
              setTradeModalOpen(true);
            }
          }}
          data-testid={`word-card-${word.textNormalized}`}
        >
          <div className="flex items-center justify-between sm:justify-start gap-3 flex-1">
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm sm:text-base tracking-wider truncate">
                  {word.textNormalized}
                </span>
                {isIpoActive && <Badge variant="secondary" className="bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] px-1.5 py-0"><Flame className="h-3 w-3 mr-0.5" />IPO</Badge>}
                {isTrading && <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-300 text-[10px] px-1.5 py-0"><CheckCircle2 className="h-3 w-3 mr-0.5" />Live</Badge>}
                {isFailed && <Badge variant="destructive" className="text-[10px] px-1.5 py-0"><XCircle className="h-3 w-3 mr-0.5" />Failed</Badge>}
              </div>
              <span className="text-xs text-muted-foreground">
                {isIpoActive 
                  ? `${word.ipoSharesSold || 0}/${word.ipoSharesOffered || 0} sold`
                  : `${(word.outstandingShares || 0).toLocaleString()} / ${word.totalShares.toLocaleString()} shares`
                }
              </span>
            </div>
            
            <div className="text-right sm:hidden">
              <div className="font-mono font-semibold text-sm">
                {isIpoActive ? formatWB(word.ipoCurrentPrice || '0') : formatWB(word.currentPrice)} WB
              </div>
              {isIpoActive && word.ipoEndsAt && (
                <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 justify-end">
                  <Clock className="h-3 w-3" />
                  {formatTimeRemaining(word.ipoEndsAt)}
                </div>
              )}
              {isTrading && word.change24h !== undefined && (
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
                {isIpoActive ? formatWB(word.ipoCurrentPrice || '0') : formatWB(word.currentPrice)} WB
              </div>
              {isIpoActive && word.ipoEndsAt && (
                <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 justify-end">
                  <Clock className="h-3 w-3" />
                  {formatTimeRemaining(word.ipoEndsAt)}
                </div>
              )}
              {isTrading && word.change24h !== undefined && (
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

            {isIpoActive && (
              <Button 
                size="sm"
                variant="default"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={(e) => { e.stopPropagation(); setIpoBuyModalOpen(true); }} 
                data-testid={`button-buy-ipo-${word.textNormalized}`}
              >
                Buy IPO
              </Button>
            )}
            {isTrading && (
              <Button 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); setTradeModalOpen(true); }} 
                data-testid={`button-trade-${word.textNormalized}`}
              >
                Trade
              </Button>
            )}
            {isFailed && (
              <Button 
                size="sm" 
                variant="ghost"
                disabled
                data-testid={`button-failed-${word.textNormalized}`}
              >
                Failed
              </Button>
            )}
          </div>

          {/* IPO Progress Bar */}
          {isIpoActive && (
            <div className="w-full sm:hidden">
              <Progress value={ipoProgress} className="h-1.5" />
            </div>
          )}
        </div>

        {isIpoActive && (
          <IpoBuyModal
            open={ipoBuyModalOpen}
            onOpenChange={setIpoBuyModalOpen}
            word={word}
            userBalance={userBalance}
          />
        )}

        {isTrading && (
          <TradeModal
            open={tradeModalOpen}
            onOpenChange={setTradeModalOpen}
            word={word}
            userBalance={userBalance}
            userShares={userShares}
          />
        )}
      </>
    );
  }

  // Full card view
  return (
    <>
      <Card 
        className={cn(
          "hover-elevate cursor-pointer",
          isIpoActive && "border-2 border-blue-500/30 bg-blue-500/5",
          isFailed && "border-red-500/30 bg-red-500/5 opacity-60"
        )}
        onClick={() => {
          if (isIpoActive) {
            setIpoBuyModalOpen(true);
          } else if (isTrading) {
            setTradeModalOpen(true);
          }
        }}
        data-testid={`word-card-${word.textNormalized}`}
      >
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-mono font-bold text-2xl tracking-wider">
                    {word.textNormalized}
                  </h3>
                  {isIpoActive && <Badge className="bg-blue-600 hover:bg-blue-700"><Flame className="h-3 w-3 mr-1" />IPO LIVE</Badge>}
                  {isTrading && <Badge className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Trading</Badge>}
                  {isFailed && <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />IPO Failed</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {isIpoActive 
                    ? `${word.ipoSharesSold || 0} of ${word.ipoSharesOffered || 0} IPO shares sold`
                    : `${(word.outstandingShares || 0).toLocaleString()} of ${word.totalShares.toLocaleString()} shares outstanding`
                  }
                </p>
                {isIpoActive && (
                  <Progress value={ipoProgress} className="h-2 w-48" />
                )}
              </div>
              {isTrading && word.change24h !== undefined && (
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
                  {isIpoActive ? "IPO Price" : "Current Price"}
                </div>
                <div className="font-mono font-bold text-3xl">
                  {isIpoActive ? formatWB(word.ipoCurrentPrice || '0') : formatWB(word.currentPrice)} WB
                </div>
                {isIpoActive && word.ipoEndsAt && (
                  <div className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 mt-2">
                    <Clock className="h-4 w-4" />
                    Ends in {formatTimeRemaining(word.ipoEndsAt)}
                  </div>
                )}
              </div>

              {isIpoActive && (
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={(e) => { e.stopPropagation(); setIpoBuyModalOpen(true); }} 
                  data-testid={`button-buy-ipo-${word.textNormalized}`}
                >
                  Buy IPO Shares
                </Button>
              )}
              {isTrading && (
                <Button 
                  onClick={(e) => { e.stopPropagation(); setTradeModalOpen(true); }} 
                  data-testid={`button-trade-${word.textNormalized}`}
                >
                  Trade Now
                </Button>
              )}
              {isFailed && (
                <Button variant="ghost" disabled data-testid={`button-failed-${word.textNormalized}`}>
                  IPO Failed
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isIpoActive && (
        <IpoBuyModal
          open={ipoBuyModalOpen}
          onOpenChange={setIpoBuyModalOpen}
          word={word}
          userBalance={userBalance}
        />
      )}

      {isTrading && (
        <TradeModal
          open={tradeModalOpen}
          onOpenChange={setTradeModalOpen}
          word={word}
          userBalance={userBalance}
          userShares={userShares}
        />
      )}
    </>
  );
}
