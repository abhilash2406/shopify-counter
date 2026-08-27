import { useEffect } from "react";

// Polaris's Modal calls onClose on any backdrop click, with no prop to opt
// out (unlike Escape/the header close button, which stay intentional). This
// intercepts backdrop clicks at the capture phase — before they can bubble
// up to React's onClose handler — so an accidental outside click doesn't
// discard in-progress form input.
export function useDisableModalBackdropClose(isOpen) {
  useEffect(() => {
    if (!isOpen) return undefined;

    function handleCapture(event) {
      if (event.target.closest?.(".Polaris-Backdrop")) {
        event.stopPropagation();
      }
    }

    document.addEventListener("click", handleCapture, true);
    return () => document.removeEventListener("click", handleCapture, true);
  }, [isOpen]);
}
