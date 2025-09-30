import { StatsCard } from "./StatsCard";
import Xeet from "@/assets/xeet.png";

export function SocialDataSection() {
  const stats = [
    { title: "Posts per second", value: "6K" },
    { title: "Views per day", value: "500M" },
    { title: "Impressions per day", value: "200B" },
    { title: "Monthly average users", value: "450M" },
  ];

  return (
    <section className="relative overflow-hidden">
      <img
        src={Xeet}
        alt="Background Overlay"
        className="absolute bottom-0 right-0 w-[400px] md:w-[600px] opacity-20 pointer-events-none select-none"
      />

      <div className="relative container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold gradient-text-accent mb-6">
            Social Data Economy
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real-time insights powering the next generation of social finance
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {stats.map((stat, index) => (
            <StatsCard
              key={index}
              title={stat.title}
              value={stat.value}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
