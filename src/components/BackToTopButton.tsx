import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { ArrowUp } from "lucide-react";

type BackToTopButtonProps = {
  container?: HTMLElement | null;
};

export function BackToTopButton({ container }: BackToTopButtonProps) {
  let timeout: NodeJS.Timeout;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setIsVisible((container?.scrollTop ?? window.scrollY) > 300);
      }, 100);
    };

    handleScroll();

    (container ?? window).addEventListener("scroll", handleScroll);
    return () =>
      (container ?? window).removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  const scrollToTop = () => {
    (container ?? window).scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className="fixed bottom-4 right-4 rounded-md bg-primary text-white shadow-lg hover:bg-primary/90 transition-opacity opacity-80 hover:opacity-100"
      aria-label="Back to top"
    >
      <ArrowUp />
    </Button>
  );
}
