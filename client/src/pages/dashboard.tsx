import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { formatWB } from "@/lib/utils";
import { StockTicker } from "@/components/StockTicker";
import { SubmitWordModal } from "@/components/SubmitWordModal";
import { WordCard } from "@/components/WordCard";
import { EventFeed } from "@/components/EventFeed";
import { Portfolio } from "@/components/Portfolio";
import { Leaderboard } from "@/components/Leaderboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  Plus, 
  LogOut, 
  User,
  Wallet,
  BarChart3,
} from "lucide-react";
import type { Word } from "@shared/schema";

interface WordWithHolding extends Word {
  userShares: number;
  change24h?: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [submitWordModalOpen, setSubmitWordModalOpen] = useState(false);

  const { data: topWords, isLoading: topWordsLoading } = useQuery<WordWithHolding[]>({
    queryKey: ["/api/words/top"],
    refetchInterval: 10000,
  });

  if (!user) {
    return null;
  }

  const userBalance = parseFloat(user.wbBalance);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between max-w-screen-2xl mx-auto px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-display font-bold tracking-tight">WORDEX</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="p-3 flex items-center gap-3">
                <Wallet className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    Balance
                  </div>
                  <div className="font-mono font-bold text-lg" data-testid="text-balance">
                    {formatWB(userBalance)} WB
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.href = "/api/logout"}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Stock Ticker */}
      <StockTicker />

      {/* Main Content */}
      <main className="flex-1 container max-w-screen-2xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Top Words & Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="hover-elevate cursor-pointer border-2" onClick={() => setSubmitWordModalOpen(true)}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-display font-semibold text-lg">Submit a Word</h3>
                      <p className="text-sm text-muted-foreground">
                        List a new word for 10 WB and receive 50 shares
                      </p>
                    </div>
                    <div className="p-3 rounded-md bg-primary/10">
                      <Plus className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-display font-semibold text-lg">Your Stats</h3>
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Total Earned:</span>{" "}
                          <span className="font-mono font-semibold">{formatWB(user.totalEarnings)} WB</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 rounded-md bg-muted/50">
                      <BarChart3 className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Power Words */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Top Power Words</CardTitle>
              </CardHeader>
              <CardContent>
                {topWordsLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-24 rounded-md bg-muted/30 animate-pulse" />
                    ))}
                  </div>
                ) : !topWords || topWords.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No words listed yet</p>
                    <p className="text-xs mt-1">Be the first to submit a word!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topWords.map((word) => (
                      <WordCard
                        key={word.id}
                        word={word}
                        userBalance={userBalance}
                        userShares={word.userShares || 0}
                        compact={true}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Portfolio */}
            <Portfolio />
          </div>

          {/* Right Column - Event Feed & Leaderboard */}
          <div className="space-y-6">
            <EventFeed />
            <Leaderboard />
          </div>
        </div>
      </main>

      {/* Submit Word Modal */}
      <SubmitWordModal
        open={submitWordModalOpen}
        onOpenChange={setSubmitWordModalOpen}
      />
    </div>
  );
}
