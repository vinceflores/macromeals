import { useState } from "react";
import { useSearchParams } from "react-router";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { getLocalToday } from "~/lib/date";

interface DateNavigationProps {
  currentDate: string;
}

export function DateNavigation({ currentDate }: DateNavigationProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);

  const localToday = getLocalToday();
  const isToday = currentDate === localToday;

  function updateDate(dateString: string) {
    if (dateString === currentDate) {
      setOpen(false);
      return;
    }

    if (dateString > localToday) {
      setOpen(false);
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.set("date", dateString);

    setOpen(false);
    setSearchParams(next, { replace: true });
  }

  function navigateDays(days: number) {
    const date = new Date(currentDate + "T00:00:00");
    date.setDate(date.getDate() + days);
    updateDate(date.toLocaleDateString("en-CA"));
  }

  return (
    <div className="flex items-center justify-between bg-card border rounded-lg p-1 shadow-sm w-full">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigateDays(-1)}
        className="h-8 w-8"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="flex-1 font-medium text-sm hover:bg-accent/50 h-8 gap-2"
          >
            <CalendarIcon className="h-3.5 w-3.5 opacity-50" />
            {isToday
              ? "Today"
              : format(new Date(currentDate + "T00:00:00"), "MMM d, yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            today={new Date(localToday + "T00:00:00")}
            selected={new Date(currentDate + "T00:00:00")}
            onSelect={(date) => {
              if (date) {
                updateDate(date.toLocaleDateString("en-CA"));
              }
            }}
            disabled={(date) =>
              date > new Date() || date < new Date("2020-01-01")
            }
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigateDays(1)}
        disabled={isToday}
        className="h-8 w-8"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
