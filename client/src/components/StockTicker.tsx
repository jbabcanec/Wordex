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

  // Duplicate words for seamless scrolling
  const tickerWords = [...words, ...words];

  return (
    <div className="h-12 border-b bg-card overflow-hidden relative">
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-card to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-card to-transparent z-10" />
      
      <div className="flex items-center h-full animate-scroll-slow">
        {tickerWords.map((word, index) => (
          <div
            key={`${word.id}-${index}`}
            className="flex items-center gap-3 px-6 whitespace-nowrap border-r border-border/50"
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
        @keyframes scroll-slow {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll-slow {
          animation: scroll-slow 60s linear infinite;
        }
      `}</style>
    </div>
  );
}
