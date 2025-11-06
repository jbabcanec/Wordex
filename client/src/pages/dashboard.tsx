import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { formatWB } from "@/lib/utils";
import { Link } from "wouter";
import { StockTicker } from "@/components/StockTicker";
import { SubmitWordModal } from "@/components/SubmitWordModal";
import { WelcomeTour, useShouldShowTour } from "@/components/WelcomeTour";
import { WordCard } from "@/components/WordCard";
import { Portfolio } from "@/components/Portfolio";
import { Leaderboard } from "@/components/Leaderboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Plus, 
  LogOut, 
  User,
  Wallet,
  BarChart3,
  HelpCircle,
  BookOpen,
  Users,
  ArrowRight,
  Clock,
} from "lucide-react";
import type { Word } from "@shared/schema";

interface WordWithHolding extends Word {
  userShares: number;
  change24h?: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [submitWordModalOpen, setSubmitWordModalOpen] = useState(false);
  const shouldShowTour = useShouldShowTour(user);
  const [tourOpen, setTourOpen] = useState(false);

  const { data: topWords, isLoading: topWordsLoading } = useQuery<WordWithHolding[]>({
    queryKey: ["/api/words/top"],
    refetchInterval: 10000,
  });

  const { data: activeIpos } = useQuery<Word[]>({
    queryKey: ["/api/ipos/active"],
    refetchInterval: 5000,
  });

  // Open tour when shouldShowTour becomes true
  useEffect(() => {
    if (shouldShowTour) {
      setTourOpen(true);
    }
  }, [shouldShowTour]);

  if (!user) {
    return null;
  }

  const userBalance = parseFloat(user.wbBalance);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="md:sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-screen-2xl mx-auto px-3 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <div>
                <h1 className="text-base sm:text-xl font-display font-bold tracking-tight">WORDEX</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground">by Floj</p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-4">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setTourOpen(true)}
                data-testid="button-help"
                className="hidden sm:flex"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Help
              </Button>
              
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setTourOpen(true)}
                data-testid="button-help-mobile"
                className="sm:hidden"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>

              <Card className="border-2 border-primary/20 bg-primary/5 min-w-[140px]">
                <CardContent className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      Balance
                    </div>
                    <div className="font-mono font-bold text-base whitespace-nowrap" data-testid="text-balance">
                      {formatWB(userBalance)} WB
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Link href="/transactions">
                <Button
                  size="icon"
                  variant="ghost"
                  className="hidden sm:flex"
                  data-testid="button-transactions"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </Link>

              <Link href={`/users/${user.id}`}>
                <Button
                  size="icon"
                  variant="ghost"
                  data-testid="button-profile"
                >
                  <User className="h-4 w-4" />
                </Button>
              </Link>

              <Button
                size="icon"
                variant="outline"
                onClick={() => window.location.href = "/api/logout"}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stock Ticker */}
      <StockTicker />

      {/* Main Content */}
      <main className="flex-1 container max-w-screen-2xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Top Words & Actions */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Hero Banner - Only show when no words exist */}
            {!topWordsLoading && (!topWords || topWords.length === 0) && (
              <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
                <CardContent className="p-4 sm:p-8 relative">
                  <div className="max-w-2xl">
                    <h2 className="text-xl sm:text-3xl font-display font-bold mb-2 sm:mb-3">
                      Trade the Power of Language
                    </h2>
                    <p className="text-base sm:text-lg text-muted-foreground mb-4 sm:mb-6">
                      Short the patriarchy. Long your vocabulary. Trade the zeitgeist.
                    </p>
                    <p className="text-sm sm:text-base text-foreground/80 mb-6 sm:mb-8">
                      Be the first to list a word and launch an IPO. Submit for 50 WB, 
                      receive 20 creator shares that vest over 60 days, and watch traders 
                      bid on your word's cultural value.
                    </p>
                    <Button
                      size="lg"
                      onClick={() => setSubmitWordModalOpen(true)}
                      className="font-semibold w-full sm:w-auto"
                      data-testid="button-submit-first-word"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Submit Your First Word
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions - Only show when words exist */}
            {!topWordsLoading && topWords && topWords.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="hover-elevate cursor-pointer border-2" onClick={() => setSubmitWordModalOpen(true)}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-display font-semibold text-lg">Submit a Word</h3>
                        <p className="text-sm text-muted-foreground">
                          Launch an IPO for 50 WB, receive 20 shares
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
            )}

            {/* Active IPOs */}
            {activeIpos && activeIpos.length > 0 && (
              <Card className="border-2 border-blue-500/30 bg-blue-500/5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      <CardTitle className="font-display">Active IPOs</CardTitle>
                    </div>
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-700 dark:text-blue-300">
                      {activeIpos.length} Live
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {activeIpos.slice(0, 3).map((word) => (
                      <WordCard
                        key={word.id}
                        word={word}
                        userBalance={userBalance}
                        userShares={0}
                        compact={true}
                      />
                    ))}
                    {activeIpos.length > 3 && (
                      <Link href="/dictionary">
                        <Button variant="outline" className="w-full" data-testid="button-view-all-ipos">
                          <BookOpen className="h-4 w-4 mr-2" />
                          View All IPOs
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Power Words */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display">Top 10 Words</CardTitle>
                  <Link href="/dictionary">
                    <Button variant="ghost" size="sm" data-testid="button-browse-words">
                      Browse All <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {topWordsLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-24 rounded-md bg-muted/30 animate-pulse" />
                    ))}
                  </div>
                ) : !topWords || topWords.length === 0 ? (
                  <div className="text-center py-16 px-6">
                    <div className="max-w-md mx-auto">
                      <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                        <TrendingUp className="h-10 w-10 text-primary" />
                      </div>
                      <h3 className="text-xl font-display font-semibold mb-2">
                        The Market Awaits
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        Submit the first word and become a pioneer trader. 
                        Your word will be the foundation of the WORDEX marketplace.
                      </p>
                      <Button
                        onClick={() => setSubmitWordModalOpen(true)}
                        data-testid="button-submit-word-empty"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        List Your Word
                      </Button>
                    </div>
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

          {/* Right Column - Leaderboard */}
          <div className="space-y-6">
            <Leaderboard />
          </div>
        </div>
      </main>

      {/* Submit Word Modal */}
      <SubmitWordModal
        open={submitWordModalOpen}
        onOpenChange={setSubmitWordModalOpen}
      />

      {/* Welcome Tour */}
      <WelcomeTour
        open={tourOpen}
        onOpenChange={setTourOpen}
      />
    </div>
  );
}
