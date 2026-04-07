import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { ArrowUp } from "lucide-react";

type BackToTopButtonProps = {
  containerRef?: React.RefObject<HTMLElement>;
  heightToShow?: number;
};

export function BackToTopButton({ containerRef, heightToShow = 300 }: BackToTopButtonProps) {
  let timeout: NodeJS.Timeout;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setIsVisible(() => {
          const container = containerRef?.current;
          const scrollTop = container ? container.scrollTop : window.scrollY;
          return scrollTop > heightToShow;
        });
      }, 100);
    };

    handleScroll();

    containerRef?.current?.addEventListener("scroll", handleScroll);
    window.addEventListener("scroll", handleScroll);

    return () => {
      clearTimeout(timeout);
      containerRef?.current?.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (!isVisible) return null;

  const scrollToTop = () => {
    const container = containerRef?.current;
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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
