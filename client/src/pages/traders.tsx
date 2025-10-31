import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatWB } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  Trophy,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { User } from "@shared/schema";

export default function Traders() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const limit = 50;

  const { data: traders, isLoading } = useQuery<User[]>({
    queryKey: [`/api/traders?page=${page}&limit=${limit}&query=${encodeURIComponent(searchQuery)}`],
    refetchInterval: 10000,
  });

  // Backend now handles filtering
  const filteredTraders = traders || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-screen-2xl mx-auto px-3 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                <h1 className="text-base sm:text-xl font-display font-bold tracking-tight">
                  All Traders
                </h1>
              </div>
            </div>
            <Badge variant="secondary" className="hidden sm:flex">
              {traders?.length || 0} Traders
            </Badge>
          </div>
        </div>
      </header>

      <main className="container max-w-screen-2xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search traders by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-traders"
              />
            </div>
          </CardContent>
        </Card>

        {/* Traders List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display">Leaderboard</CardTitle>
              <Badge variant="secondary">{filteredTraders.length} Results</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="h-20 rounded-md bg-muted/30 animate-pulse" />
                ))}
              </div>
            ) : filteredTraders.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                  <Users className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-2">
                  No Traders Found
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Try adjusting your search query" : "No traders yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTraders.map((trader, index) => {
                  const rank = (page - 1) * limit + index + 1;
                  const balance = parseFloat(trader.wbBalance);
                  const earnings = parseFloat(trader.totalEarnings);
                  
                  return (
                    <Link key={trader.id} href={`/users/${trader.id}`}>
                      <div
                        className="flex items-center gap-4 p-4 rounded-md border hover-elevate cursor-pointer"
                        data-testid={`trader-row-${trader.id}`}
                      >
                      {/* Rank */}
                      <div className="flex-shrink-0 w-12 text-center">
                        {rank <= 3 ? (
                          <Trophy
                            className={`h-6 w-6 mx-auto ${
                              rank === 1 ? "text-yellow-500" :
                              rank === 2 ? "text-gray-400" :
                              "text-orange-600"
                            }`}
                          />
                        ) : (
                          <span className="text-lg font-mono font-semibold text-muted-foreground">
                            #{rank}
                          </span>
                        )}
                      </div>

                      {/* Avatar */}
                      <Avatar className="h-12 w-12 border-2">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {trader.username?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-base truncate" data-testid={`text-username-${trader.id}`}>
                          {trader.username}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Joined {new Date(trader.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-end sm:items-center">
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                            <Wallet className="h-3 w-3" />
                            <span>Balance</span>
                          </div>
                          <div className="font-mono font-bold text-base" data-testid={`text-balance-${trader.id}`}>
                            {formatWB(balance)} WB
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                            <TrendingUp className="h-3 w-3" />
                            <span>Total Earned</span>
                          </div>
                          <div className="font-mono font-bold text-base text-green-600 dark:text-green-400">
                            {formatWB(earnings)} WB
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

        {/* Pagination */}
        {!isLoading && filteredTraders.length > 0 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-4">
              <span className="text-sm font-medium">Page {page}</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(page + 1)}
              disabled={filteredTraders.length < limit}
              data-testid="button-next-page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
