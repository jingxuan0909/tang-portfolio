import { motion } from "motion/react";
import { ArrowRight, ArrowSquareOut, Barbell, Briefcase, ChatCircleDots, ShieldCheck, Trophy, GraduationCap, Certificate, Sparkle, UsersThree } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { ContactButtons, Layout, LoadingScreen, PageIntro, reveal } from "./components";
import { useContent } from "./content-context";

const projectIcons = [ChatCircleDots, ShieldCheck, Barbell];

function CredentialCards({ items }) {
  return <div className="credential-grid">{items.map((item) => <a className="credential-card" href={item.url} target="_blank" rel="noreferrer" key={item.id}>
    <span className="credential-card__icon"><Certificate size={25} weight="duotone" /></span>
    <span className="credential-card__copy"><strong>{item.title}</strong><small>{item.issuer}{item.date ? ` · ${item.date}` : ""}</small></span>
    <ArrowSquareOut className="credential-card__arrow" size={20} />
  </a>)}</div>;
}

export function HomePage() {
  const { content, error } = useContent();
  if (!content) return <LoadingScreen />;
  const { profile, about, projects, semesterResults, contact } = content;
  return (
    <Layout compactBackground={false}>
      <section className="hero">
        <div className="hero__copy">
          <motion.span className="eyebrow" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .15 }}>Hello, I’m</motion.span>
          <motion.h1 initial={{ opacity: 0, y: 34 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .85, delay: .22 }}>{profile.name}</motion.h1>
          <motion.p className="hero__role" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .55 }}>{profile.eyebrow}</motion.p>
          <motion.p className="hero__intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .68 }}>{profile.intro}</motion.p>
          <motion.div className="hero__actions" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .82 }}>
            <Link className="button button--primary" to="/about">About me <ArrowRight /></Link>
            <Link className="button button--ghost" to="/resume">View resume <ArrowRight /></Link>
          </motion.div>
        </div>
        <motion.div className="portrait-frame" initial={{ opacity: 0, scale: .94, rotate: 1.5 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 1, delay: .28 }}>
          <img src={profile.portraitUrl || "/assets/tang-keng-hin.jpg"} alt="Tang Keng Hin" />
        </motion.div>
      </section>

      {error && <p className="notice">{error}</p>}

      <section className="home-grid section-wrap">
        <motion.div className="about-preview" {...reveal}>
          <span className="eyebrow">About me</span><h2>{about.heading}</h2>
          {about.paragraphs.map((paragraph, index) => <p key={`home-about-${index}`}>{paragraph}</p>)}
          <div className="skill-cloud">{about.skills.map((skill, index) => <span key={`home-skill-${index}`}>{skill}</span>)}</div>
        </motion.div>
        <motion.div className="project-preview" {...reveal} transition={{ ...reveal.transition, delay: .1 }}>
          <span className="eyebrow">Projects</span><h2>Recent Projects</h2>
          <div className="project-list">{projects.map((project, index) => {
            const Icon = projectIcons[index % projectIcons.length];
            return <a href={project.url} target="_blank" rel="noreferrer" className="project-row" key={project.id}>
              <span className="project-row__icon"><Icon size={28} weight="duotone" /></span>
              <span><strong>{project.title}</strong><small>{project.description}</small></span><ArrowRight size={22} />
            </a>;
          })}</div>
          <a className="text-link" href={contact.github} target="_blank" rel="noreferrer">View all projects <ArrowRight /></a>
        </motion.div>
      </section>

      <motion.section className="results section-wrap" {...reveal}>
        <span className="eyebrow">Semester results</span><h2>Academic Progress</h2>
        <div className="results-grid">{semesterResults.map((result, index) => <article key={`${result.semester}-${index}`}><Trophy size={22} weight="duotone" /><small>Semester {result.semester}</small><strong>{result.gpa}</strong><span>GPA</span></article>)}</div>
        <p>Consistent progress. Continuous growth.</p>
      </motion.section>

      <motion.section className="home-experience section-wrap" {...reveal}>
        <div className="section-heading"><div><span className="eyebrow">Experience</span><h2>Practical Experience</h2></div><Link className="text-link" to="/resume">View full resume <ArrowRight /></Link></div>
        <div className="experience-grid">{content.experience.map((item, index) => <article className="experience-card" key={item.id || `${item.company}-${index}`}><span className="experience-card__icon"><Briefcase size={23} weight="duotone" /></span><small>{item.period}</small><h3>{item.company}</h3><strong>{item.role}</strong><p>{item.description}</p></article>)}</div>
      </motion.section>

      <motion.section className="home-credentials section-wrap" {...reveal}>
        <span className="eyebrow">Achievements</span><h2>Awards & Certificates</h2>
        <div className="home-credentials__columns"><div><h3>Awards</h3><CredentialCards items={content.awards} /></div><div><h3>Certificates</h3><CredentialCards items={content.certifications} /></div></div>
      </motion.section>

      <motion.section className="availability section-wrap" {...reveal}>
        <div><span className="availability__mark"><Sparkle size={30} weight="fill" /></span><span><h2>{profile.availability}</h2><p>{profile.availabilityDetail}</p></span></div>
        <Link className="button button--primary" to="/contact">Let’s connect <ArrowRight /></Link>
      </motion.section>

      <motion.section className="connect-panel section-wrap" {...reveal}>
        <div><h2>Let’s Build Something Meaningful</h2><p>I’m open to opportunities, collaborations, and conversations. Feel free to reach out.</p></div>
        <ContactButtons contact={contact} />
      </motion.section>
    </Layout>
  );
}

export function AboutPage() {
  const { content } = useContent();
  if (!content) return <LoadingScreen />;
  return <Layout><PageIntro eyebrow="About" title={content.about.heading}><p>{content.about.paragraphs[0]}</p></PageIntro>
    <section className="content-section two-column">
      <motion.div className="portrait-secondary" {...reveal}><img src={content.profile.portraitUrl || "/assets/tang-keng-hin.jpg"} alt="Tang Keng Hin" /></motion.div>
      <motion.div className="prose" {...reveal}>{content.about.paragraphs.map((paragraph, index) => <p key={`about-${index}`}>{paragraph}</p>)}<h2>What I work with</h2><div className="skill-cloud skill-cloud--large">{content.about.skills.map((skill, index) => <span key={`about-skill-${index}`}>{skill}</span>)}</div></motion.div>
    </section>
  </Layout>;
}

export function ResumePage() {
  const { content } = useContent();
  if (!content) return <LoadingScreen />;
  return <Layout><PageIntro eyebrow="Resume" title="Experience, education, and skills"><p>{content.profile.intro}</p></PageIntro>
    <section className="content-section resume-layout">
      <motion.div className="resume-block" {...reveal}><h2><Trophy /> Semester Results</h2><div className="result-table">{content.semesterResults.map((item, index) => <div key={`${item.semester}-${index}`}><span>Semester {item.semester}</span><strong>{item.gpa}</strong></div>)}</div></motion.div>
      <motion.div className="resume-block" {...reveal}><h2><GraduationCap /> Education</h2>{content.education.map((item, index) => <article className="timeline-item" key={item.id || `${item.institution}-${index}`}><span>{item.period}</span><h3>{item.institution}</h3><p>{item.qualification}</p></article>)}</motion.div>
      <motion.div className="resume-block resume-block--wide" {...reveal}><h2>Experience</h2>{content.experience.map((item, index) => <article className="timeline-item" key={item.id || `${item.company}-${index}`}><span>{item.period}</span><h3>{item.company}</h3><strong>{item.role}</strong><p>{item.description}</p></article>)}</motion.div>
      <motion.div className="resume-block resume-block--wide" {...reveal}><h2><UsersThree /> Extra Curricular Activities</h2>{content.extraCurricularActivities.map((item, index) => <article className="timeline-item" key={item.id || `${item.club}-${index}`}><span>{item.period}</span><h3>{item.club}</h3><strong>{item.position}</strong><p>{item.description}</p></article>)}</motion.div>
      <motion.div className="resume-block resume-block--wide" {...reveal}><h2><Briefcase /> Projects</h2><div className="resume-project-grid">{content.projects.map((project, index) => { const Icon = projectIcons[index % projectIcons.length]; return <a href={project.url} target="_blank" rel="noreferrer" className="project-row" key={project.id}><span className="project-row__icon"><Icon size={28} weight="duotone" /></span><span><strong>{project.title}</strong><small>{project.description}</small></span><ArrowSquareOut size={20} /></a>; })}</div></motion.div>
      <motion.div className="resume-block" {...reveal}><h2>Skills</h2><div className="skill-cloud skill-cloud--large">{content.about.skills.map((skill, index) => <span key={`resume-skill-${index}`}>{skill}</span>)}</div></motion.div>
      <motion.div className="resume-block resume-block--wide" {...reveal}><h2><Trophy /> Awards</h2><p className="credential-intro">Select an award to view the original letter.</p><CredentialCards items={content.awards} /></motion.div>
      <motion.div className="resume-block resume-block--wide" {...reveal}><h2><Certificate /> Certificates</h2><p className="credential-intro">Select a certificate to view the verified document.</p><CredentialCards items={content.certifications} /></motion.div>
    </section>
  </Layout>;
}

export function ContactPage() {
  const { content } = useContent();
  if (!content) return <LoadingScreen />;
  return <Layout><section className="contact-page"><motion.div {...reveal}><span className="eyebrow">Contact</span><h1>Let’s create something secure and impactful.</h1><p>I’m currently looking for a 16+ week internship and I’m always open to thoughtful collaborations and technical conversations.</p><a className="contact-email" href={`mailto:${content.contact.email}`}>{content.contact.email}</a><ContactButtons contact={content.contact} large /></motion.div></section></Layout>;
}
