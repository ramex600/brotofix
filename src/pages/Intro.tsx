import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import brototypelogo from "@/assets/brototype-logo.jpg";

const Intro = () => {
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 2000);

    const redirectTimer = setTimeout(() => {
      navigate("/login");
    }, 2500);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(redirectTimer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated logo */}
      <div
        className={`transition-opacity duration-500 ${
          isExiting ? "animate-fade-out" : "animate-fade-in"
        }`}
      >
        <div className="animate-scale-in animate-glow-pulse">
          <img
            src={brototypelogo}
            alt="Brototype Logo"
            className="w-64 h-64 md:w-80 md:h-80 object-contain rounded-full"
          />
        </div>
      </div>

      {/* Loading text */}
      <div
        className={`absolute bottom-20 text-foreground/20 text-sm tracking-widest transition-opacity duration-500 ${
          isExiting ? "opacity-0" : "opacity-100"
        }`}
      >
        Loading...
      </div>
    </div>
  );
};

export default Intro;
