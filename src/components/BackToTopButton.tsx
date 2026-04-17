import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { ArrowUp } from "lucide-react";

type BackToTopButtonProps = {
  containerRef?: React.RefObject<HTMLElement>;
  heightToShow?: number;
};

export function BackToTopButton({ containerRef, heightToShow = 300 }: BackToTopButtonProps) {
  let timeout: ReturnType<typeof setTimeout>;
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
      className="fixed bottom-20 right-4 h-8 w-8 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition-opacity opacity-80 hover:opacity-100"
      aria-label="Back to top"
    >
      <ArrowUp className="h-4 w-4" />
    </Button>
  );
}
