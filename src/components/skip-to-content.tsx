"use client";

/**
 * Skip-to-content link for keyboard/screen reader accessibility.
 * Visually hidden until focused via Tab key — an industry-standard a11y pattern.
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="fixed left-4 top-4 z-50 -translate-y-16 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      Skip to main content
    </a>
  );
}
