import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { TransactionHistory } from "@/components/TransactionHistory";
import { SocialDataSection } from "@/components/SocialDataSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-background">
      <Header />
      <HeroSection />
      <SocialDataSection />
    </div>
  );
};

export default Index;
