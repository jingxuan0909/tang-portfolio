import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AdminPage } from "./AdminPage";
import { ContentProvider } from "./content-context";
import { AboutPage, ContactPage, HomePage, ProjectsPage, ResumePage } from "./pages";
import { ResetPasswordPage } from "./ResetPasswordPage";

// Displays the page that matches the URL and fades between page changes.
function AnimatedRoutes() {
  const location = useLocation();
  // Always start a newly opened page at the top.
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [location.pathname]);
  return <AnimatePresence mode="wait"><motion.div key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .28 }}>
    <Routes location={location}>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/resume" element={<ResumePage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  </motion.div></AnimatePresence>;
}

// Provides routing and shared portfolio content to the entire application.
export function App() {
  return <BrowserRouter><ContentProvider><AnimatedRoutes /></ContentProvider></BrowserRouter>;
}
