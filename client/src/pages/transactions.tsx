import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatWB } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Receipt,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Coins,
  Search,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import type { Transaction, Word } from "@shared/schema";

type TransactionWithWord = {
  transaction: Transaction;
  word: Word | null;
};

export default function Transactions() {
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchText, setSearchText] = useState("");
  const limit = 50;

  const { data: transactions, isLoading } = useQuery<TransactionWithWord[]>({
    queryKey: [
      "/api/transactions",
      {
        page,
        limit,
        type: filterType !== "ALL" ? filterType : undefined,
        search: searchText || undefined,
      },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (filterType !== "ALL") {
        params.append("type", filterType);
      }
      
      if (searchText) {
        params.append("search", searchText);
      }
      
      const response = await fetch(`/api/transactions?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }
      return response.json();
    },
    refetchInterval: 30000,
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "IPO_BUY":
      case "LIMIT_BUY":
      case "MARKET_BUY":
        return <ArrowDownRight className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case "LIMIT_SELL":
      case "MARKET_SELL":
        return <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case "SUBMIT_WORD":
        return <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <Coins className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      IPO_BUY: "IPO Buy",
      LIMIT_BUY: "Limit Buy",
      MARKET_BUY: "Market Buy",
      LIMIT_SELL: "Limit Sell",
      MARKET_SELL: "Market Sell",
      SUBMIT_WORD: "Submit Word",
      DAILY_LOGIN: "Login Bonus",
    };
    return labels[type] || type;
  };

  const getTypeBadgeVariant = (type: string) => {
    if (type.includes("BUY")) return "default";
    if (type.includes("SELL")) return "destructive";
    if (type === "SUBMIT_WORD") return "secondary";
    return "outline";
  };

  const handleFilterChange = (value: string) => {
    setFilterType(value);
    setPage(1); // Reset to page 1 when filter changes
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    setPage(1); // Reset to page 1 when search changes
  };

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
                <Receipt className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                <h1 className="text-base sm:text-xl font-display font-bold tracking-tight">
                  Transaction History
                </h1>
              </div>
            </div>
            <Badge variant="secondary" className="hidden sm:flex">
              {transactions?.length || 0} Transactions
            </Badge>
          </div>
        </div>
      </header>

      <main className="container max-w-screen-2xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Filter and Search Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by word..."
              value={searchText}
              onChange={handleSearchChange}
              className="flex-1"
              data-testid="input-search-word"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <Select value={filterType} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-filter-type">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="BUY">Buy Orders</SelectItem>
                <SelectItem value="SELL">Sell Orders</SelectItem>
                <SelectItem value="IPO">IPO Purchases</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">
              {filterType !== "ALL"
                ? `${filterType === "BUY" ? "Buy" : filterType === "SELL" ? "Sell" : "IPO"} Transactions`
                : "All Transactions"}
              {searchText && ` matching "${searchText}"`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="h-16 rounded-md bg-muted/30 animate-pulse" />
                ))}
              </div>
            ) : !transactions || transactions.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                  <Receipt className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-2">
                  {searchText || filterType !== "ALL"
                    ? "No Matching Transactions"
                    : "No Transactions Yet"}
                </h3>
                <p className="text-muted-foreground">
                  {searchText || filterType !== "ALL"
                    ? "Try adjusting your filters or search"
                    : "Start trading to see your transaction history here"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Word</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Fee</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map(({ transaction, word }) => {
                      const isBuy = transaction.type.includes("BUY");
                      const isSell = transaction.type.includes("SELL");
                      const amount = parseFloat(transaction.totalAmount);
                      const fee = parseFloat(transaction.fee);
                      const balanceAfter = parseFloat(transaction.balanceAfter);

                      return (
                        <TableRow key={transaction.id} data-testid={`transaction-row-${transaction.id}`}>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(transaction.createdAt), "MMM d, yyyy h:mm a")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTypeIcon(transaction.type)}
                              <Badge variant={getTypeBadgeVariant(transaction.type)}>
                                {getTypeLabel(transaction.type)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {word ? (
                              <Link href={`/words/${word.id}`}>
                                <span className="font-semibold hover:underline cursor-pointer" data-testid={`text-word-${transaction.id}`}>
                                  {word.displayText}
                                </span>
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {transaction.quantity ? (
                              <span data-testid={`text-quantity-${transaction.id}`}>
                                {transaction.quantity.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {transaction.pricePerShare ? (
                              <span data-testid={`text-price-${transaction.id}`}>
                                {formatWB(parseFloat(transaction.pricePerShare))}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-muted-foreground">
                            {fee > 0 ? `${formatWB(fee)}` : "—"}
                          </TableCell>
                          <TableCell className={`text-right font-mono font-semibold ${
                            isBuy ? "text-red-600 dark:text-red-400" :
                            isSell ? "text-green-600 dark:text-green-400" :
                            ""
                          }`} data-testid={`text-amount-${transaction.id}`}>
                            {isBuy || transaction.type === "SUBMIT_WORD" ? "-" : "+"}{formatWB(Math.abs(amount))}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold" data-testid={`text-balance-${transaction.id}`}>
                            {formatWB(balanceAfter)} WB
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {!isLoading && transactions && transactions.length > 0 && (
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
              disabled={transactions.length < limit}
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
