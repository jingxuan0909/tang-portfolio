import { useEffect, useState } from "react";
import { ArrowLeft, ArrowSquareOut, FloppyDisk, Plus, SignOut, Trash, UploadSimple } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { useContent } from "./content-context";

async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body;
}

function Field({ label, value, onChange, multiline = false, type = "text" }) {
  const Component = multiline ? "textarea" : "input";
  return <label className="admin-field"><span>{label}</span><Component type={multiline ? undefined : type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} rows={multiline ? 4 : undefined} /></label>;
}

function ListEditor({ title, items, onChange }) {
  return <section className="admin-card"><div className="admin-card__heading"><h2>{title}</h2><button type="button" onClick={() => onChange([...items, ""])}><Plus /> Add</button></div>
    <div className="admin-list">{items.map((item, index) => <div className="admin-list__row" key={`${title}-${index}`}><input value={item} onChange={(event) => onChange(items.map((entry, entryIndex) => entryIndex === index ? event.target.value : entry))} /><button type="button" className="icon-button" onClick={() => onChange(items.filter((_, entryIndex) => entryIndex !== index))} aria-label={`Delete ${title} item`}><Trash /></button></div>)}</div>
  </section>;
}

async function uploadFile(file, csrf) {
  const response = await fetch("/api/uploads", { method: "POST", headers: { "Content-Type": file.type, "x-csrf-token": csrf }, body: file });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Upload failed");
  return body.url;
}

function PortraitEditor({ value, onChange, csrf, setMessage }) {
  const [uploading, setUploading] = useState(false);
  async function upload(file) {
    if (!file) return;
    setUploading(true); setMessage("");
    try {
      const url = await uploadFile(file, csrf);
      onChange(url); setMessage("Portrait uploaded successfully. Save all changes to publish it.");
    } catch (error) { setMessage(error.message); } finally { setUploading(false); }
  }
  return <div className="admin-portrait"><div className="admin-portrait__preview"><img src={value || "/assets/tang-keng-hin.jpg"} alt="Current portrait preview" /></div><div className="admin-portrait__controls"><Field label="Portrait image URL" value={value} onChange={onChange} /><p>Use a clear JPG, PNG, or WebP portrait. The same image appears across the portfolio.</p><label className="upload-button"><UploadSimple /> {uploading ? "Uploading…" : "Upload new portrait"}<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => upload(event.target.files?.[0])} /></label></div></div>;
}

function DocumentEditor({ title, items, onChange, csrf, setMessage }) {
  const [uploading, setUploading] = useState("");
  function update(index, key, value) { onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item)); }
  async function upload(index, file) {
    if (!file) return;
    setUploading(items[index].id); setMessage("");
    try {
      const url = await uploadFile(file, csrf);
      update(index, "url", url); setMessage("File uploaded successfully. Save all changes to publish it.");
    } catch (error) { setMessage(error.message); } finally { setUploading(""); }
  }
  return <section className="admin-card"><div className="admin-card__heading"><div><h2>{title}</h2><p>Add a PDF or image so visitors can open the original document.</p></div><button type="button" onClick={() => onChange([...items, { id: crypto.randomUUID(), title: `New ${title === "Awards" ? "award" : "certificate"}`, issuer: "", date: "", url: "" }])}><Plus /> Add</button></div>
    {items.map((item, index) => <article className="admin-repeat admin-document" key={item.id}>
      <div className="admin-grid"><Field label="Title" value={item.title} onChange={(value) => update(index, "title", value)} /><Field label="Issuer" value={item.issuer} onChange={(value) => update(index, "issuer", value)} /><Field label="Date / period" value={item.date} onChange={(value) => update(index, "date", value)} /><Field label="Document URL" value={item.url} onChange={(value) => update(index, "url", value)} /></div>
      <div className="admin-document__actions"><label className="upload-button"><UploadSimple /> {uploading === item.id ? "Uploading…" : "Upload PDF / image"}<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" disabled={Boolean(uploading)} onChange={(event) => upload(index, event.target.files?.[0])} /></label>{item.url && <a href={item.url} target="_blank" rel="noreferrer"><ArrowSquareOut /> Preview</a>}<button type="button" className="delete-button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}><Trash /> Delete</button></div>
    </article>)}
  </section>;
}

export function AdminPage() {
  const { content, setContent, refresh } = useContent();
  const [session, setSession] = useState({ loading: true, authenticated: false, csrf: "" });
  const [draft, setDraft] = useState(null);
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api("/api/auth/session").then((result) => setSession({ loading: false, ...result })).catch(() => setSession({ loading: false, authenticated: false, csrf: "" }));
  }, []);
  useEffect(() => { if (content && !draft) setDraft(structuredClone(content)); }, [content, draft]);

  async function login(event) {
    event.preventDefault(); setMessage("");
    try {
      const result = await api("/api/auth/login", { method: "POST", body: JSON.stringify(credentials) });
      setSession({ loading: false, ...result }); setCredentials({ username: "", password: "" });
    } catch (error) { setMessage(error.message); }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setSession({ loading: false, authenticated: false, csrf: "" }); setDraft(null);
  }

  async function save(event) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const result = await api("/api/content", { method: "PUT", headers: { "x-csrf-token": session.csrf }, body: JSON.stringify(draft) });
      setContent(result.content); await refresh(); setMessage("Changes saved successfully.");
    } catch (error) { setMessage(error.message); } finally { setSaving(false); }
  }

  function updateSection(section, key, value) { setDraft((current) => ({ ...current, [section]: { ...current[section], [key]: value } })); }
  function updateArray(section, index, key, value) { setDraft((current) => ({ ...current, [section]: current[section].map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) })); }

  if (session.loading || !content) return <div className="admin-loading">Checking secure session…</div>;
  if (!session.authenticated) return <main className="admin-login"><div className="admin-login__panel"><Link to="/"><ArrowLeft /> Back to portfolio</Link><span className="eyebrow">Private access</span><h1>Content Admin</h1><p>Sign in to update your public portfolio.</p><form onSubmit={login}><Field label="Username" value={credentials.username} onChange={(username) => setCredentials({ ...credentials, username })} /><Field label="Password" type="password" value={credentials.password} onChange={(password) => setCredentials({ ...credentials, password })} />{message && <p className="admin-message admin-message--error">{message}</p>}<button className="button button--primary" type="submit">Sign in</button></form></div></main>;
  if (!draft) return null;

  return <main className="admin-page"><header className="admin-header"><div><span className="eyebrow">Private workspace</span><h1>Portfolio Content</h1></div><div><Link className="button button--ghost" to="/"><ArrowLeft /> View site</Link><button className="button button--ghost" type="button" onClick={logout}><SignOut /> Log out</button></div></header>
    <form className="admin-form" onSubmit={save}>
      <section className="admin-card"><h2>Profile</h2><PortraitEditor value={draft.profile.portraitUrl} csrf={session.csrf} setMessage={setMessage} onChange={(value) => updateSection("profile", "portraitUrl", value)} /><div className="admin-grid"><Field label="Name" value={draft.profile.name} onChange={(value) => updateSection("profile", "name", value)} /><Field label="Role" value={draft.profile.role} onChange={(value) => updateSection("profile", "role", value)} /><Field label="Hero eyebrow" value={draft.profile.eyebrow} onChange={(value) => updateSection("profile", "eyebrow", value)} /><Field label="Availability" value={draft.profile.availability} onChange={(value) => updateSection("profile", "availability", value)} /><Field label="Intro" multiline value={draft.profile.intro} onChange={(value) => updateSection("profile", "intro", value)} /><Field label="Availability detail" multiline value={draft.profile.availabilityDetail} onChange={(value) => updateSection("profile", "availabilityDetail", value)} /></div></section>
      <section className="admin-card"><h2>About</h2><Field label="Heading" value={draft.about.heading} onChange={(value) => updateSection("about", "heading", value)} />{draft.about.paragraphs.map((paragraph, index) => <Field key={index} label={`Paragraph ${index + 1}`} multiline value={paragraph} onChange={(value) => updateSection("about", "paragraphs", draft.about.paragraphs.map((item, itemIndex) => itemIndex === index ? value : item))} />)}</section>
      <ListEditor title="Skills" items={draft.about.skills} onChange={(value) => updateSection("about", "skills", value)} />
      <section className="admin-card"><div className="admin-card__heading"><h2>Projects</h2><button type="button" onClick={() => setDraft({ ...draft, projects: [...draft.projects, { id: crypto.randomUUID(), title: "New project", description: "", tech: [], url: draft.contact.github }] })}><Plus /> Add project</button></div>{draft.projects.map((project, index) => <article className="admin-repeat" key={project.id}><div className="admin-grid"><Field label="Title" value={project.title} onChange={(value) => updateArray("projects", index, "title", value)} /><Field label="Project URL" value={project.url} onChange={(value) => updateArray("projects", index, "url", value)} /><Field label="Description" multiline value={project.description} onChange={(value) => updateArray("projects", index, "description", value)} /><Field label="Technologies (comma separated)" value={project.tech.join(", ")} onChange={(value) => updateArray("projects", index, "tech", value.split(",").map((item) => item.trim()).filter(Boolean))} /></div><button type="button" className="delete-button" onClick={() => setDraft({ ...draft, projects: draft.projects.filter((_, itemIndex) => itemIndex !== index) })}><Trash /> Delete project</button></article>)}</section>
      <section className="admin-card"><div className="admin-card__heading"><h2>Semester Results</h2><button type="button" onClick={() => setDraft({ ...draft, semesterResults: [...draft.semesterResults, { semester: "", gpa: "" }] })}><Plus /> Add result</button></div><div className="admin-results">{draft.semesterResults.map((result, index) => <div key={index}><Field label="Semester" value={result.semester} onChange={(value) => updateArray("semesterResults", index, "semester", value)} /><Field label="GPA" value={result.gpa} onChange={(value) => updateArray("semesterResults", index, "gpa", value)} /><button type="button" className="icon-button" onClick={() => setDraft({ ...draft, semesterResults: draft.semesterResults.filter((_, itemIndex) => itemIndex !== index) })}><Trash /></button></div>)}</div></section>
      <section className="admin-card"><h2>Contact</h2><div className="admin-grid"><Field label="Gmail address" type="email" value={draft.contact.email} onChange={(value) => updateSection("contact", "email", value)} /><Field label="GitHub URL" value={draft.contact.github} onChange={(value) => updateSection("contact", "github", value)} /><Field label="LinkedIn URL (optional)" value={draft.contact.linkedin} onChange={(value) => updateSection("contact", "linkedin", value)} /><Field label="Facebook URL" value={draft.contact.facebook} onChange={(value) => updateSection("contact", "facebook", value)} /><Field label="WhatsApp number (country code, no +)" value={draft.contact.whatsapp} onChange={(value) => updateSection("contact", "whatsapp", value.replace(/\D/g, ""))} /></div></section>
      <DocumentEditor title="Awards" items={draft.awards} csrf={session.csrf} setMessage={setMessage} onChange={(items) => setDraft((current) => ({ ...current, awards: items }))} />
      <DocumentEditor title="Certificates" items={draft.certifications} csrf={session.csrf} setMessage={setMessage} onChange={(items) => setDraft((current) => ({ ...current, certifications: items }))} />
      <div className="admin-save">{message && <p className={message.includes("successfully") ? "admin-message" : "admin-message admin-message--error"}>{message}</p>}<button className="button button--primary" type="submit" disabled={saving}><FloppyDisk /> {saving ? "Saving…" : "Save all changes"}</button></div>
    </form>
  </main>;
}
