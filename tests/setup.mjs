// Installs shared DOM assertions and resets browser-like state after every test.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

// Motion and dialog code use these browser APIs, which jsdom does not animate.
window.requestAnimationFrame = (callback) => window.setTimeout(callback, 0);
window.cancelAnimationFrame = (id) => window.clearTimeout(id);
window.scrollTo = vi.fn();
