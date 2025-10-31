import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatWB } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  TrendingUp,
  Users,
  BarChart3,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import type { Word } from "@shared/schema";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TradeModal } from "@/components/TradeModal";
import { IpoBuyModal } from "@/components/IpoBuyModal";
import { useState } from "react";

type PriceHistoryPoint = {
  price: string;
  quantity: number;
  totalValue: string;
  createdAt: string;
  isIpo: boolean;
};

export default function WordDetail() {
  const { id } = useParams();
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showIpoModal, setShowIpoModal] = useState(false);

  const { data: word, isLoading: wordLoading } = useQuery<Word>({
    queryKey: [`/api/words/${id}`],
    refetchInterval: 10000,
  });

  const { data: priceHistory, isLoading: historyLoading } = useQuery<PriceHistoryPoint[]>({
    queryKey: [`/api/words/${id}/history`],
    refetchInterval: 30000,
    enabled: !!word,
  });

  if (wordLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!word) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Word Not Found</h2>
          <Link href="/dictionary">
            <Button>Back to Dictionary</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentPrice = parseFloat(word.currentPrice);
  const marketCap = parseFloat(word.marketCap);
  const isIpoActive = word.ipoStatus === "IPO_ACTIVE";
  const isTrading = word.ipoStatus === "TRADING";
  const isFailed = word.ipoStatus === "IPO_FAILED";

  // Prepare chart data (reverse to show oldest first)
  const chartData = priceHistory
    ? [...priceHistory].reverse().map((point, index) => ({
        name: format(new Date(point.createdAt), "MMM d"),
        price: parseFloat(point.price),
        time: new Date(point.createdAt).getTime(),
      }))
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-screen-2xl mx-auto px-3 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/dictionary">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-2xl font-display font-bold tracking-tight">
                  {word.displayText}
                </h1>
                <Badge variant={
                  isIpoActive ? "default" :
                  isTrading ? "secondary" :
                  "destructive"
                }>
                  {isIpoActive ? "IPO" : isTrading ? "TRADING" : "FAILED"}
                </Badge>
              </div>
            </div>
            {isTrading && (
              <Button onClick={() => setShowTradeModal(true)} data-testid="button-trade">
                Trade
              </Button>
            )}
            {isIpoActive && (
              <Button onClick={() => setShowIpoModal(true)} data-testid="button-buy-ipo">
                Buy IPO
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container max-w-screen-2xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Price Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Current Price
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono" data-testid="text-current-price">
                  {formatWB(currentPrice)} WB
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BarChart3 className="h-4 w-4" />
                    <span>Market Cap</span>
                  </div>
                  <div className="font-mono font-semibold" data-testid="text-market-cap">
                    {formatWB(marketCap)} WB
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span>Total Shares</span>
                  </div>
                  <div className="font-mono font-semibold" data-testid="text-total-shares">
                    {word.totalShares.toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Outstanding</span>
                  </div>
                  <div className="font-mono font-semibold" data-testid="text-outstanding-shares">
                    {word.outstandingShares.toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Trade Count</span>
                  </div>
                  <div className="font-mono font-semibold" data-testid="text-trade-count">
                    {word.tradeCount.toLocaleString()}
                  </div>
                </div>

                {isIpoActive && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">IPO Progress</div>
                      <div className="font-mono font-semibold">
                        {word.ipoSharesSold} / {word.ipoSharesOffered}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">Ends At</div>
                      <div className="text-sm">
                        {word.ipoEndsAt && format(new Date(word.ipoEndsAt), "MMM d, h:mm a")}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Chart & History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price Chart */}
            {!isIpoActive && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-display">Price History</CardTitle>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <div className="animate-pulse">Loading chart...</div>
                    </div>
                  ) : chartData.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No trading history yet
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="name"
                          className="text-xs text-muted-foreground"
                        />
                        <YAxis
                          className="text-xs text-muted-foreground"
                          tickFormatter={(value) => `${value.toFixed(2)}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "var(--radius)",
                          }}
                          formatter={(value: number) => [`${formatWB(value)} WB`, "Price"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Trading History */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Recent Trades</CardTitle>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 rounded-md bg-muted/30 animate-pulse" />
                    ))}
                  </div>
                ) : !priceHistory || priceHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No trades yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {priceHistory.slice(0, 10).map((trade, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-md border"
                        data-testid={`trade-${index}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={trade.isIpo ? "default" : "secondary"}>
                              {trade.isIpo ? "IPO" : "TRADE"}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(trade.createdAt), "MMM d, h:mm a")}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-semibold">
                            {formatWB(parseFloat(trade.price))} WB
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {trade.quantity.toLocaleString()} shares
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Trade Modal */}
      <TradeModal
        open={showTradeModal}
        onOpenChange={setShowTradeModal}
        word={{
          id: word.id,
          textNormalized: word.textNormalized,
          displayText: word.displayText,
          currentPrice: word.currentPrice,
        }}
        userBalance={0}
        userShares={0}
      />

      {/* IPO Buy Modal */}
      <IpoBuyModal
        open={showIpoModal}
        onOpenChange={setShowIpoModal}
        word={{
          id: word.id,
          textNormalized: word.textNormalized,
          displayText: word.displayText,
          ipoCurrentPrice: word.ipoCurrentPrice,
          ipoSharesOffered: word.ipoSharesOffered,
          ipoSharesSold: word.ipoSharesSold,
          ipoEndsAt: word.ipoEndsAt || undefined,
        }}
        userBalance={0}
      />
    </div>
  );
}
