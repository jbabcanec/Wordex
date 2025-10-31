import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { WordCard } from "@/components/WordCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  TrendingUp,
} from "lucide-react";
import type { Word } from "@shared/schema";

export default function Dictionary() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const limit = 50;

  const { data: words, isLoading } = useQuery<Word[]>({
    queryKey: [`/api/allwords?page=${page}&limit=${limit}`],
    refetchInterval: 10000,
  });

  const { data: activeIpos } = useQuery<Word[]>({
    queryKey: ["/api/ipos/active"],
    refetchInterval: 5000,
  });

  if (!user) {
    return null;
  }

  const userBalance = parseFloat(user.wbBalance);

  // Filter words based on search and status
  const filteredWords = words?.filter((word) => {
    const matchesSearch = searchQuery === "" || 
      word.textNormalized.toLowerCase().includes(searchQuery.toLowerCase()) ||
      word.displayText.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "ipo" && word.ipoStatus === "IPO_ACTIVE") ||
      (statusFilter === "trading" && word.ipoStatus === "TRADING") ||
      (statusFilter === "failed" && word.ipoStatus === "IPO_FAILED");
    
    return matchesSearch && matchesStatus;
  }) || [];

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
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                <h1 className="text-base sm:text-xl font-display font-bold tracking-tight">
                  Word Dictionary
                </h1>
              </div>
            </div>
            <Badge variant="secondary" className="hidden sm:flex">
              {words?.length || 0} Words
            </Badge>
          </div>
        </div>
      </header>

      <main className="container max-w-screen-2xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search words..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-words"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ipo">IPO Active</SelectItem>
                  <SelectItem value="trading">Trading</SelectItem>
                  <SelectItem value="failed">Failed IPO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Active IPOs Section */}
        {activeIpos && activeIpos.length > 0 && statusFilter === "all" && (
          <Card className="mb-6 border-2 border-blue-500/30 bg-blue-500/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <CardTitle className="font-display text-lg">Active IPOs ({activeIpos.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeIpos.map((word) => (
                  <WordCard
                    key={word.id}
                    word={word}
                    userBalance={userBalance}
                    userShares={0}
                    compact={true}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Words Grid */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display">
                {statusFilter === "all" ? "All Words" :
                 statusFilter === "ipo" ? "IPO Words" :
                 statusFilter === "trading" ? "Trading Words" :
                 "Failed IPOs"}
              </CardTitle>
              <Badge variant="secondary">{filteredWords.length} Results</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-32 rounded-md bg-muted/30 animate-pulse" />
                ))}
              </div>
            ) : filteredWords.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                  <BookOpen className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-2">
                  No Words Found
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Try adjusting your search query" : "Be the first to submit a word!"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredWords.map((word) => (
                  <WordCard
                    key={word.id}
                    word={word}
                    userBalance={userBalance}
                    userShares={0}
                    compact={false}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {!isLoading && filteredWords.length > 0 && (
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
              disabled={filteredWords.length < limit}
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
