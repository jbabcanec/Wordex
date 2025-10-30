import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Plus, 
  ArrowLeftRight, 
  Coins,
  Trophy,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react";

interface WelcomeTourProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tourSteps = [
  {
    title: "Welcome to WORDEX",
    description: "Trade the power of language. WORDEX is a speculative trading platform where words have real value based on their cultural and social impact.",
    icon: TrendingUp,
    content: [
      "Buy and sell shares in words like stocks",
      "Earn dividends when cultural events boost word value",
      "Compete on the leaderboard with other traders",
    ],
  },
  {
    title: "Your WordBucks Balance",
    description: "WordBucks (WB) is your virtual trading currency. You started with 10,000 WB to begin your trading journey.",
    icon: Coins,
    content: [
      "Use WB to buy shares in words",
      "Earn more WB by selling shares at profit",
      "Get 100 WB daily login bonus",
      "All transactions are tracked with receipts",
    ],
  },
  {
    title: "Submit New Words",
    description: "Be the first to list a powerful word and claim your creator shares.",
    icon: Plus,
    content: [
      "Submit any word for 10 WB",
      "Receive 50 free creator shares (5% stake)",
      "Words are normalized to ALL CAPS, NO SPACES",
      "Own a piece of language itself",
    ],
  },
  {
    title: "Trading Words",
    description: "Buy low, sell high. The platform acts as market maker with a 2% spread.",
    icon: ArrowLeftRight,
    content: [
      "Buy shares at IV × 1.02 (intrinsic value + 2%)",
      "Sell shares at IV × 0.98 (intrinsic value - 2%)",
      "0.5% trading fee on all transactions",
      "Track your portfolio and profits in real-time",
    ],
  },
  {
    title: "Ready to Trade",
    description: "You're all set! Short the patriarchy. Long your vocabulary. Trade the zeitgeist.",
    icon: Trophy,
    content: [
      "Start by submitting your first word",
      "Or buy shares in existing trending words",
      "Watch the ticker for market movements",
      "Climb the leaderboard and prove your trading prowess",
    ],
  },
];

export function WelcomeTour({ open, onOpenChange }: WelcomeTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Reset to first step when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
    }
  }, [open]);
  
  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark tour as completed in localStorage
      localStorage.setItem("wordex-tour-completed", "true");
      setCurrentStep(0);
      onOpenChange(false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("wordex-tour-completed", "true");
    setCurrentStep(0);
    onOpenChange(false);
  };

  const step = tourSteps[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === tourSteps.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" data-testid="dialog-welcome-tour">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-lg bg-primary/10 border-2 border-primary/20">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-display">{step.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                {tourSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 rounded-full transition-all ${
                      index === currentStep
                        ? "w-8 bg-primary"
                        : index < currentStep
                        ? "w-6 bg-primary/50"
                        : "w-4 bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogDescription className="text-base pt-2">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <ul className="space-y-3">
            {step.content.map((item, index) => (
              <li key={index} className="flex items-start gap-3 text-sm">
                <div className="mt-0.5 p-1 rounded-full bg-primary/10">
                  <Check className="h-3 w-3 text-primary" />
                </div>
                <span className="text-foreground/90">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            data-testid="button-skip-tour"
          >
            Skip Tour
          </Button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                data-testid="button-previous-step"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleNext}
              data-testid="button-next-step"
            >
              {isLastStep ? (
                <>
                  Start Trading
                  <TrendingUp className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to check if user should see the tour
export function useShouldShowTour(user: any) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const tourCompleted = localStorage.getItem("wordex-tour-completed");
    if (!tourCompleted) {
      // Show tour after a short delay for new users
      const timer = setTimeout(() => {
        setShouldShow(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  return shouldShow;
}
