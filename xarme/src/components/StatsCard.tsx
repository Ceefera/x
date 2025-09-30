import { Card } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string;
}

export function StatsCard({ title, value }: StatsCardProps) {
  return (
    <Card className="p-8 bg-card/80 backdrop-blur-sm border-border shadow-intense hover:shadow-intense hover:border-electric-blue/50 transition-all duration-500 group">
      <div className="text-center space-y-3">
        <div className="text-3xl md:text-4xl font-bold gradient-text group-hover:gradient-text-accent transition-all duration-300">
          {value}
        </div>
        <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
          {title}
        </div>
      </div>
    </Card>
  );
}