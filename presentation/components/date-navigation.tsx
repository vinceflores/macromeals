import { useState } from "react";
import { useSearchParams } from "react-router";
import { Calendar as CalendarIcon } from "lucide-react";
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

  function goToToday() {
    updateDate(localToday);
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm md:flex-row md:items-center md:justify-between w-full">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={() => navigateDays(-1)}
          className="rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors h-10"
        >
          Previous
        </Button>

        <Button
          variant="outline"
          onClick={goToToday}
          className="rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors h-10"
        >
          Today
        </Button>

        <Button
          variant="outline"
          onClick={() => navigateDays(1)}
          disabled={isToday}
          className="rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors h-10 disabled:opacity-50"
        >
          Next
        </Button>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="text-lg font-semibold hover:text-primary transition-colors flex items-center gap-2 outline-none">
            <CalendarIcon className="h-5 w-5 opacity-50" />
            {isToday
              ? "Today"
              : new Date(currentDate + "T00:00:00").toLocaleDateString(
                  "en-CA",
                  {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  },
                )}
          </button>
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
              date > new Date(localToday + "T00:00:00") ||
              date < new Date("2020-01-01")
            }
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <div className="hidden md:block w-[200px]" />
    </section>
  );
}
