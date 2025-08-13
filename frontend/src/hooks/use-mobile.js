import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

// Enhanced mobile hook with additional features
export function useMobileFeatures() {
  const [isMobile, setIsMobile] = React.useState(undefined);
  const [isTouchDevice, setIsTouchDevice] = React.useState(false);
  const [orientation, setOrientation] = React.useState("portrait");
  const [screenSize, setScreenSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
    };

    // Check if touch device
    const checkTouchDevice = () => {
      const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      setIsTouchDevice(touch);
    };

    // Check orientation
    const checkOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      setOrientation(isPortrait ? "portrait" : "landscape");
    };

    // Update screen size
    const updateScreenSize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Initial checks
    checkMobile();
    checkTouchDevice();
    checkOrientation();
    updateScreenSize();

    // Event listeners
    const handleResize = () => {
      checkMobile();
      checkOrientation();
      updateScreenSize();
    };

    const handleOrientationChange = () => {
      setTimeout(() => {
        checkOrientation();
        updateScreenSize();
      }, 100);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, []);

  return {
    isMobile: !!isMobile,
    isTouchDevice,
    orientation,
    screenSize,
    isSmallScreen: screenSize.width < 480,
    isMediumScreen: screenSize.width >= 480 && screenSize.width < 768,
    isLargeScreen: screenSize.width >= 768,
  };
}

// Hook for mobile-specific interactions
export function useMobileInteractions() {
  const [isScrolling, setIsScrolling] = React.useState(false);
  const [scrollDirection, setScrollDirection] = React.useState("none");
  const [lastScrollY, setLastScrollY] = React.useState(0);

  React.useEffect(() => {
    let scrollTimeout;

    const handleScroll = () => {
      setIsScrolling(true);

      const currentScrollY = window.scrollY;
      const direction = currentScrollY > lastScrollY ? "down" : "up";
      setScrollDirection(direction);
      setLastScrollY(currentScrollY);

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
        setScrollDirection("none");
      }, 150);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [lastScrollY]);

  return {
    isScrolling,
    scrollDirection,
  };
}

// Hook for preventing zoom on input focus (iOS)
export function usePreventZoom() {
  React.useEffect(() => {
    const preventZoom = (e) => {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "SELECT" ||
        e.target.tagName === "TEXTAREA"
      ) {
        const viewport = document.querySelector("meta[name=viewport]");
        if (viewport) {
          viewport.setAttribute(
            "content",
            "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
          );
        }
      }
    };

    const restoreZoom = () => {
      const viewport = document.querySelector("meta[name=viewport]");
      if (viewport) {
        viewport.setAttribute("content", "width=device-width, initial-scale=1");
      }
    };

    document.addEventListener("focusin", preventZoom);
    document.addEventListener("focusout", restoreZoom);

    return () => {
      document.removeEventListener("focusin", preventZoom);
      document.removeEventListener("focusout", restoreZoom);
    };
  }, []);
}
