import { useQuery } from "@tanstack/react-query";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, TrendingUp, Globe, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Event {
  id: string;
  wordId: string;
  word: {
    textNormalized: string;
  };
  points: number;
  description: string;
  validated: boolean;
  votesFor: number;
  votesAgainst: number;
  createdAt: string;
}

export function EventFeed() {
  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events/recent"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const getEventIcon = (points: number) => {
    if (points >= 1000) return Flame;
    if (points >= 500) return Globe;
    return TrendingUp;
  };

  const getEventTier = (points: number): { label: string; color: string } => {
    if (points >= 1000) return { label: "TIER 1", color: "bg-destructive/10 text-destructive" };
    if (points >= 501) return { label: "TIER 2", color: "bg-orange-500/10 text-orange-500" };
    if (points >= 101) return { label: "TIER 3", color: "bg-primary/10 text-primary" };
    if (points >= 26) return { label: "TIER 4", color: "bg-chart-2/10 text-chart-2" };
    return { label: "TIER 5", color: "bg-muted text-muted-foreground" };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Event Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-md bg-muted/30 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Event Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No recent events</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Recent Events</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((event) => {
            const Icon = getEventIcon(event.points);
            const tier = getEventTier(event.points);

            return (
              <div
                key={event.id}
                className="flex gap-3 p-3 rounded-md border bg-card hover-elevate"
                data-testid={`event-${event.id}`}
              >
                <div className={cn("p-2 rounded-md h-fit", tier.color)}>
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm tracking-wider">
                          {event.word.textNormalized}
                        </span>
                        <Badge variant="outline" className={cn("text-xs", tier.color)}>
                          {tier.label}
                        </Badge>
                        {event.validated ? (
                          <Badge className="bg-gain/10 text-gain border-gain/20 text-xs">
                            Validated
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {event.description}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-mono font-bold text-sm">
                        +{event.points}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        points
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div>{formatDateTime(event.createdAt)}</div>
                    {!event.validated && (
                      <div className="flex items-center gap-2">
                        <span className="text-gain">{event.votesFor} for</span>
                        <span className="text-loss">{event.votesAgainst} against</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
