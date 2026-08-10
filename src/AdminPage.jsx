import { useEffect, useState } from "react";
import { ArrowLeft, ArrowSquareOut, FloppyDisk, Plus, SignOut, Trash, UploadSimple } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { useContent } from "./content-context";
import { isSupabaseConfigured, supabase } from "./supabase";

function Field({ label, value, onChange, multiline = false, type = "text", autoComplete }) {
  const Component = multiline ? "textarea" : "input";
  return <label className="admin-field"><span>{label}</span><Component type={multiline ? undefined : type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} rows={multiline ? 4 : undefined} autoComplete={autoComplete} /></label>;
}

function ListEditor({ title, description, items, onChange }) {
  return <section className="admin-card"><div className="admin-card__heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button type="button" onClick={() => onChange([...items, ""])}><Plus /> Add</button></div>
    <div className="admin-list">{items.map((item, index) => <div className="admin-list__row" key={`${title}-${index}`}><input value={item} onChange={(event) => onChange(items.map((entry, entryIndex) => entryIndex === index ? event.target.value : entry))} /><button type="button" className="icon-button" onClick={() => onChange(items.filter((_, entryIndex) => entryIndex !== index))} aria-label={`Delete ${title} item`}><Trash /></button></div>)}</div>
  </section>;
}

function TextListEditor({ title, items, onChange }) {
  return <section className="admin-card"><div className="admin-card__heading"><div><h2>{title}</h2><p>Add, edit, or remove paragraphs. Every page using this content updates together.</p></div><button type="button" onClick={() => onChange([...items, ""])}><Plus /> Add paragraph</button></div>
    <div className="admin-list">{items.map((item, index) => <div className="admin-list__row admin-list__row--multiline" key={`${title}-${index}`}><textarea rows="4" value={item} onChange={(event) => onChange(items.map((entry, entryIndex) => entryIndex === index ? event.target.value : entry))} /><button type="button" className="icon-button" onClick={() => onChange(items.filter((_, entryIndex) => entryIndex !== index))} aria-label={`Delete ${title} paragraph`}><Trash /></button></div>)}</div>
  </section>;
}

function RecordEditor({ title, description, items, fields, createItem, onChange }) {
  function update(index, key, value) {
    onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  }
  return <section className="admin-card"><div className="admin-card__heading"><div><h2>{title}</h2><p>{description}</p></div><button type="button" onClick={() => onChange([...items, createItem()])}><Plus /> Add</button></div>
    {items.map((item, index) => <article className="admin-repeat" key={item.id || `${title}-${index}`}><div className="admin-grid">{fields.map((field) => <Field key={field.key} label={field.label} multiline={field.multiline} value={item[field.key]} onChange={(value) => update(index, field.key, value)} />)}</div><button type="button" className="delete-button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}><Trash /> Delete</button></article>)}
  </section>;
}

const educationFields = [
  { key: "institution", label: "Institution" },
  { key: "qualification", label: "Qualification" },
  { key: "period", label: "Period" },
];
const experienceFields = [
  { key: "company", label: "Company" },
  { key: "role", label: "Role" },
  { key: "period", label: "Period" },
  { key: "description", label: "Description", multiline: true },
];
const activityFields = [
  { key: "club", label: "Club / organisation" },
  { key: "position", label: "Position" },
  { key: "period", label: "Period" },
  { key: "description", label: "Description", multiline: true },
];

async function uploadFile(file) {
  const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) throw new Error("Only PDF, JPG, PNG, and WebP files are allowed.");
  if (file.size > 10 * 1024 * 1024) throw new Error("File must be 10 MB or smaller.");
  const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "bin";
  const path = `${new Date().getFullYear()}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("portfolio-files").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("portfolio-files").getPublicUrl(path);
  return data.publicUrl;
}

function normalizeExternalUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function PortraitEditor({ value, onChange, onUploadComplete, setMessage }) {
  const [uploading, setUploading] = useState(false);
  async function upload(file) {
    if (!file) return;
    setUploading(true); setMessage("");
    try {
      const url = await uploadFile(file);
      onChange(url);
      await onUploadComplete(url);
      setMessage("Portrait uploaded and published successfully.");
    } catch (error) { setMessage(error.message); } finally { setUploading(false); }
  }
  return <div className="admin-portrait"><div className="admin-portrait__preview"><img src={value || "/assets/tang-keng-hin.jpg"} alt="Current portrait preview" /></div><div className="admin-portrait__controls"><strong>Current portrait</strong><p>Select a real JPG, PNG, or WebP file from your device. It will be uploaded to Supabase and published across the portfolio.</p><label className="upload-button"><UploadSimple /> {uploading ? "Uploading…" : "Choose and upload portrait"}<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => upload(event.target.files?.[0])} /></label></div></div>;
}

function DocumentEditor({ title, items, onChange, onUploadComplete, setMessage }) {
  const [uploading, setUploading] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  function update(index, key, value) { onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item)); }
  async function upload(index, file) {
    if (!file) return;
    setUploading(items[index].id); setMessage(""); setUploadStatus("");
    try {
      const url = await uploadFile(file);
      const nextItems = items.map((item, itemIndex) => itemIndex === index ? { ...item, url } : item);
      onChange(nextItems);
      await onUploadComplete(nextItems);
      setUploadStatus("PDF/image uploaded and published successfully.");
      setMessage("File uploaded and published successfully.");
    } catch (error) { setUploadStatus(error.message); setMessage(error.message); } finally { setUploading(""); }
  }
  return <section className="admin-card"><div className="admin-card__heading"><div><h2>{title}</h2><p>Add the entry first, complete its details, then upload a PDF/image. Successful uploads are published automatically.</p></div><button type="button" onClick={() => onChange([...items, { id: crypto.randomUUID(), title: `New ${title === "Awards" ? "award" : "certificate"}`, issuer: "", date: "", url: "" }])}><Plus /> Add</button></div>
    {items.map((item, index) => <article className="admin-repeat admin-document" key={item.id}>
      <div className="admin-grid"><Field label="Title" value={item.title} onChange={(value) => update(index, "title", value)} /><Field label="Issuer" value={item.issuer} onChange={(value) => update(index, "issuer", value)} /><Field label="Date / period" value={item.date} onChange={(value) => update(index, "date", value)} /></div>
      <div className="admin-document__actions"><label className="upload-button"><UploadSimple /> {uploading === item.id ? "Uploading…" : item.url ? "Replace PDF / image" : "Choose and upload PDF / image"}<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" disabled={Boolean(uploading)} onChange={(event) => upload(index, event.target.files?.[0])} /></label>{item.url && <a href={item.url} target="_blank" rel="noreferrer"><ArrowSquareOut /> View uploaded file</a>}<button type="button" className="delete-button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}><Trash /> Delete</button></div>
    </article>)}
    {uploadStatus && <p className={uploadStatus.includes("successfully") ? "admin-message" : "admin-message admin-message--error"}>{uploadStatus}</p>}
  </section>;
}

export function AdminPage() {
  const { content, setContent, refresh } = useContent();
  const [session, setSession] = useState({ loading: true, authenticated: false });
  const [draft, setDraft] = useState(null);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setSession({ loading: false, authenticated: false });
      return undefined;
    }
    supabase.auth.getSession().then(({ data }) => setSession({ loading: false, authenticated: Boolean(data.session) }));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession({ loading: false, authenticated: Boolean(nextSession) });
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (content && !draft) setDraft(structuredClone(content)); }, [content, draft]);

  async function login(event) {
    event.preventDefault(); setMessage("");
    try {
      const { error } = await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      setSession({ loading: false, authenticated: true }); setCredentials({ email: "", password: "" });
    } catch (error) { setMessage(error.message); }
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession({ loading: false, authenticated: false }); setDraft(null);
  }

  async function requestPasswordReset() {
    setMessage("");
    const email = credentials.email.trim();
    if (!email) {
      setMessage("Enter your Admin email first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setMessage(error ? error.message : "Password recovery email sent. Use only the newest email link.");
  }

  async function persistContent(nextDraft, successMessage = "Changes saved successfully.") {
    const normalizedDraft = {
      ...nextDraft,
      contact: {
        ...nextDraft.contact,
        github: normalizeExternalUrl(nextDraft.contact.github),
        linkedin: normalizeExternalUrl(nextDraft.contact.linkedin),
        facebook: normalizeExternalUrl(nextDraft.contact.facebook),
      },
    };
    const { data, error } = await supabase
      .from("portfolio_content")
      .upsert({ id: 1, content: normalizedDraft, updated_at: new Date().toISOString() }, { onConflict: "id" })
      .select("content")
      .single();
    if (error) throw error;
    setDraft(structuredClone(data.content));
    setContent(data.content);
    await refresh();
    setMessage(successMessage);
    return data.content;
  }

  async function save(event) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      await persistContent(draft);
    } catch (error) { setMessage(error.message); } finally { setSaving(false); }
  }

  function updateSection(section, key, value) { setDraft((current) => ({ ...current, [section]: { ...current[section], [key]: value } })); }
  function updateArray(section, index, key, value) { setDraft((current) => ({ ...current, [section]: current[section].map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) })); }

  if (session.loading || !content) return <div className="admin-loading">Checking secure session…</div>;
  if (!session.authenticated) return <main className="admin-login"><div className="admin-login__panel"><Link to="/"><ArrowLeft /> Back to portfolio</Link><span className="eyebrow">Private access</span><h1>Content Admin</h1><p>Sign in with your Supabase Admin account.</p>{!isSupabaseConfigured && <p className="admin-message admin-message--error">Supabase environment variables are missing.</p>}<form onSubmit={login} autoComplete="off"><Field label="Email" type="email" autoComplete="off" value={credentials.email} onChange={(email) => setCredentials({ ...credentials, email })} /><Field label="Password" type="password" autoComplete="off" value={credentials.password} onChange={(password) => setCredentials({ ...credentials, password })} />{message && <p className={message.includes("sent") ? "admin-message" : "admin-message admin-message--error"}>{message}</p>}<button className="button button--primary" type="submit" disabled={!isSupabaseConfigured}>Sign in</button><button className="button button--ghost" type="button" onClick={requestPasswordReset} disabled={!isSupabaseConfigured}>Forgot password?</button></form></div></main>;
  if (!draft) return null;

  return <main className="admin-page"><header className="admin-header"><div><span className="eyebrow">Private workspace</span><h1>Portfolio Content</h1></div><div><button className="button button--primary" type="submit" form="admin-content-form" disabled={saving}><FloppyDisk /> {saving ? "Saving…" : "Save changes"}</button><Link className="button button--ghost" to="/"><ArrowLeft /> View site</Link><button className="button button--ghost" type="button" onClick={logout}><SignOut /> Log out</button></div></header>
    <form id="admin-content-form" className="admin-form" onSubmit={save}>
      <section className="admin-card"><h2>Profile</h2><PortraitEditor value={draft.profile.portraitUrl} setMessage={setMessage} onChange={(value) => updateSection("profile", "portraitUrl", value)} onUploadComplete={(value) => persistContent({ ...draft, profile: { ...draft.profile, portraitUrl: value } }, "Portrait uploaded and published successfully.")} /><div className="admin-grid"><Field label="Name" value={draft.profile.name} onChange={(value) => updateSection("profile", "name", value)} /><Field label="Role" value={draft.profile.role} onChange={(value) => updateSection("profile", "role", value)} /><Field label="Hero eyebrow" value={draft.profile.eyebrow} onChange={(value) => updateSection("profile", "eyebrow", value)} /><Field label="Availability" value={draft.profile.availability} onChange={(value) => updateSection("profile", "availability", value)} /><Field label="Intro" multiline value={draft.profile.intro} onChange={(value) => updateSection("profile", "intro", value)} /><Field label="Availability detail" multiline value={draft.profile.availabilityDetail} onChange={(value) => updateSection("profile", "availabilityDetail", value)} /></div></section>
      <section className="admin-card"><h2>About heading</h2><Field label="Heading" value={draft.about.heading} onChange={(value) => updateSection("about", "heading", value)} /></section>
      <TextListEditor title="About paragraphs" items={draft.about.paragraphs} onChange={(value) => updateSection("about", "paragraphs", value)} />
      <ListEditor title="Skills" description="Updates the Home, About, and Resume pages together." items={draft.about.skills} onChange={(value) => updateSection("about", "skills", value)} />
      <section className="admin-card"><div className="admin-card__heading"><h2>Projects</h2><button type="button" onClick={() => setDraft({ ...draft, projects: [...draft.projects, { id: crypto.randomUUID(), title: "New project", description: "", tech: [], url: draft.contact.github }] })}><Plus /> Add project</button></div>{draft.projects.map((project, index) => <article className="admin-repeat" key={project.id}><div className="admin-grid"><Field label="Title" value={project.title} onChange={(value) => updateArray("projects", index, "title", value)} /><Field label="Project URL" value={project.url} onChange={(value) => updateArray("projects", index, "url", value)} /><Field label="Description" multiline value={project.description} onChange={(value) => updateArray("projects", index, "description", value)} /><Field label="Technologies (comma separated)" value={project.tech.join(", ")} onChange={(value) => updateArray("projects", index, "tech", value.split(",").map((item) => item.trim()).filter(Boolean))} /></div><button type="button" className="delete-button" onClick={() => setDraft({ ...draft, projects: draft.projects.filter((_, itemIndex) => itemIndex !== index) })}><Trash /> Delete project</button></article>)}</section>
      <section className="admin-card"><div className="admin-card__heading"><h2>Semester Results</h2><button type="button" onClick={() => setDraft({ ...draft, semesterResults: [...draft.semesterResults, { semester: "", gpa: "" }] })}><Plus /> Add result</button></div><div className="admin-results">{draft.semesterResults.map((result, index) => <div key={index}><Field label="Semester" value={result.semester} onChange={(value) => updateArray("semesterResults", index, "semester", value)} /><Field label="GPA" value={result.gpa} onChange={(value) => updateArray("semesterResults", index, "gpa", value)} /><button type="button" className="icon-button" onClick={() => setDraft({ ...draft, semesterResults: draft.semesterResults.filter((_, itemIndex) => itemIndex !== index) })}><Trash /></button></div>)}</div></section>
      <RecordEditor title="Education" description="Shown on the Resume page in this order." items={draft.education} fields={educationFields} createItem={() => ({ id: crypto.randomUUID(), institution: "", qualification: "", period: "" })} onChange={(items) => setDraft((current) => ({ ...current, education: items }))} />
      <RecordEditor title="Experience" description="Updates both the Home experience section and the Resume page." items={draft.experience} fields={experienceFields} createItem={() => ({ id: crypto.randomUUID(), company: "", role: "", period: "", description: "" })} onChange={(items) => setDraft((current) => ({ ...current, experience: items }))} />
      <RecordEditor title="Extra Curricular Activities" description="Add or remove activities shown on the Resume page." items={draft.extraCurricularActivities} fields={activityFields} createItem={() => ({ id: crypto.randomUUID(), club: "", position: "", period: "", description: "" })} onChange={(items) => setDraft((current) => ({ ...current, extraCurricularActivities: items }))} />
      <section className="admin-card"><h2>Contact</h2><p className="admin-card__hint">Save once here to update the footer, Home contact panel, and Contact page together.</p><div className="admin-grid"><Field label="Gmail address" type="email" value={draft.contact.email} onChange={(value) => updateSection("contact", "email", value)} /><Field label="GitHub URL" value={draft.contact.github} onChange={(value) => updateSection("contact", "github", value)} /><Field label="LinkedIn URL (optional)" value={draft.contact.linkedin} onChange={(value) => updateSection("contact", "linkedin", value)} /><Field label="Facebook URL" value={draft.contact.facebook} onChange={(value) => updateSection("contact", "facebook", value)} /><Field label="WhatsApp number (country code, no +)" value={draft.contact.whatsapp} onChange={(value) => updateSection("contact", "whatsapp", value.replace(/\D/g, ""))} /></div></section>
      <DocumentEditor title="Awards" items={draft.awards} setMessage={setMessage} onChange={(items) => setDraft((current) => ({ ...current, awards: items }))} onUploadComplete={(items) => persistContent({ ...draft, awards: items }, "Award document uploaded and published successfully.")} />
      <DocumentEditor title="Certificates" items={draft.certifications} setMessage={setMessage} onChange={(items) => setDraft((current) => ({ ...current, certifications: items }))} onUploadComplete={(items) => persistContent({ ...draft, certifications: items }, "Certificate uploaded and published successfully.")} />
      <div className="admin-save">{message && <p className={message.includes("successfully") ? "admin-message" : "admin-message admin-message--error"}>{message}</p>}<button className="button button--primary" type="submit" disabled={saving}><FloppyDisk /> {saving ? "Saving…" : "Save all changes"}</button></div>
    </form>
  </main>;
}
