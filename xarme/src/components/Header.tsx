import XeetOverlay from "@/assets/xeet.png";
import XeetLogo from "@/assets/xeet-logo.png";

export function Header() {
  return (
    <header className="relative overflow-hidden bg-background">
      <img
        src={XeetOverlay}
        alt="Top Left Overlay"
        className="absolute top-0 left-0 w-[300px] md:w-[400px] opacity-20 pointer-events-none select-none"
      />

      <div className="absolute top-6 left-6">
        <img
          src={XeetLogo}
          alt="Xeet Logo"
          className="h-14 w-auto"
        />
      </div>

      {/* Hero content */}
      <div className="relative container mx-auto px-4 py-20">
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-7xl font-bold mb-6 gradient-text float-animation">
            The Gamified InfoFi Ecosystem For Social Resources
          </h1>
          <p className="text-xl md:text-3xl gradient-text-accent">
            A game layer for X
          </p>
        </div>
      </div>
    </header>
  );
}
