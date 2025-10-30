import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Zap, DollarSign, Trophy } from "lucide-react";

export default function Landing() {
  const [showLocalLogin, setShowLocalLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'invalid_credentials') {
      setError('Invalid username or password');
      setShowLocalLogin(true);
    }
  }, []);

  const handleLocalLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;
    
    fetch('/api/login/local', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: formData.get('username') as string,
        password: formData.get('password') as string,
      }),
      credentials: 'include',
    })
      .then(response => {
        if (response.redirected) {
          window.location.href = response.url;
        } else if (!response.ok) {
          setError('Invalid username or password');
        }
      })
      .catch(() => {
        setError('Login failed. Please try again.');
      });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between max-w-screen-2xl mx-auto px-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <TrendingUp className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
              <h1 className="text-lg sm:text-2xl font-display font-bold tracking-tight">WORDEX</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm"
              variant={showLocalLogin ? "outline" : "default"}
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login"
              className="text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">Get Started</span>
              <span className="sm:hidden">Start</span>
            </Button>
            <Button 
              size="sm"
              variant={showLocalLogin ? "default" : "outline"}
              onClick={() => setShowLocalLogin(!showLocalLogin)}
              data-testid="button-toggle-local-login"
              className="text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">Local Login</span>
              <span className="sm:hidden">Login</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center py-8 sm:py-24 px-3 sm:px-6">
        <div className="container max-w-screen-xl mx-auto">
          {showLocalLogin ? (
            <div className="flex flex-col items-center gap-6 sm:gap-8 max-w-md mx-auto">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl sm:text-4xl font-display font-bold tracking-tight">
                  Local Login
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Sign in with your username and password
                </p>
              </div>

              <Card className="w-full">
                <CardContent className="p-4 sm:p-6">
                  <form onSubmit={handleLocalLogin} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="username" className="text-sm font-medium">
                        Username
                      </label>
                      <Input
                        id="username"
                        name="username"
                        type="text"
                        placeholder="Enter username"
                        required
                        data-testid="input-username"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="password" className="text-sm font-medium">
                        Password
                      </label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Enter password"
                        required
                        data-testid="input-password"
                      />
                    </div>

                    {error && (
                      <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                        {error}
                      </div>
                    )}

                    <Button type="submit" className="w-full" data-testid="button-local-login-submit">
                      Sign In
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Button 
                variant="outline"
                onClick={() => {
                  setShowLocalLogin(false);
                  setError(null);
                }}
                data-testid="button-back-to-landing"
              >
                Back to Landing
              </Button>
            </div>
          ) : (
          <div className="flex flex-col items-center text-center gap-6 sm:gap-8">
            {/* Main Headline */}
            <div className="space-y-3 sm:space-y-4">
              <h2 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight">
                WORDEX
              </h2>
              <p className="text-lg sm:text-2xl md:text-3xl font-display font-medium text-muted-foreground">
                Trade the Power of Language
              </p>
            </div>

            {/* Tagline */}
            <div className="max-w-2xl space-y-2 sm:space-y-3">
              <p className="text-base sm:text-xl md:text-2xl font-medium">
                Short the patriarchy. Long your vocabulary.
              </p>
              <p className="text-base sm:text-xl md:text-2xl font-medium">
                Trade the zeitgeist.
              </p>
            </div>

            {/* Description */}
            <p className="max-w-2xl text-sm sm:text-base md:text-lg text-muted-foreground px-4">
              A speculative trading platform where you trade shares in words based on their social and cultural power.
              Submit words, trade shares, validate events, and earn dividends when your words gain momentum.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-2 sm:mt-4 w-full sm:w-auto px-4 sm:px-0">
              <Button 
                size="lg"
                className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-get-started"
              >
                Start Trading
                <TrendingUp className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-16 w-full max-w-4xl px-4">
              <div className="p-4 sm:p-6 rounded-md border bg-card hover-elevate">
                <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
                  <div className="p-2 sm:p-3 rounded-md bg-primary/10">
                    <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-base sm:text-lg">Submit Words</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Submit any word for 10 WB and receive 50 shares as the creator.
                    Watch its value grow with cultural events.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-6 rounded-md border bg-card hover-elevate">
                <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
                  <div className="p-2 sm:p-3 rounded-md bg-primary/10">
                    <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-base sm:text-lg">Trade & Earn</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Buy and sell shares at real-time prices. Earn dividends when events
                    validate the power of your word holdings.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-6 rounded-md border bg-card hover-elevate">
                <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
                  <div className="p-2 sm:p-3 rounded-md bg-primary/10">
                    <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-base sm:text-lg">Climb Leaderboards</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Compete with other traders to accumulate the most WordBucks.
                    Build your portfolio and trading reputation.
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-8 sm:mt-12 max-w-2xl w-full px-4">
              <div className="text-center">
                <div className="text-xl sm:text-3xl font-mono font-bold text-primary">10,000</div>
                <div className="text-[10px] sm:text-sm text-muted-foreground mt-1">WB Signup Bonus</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-3xl font-mono font-bold text-primary">100</div>
                <div className="text-[10px] sm:text-sm text-muted-foreground mt-1">WB Daily Login</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-3xl font-mono font-bold text-primary">∞</div>
                <div className="text-[10px] sm:text-sm text-muted-foreground mt-1">Earning Potential</div>
              </div>
            </div>
          </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 sm:py-8">
        <div className="container max-w-screen-2xl mx-auto px-3 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4">
            <div className="text-xs sm:text-sm text-muted-foreground text-center md:text-left">
              © 2025 WORDEX. Trade the power of language.
            </div>
            <div className="flex gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
              <span>No real money involved</span>
              <span>•</span>
              <span>Platform currency only</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
