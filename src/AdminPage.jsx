import { useEffect, useState } from "react";
import { ArrowLeft, ArrowSquareOut, Eye, EyeSlash, FloppyDisk, PencilSimple, Plus, SignOut, Trash, UploadSimple, X } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { useContent } from "./content-context";
import { sortRecent } from "./content-utils";
import { isSupabaseConfigured, supabase } from "./supabase";

const DEFAULT_PORTRAIT = "/assets/default-avatar.png";

function Field({ label, value, onChange, multiline = false, type = "text", autoComplete, required = false }) {
  const Component = multiline ? "textarea" : "input";
  return <label className="admin-field"><span>{label}</span><Component type={multiline ? undefined : type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} rows={multiline ? 4 : undefined} autoComplete={autoComplete} required={required} /></label>;
}

function VisibilityToggle({ checked, onChange, visibleLabel = "Visible", hiddenLabel = "Hidden" }) {
  return <label className="admin-toggle"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span aria-hidden="true" /><strong>{checked ? visibleLabel : hiddenLabel}</strong></label>;
}

function EditorModal({ title, confirmLabel, confirmDisabled = false, onCancel, onConfirm, children }) {
  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
    <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
      <header><div><span className="eyebrow">Content editor</span><h2 id="admin-modal-title">{title}</h2></div><button className="icon-button" type="button" onClick={onCancel} aria-label="Close editor"><X size={20} /></button></header>
      <div className="admin-modal__form">
        <div className="admin-modal__body">{children}</div>
        <footer><button className="button button--ghost" type="button" onClick={onCancel}>Cancel</button><button className="button button--primary" type="button" onClick={onConfirm} disabled={confirmDisabled}>{confirmLabel}</button></footer>
      </div>
    </section>
  </div>;
}

function ListEditor({ title, description, items, onChange, setMessage, multiline = false, addLabel = "Add" }) {
  const [editor, setEditor] = useState(null);
  const openAdd = () => setEditor({ mode: "add", index: -1, value: "" });
  const openEdit = (index) => setEditor({ mode: "edit", index, value: items[index] });
  function confirm() {
    const nextItems = editor.mode === "add" ? [...items, editor.value] : items.map((item, index) => index === editor.index ? editor.value : item);
    onChange(nextItems);
    setMessage(`${title} ${editor.mode === "add" ? "added" : "updated"} successfully. Select Save changes to publish.`);
    setEditor(null);
  }
  function remove(index) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
    setMessage(`${title} item removed successfully. Select Save changes to publish.`);
  }
  return <section className="admin-card"><div className="admin-card__heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button type="button" onClick={openAdd}><Plus /> {addLabel}</button></div>
    <div className="admin-entry-list">{items.map((item, index) => <article className={`admin-entry ${multiline ? "admin-entry--paragraph" : ""}`} key={`${title}-${index}`}><div>{multiline ? <p>{item}</p> : <strong>{item}</strong>}</div><div className="admin-entry__actions"><button type="button" onClick={() => openEdit(index)}><PencilSimple /> Edit</button><button type="button" className="delete-button" onClick={() => remove(index)}><Trash /> Delete</button></div></article>)}</div>
    {editor && <EditorModal title={`${editor.mode === "add" ? "Add" : "Edit"} ${title}`} confirmLabel={editor.mode === "add" ? "Add" : "Update"} confirmDisabled={!editor.value.trim()} onCancel={() => setEditor(null)} onConfirm={confirm}><Field label={multiline ? "Paragraph" : title.replace(/s$/, "")} multiline={multiline} value={editor.value} onChange={(value) => setEditor({ ...editor, value })} required /></EditorModal>}
  </section>;
}

function RecordEditor({ title, description, items, fields, createItem, onChange, setMessage, addLabel = "Add", allowVisibility = false, sectionVisible = true, onSectionVisibilityChange }) {
  const [editor, setEditor] = useState(null);
  const openAdd = () => setEditor({ mode: "add", index: -1, value: createItem() });
  const openEdit = (index) => setEditor({ mode: "edit", index, value: structuredClone(items[index]) });
  function confirm() {
    const nextItems = editor.mode === "add" ? [...items, editor.value] : items.map((item, index) => index === editor.index ? editor.value : item);
    onChange(nextItems);
    setMessage(`${title} ${editor.mode === "add" ? "added" : "updated"} successfully. Select Save changes to publish.`);
    setEditor(null);
  }
  function remove(index) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
    setMessage(`${title} removed successfully. Select Save changes to publish.`);
  }
  function toggleItem(index) {
    const nextVisible = items[index].visible === false;
    onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, visible: nextVisible } : item));
    setMessage(`${title} item ${nextVisible ? "shown" : "hidden"} successfully. Select Save changes to publish.`);
  }
  return <section className="admin-card"><div className="admin-card__heading"><div><h2>{title}</h2><p>{description}</p></div><div className="admin-card__heading-actions">{allowVisibility && <VisibilityToggle checked={sectionVisible} onChange={onSectionVisibilityChange} visibleLabel="Section visible" hiddenLabel="Section hidden" />}<button type="button" onClick={openAdd}><Plus /> {addLabel}</button></div></div>
    <div className="admin-entry-list">{items.map((item, index) => <article className={`admin-entry ${allowVisibility && item.visible === false ? "admin-entry--hidden" : ""}`} key={item.id || `${title}-${index}`}><div className="admin-entry__details">{fields.map((field, fieldIndex) => <span className={fieldIndex === 0 ? "admin-entry__primary" : ""} key={field.key}><small>{field.label}</small>{field.display ? field.display(item[field.key]) : item[field.key]}</span>)}</div><div className="admin-entry__actions">{allowVisibility && <button type="button" onClick={() => toggleItem(index)}>{item.visible === false ? <Eye /> : <EyeSlash />} {item.visible === false ? "Show" : "Hide"}</button>}<button type="button" onClick={() => openEdit(index)}><PencilSimple /> Edit</button><button type="button" className="delete-button" onClick={() => remove(index)}><Trash /> Delete</button></div></article>)}</div>
    {editor && <EditorModal title={`${editor.mode === "add" ? "Add" : "Edit"} ${title}`} confirmLabel={editor.mode === "add" ? "Add" : "Update"} confirmDisabled={!String(editor.value[fields[0].key] || "").trim()} onCancel={() => setEditor(null)} onConfirm={confirm}>{fields.map((field, index) => <Field key={field.key} label={field.label} multiline={field.multiline} type={field.type} value={field.format ? field.format(editor.value[field.key]) : editor.value[field.key]} onChange={(value) => setEditor({ ...editor, value: { ...editor.value, [field.key]: field.parse ? field.parse(value) : value } })} required={index === 0} />)}</EditorModal>}
  </section>;
}

const projectFields = [
  { key: "title", label: "Title" },
  { key: "url", label: "Project URL" },
  { key: "description", label: "Description", multiline: true },
  { key: "tech", label: "Technologies (comma separated)", format: (value = []) => value.join(", "), parse: (value) => value.split(",").map((item) => item.trim()).filter(Boolean), display: (value = []) => value.join(", ") },
];
const semesterFields = [{ key: "semester", label: "Semester" }, { key: "gpa", label: "GPA" }];
const educationFields = [{ key: "institution", label: "Institution" }, { key: "qualification", label: "Qualification" }, { key: "period", label: "Period" }];
const experienceFields = [{ key: "company", label: "Company" }, { key: "role", label: "Role" }, { key: "period", label: "Period" }, { key: "description", label: "Description", multiline: true }];
const activityFields = [{ key: "club", label: "Club / organisation" }, { key: "position", label: "Position" }, { key: "period", label: "Period" }, { key: "description", label: "Description", multiline: true }];

async function uploadFile(file, { imagesOnly = false } = {}) {
  const imageTypes = ["image/jpeg", "image/png", "image/webp"];
  const allowedTypes = imagesOnly ? imageTypes : ["application/pdf", ...imageTypes];
  if (!allowedTypes.includes(file.type)) throw new Error(imagesOnly ? "Only JPG, PNG, and WebP images are allowed." : "Only PDF, JPG, PNG, and WebP files are allowed.");
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
      const url = await uploadFile(file, { imagesOnly: true });
      onChange(url);
      await onUploadComplete(url);
      setMessage("Portrait uploaded and published successfully.");
    } catch (error) { setMessage(error.message); } finally { setUploading(false); }
  }
  function remove() {
    onChange(DEFAULT_PORTRAIT);
    setMessage("Portrait removed successfully. Select Save changes to publish the default avatar.");
  }
  return <div className="admin-portrait"><div className="admin-portrait__preview"><img src={value || DEFAULT_PORTRAIT} alt="Current portrait preview" /></div><div className="admin-portrait__controls"><strong>Current portrait</strong><p>Select a real JPG, PNG, or WebP file from your device. Remove portrait switches the website to your white default avatar.</p><div className="admin-portrait__actions"><label className="upload-button"><UploadSimple /> {uploading ? "Uploading…" : "Choose and upload portrait"}<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => upload(event.target.files?.[0])} /></label><button className="delete-button" type="button" onClick={remove} disabled={value === DEFAULT_PORTRAIT}><Trash /> Remove portrait</button></div></div></div>;
}

function ProjectEditor({ items, onChange, onUploadComplete, setMessage, defaultUrl }) {
  const [editor, setEditor] = useState(null);
  const [uploading, setUploading] = useState("");
  const openAdd = () => setEditor({ mode: "add", index: -1, value: { id: crypto.randomUUID(), title: "", description: "", tech: [], url: defaultUrl, logoUrl: "" } });
  const openEdit = (index) => setEditor({ mode: "edit", index, value: structuredClone(items[index]) });
  function confirm() {
    const nextItems = editor.mode === "add" ? [...items, editor.value] : items.map((item, index) => index === editor.index ? editor.value : item);
    onChange(nextItems);
    setMessage(`Projects ${editor.mode === "add" ? "added" : "updated"} successfully. Select Save changes to publish.`);
    setEditor(null);
  }
  function remove(index) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
    setMessage("Project removed successfully. Select Save changes to publish.");
  }
  function removeLogo(index) {
    onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, logoUrl: "" } : item));
    setMessage("Project logo removed successfully. Select Save changes to publish the default icon.");
  }
  async function upload(index, file) {
    if (!file) return;
    const uploadId = items[index].id || String(index);
    setUploading(uploadId); setMessage("");
    try {
      const logoUrl = await uploadFile(file, { imagesOnly: true });
      const nextItems = items.map((item, itemIndex) => itemIndex === index ? { ...item, logoUrl } : item);
      onChange(nextItems);
      await onUploadComplete(nextItems);
      setMessage("Project logo uploaded and published successfully.");
    } catch (error) { setMessage(error.message); } finally { setUploading(""); }
  }
  return <section className="admin-card"><div className="admin-card__heading"><div><h2>Projects</h2><p>Updates the Home and Resume pages. Upload a real logo image or keep the default Phosphor icon.</p></div><button type="button" onClick={openAdd}><Plus /> Add project</button></div>
    <div className="admin-entry-list">{items.map((item, index) => { const uploadId = item.id || String(index); return <article className="admin-entry admin-project" key={uploadId}><div className="admin-project-summary"><div className={`admin-project-logo ${item.logoUrl ? "" : "admin-project-logo--empty"}`}>{item.logoUrl ? <img src={item.logoUrl} alt={`${item.title} logo preview`} /> : <span>No logo</span>}</div><div className="admin-entry__details"><span className="admin-entry__primary"><small>Title</small>{item.title}</span><span><small>Project URL</small>{item.url}</span><span><small>Description</small>{item.description}</span><span><small>Technologies</small>{(item.tech || []).join(", ")}</span></div></div><div className="admin-document__actions"><button type="button" onClick={() => openEdit(index)}><PencilSimple /> Edit</button><label className="upload-button"><UploadSimple /> {uploading === uploadId ? "Uploading..." : item.logoUrl ? "Replace logo" : "Upload logo"}<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" disabled={Boolean(uploading)} onChange={(event) => upload(index, event.target.files?.[0])} /></label>{item.logoUrl && <><a href={item.logoUrl} target="_blank" rel="noreferrer"><ArrowSquareOut /> View logo</a><button type="button" className="delete-button" onClick={() => removeLogo(index)}><Trash /> Remove logo</button></>}<button type="button" className="delete-button" onClick={() => remove(index)}><Trash /> Delete project</button></div></article>; })}</div>
    {editor && <EditorModal title={`${editor.mode === "add" ? "Add" : "Edit"} Project`} confirmLabel={editor.mode === "add" ? "Add" : "Update"} confirmDisabled={!editor.value.title.trim()} onCancel={() => setEditor(null)} onConfirm={confirm}>{projectFields.map((field, index) => <Field key={field.key} label={field.label} multiline={field.multiline} value={field.format ? field.format(editor.value[field.key]) : editor.value[field.key]} onChange={(value) => setEditor({ ...editor, value: { ...editor.value, [field.key]: field.parse ? field.parse(value) : value } })} required={index === 0} />)}</EditorModal>}
  </section>;
}

function DocumentEditor({ title, items, onChange, onUploadComplete, setMessage }) {
  const [editor, setEditor] = useState(null);
  const [uploading, setUploading] = useState("");
  const fields = [{ key: "title", label: "Title" }, { key: "issuer", label: "Issuer" }, { key: "date", label: "Date / period" }];
  const openAdd = () => setEditor({ mode: "add", index: -1, value: { id: crypto.randomUUID(), title: "", issuer: "", date: "", url: "" } });
  const openEdit = (index) => setEditor({ mode: "edit", index, value: structuredClone(items[index]) });
  function confirm() {
    const nextItems = editor.mode === "add" ? [...items, editor.value] : items.map((item, index) => index === editor.index ? editor.value : item);
    onChange(nextItems);
    setMessage(`${title} ${editor.mode === "add" ? "added" : "updated"} successfully. ${editor.mode === "add" ? "You can now upload its PDF/image. " : ""}Select Save changes to publish.`);
    setEditor(null);
  }
  function remove(index) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
    setMessage(`${title} item removed successfully. Select Save changes to publish.`);
  }
  async function upload(index, file) {
    if (!file) return;
    const uploadId = items[index].id || String(index);
    setUploading(uploadId); setMessage("");
    try {
      const url = await uploadFile(file);
      const nextItems = items.map((item, itemIndex) => itemIndex === index ? { ...item, url } : item);
      onChange(nextItems);
      await onUploadComplete(nextItems);
      setMessage(`${title} file uploaded and published successfully.`);
    } catch (error) { setMessage(error.message); } finally { setUploading(""); }
  }
  return <section className="admin-card"><div className="admin-card__heading"><div><h2>{title}</h2><p>Add or edit the details in a dialog, then upload the real PDF/image from its card.</p></div><button type="button" onClick={openAdd}><Plus /> Add</button></div>
    <div className="admin-entry-list">{items.map((item, index) => { const uploadId = item.id || String(index); return <article className="admin-entry admin-document" key={uploadId}><div className="admin-entry__details"><span className="admin-entry__primary"><small>Title</small>{item.title}</span><span><small>Issuer</small>{item.issuer}</span><span><small>Date / period</small>{item.date}</span><span><small>File</small>{item.url ? "Uploaded" : "Not uploaded"}</span></div><div className="admin-document__actions"><button type="button" onClick={() => openEdit(index)}><PencilSimple /> Edit</button><label className="upload-button"><UploadSimple /> {uploading === uploadId ? "Uploading…" : item.url ? "Replace file" : "Upload PDF / image"}<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" disabled={Boolean(uploading)} onChange={(event) => upload(index, event.target.files?.[0])} /></label>{item.url && <a href={item.url} target="_blank" rel="noreferrer"><ArrowSquareOut /> View file</a>}<button type="button" className="delete-button" onClick={() => remove(index)}><Trash /> Delete</button></div></article>; })}</div>
    {editor && <EditorModal title={`${editor.mode === "add" ? "Add" : "Edit"} ${title}`} confirmLabel={editor.mode === "add" ? "Add" : "Update"} confirmDisabled={!editor.value.title.trim()} onCancel={() => setEditor(null)} onConfirm={confirm}>{fields.map((field, index) => <Field key={field.key} label={field.label} value={editor.value[field.key]} onChange={(value) => setEditor({ ...editor, value: { ...editor.value, [field.key]: value } })} required={index === 0} />)}</EditorModal>}
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
    if (!supabase) { setSession({ loading: false, authenticated: false }); return undefined; }
    supabase.auth.getSession().then(({ data }) => setSession({ loading: false, authenticated: Boolean(data.session) }));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession({ loading: false, authenticated: Boolean(nextSession) }));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (content && !draft) setDraft(structuredClone(content)); }, [content, draft]);
  useEffect(() => { if (!message || !session.authenticated) return undefined; const timer = window.setTimeout(() => setMessage(""), 6000); return () => window.clearTimeout(timer); }, [message, session.authenticated]);

  async function login(event) {
    event.preventDefault(); setMessage("");
    try { const { error } = await supabase.auth.signInWithPassword(credentials); if (error) throw error; setSession({ loading: false, authenticated: true }); setCredentials({ email: "", password: "" }); } catch (error) { setMessage(error.message); }
  }
  async function logout() { await supabase.auth.signOut(); setSession({ loading: false, authenticated: false }); setDraft(null); }
  async function requestPasswordReset() {
    setMessage(""); const email = credentials.email.trim();
    if (!email) { setMessage("Enter your Admin email first."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setMessage(error ? error.message : "Password recovery email sent. Use only the newest email link.");
  }
  async function persistContent(nextDraft, successMessage = "Changes saved successfully.") {
    const normalizedDraft = {
      ...nextDraft,
      experience: sortRecent(nextDraft.experience, "period"),
      extraCurricularActivities: sortRecent(nextDraft.extraCurricularActivities, "period"),
      awards: sortRecent(nextDraft.awards, "date"),
      contact: { ...nextDraft.contact, github: normalizeExternalUrl(nextDraft.contact.github), linkedin: normalizeExternalUrl(nextDraft.contact.linkedin), facebook: normalizeExternalUrl(nextDraft.contact.facebook) },
    };
    const { data, error } = await supabase.from("portfolio_content").upsert({ id: 1, content: normalizedDraft, updated_at: new Date().toISOString() }, { onConflict: "id" }).select("content").single();
    if (error) throw error;
    setDraft(structuredClone(data.content)); setContent(data.content); await refresh(); setMessage(successMessage); return data.content;
  }
  async function save(event) { event.preventDefault(); setSaving(true); setMessage(""); try { await persistContent(draft); } catch (error) { setMessage(error.message); } finally { setSaving(false); } }
  function updateSection(section, key, value) { setDraft((current) => ({ ...current, [section]: { ...current[section], [key]: value } })); }
  const setArray = (section) => (items) => setDraft((current) => ({ ...current, [section]: items }));
  const setRecentArray = (section, dateKey) => (items) => setDraft((current) => ({ ...current, [section]: sortRecent(items, dateKey) }));

  if (session.loading || !content) return <div className="admin-loading">Checking secure session…</div>;
  if (!session.authenticated) return <main className="admin-login"><div className="admin-login__panel"><Link to="/"><ArrowLeft /> Back to portfolio</Link><span className="eyebrow">Private access</span><h1>Content Admin</h1><p>Sign in with your Supabase Admin account.</p>{!isSupabaseConfigured && <p className="admin-message admin-message--error">Supabase environment variables are missing.</p>}<form onSubmit={login} autoComplete="off"><Field label="Email" type="email" autoComplete="off" value={credentials.email} onChange={(email) => setCredentials({ ...credentials, email })} /><Field label="Password" type="password" autoComplete="off" value={credentials.password} onChange={(password) => setCredentials({ ...credentials, password })} />{message && <p className={message.includes("sent") ? "admin-message" : "admin-message admin-message--error"}>{message}</p>}<button className="button button--primary" type="submit" disabled={!isSupabaseConfigured}>Sign in</button><button className="button button--ghost" type="button" onClick={requestPasswordReset} disabled={!isSupabaseConfigured}>Forgot password?</button></form></div></main>;
  if (!draft) return null;

  const successMessage = message.toLowerCase().includes("successfully") || message.toLowerCase().includes("sent");
  return <main className="admin-page">
    <header className="admin-header"><div><span className="eyebrow">Private workspace</span><h1>Portfolio Content</h1></div><div><button className="button button--primary" type="submit" form="admin-content-form" disabled={saving}><FloppyDisk /> {saving ? "Saving…" : "Save changes"}</button><Link className="button button--ghost" to="/"><ArrowLeft /> View site</Link><button className="button button--ghost" type="button" onClick={logout}><SignOut /> Log out</button></div></header>
    {message && <div className={`admin-toast ${successMessage ? "" : "admin-toast--error"}`} role="status"><span>{message}</span><button type="button" onClick={() => setMessage("")} aria-label="Dismiss message"><X /></button></div>}
    <form id="admin-content-form" className="admin-form" onSubmit={save}>
      <section className="admin-card"><h2>Profile</h2><PortraitEditor value={draft.profile.portraitUrl} setMessage={setMessage} onChange={(value) => updateSection("profile", "portraitUrl", value)} onUploadComplete={(value) => persistContent({ ...draft, profile: { ...draft.profile, portraitUrl: value } }, "Portrait uploaded and published successfully.")} /><div className="admin-grid"><Field label="Name" value={draft.profile.name} onChange={(value) => updateSection("profile", "name", value)} /><Field label="Role" value={draft.profile.role} onChange={(value) => updateSection("profile", "role", value)} /><Field label="Hero eyebrow" value={draft.profile.eyebrow} onChange={(value) => updateSection("profile", "eyebrow", value)} /><Field label="Availability" value={draft.profile.availability} onChange={(value) => updateSection("profile", "availability", value)} /><Field label="Intro" multiline value={draft.profile.intro} onChange={(value) => updateSection("profile", "intro", value)} /><Field label="Availability detail" multiline value={draft.profile.availabilityDetail} onChange={(value) => updateSection("profile", "availabilityDetail", value)} /></div></section>
      <section className="admin-card"><h2>About heading</h2><Field label="Heading" value={draft.about.heading} onChange={(value) => updateSection("about", "heading", value)} /></section>
      <ListEditor title="About paragraphs" description="Updates the Home and About pages." multiline addLabel="Add paragraph" items={draft.about.paragraphs} onChange={(value) => updateSection("about", "paragraphs", value)} setMessage={setMessage} />
      <ListEditor title="Skills" description="Updates the Home, About, and Resume pages together." items={draft.about.skills} onChange={(value) => updateSection("about", "skills", value)} setMessage={setMessage} />
      <ProjectEditor items={draft.projects} defaultUrl={draft.contact.github} onChange={setArray("projects")} setMessage={setMessage} onUploadComplete={(items) => persistContent({ ...draft, projects: items }, "Project logo uploaded and published successfully.")} />
      <RecordEditor title="Semester Results" description="Hide the whole section or individual semester results without deleting them." addLabel="Add result" items={draft.semesterResults} fields={semesterFields} createItem={() => ({ id: crypto.randomUUID(), semester: "", gpa: "", visible: true })} onChange={setArray("semesterResults")} setMessage={setMessage} allowVisibility sectionVisible={draft.sectionVisibility.semesterResults} onSectionVisibilityChange={(value) => updateSection("sectionVisibility", "semesterResults", value)} />
      <RecordEditor title="Education" description="Shown on the Resume page in this order." items={draft.education} fields={educationFields} createItem={() => ({ id: crypto.randomUUID(), institution: "", qualification: "", period: "" })} onChange={setArray("education")} setMessage={setMessage} />
      <section className="admin-card"><div className="admin-card__heading"><div><h2>Current Employment</h2><p>Show your present workplace above previous experience when the Experience section is enabled.</p></div><VisibilityToggle checked={Boolean(draft.currentEmployment.visible)} onChange={(value) => updateSection("currentEmployment", "visible", value)} /></div><div className="admin-grid"><Field label="Company" value={draft.currentEmployment.company} onChange={(value) => updateSection("currentEmployment", "company", value)} /><Field label="Role" value={draft.currentEmployment.role} onChange={(value) => updateSection("currentEmployment", "role", value)} /><Field label="Period" value={draft.currentEmployment.period} onChange={(value) => updateSection("currentEmployment", "period", value)} /><Field label="Description" multiline value={draft.currentEmployment.description} onChange={(value) => updateSection("currentEmployment", "description", value)} /></div></section>
      <RecordEditor title="Experience" description="Automatically ordered newest to oldest. Hide the whole section or individual jobs without deleting them." items={sortRecent(draft.experience, "period")} fields={experienceFields} createItem={() => ({ id: crypto.randomUUID(), company: "", role: "", period: "", description: "", visible: true })} onChange={setRecentArray("experience", "period")} setMessage={setMessage} allowVisibility sectionVisible={draft.sectionVisibility.experience} onSectionVisibilityChange={(value) => updateSection("sectionVisibility", "experience", value)} />
      <RecordEditor title="Extra Curricular Activities" description="Hide the whole section or individual activities while keeping the information for later." items={sortRecent(draft.extraCurricularActivities, "period")} fields={activityFields} createItem={() => ({ id: crypto.randomUUID(), club: "", position: "", period: "", description: "", visible: true })} onChange={setRecentArray("extraCurricularActivities", "period")} setMessage={setMessage} allowVisibility sectionVisible={draft.sectionVisibility.extraCurricularActivities} onSectionVisibilityChange={(value) => updateSection("sectionVisibility", "extraCurricularActivities", value)} />
      <section className="admin-card"><h2>Contact</h2><p className="admin-card__hint">Save once here to update the footer, Home contact panel, and Contact page together.</p><div className="admin-grid"><Field label="Gmail address" type="email" value={draft.contact.email} onChange={(value) => updateSection("contact", "email", value)} /><Field label="GitHub URL" value={draft.contact.github} onChange={(value) => updateSection("contact", "github", value)} /><Field label="LinkedIn URL (optional)" value={draft.contact.linkedin} onChange={(value) => updateSection("contact", "linkedin", value)} /><Field label="Facebook URL" value={draft.contact.facebook} onChange={(value) => updateSection("contact", "facebook", value)} /><Field label="WhatsApp number (country code, no +)" value={draft.contact.whatsapp} onChange={(value) => updateSection("contact", "whatsapp", value.replace(/\D/g, ""))} /></div></section>
      <DocumentEditor title="Awards" items={sortRecent(draft.awards, "date")} setMessage={setMessage} onChange={setRecentArray("awards", "date")} onUploadComplete={(items) => persistContent({ ...draft, awards: sortRecent(items, "date") }, "Award document uploaded and published successfully.")} />
      <DocumentEditor title="Certificates" items={draft.certifications} setMessage={setMessage} onChange={setArray("certifications")} onUploadComplete={(items) => persistContent({ ...draft, certifications: items }, "Certificate uploaded and published successfully.")} />
    </form>
  </main>;
}
