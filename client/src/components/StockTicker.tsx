import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, TrendingDown, Activity, Clock, Filter } from "lucide-react";
import { formatWB, formatPercentage } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { TradeModal } from "@/components/TradeModal";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Word } from "@shared/schema";

interface TickerWord {
  id: string;
  textNormalized: string;
  displayText: string;
  currentPrice: string;
  change24h: number;
  tradeCount?: number;
  ipoStatus?: string;
}

export function StockTicker() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("trending");
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: words, isLoading } = useQuery<TickerWord[]>({
    queryKey: [`/api/words/ticker?filter=${filter}`],
    refetchInterval: 5000,
  });

  // Auto-scroll animation
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || !words || words.length === 0) return;

    let scrollPosition = 0;
    const scrollSpeed = 0.5; // pixels per frame

    const animate = () => {
      if (scrollContainer) {
        scrollPosition += scrollSpeed;
        if (scrollPosition >= scrollContainer.scrollWidth / 2) {
          scrollPosition = 0;
        }
        scrollContainer.scrollLeft = scrollPosition;
      }
    };

    const intervalId = setInterval(animate, 30);

    // Pause on hover
    const handleMouseEnter = () => clearInterval(intervalId);
    const handleMouseLeave = () => {
      const newIntervalId = setInterval(animate, 30);
      return () => clearInterval(newIntervalId);
    };

    scrollContainer.addEventListener('mouseenter', handleMouseEnter);
    scrollContainer.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      clearInterval(intervalId);
      scrollContainer.removeEventListener('mouseenter', handleMouseEnter);
      scrollContainer.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [words]);

  const handleWordClick = async (wordData: TickerWord) => {
    // Fetch full word data for the modal
    const response = await fetch(`/api/words/${wordData.id}`);
    const fullWord = await response.json();
    setSelectedWord(fullWord);
    setTradeModalOpen(true);
  };

  if (isLoading || !words || words.length === 0) {
    return (
      <div className="h-12 border-b bg-muted/30 flex items-center justify-between px-4">
        <div className="text-sm text-muted-foreground">
          {isLoading ? "Loading market data..." : "Market opening soon — be the first to submit a word"}
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36 h-8 text-xs" data-testid="ticker-filter">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="trending">Trending</SelectItem>
            <SelectItem value="gainers">Top Gainers</SelectItem>
            <SelectItem value="losers">Top Losers</SelectItem>
            <SelectItem value="volume">Most Traded</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Duplicate words for seamless infinite scroll
  const duplicatedWords = [...words, ...words];

  return (
    <>
      <div className="h-12 border-b bg-card relative">
        {/* Filter dropdown - positioned absolutely */}
        <div className="absolute top-1/2 -translate-y-1/2 right-4 z-20">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-36 h-8 text-xs bg-background/95 backdrop-blur" data-testid="ticker-filter">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trending">Trending</SelectItem>
              <SelectItem value="gainers">Top Gainers</SelectItem>
              <SelectItem value="losers">Top Losers</SelectItem>
              <SelectItem value="volume">Most Traded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Gradient edges */}
        <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-40 w-12 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />

        {/* Scrolling ticker */}
        <div
          ref={scrollRef}
          className="flex items-center h-full overflow-x-auto scrollbar-hide"
          data-testid="stock-ticker-scroll"
        >
          {duplicatedWords.map((word, index) => (
            <div
              key={`${word.id}-${index}`}
              onClick={() => handleWordClick(word)}
              className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 whitespace-nowrap border-r border-border/50 flex-shrink-0 cursor-pointer hover:bg-accent/50 transition-colors"
              data-testid={`ticker-word-${word.id}`}
            >
              {/* IPO Badge */}
              {word.ipoStatus === "IPO_ACTIVE" && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                  <Clock className="h-2.5 w-2.5 mr-0.5" />
                  IPO
                </Badge>
              )}

              {/* Word name */}
              <span className="font-mono font-semibold text-xs sm:text-sm tracking-wider">
                {word.textNormalized}
              </span>

              {/* Price */}
              <span className="font-mono text-xs sm:text-sm">
                {formatWB(word.currentPrice)} WB
              </span>

              {/* 24h Change */}
              <span
                className={cn(
                  "flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-mono font-medium",
                  word.change24h >= 0 ? "text-gain" : "text-loss"
                )}
                data-testid={`ticker-change-${word.id}`}
              >
                {word.change24h >= 0 ? (
                  <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                )}
                {formatPercentage(word.change24h)}
              </span>

              {/* Volume (if available) */}
              {word.tradeCount != null && word.tradeCount > 0 && (
                <span className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Activity className="h-2.5 w-2.5" />
                  {word.tradeCount}
                </span>
              )}
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

      {/* Trade Modal */}
      {selectedWord && user && (
        <TradeModal
          open={tradeModalOpen}
          onOpenChange={setTradeModalOpen}
          word={selectedWord}
          userBalance={parseFloat(user.wbBalance)}
          userShares={0}
        />
      )}
    </>
  );
}
