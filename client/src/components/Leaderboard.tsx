import { useQuery } from "@tanstack/react-query";
import { formatWB } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LeaderboardEntry {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  portfolioValue: string;
  holdingsValue: string;
  wbBalance: string;
  rank: number;
}

export function Leaderboard() {
  const { data: entries, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-md bg-muted/30 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Top Traders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 px-6">
            <div className="p-4 rounded-full bg-muted/30 w-fit mx-auto mb-4">
              <Trophy className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">Race to the Top</h3>
            <p className="text-sm text-muted-foreground">
              Build your earnings through smart trading and climb the ranks.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-orange-600" />;
    return null;
  };

  const getDisplayName = (entry: LeaderboardEntry) => {
    if (entry.firstName && entry.lastName) {
      return `${entry.firstName} ${entry.lastName}`;
    }
    if (entry.firstName) return entry.firstName;
    if (entry.email) return entry.email;
    return "Anonymous Trader";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Top Traders</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {entries.slice(0, 10).map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 p-3 rounded-md border bg-card hover-elevate"
              data-testid={`leaderboard-rank-${entry.rank}`}
            >
              <div className="w-8 flex items-center justify-center">
                {getRankIcon(entry.rank) || (
                  <span className="font-mono text-sm text-muted-foreground">
                    {entry.rank}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {getDisplayName(entry)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Rank #{entry.rank}
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono font-bold">
                  {formatWB(entry.portfolioValue)} WB
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Value
                </div>
                {entry.rank <= 3 && (
                  <Badge
                    variant="outline"
                    className="text-xs mt-1"
                  >
                    Top {entry.rank}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
