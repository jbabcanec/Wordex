import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatWB } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  Package,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import type { Word, Holding, Trade } from "@shared/schema";

type UserProfileData = {
  user: {
    id: string;
    username: string;
    wbBalance: string;
    totalEarnings: string;
    createdAt: string;
  };
  portfolio: Array<{
    holding: Holding;
    word: Word | null;
  }>;
  recentTrades: Array<{
    trade: Trade;
    word: Word | null;
  }>;
  submittedWordsCount: number;
};

export default function UserProfile() {
  const { id } = useParams();

  const { data: profileData, isLoading } = useQuery<UserProfileData>({
    queryKey: [`/api/users/${id}`],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading profile...</div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
          <Link href="/traders">
            <Button>Back to Traders</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { user, portfolio, recentTrades, submittedWordsCount } = profileData;
  const balance = parseFloat(user.wbBalance);
  const earnings = parseFloat(user.totalEarnings);

  // Calculate portfolio value
  const portfolioValue = portfolio.reduce((total, { holding, word }) => {
    if (!word) return total;
    const currentValue = holding.quantity * parseFloat(word.currentPrice);
    return total + currentValue;
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-screen-2xl mx-auto px-3 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/traders">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {user.username[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-base sm:text-xl font-display font-bold tracking-tight" data-testid="text-username">
                    {user.username}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Joined {format(new Date(user.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-screen-2xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Stats Cards */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Balance
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono" data-testid="text-balance">
                {formatWB(balance)} WB
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Earned
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400" data-testid="text-earnings">
                {formatWB(earnings)} WB
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Portfolio Value
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono" data-testid="text-portfolio-value">
                {formatWB(portfolioValue)} WB
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Words Submitted
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono" data-testid="text-words-submitted">
                {submittedWordsCount}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Portfolio */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Portfolio</CardTitle>
            </CardHeader>
            <CardContent>
              {portfolio.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No holdings yet
                </div>
              ) : (
                <div className="space-y-2">
                  {portfolio.map(({ holding, word }) => {
                    if (!word) return null;
                    const currentValue = holding.quantity * parseFloat(word.currentPrice);
                    const costBasis = parseFloat(holding.averageCost) * holding.quantity;
                    const profitLoss = currentValue - costBasis;
                    const profitLossPercent = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

                    return (
                      <Link key={holding.id} href={`/words/${word.id}`}>
                        <div className="p-4 rounded-md border hover-elevate cursor-pointer" data-testid={`portfolio-item-${word.id}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold">{word.displayText}</div>
                            <Badge variant={word.ipoStatus === "TRADING" ? "secondary" : "default"}>
                              {word.ipoStatus === "TRADING" ? "TRADING" : "IPO"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Shares</div>
                              <div className="font-mono font-semibold">{holding.quantity.toLocaleString()}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-muted-foreground">Value</div>
                              <div className="font-mono font-semibold">{formatWB(currentValue)} WB</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Avg Cost</div>
                              <div className="font-mono text-sm">{formatWB(parseFloat(holding.averageCost))}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-muted-foreground">P/L</div>
                              <div className={`font-mono text-sm ${
                                profitLoss >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                              }`}>
                                {profitLoss >= 0 ? "+" : ""}{formatWB(profitLoss)} ({profitLossPercent.toFixed(1)}%)
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Trades */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Recent Trades</CardTitle>
            </CardHeader>
            <CardContent>
              {recentTrades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No trades yet
                </div>
              ) : (
                <div className="space-y-2">
                  {recentTrades.map(({ trade, word }, index) => {
                    if (!word) return null;
                    const isBuyer = trade.buyerId === user.id;
                    const isSeller = trade.sellerId === user.id;

                    return (
                      <div
                        key={trade.id}
                        className="p-3 rounded-md border"
                        data-testid={`trade-${index}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Link href={`/words/${word.id}`}>
                            <span className="font-semibold hover:underline cursor-pointer">
                              {word.displayText}
                            </span>
                          </Link>
                          <Badge variant={isBuyer ? "default" : "destructive"}>
                            {trade.isIpo ? "IPO" : isBuyer ? "BUY" : "SELL"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Shares: </span>
                            <span className="font-mono">{trade.quantity.toLocaleString()}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-muted-foreground">Price: </span>
                            <span className="font-mono">{formatWB(parseFloat(trade.price))}</span>
                          </div>
                          <div className="col-span-2 text-xs text-muted-foreground">
                            {format(new Date(trade.createdAt), "MMM d, h:mm a")}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
