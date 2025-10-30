import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatWB, formatPercentage } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TickerWord {
  id: string;
  textNormalized: string;
  currentPrice: string;
  change24h: number;
}

export function StockTicker() {
  const { data: words, isLoading } = useQuery<TickerWord[]>({
    queryKey: ["/api/words/trending"],
    refetchInterval: 5000, // Update every 5 seconds
  });

  if (isLoading || !words || words.length === 0) {
    return (
      <div className="h-12 border-b bg-muted/30 flex items-center justify-center px-4">
        <div className="text-sm text-muted-foreground">
          {isLoading ? "Loading market data..." : "Market opening soon — be the first to submit a word"}
        </div>
      </div>
    );
  }

  return (
    <div className="h-12 border-b bg-card relative">
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />
      
      <div 
        className="flex items-center h-full overflow-x-auto scrollbar-hide"
        data-testid="stock-ticker-scroll"
      >
        {words.map((word) => (
          <div
            key={word.id}
            className="flex items-center gap-3 px-6 whitespace-nowrap border-r border-border/50 flex-shrink-0"
            data-testid={`ticker-word-${word.id}`}
          >
            <span className="font-mono font-semibold text-sm tracking-wider">
              {word.textNormalized}
            </span>
            <span className="font-mono text-sm">
              {formatWB(word.currentPrice)} WB
            </span>
            <span
              className={cn(
                "flex items-center gap-1 text-xs font-mono font-medium",
                word.change24h >= 0 ? "text-gain" : "text-loss"
              )}
              data-testid={`ticker-change-${word.id}`}
            >
              {word.change24h >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {formatPercentage(word.change24h)}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
