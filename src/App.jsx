import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AdminPage } from "./AdminPage";
import { ContentProvider } from "./content-context";
import { AboutPage, ContactPage, HomePage, ResumePage } from "./pages";

function AnimatedRoutes() {
  const location = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [location.pathname]);
  return <AnimatePresence mode="wait"><motion.div key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .28 }}>
    <Routes location={location}>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/resume" element={<ResumePage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  </motion.div></AnimatePresence>;
}

export function App() {
  return <BrowserRouter><ContentProvider><AnimatedRoutes /></ContentProvider></BrowserRouter>;
}
