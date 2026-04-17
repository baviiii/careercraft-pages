import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ActivityHeatmapProps {
  activityLogs: Array<{ created_at: string }>;
}

export function ActivityHeatmap({ activityLogs }: ActivityHeatmapProps) {
  // Generate heatmap data for last 12 weeks
  const generateHeatmapData = () => {
    const weeks: { date: Date; count: number; level: number }[][] = [];
    const today = new Date();
    
    for (let week = 11; week >= 0; week--) {
      const weekData: { date: Date; count: number; level: number }[] = [];
      
      for (let day = 0; day < 7; day++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (week * 7) - (6 - day));
        
        const count = activityLogs.filter(log => {
          const logDate = new Date(log.created_at).toISOString().split('T')[0];
          return logDate === date.toISOString().split('T')[0];
        }).length;

        // Determine level (0-4) based on activity count
        let level = 0;
        if (count > 0) level = 1;
        if (count > 5) level = 2;
        if (count > 10) level = 3;
        if (count > 20) level = 4;

        weekData.push({ date, count, level });
      }
      
      weeks.push(weekData);
    }
    
    return weeks;
  };

  const heatmapData = generateHeatmapData();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-muted/30';
      case 1: return 'bg-primary/20';
      case 2: return 'bg-primary/40';
      case 3: return 'bg-primary/60';
      case 4: return 'bg-primary';
      default: return 'bg-muted/30';
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Activity Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1">
          <div className="flex flex-col gap-1 mr-2">
            {days.map((day) => (
              <div key={day} className="h-3 text-[10px] text-muted-foreground flex items-center">
                {day}
              </div>
            ))}
          </div>
          
          <TooltipProvider>
            <div className="flex gap-1">
              {heatmapData.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day, dayIndex) => (
                    <Tooltip key={dayIndex}>
                      <TooltipTrigger>
                        <div 
                          className={`w-3 h-3 rounded-sm ${getLevelColor(day.level)} transition-colors hover:ring-1 hover:ring-primary`}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {day.date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-xs font-semibold">{day.count} activities</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
          </TooltipProvider>
        </div>
        
        <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <div key={level} className={`w-3 h-3 rounded-sm ${getLevelColor(level)}`} />
            ))}
          </div>
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}
