// Contains reusable navigation, footer, layout, contact, motion, and project presentation components.
import { motion, useScroll, useTransform } from "motion/react";
import { EnvelopeSimple, FacebookLogo, GithubLogo, LinkedinLogo, WhatsappLogo, ArrowUpRight, List, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useContent } from "./content-context";

// Reusable scroll-reveal animation settings for public page sections.
export const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] },
};

// Moves the aurora image slowly while the visitor scrolls to create depth.
export function AuroraBackground({ compact = false }) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1200], [0, compact ? 70 : 150]);
  return (
    <motion.div className={`aurora-bg ${compact ? "aurora-bg--compact" : ""}`} style={{ y }} aria-hidden="true">
      <img src="/assets/aurora-landscape.png" alt="" />
      <span className="aurora-bg__veil" />
    </motion.div>
  );
}

// Renders desktop navigation and the expandable mobile menu.
export function Header() {
  const [open, setOpen] = useState(false);
  // One list keeps desktop and mobile navigation labels consistent.
  const links = [["/", "Home"], ["/about", "About"], ["/projects", "Projects"], ["/resume", "Resume"], ["/contact", "Contact"]];
  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="Tang Keng Hin home"><span>TKH</span></Link>
      <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>
        {open ? <X size={24} /> : <List size={24} />}
      </button>
      <nav className={open ? "nav nav--open" : "nav"} aria-label="Primary navigation">
        {links.map(([href, label]) => <NavLink key={href} to={href} onClick={() => setOpen(false)}>{label}</NavLink>)}
      </nav>
    </header>
  );
}

// Reads live contact data so Admin changes update every footer link.
export function Footer() {
  const { content } = useContent();
  if (!content) return null;
  const { profile, contact } = content;
  return (
    <footer className="footer">
      <div className="footer__profile">
        <img src={profile.portraitUrl || "/assets/tang-keng-hin.jpg"} alt="Tang Keng Hin" />
        <div><strong>{profile.name}</strong><span>{profile.role}</span><p>Building secure, reliable, and meaningful technology.</p></div>
      </div>
      <div className="footer__column"><span className="micro-label">Explore</span><Link to="/">Home</Link><Link to="/about">About</Link><Link to="/projects">Projects</Link><Link to="/resume">Resume</Link><Link to="/contact">Contact</Link></div>
      <div className="footer__column footer__connect"><span className="micro-label">Connect</span><div>
        <a href={contact.github} target="_blank" rel="noreferrer" aria-label="GitHub"><GithubLogo size={24} weight="fill" /></a>
        {contact.linkedin && <a href={contact.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn"><LinkedinLogo size={24} weight="fill" /></a>}
        {contact.facebook && <a href={contact.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><FacebookLogo size={24} weight="fill" /></a>}
        <a href={`mailto:${contact.email}`} aria-label="Gmail"><EnvelopeSimple size={24} /></a>
        {contact.whatsapp && <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer" aria-label="WhatsApp"><WhatsappLogo size={24} weight="fill" /></a>}
      </div></div>
      <div className="footer__bottom"><span>© {new Date().getFullYear()} Tang Keng Hin <i>·</i> <a href={contact.github} target="_blank" rel="noreferrer">Source</a></span><Link className="footer__admin" to="/admin">Admin</Link></div>
    </footer>
  );
}

// Wraps every public page with the shared background, header, and footer.
export function Layout({ children, compactBackground = true }) {
  return <div className="app-shell"><AuroraBackground compact={compactBackground} /><Header /><main>{children}</main><Footer /></div>;
}

// Creates a consistent animated heading for inner pages.
export function PageIntro({ eyebrow, title, children }) {
  return <motion.section className="page-intro" {...reveal}><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{children}</motion.section>;
}

// Builds contact buttons only for links that have been configured.
export function ContactButtons({ contact, large = false }) {
  return <div className={`contact-buttons ${large ? "contact-buttons--large" : ""}`}>
    <a className="contact-button contact-button--primary" href={`mailto:${contact.email}`}><EnvelopeSimple size={22} />Gmail<ArrowUpRight size={18} /></a>
    <a className="contact-button" href={contact.github} target="_blank" rel="noreferrer"><GithubLogo size={22} weight="fill" />GitHub<ArrowUpRight size={18} /></a>
    {contact.linkedin && <a className="contact-button" href={contact.linkedin} target="_blank" rel="noreferrer"><LinkedinLogo size={22} weight="fill" />LinkedIn<ArrowUpRight size={18} /></a>}
    {contact.facebook && <a className="contact-button" href={contact.facebook} target="_blank" rel="noreferrer"><FacebookLogo size={22} weight="fill" />Facebook<ArrowUpRight size={18} /></a>}
    {contact.whatsapp && <a className="contact-button" href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer"><WhatsappLogo size={22} weight="fill" />WhatsApp<ArrowUpRight size={18} /></a>}
  </div>;
}

// Appears briefly while Supabase content is being loaded.
export function LoadingScreen() {
  return <div className="loading-screen"><span /><p>Loading portfolio</p></div>;
}
