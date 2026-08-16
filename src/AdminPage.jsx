// Provides secure Admin authentication, OTP verification, content editing, uploads, and Guest Preview.
import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowSquareOut, CaretDown, Eye, EyeSlash, FloppyDisk, LockKey, PencilSimple, Plus, SignOut, Trash, UploadSimple, UserFocus, X } from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router-dom";
import { useContent } from "./content-context";
import { sortRecent } from "./content-utils";
import { isSupabaseConfigured, supabase } from "./supabase";
import { collectReferencedStorageUrls, hasContentChanged, parseTechnologies, storagePathFromPublicUrl } from "./admin-utils";

const DEFAULT_PORTRAIT = "/assets/default-avatar.png";
const ADMIN_OTP_VERIFIED_KEY = "tang-admin-otp-verified";
const RECOVERY_EMAIL_KEY = "tang-admin-recovery-email";
// Guest Preview reads this context to disable every editing control.
const AdminReadOnlyContext = createContext(false);

// Reusable labelled input that can also render a larger textarea.
function Field({ label, value, onChange, multiline = false, type = "text", autoComplete, required = false }) {
  const readOnly = useContext(AdminReadOnlyContext);
  const Component = multiline ? "textarea" : "input";
  return <label className="admin-field"><span>{label}</span><Component type={multiline ? undefined : type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} rows={multiline ? 4 : undefined} autoComplete={autoComplete} required={required} disabled={readOnly} /></label>;
}

// Switches a section or individual item between public and hidden states.
function VisibilityToggle({ checked, onChange, visibleLabel = "Visible", hiddenLabel = "Hidden" }) {
  const readOnly = useContext(AdminReadOnlyContext);
  return <label className="admin-toggle"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={readOnly} /><span aria-hidden="true" /><strong>{checked ? visibleLabel : hiddenLabel}</strong></label>;
}

// Displays Add and Edit forms in a focused modal dialog.
function EditorModal({ title, confirmLabel, confirmDisabled = false, confirmDanger = false, onCancel, onConfirm, children }) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const appRoot = document.getElementById("root");
    const previousInert = appRoot?.inert;
    const previousAriaHidden = appRoot?.getAttribute("aria-hidden");

    // The dialog is rendered outside #root, so the page can safely become inert.
    if (appRoot) {
      appRoot.inert = true;
      appRoot.setAttribute("aria-hidden", "true");
    }

    const focusableSelector = "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])";
    const primaryFieldSelector = "input:not([disabled]), textarea:not([disabled]), select:not([disabled])";
    const focusFirstControl = () => (dialogRef.current?.querySelector(primaryFieldSelector) || dialogRef.current?.querySelector(focusableSelector))?.focus();
    const animationFrame = window.requestAnimationFrame(focusFirstControl);

    function handleKeyDown(event) {
      // Capture Escape at the window level before an input or editor can stop it.
      const isEscape = event.key === "Escape" || event.key === "Esc" || event.code === "Escape";
      if (isEscape) {
        event.preventDefault();
        event.stopPropagation();
        cancelRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const controls = [...dialogRef.current.querySelectorAll(focusableSelector)];
      if (!controls.length) return;
      const first = controls[0];
      const last = controls.at(-1);

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    // Capture mode makes the keyboard behavior reliable inside every form field.
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("keydown", handleKeyDown, true);
      if (appRoot) {
        appRoot.inert = Boolean(previousInert);
        if (previousAriaHidden === null) appRoot.removeAttribute("aria-hidden");
        else appRoot.setAttribute("aria-hidden", previousAriaHidden);
      }
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []);

  return createPortal(<div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
    <section ref={dialogRef} className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
      <header><div><span className="eyebrow">Content editor</span><h2 id="admin-modal-title">{title}</h2></div><button className="icon-button" type="button" onClick={onCancel} aria-label="Close editor"><X size={20} /></button></header>
      <div className="admin-modal__form">
        <div className="admin-modal__body">{children}</div>
        <footer><button className="button button--ghost" type="button" onClick={onCancel}>Cancel</button><button className={confirmDanger ? "button delete-button" : "button button--primary"} type="button" onClick={onConfirm} disabled={confirmDisabled}>{confirmLabel}</button></footer>
      </div>
    </section>
  </div>, document.body);
}

// Confirms destructive changes before they are applied to the local draft.
function ConfirmDeleteModal({ itemName, onCancel, onConfirm }) {
  return <EditorModal title={`Delete ${itemName}?`} confirmLabel="Delete" confirmDanger onCancel={onCancel} onConfirm={onConfirm}>
    <div className="admin-confirm-copy"><p>This removes <strong>{itemName}</strong> from your draft.</p><p>The public website will change only after you select <strong>Save changes</strong>.</p></div>
  </EditorModal>;
}

// Groups one content type and optionally lets the Admin collapse a long section.
function AdminCard({ title, description, actions, children, collapsible = false }) {
  const [open, setOpen] = useState(!collapsible);
  const contentId = useId();
  return <section className={`admin-card ${collapsible ? "admin-card--collapsible" : ""} ${open ? "admin-card--open" : ""}`}>
    <div className="admin-card__heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div><div className="admin-card__heading-actions">{(!collapsible || open) && actions}{collapsible && <button className="admin-collapse-button" type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls={contentId}>{open ? "Close" : "Open"} <CaretDown /></button>}</div></div>
    <div className="admin-card__content" id={contentId} hidden={!open}>{children}</div>
  </section>;
}

// Edits simple text arrays such as About paragraphs and Skills.
function ListEditor({ title, description, items, onChange, setMessage, multiline = false, addLabel = "Add", collapsible = false }) {
  const readOnly = useContext(AdminReadOnlyContext);
  const [editor, setEditor] = useState(null);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const lockedProps = readOnly ? { "aria-disabled": true, "aria-describedby": "guest-read-only-message" } : {};
  const openAdd = () => setEditor({ mode: "add", index: -1, value: "" });
  const openEdit = (index) => setEditor({ mode: "edit", index, value: items[index] });
  // Applies the modal value to the local draft; Save changes publishes it later.
  function confirm() {
    const nextItems = editor.mode === "add" ? [...items, editor.value] : items.map((item, index) => index === editor.index ? editor.value : item);
    onChange(nextItems);
    setMessage(`${title} ${editor.mode === "add" ? "added" : "updated"} successfully. Select Save changes to publish.`);
    setEditor(null);
  }
  function remove(index) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
    setMessage(`${title} item removed from the draft. Select Save changes to publish.`);
    setDeleteIndex(null);
  }
  return <AdminCard title={title} description={description} collapsible={collapsible} actions={<button type="button" onClick={openAdd} {...lockedProps}><Plus /> {addLabel}</button>}>
    <div className="admin-entry-list">{items.map((item, index) => <article className={`admin-entry ${multiline ? "admin-entry--paragraph" : ""}`} key={`${title}-${index}`}><div>{multiline ? <p>{item}</p> : <strong>{item}</strong>}</div><div className="admin-entry__actions"><button type="button" onClick={() => openEdit(index)} {...lockedProps}><PencilSimple /> Edit</button><button type="button" className="delete-button" onClick={() => setDeleteIndex(index)} {...lockedProps}><Trash /> Delete</button></div></article>)}</div>
    {editor && <EditorModal title={`${editor.mode === "add" ? "Add" : "Edit"} ${title}`} confirmLabel={editor.mode === "add" ? "Add" : "Update"} confirmDisabled={!editor.value.trim()} onCancel={() => setEditor(null)} onConfirm={confirm}><Field label={multiline ? "Paragraph" : title.replace(/s$/, "")} multiline={multiline} value={editor.value} onChange={(value) => setEditor({ ...editor, value })} required /></EditorModal>}
    {deleteIndex !== null && <ConfirmDeleteModal itemName={multiline ? `${title} paragraph` : String(items[deleteIndex])} onCancel={() => setDeleteIndex(null)} onConfirm={() => remove(deleteIndex)} />}
  </AdminCard>;
}

// Edits structured lists such as Education, Experience, and Semester Results.
function RecordEditor({ title, description, items, fields, createItem, onChange, setMessage, addLabel = "Add", allowVisibility = false, sectionVisible = true, onSectionVisibilityChange }) {
  const readOnly = useContext(AdminReadOnlyContext);
  const [editor, setEditor] = useState(null);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const lockedProps = readOnly ? { "aria-disabled": true, "aria-describedby": "guest-read-only-message" } : {};
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
    setMessage(`${title} removed from the draft. Select Save changes to publish.`);
    setDeleteIndex(null);
  }
  // Hiding keeps the record in Supabase but removes it from public pages.
  function toggleItem(index) {
    const nextVisible = items[index].visible === false;
    onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, visible: nextVisible } : item));
    setMessage(`${title} item ${nextVisible ? "shown" : "hidden"} successfully. Select Save changes to publish.`);
  }
  return <AdminCard title={title} description={description} collapsible actions={<>{allowVisibility && <VisibilityToggle checked={sectionVisible} onChange={onSectionVisibilityChange} visibleLabel="Section visible" hiddenLabel="Section hidden" />}<button type="button" onClick={openAdd} {...lockedProps}><Plus /> {addLabel}</button></>}>
    <div className="admin-entry-list">{items.map((item, index) => <article className={`admin-entry ${allowVisibility && item.visible === false ? "admin-entry--hidden" : ""}`} key={item.id || `${title}-${index}`}><div className="admin-entry__details">{fields.map((field, fieldIndex) => <span className={fieldIndex === 0 ? "admin-entry__primary" : ""} key={field.key}><small>{field.label}</small>{field.display ? field.display(item[field.key]) : item[field.key]}</span>)}</div><div className="admin-entry__actions">{allowVisibility && <button type="button" onClick={() => toggleItem(index)} {...lockedProps}>{item.visible === false ? <Eye /> : <EyeSlash />} {item.visible === false ? "Show" : "Hide"}</button>}<button type="button" onClick={() => openEdit(index)} {...lockedProps}><PencilSimple /> Edit</button><button type="button" className="delete-button" onClick={() => setDeleteIndex(index)} {...lockedProps}><Trash /> Delete</button></div></article>)}</div>
    {editor && <EditorModal title={`${editor.mode === "add" ? "Add" : "Edit"} ${title}`} confirmLabel={editor.mode === "add" ? "Add" : "Update"} confirmDisabled={!String(editor.value[fields[0].key] || "").trim()} onCancel={() => setEditor(null)} onConfirm={confirm}>{fields.map((field, index) => <Field key={field.key} label={field.label} multiline={field.multiline} type={field.type} value={field.format ? field.format(editor.value[field.key]) : editor.value[field.key]} onChange={(value) => setEditor({ ...editor, value: { ...editor.value, [field.key]: field.parse ? field.parse(value) : value } })} required={index === 0} />)}</EditorModal>}
    {deleteIndex !== null && <ConfirmDeleteModal itemName={String(items[deleteIndex]?.[fields[0].key] || title)} onCancel={() => setDeleteIndex(null)} onConfirm={() => remove(deleteIndex)} />}
  </AdminCard>;
}

// Field definitions keep each generated editor consistent and easy to extend.
const projectFields = [
  { key: "title", label: "Title" },
  { key: "url", label: "Project URL" },
  { key: "shortDescription", label: "Short description (Home page)", multiline: true },
  { key: "description", label: "Detailed description (Projects page)", multiline: true },
  { key: "techInput", label: "Technologies (comma separated)", multiline: true },
];
const semesterFields = [{ key: "semester", label: "Semester" }, { key: "gpa", label: "GPA" }];
const educationFields = [{ key: "institution", label: "Institution" }, { key: "qualification", label: "Qualification" }, { key: "period", label: "Period" }];
const experienceFields = [{ key: "company", label: "Company" }, { key: "role", label: "Role" }, { key: "period", label: "Period" }, { key: "description", label: "Description", multiline: true }];
const activityFields = [{ key: "club", label: "Club / organisation" }, { key: "position", label: "Position" }, { key: "period", label: "Period" }, { key: "description", label: "Description", multiline: true }];

// Validates and uploads a real file to the public portfolio-files Storage bucket.
async function uploadFile(file, { imagesOnly = false } = {}) {
  const imageTypes = ["image/jpeg", "image/png", "image/webp"];
  const allowedTypes = imagesOnly ? imageTypes : ["application/pdf", ...imageTypes];
  if (!allowedTypes.includes(file.type)) throw new Error(imagesOnly ? "Only JPG, PNG, and WebP images are allowed." : "Only PDF, JPG, PNG, and WebP files are allowed.");
  if (file.size > 10 * 1024 * 1024) throw new Error("File must be 10 MB or smaller.");
  const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "bin";
  // A unique path prevents two uploaded files from overwriting each other.
  const path = `${new Date().getFullYear()}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("portfolio-files").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("portfolio-files").getPublicUrl(path);
  return data.publicUrl;
}

// Deletes only URLs that point to this project's portfolio-files Storage bucket.
async function removeStorageFiles(urls = []) {
  const paths = [...new Set(urls.map((url) => storagePathFromPublicUrl(url)).filter(Boolean))];
  if (!paths.length) return [];
  const { error } = await supabase.storage.from("portfolio-files").remove(paths);
  if (error) throw error;
  return paths;
}

// Adds https:// when the Admin enters a domain without a URL protocol.
function normalizeExternalUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// Uploads, previews, or replaces the portrait with the default avatar.
function PortraitEditor({ value, onChange, onUploadComplete, onQueueStorageDelete, setMessage }) {
  const readOnly = useContext(AdminReadOnlyContext);
  const [uploading, setUploading] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  async function upload(file) {
    if (!file) return;
    setUploading(true); setMessage("");
    try {
      const oldUrl = value;
      const url = await uploadFile(file, { imagesOnly: true });
      onChange(url);
      // Portrait uploads publish immediately so the uploaded URL is not lost.
      await onUploadComplete(url, oldUrl);
      setMessage("Portrait uploaded and published successfully.");
    } catch (error) { setMessage(error.message); } finally { setUploading(false); }
  }
  function remove() {
    onQueueStorageDelete(value);
    onChange(DEFAULT_PORTRAIT);
    setMessage("Portrait removed from the draft. Select Save changes to publish the default avatar.");
    setConfirmingRemove(false);
  }
  return <>
    <div className="admin-portrait"><div className="admin-portrait__preview"><img src={value || DEFAULT_PORTRAIT} alt="Current portrait preview" /></div><div className="admin-portrait__controls"><strong>Current portrait</strong><p>Select a real JPG, PNG, or WebP file from your device. Remove portrait switches the website to your white default avatar.</p><div className="admin-portrait__actions"><label className="upload-button" aria-disabled={readOnly || uploading} aria-describedby={readOnly ? "guest-read-only-message" : undefined}><UploadSimple /> {uploading ? "Uploading…" : "Choose and upload portrait"}<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" disabled={readOnly || uploading} onChange={(event) => upload(event.target.files?.[0])} /></label><button className="delete-button" type="button" onClick={() => setConfirmingRemove(true)} disabled={readOnly || value === DEFAULT_PORTRAIT} aria-describedby={readOnly ? "guest-read-only-message" : undefined}><Trash /> Remove portrait</button></div></div></div>
    {confirmingRemove && <ConfirmDeleteModal itemName="current portrait" onCancel={() => setConfirmingRemove(false)} onConfirm={remove} />}
  </>;
}

// Manages project copy, technologies, links, ordering, and uploaded logos.
function ProjectEditor({ items, onChange, onUploadComplete, onQueueStorageDelete, setMessage, defaultUrl }) {
  const readOnly = useContext(AdminReadOnlyContext);
  const [editor, setEditor] = useState(null);
  const [uploading, setUploading] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const lockedProps = readOnly ? { "aria-disabled": true, "aria-describedby": "guest-read-only-message" } : {};
  // New projects are prepared with a unique ID and the GitHub URL as a fallback.
  const openAdd = () => setEditor({ mode: "add", index: -1, value: { id: crypto.randomUUID(), title: "", shortDescription: "", description: "", tech: [], techInput: "", url: defaultUrl, logoUrl: "" } });
  const openEdit = (index) => setEditor({ mode: "edit", index, value: { ...structuredClone(items[index]), shortDescription: items[index].shortDescription || items[index].description || "", techInput: (items[index].tech || []).join(", ") } });
  function confirm() {
    const { techInput, ...project } = editor.value;
    // Convert the friendly comma-separated text into the array used by public tags.
    project.tech = parseTechnologies(techInput);
    // A newly added project goes first so Home always shows the newest work first.
    const nextItems = editor.mode === "add" ? [project, ...items] : items.map((item, index) => index === editor.index ? project : item);
    onChange(nextItems);
    setMessage(`Projects ${editor.mode === "add" ? "added" : "updated"} successfully. Select Save changes to publish.`);
    setEditor(null);
  }
  function remove(index) {
    onQueueStorageDelete(items[index]?.logoUrl);
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
    setMessage("Project removed from the draft. Select Save changes to publish.");
    setDeleteTarget(null);
  }
  function removeLogo(index) {
    onQueueStorageDelete(items[index]?.logoUrl);
    onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, logoUrl: "" } : item));
    setMessage("Project logo removed from the draft. Select Save changes to publish the default icon.");
    setDeleteTarget(null);
  }
  async function upload(index, file) {
    if (!file) return;
    const uploadId = items[index].id || String(index);
    setUploading(uploadId); setMessage("");
    try {
      const oldUrl = items[index].logoUrl;
      const logoUrl = await uploadFile(file, { imagesOnly: true });
      const nextItems = items.map((item, itemIndex) => itemIndex === index ? { ...item, logoUrl } : item);
      onChange(nextItems);
      await onUploadComplete(nextItems, oldUrl);
      setMessage("Project logo uploaded and published successfully.");
    } catch (error) { setMessage(error.message); } finally { setUploading(""); }
  }
  return <AdminCard title="Projects" description="Updates the Home, Projects, and Resume pages. New projects appear first. Upload a real logo image or keep the default Phosphor icon." collapsible actions={<button type="button" onClick={openAdd} {...lockedProps}><Plus /> Add project</button>}>
    <div className="admin-entry-list">{items.map((item, index) => {
      const uploadId = item.id || String(index);
      return <article className="admin-entry admin-project" key={uploadId}>
        <div className="admin-project-summary"><div className={`admin-project-logo ${item.logoUrl ? "" : "admin-project-logo--empty"}`}>{item.logoUrl ? <img src={item.logoUrl} alt={`${item.title} logo preview`} /> : <span>No logo</span>}</div><div className="admin-entry__details admin-project__details"><span className="admin-entry__primary"><small>Title</small>{item.title}</span><span className="admin-project__url" title={item.url}><small>Project URL</small>{item.url}</span><span className="admin-project__description" title={item.shortDescription || item.description}><small>Home description</small>{item.shortDescription || item.description}</span><span className="admin-project__description admin-project__description--detailed" title={item.description}><small>Projects page description</small>{item.description}</span><span className="admin-project__technologies" title={(item.tech || []).join(", ")}><small>Technologies</small>{(item.tech || []).join(", ")}</span></div></div>
        <div className="admin-project__actions" aria-label={`Actions for ${item.title}`}>
          <div className="admin-project__action-row"><button type="button" onClick={() => openEdit(index)} {...lockedProps}><PencilSimple /> Edit</button><label className="upload-button" aria-disabled={readOnly || Boolean(uploading)} aria-describedby={readOnly ? "guest-read-only-message" : undefined}><UploadSimple /> {uploading === uploadId ? "Uploading..." : item.logoUrl ? "Replace logo" : "Upload logo"}<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" disabled={readOnly || Boolean(uploading)} onChange={(event) => upload(index, event.target.files?.[0])} /></label>{item.logoUrl && <a href={item.logoUrl} target="_blank" rel="noreferrer" {...lockedProps}><ArrowSquareOut /> View logo</a>}</div>
          <div className="admin-project__action-row admin-project__action-row--danger">{item.logoUrl && <button type="button" className="delete-button" onClick={() => setDeleteTarget({ type: "logo", index })} {...lockedProps}><Trash /> Remove logo</button>}<button type="button" className="delete-button" onClick={() => setDeleteTarget({ type: "project", index })} {...lockedProps}><Trash /> Delete project</button></div>
        </div>
      </article>;
    })}</div>
    {editor && <EditorModal title={`${editor.mode === "add" ? "Add" : "Edit"} Project`} confirmLabel={editor.mode === "add" ? "Add" : "Update"} confirmDisabled={!editor.value.title.trim()} onCancel={() => setEditor(null)} onConfirm={confirm}>{projectFields.map((field, index) => <Field key={field.key} label={field.label} multiline={field.multiline} value={field.format ? field.format(editor.value[field.key]) : editor.value[field.key]} onChange={(value) => setEditor({ ...editor, value: { ...editor.value, [field.key]: field.parse ? field.parse(value) : value } })} required={index === 0} />)}</EditorModal>}
    {deleteTarget && <ConfirmDeleteModal itemName={deleteTarget.type === "logo" ? `${items[deleteTarget.index]?.title} logo` : items[deleteTarget.index]?.title || "project"} onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteTarget.type === "logo" ? removeLogo(deleteTarget.index) : remove(deleteTarget.index)} />}
  </AdminCard>;
}

// Manages Award and Certificate details together with their PDF or image file.
function DocumentEditor({ title, items, onChange, onUploadComplete, onQueueStorageDelete, setMessage }) {
  const readOnly = useContext(AdminReadOnlyContext);
  const [editor, setEditor] = useState(null);
  const [uploading, setUploading] = useState("");
  const [deleteIndex, setDeleteIndex] = useState(null);
  const lockedProps = readOnly ? { "aria-disabled": true, "aria-describedby": "guest-read-only-message" } : {};
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
    onQueueStorageDelete(items[index]?.url);
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
    setMessage(`${title} item removed from the draft. Select Save changes to publish.`);
    setDeleteIndex(null);
  }
  async function upload(index, file) {
    if (!file) return;
    const uploadId = items[index].id || String(index);
    setUploading(uploadId); setMessage("");
    try {
      const oldUrl = items[index].url;
      const url = await uploadFile(file);
      const nextItems = items.map((item, itemIndex) => itemIndex === index ? { ...item, url } : item);
      onChange(nextItems);
      // Publish immediately after upload so the Storage URL is saved in the database.
      await onUploadComplete(nextItems, oldUrl);
      setMessage(`${title} file uploaded and published successfully.`);
    } catch (error) { setMessage(error.message); } finally { setUploading(""); }
  }
  return <AdminCard title={title} description="Add or edit the details in a dialog, then upload the real PDF/image from its card." collapsible actions={<button type="button" onClick={openAdd} {...lockedProps}><Plus /> Add</button>}>
    <div className="admin-entry-list">{items.map((item, index) => {
      const uploadId = item.id || String(index);
      return <article className="admin-entry admin-document" key={uploadId}><div className="admin-entry__details"><span className="admin-entry__primary"><small>Title</small>{item.title}</span><span><small>Issuer</small>{item.issuer}</span><span><small>Date / period</small>{item.date}</span><span><small>File</small>{item.url ? "Uploaded" : "Not uploaded"}</span></div><div className="admin-document__actions"><button type="button" onClick={() => openEdit(index)} {...lockedProps}><PencilSimple /> Edit</button><label className="upload-button" aria-disabled={readOnly || Boolean(uploading)} aria-describedby={readOnly ? "guest-read-only-message" : undefined}><UploadSimple /> {uploading === uploadId ? "Uploading…" : item.url ? "Replace file" : "Upload PDF / image"}<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" disabled={readOnly || Boolean(uploading)} onChange={(event) => upload(index, event.target.files?.[0])} /></label>{item.url && <a href={item.url} target="_blank" rel="noreferrer" {...lockedProps}><ArrowSquareOut /> View file</a>}<button type="button" className="delete-button" onClick={() => setDeleteIndex(index)} {...lockedProps}><Trash /> Delete</button></div></article>;
    })}</div>
    {editor && <EditorModal title={`${editor.mode === "add" ? "Add" : "Edit"} ${title}`} confirmLabel={editor.mode === "add" ? "Add" : "Update"} confirmDisabled={!editor.value.title.trim()} onCancel={() => setEditor(null)} onConfirm={confirm}>{fields.map((field, index) => <Field key={field.key} label={field.label} value={editor.value[field.key]} onChange={(value) => setEditor({ ...editor, value: { ...editor.value, [field.key]: value } })} required={index === 0} />)}</EditorModal>}
    {deleteIndex !== null && <ConfirmDeleteModal itemName={items[deleteIndex]?.title || title} onCancel={() => setDeleteIndex(null)} onConfirm={() => remove(deleteIndex)} />}
  </AdminCard>;
}

// Provides secure content management and a read-only demonstration mode.
export function AdminPage() {
  const { content, setContent, refresh } = useContent();
  const navigate = useNavigate();
  // Authentication state is separate from the editable content draft.
  const [session, setSession] = useState({ loading: true, authenticated: false });
  const [draft, setDraft] = useState(null);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [loginStep, setLoginStep] = useState("credentials");
  const [pendingLoginEmail, setPendingLoginEmail] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [resendAvailableIn, setResendAvailableIn] = useState(0);
  const [guestMode, setGuestMode] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingStorageDeletes, setPendingStorageDeletes] = useState([]);

  // Restore access only when Supabase has a session and this tab completed OTP.
  useEffect(() => {
    if (!supabase) { setSession({ loading: false, authenticated: false }); return undefined; }
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const otpVerified = sessionStorage.getItem(ADMIN_OTP_VERIFIED_KEY) === "true";
      if (data.session && !otpVerified) {
        await supabase.auth.signOut({ scope: "local" });
        if (active) setSession({ loading: false, authenticated: false });
        return;
      }
      setSession({ loading: false, authenticated: Boolean(data.session && otpVerified) });
    });
    // Keep the interface synchronized when Supabase signs in or signs out.
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      const otpVerified = sessionStorage.getItem(ADMIN_OTP_VERIFIED_KEY) === "true";
      setSession({ loading: false, authenticated: Boolean(nextSession && otpVerified) });
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  // Prevent repeated OTP emails by showing a 60-second resend countdown.
  useEffect(() => {
    if (resendAvailableIn <= 0) return undefined;
    const timer = window.setInterval(() => setResendAvailableIn((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendAvailableIn]);
  // Clone live content so edits remain local until Save changes is selected.
  useEffect(() => { if (content && !draft) setDraft(structuredClone(content)); }, [content, draft]);
  // Remove old success messages automatically after six seconds.
  useEffect(() => { if (!message || !session.authenticated) return undefined; const timer = window.setTimeout(() => setMessage(""), 6000); return () => window.clearTimeout(timer); }, [message, session.authenticated]);

  const hasUnsavedChanges = hasContentChanged(draft, content);

  // Let the browser warn before a tab with unsaved Admin changes is closed.
  useEffect(() => {
    function warnBeforeUnload(event) {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

  // Step 1 verifies the password, then emails a separate one-time code.
  async function login(event) {
    event.preventDefault(); setMessage(""); setAuthBusy(true);
    const email = credentials.email.trim();
    try {
      const { error: passwordError } = await supabase.auth.signInWithPassword({ email, password: credentials.password });
      if (passwordError) throw passwordError;
      // End the password session so OTP remains a required second factor.
      await supabase.auth.signOut({ scope: "local" });
      const { error: otpError } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      if (otpError) throw otpError;
      setPendingLoginEmail(email);
      setCredentials({ email, password: "" });
      setLoginOtp("");
      setLoginStep("otp");
      setResendAvailableIn(60);
      setMessage("A 6-digit sign-in code was sent to your Gmail.");
    } catch (error) {
      await supabase.auth.signOut({ scope: "local" });
      setMessage(error.message);
    } finally { setAuthBusy(false); }
  }
  // Step 2 verifies the Gmail OTP and opens the real Admin workspace.
  async function verifyLoginOtp(event) {
    event.preventDefault(); setMessage("");
    if (!/^\d{6}$/.test(loginOtp)) { setMessage("Enter the complete 6-digit code."); return; }
    setAuthBusy(true);
    sessionStorage.setItem(ADMIN_OTP_VERIFIED_KEY, "true");
    const { data, error } = await supabase.auth.verifyOtp({ email: pendingLoginEmail, token: loginOtp, type: "email" });
    if (error || !data.session) {
      sessionStorage.removeItem(ADMIN_OTP_VERIFIED_KEY);
      setMessage(error?.message || "The code is invalid or has expired.");
      setAuthBusy(false);
      return;
    }
    setSession({ loading: false, authenticated: true });
    setCredentials({ email: "", password: "" });
    setLoginOtp("");
    setMessage("Two-step verification completed successfully.");
    setAuthBusy(false);
  }
  // Requests a replacement code after the cooldown finishes.
  async function resendLoginOtp() {
    if (resendAvailableIn > 0 || authBusy) return;
    setMessage(""); setAuthBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: pendingLoginEmail, options: { shouldCreateUser: false } });
    setMessage(error ? error.message : "A new 6-digit sign-in code was sent to your Gmail.");
    if (!error) setResendAvailableIn(60);
    setAuthBusy(false);
  }
  // Clears both Supabase and local OTP state when the Admin logs out.
  async function logout() {
    if (hasUnsavedChanges && !window.confirm("You have unsaved changes. Log out without saving?")) return;
    sessionStorage.removeItem(ADMIN_OTP_VERIFIED_KEY);
    await supabase.auth.signOut();
    setSession({ loading: false, authenticated: false });
    setDraft(null);
    setLoginStep("credentials");
  }
  // Starts a clean recovery flow on the dedicated reset-password page.
  function openPasswordRecovery() {
    setMessage("");
    sessionStorage.removeItem(RECOVERY_EMAIL_KEY);
    sessionStorage.removeItem("tang-admin-recovery-verified");
    navigate("/reset-password", { state: { email: credentials.email.trim() } });
  }
  // Guest mode shows the CMS structure without granting write access.
  function openGuestPreview() { setGuestMode(true); setMessage(""); }
  function closeGuestPreview() { setGuestMode(false); setMessage(""); }
  function confirmLeave(event) {
    if (!hasUnsavedChanges || window.confirm("You have unsaved changes. Leave without saving?")) return;
    event.preventDefault();
  }
  function queueStorageDelete(url) {
    if (!storagePathFromPublicUrl(url)) return;
    setPendingStorageDeletes((current) => current.includes(url) ? current : [...current, url]);
  }
  // Capture clicks before disabled guest controls can change local content.
  function blockGuestInteraction(event) {
    if (!guestMode || event.target.closest(".admin-collapse-button, [data-guest-allowed='true']")) return;
    if (event.target.closest("button, a, input, textarea, .admin-toggle, .upload-button")) {
      event.preventDefault();
      event.stopPropagation();
      setMessage("Guest Preview is read-only. Sign in as Admin to use this control.");
    }
  }
  // Normalizes and writes the complete content document to Supabase row ID 1.
  async function persistContent(nextDraft, successMessage = "Changes saved successfully.", extraStorageDeletes = []) {
    // Keep dated content newest-first and clean social URLs before publishing.
    const normalizedDraft = {
      ...nextDraft,
      experience: sortRecent(nextDraft.experience, "period"),
      extraCurricularActivities: sortRecent(nextDraft.extraCurricularActivities, "period"),
      awards: sortRecent(nextDraft.awards, "date"),
      contact: { ...nextDraft.contact, github: normalizeExternalUrl(nextDraft.contact.github), linkedin: normalizeExternalUrl(nextDraft.contact.linkedin), facebook: normalizeExternalUrl(nextDraft.contact.facebook) },
    };
    // Upsert creates row 1 when missing or replaces its content when it exists.
    const { data, error } = await supabase.from("portfolio_content").upsert({ id: 1, content: normalizedDraft, updated_at: new Date().toISOString() }, { onConflict: "id" }).select("content").single();
    if (error) throw error;
    setDraft(structuredClone(data.content));
    setContent(data.content);

    // Delete only old Supabase files that are no longer referenced by saved content.
    const referencedUrls = collectReferencedStorageUrls(data.content);
    const cleanupUrls = [...new Set([...pendingStorageDeletes, ...extraStorageDeletes])]
      .filter((url) => storagePathFromPublicUrl(url) && !referencedUrls.has(url));
    let cleanupWarning = "";
    try {
      await removeStorageFiles(cleanupUrls);
      setPendingStorageDeletes((current) => current.filter((url) => !cleanupUrls.includes(url)));
    } catch (cleanupError) {
      cleanupWarning = ` Content was saved, but an old Storage file could not be removed: ${cleanupError.message}`;
    }

    await refresh();
    setMessage(`${successMessage}${cleanupWarning}`);
    return data.content;
  }
  // Publishes all unsaved draft changes from the main Save changes button.
  async function save(event) { event.preventDefault(); setSaving(true); setMessage(""); try { await persistContent(draft); } catch (error) { setMessage(error.message); } finally { setSaving(false); } }
  // Updates one nested object field without mutating the previous React state.
  function updateSection(section, key, value) { setDraft((current) => ({ ...current, [section]: { ...current[section], [key]: value } })); }
  // Creates small setter helpers for list-based editor components.
  const setArray = (section) => (items) => setDraft((current) => ({ ...current, [section]: items }));
  const setRecentArray = (section, dateKey) => (items) => setDraft((current) => ({ ...current, [section]: sortRecent(items, dateKey) }));

  if (session.loading || !content) return <div className="admin-loading">Checking secure session…</div>;
  if (!session.authenticated && !guestMode) return <main className="admin-login"><div className="admin-login__panel">
    <Link to="/"><ArrowLeft /> Back to portfolio</Link>
    <span className="eyebrow">Private access</span>
    <h1>Content Admin</h1>
    {loginStep === "credentials" ? <>
      <p>Sign in with your password, then verify the 6-digit code sent to your Gmail.</p>
      {!isSupabaseConfigured && <p className="admin-message admin-message--error">Supabase environment variables are missing.</p>}
      <form onSubmit={login} autoComplete="off">
        <Field label="Email" type="email" autoComplete="off" value={credentials.email} onChange={(email) => setCredentials({ ...credentials, email })} required />
        <Field label="Password" type="password" autoComplete="off" value={credentials.password} onChange={(password) => setCredentials({ ...credentials, password })} required />
        {message && <p className="admin-message admin-message--error">{message}</p>}
        <button className="button button--primary" type="submit" disabled={!isSupabaseConfigured || authBusy}>{authBusy ? "Checking…" : "Sign in"}</button>
        <button className="button button--ghost" type="button" onClick={openPasswordRecovery} disabled={!isSupabaseConfigured || authBusy}>Forgot password?</button>
        <div className="admin-login__divider"><span>Guest access</span></div>
        <button className="button button--guest" type="button" onClick={openGuestPreview}><UserFocus size={20} /> Explore Admin as Guest</button>
        <p className="admin-login__guest-note">View the complete Admin workspace safely. Editing, uploading, saving, and deleting are locked.</p>
      </form>
    </> : <>
      <p>We sent a one-time code to <strong>{pendingLoginEmail}</strong>. Enter it below to finish signing in.</p>
      <form onSubmit={verifyLoginOtp}>
        <label className="admin-field"><span>6-digit verification code</span><input className="admin-otp-input" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength="6" pattern="[0-9]{6}" value={loginOtp} onChange={(event) => setLoginOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus /></label>
        {message && <p className={message.includes("sent") ? "admin-message" : "admin-message admin-message--error"}>{message}</p>}
        <button className="button button--primary" type="submit" disabled={authBusy || loginOtp.length !== 6}>{authBusy ? "Verifying…" : "Verify and enter Admin"}</button>
        <button className="button button--ghost" type="button" onClick={resendLoginOtp} disabled={authBusy || resendAvailableIn > 0}>{resendAvailableIn > 0 ? `Resend code in ${resendAvailableIn}s` : "Resend code"}</button>
        <button className="admin-login__text-button" type="button" onClick={() => { setLoginStep("credentials"); setLoginOtp(""); setMessage(""); }}>Use a different account</button>
      </form>
    </>}
  </div></main>;
  if (!draft) return null;

  // Choose the toast color from the result message.
  const successMessage = message.toLowerCase().includes("successfully") || message.toLowerCase().includes("sent");
  return <AdminReadOnlyContext.Provider value={guestMode}><main className={`admin-page ${guestMode ? "admin-page--guest" : ""}`} onClickCapture={blockGuestInteraction} onSubmitCapture={blockGuestInteraction}>
    <header className="admin-header"><div><span className="eyebrow">{guestMode ? "Read-only demonstration" : "Private workspace"}</span><h1>{guestMode ? "Admin Guest Preview" : "Portfolio Content"}</h1>{!guestMode && <span className={`admin-save-status ${hasUnsavedChanges ? "admin-save-status--dirty" : ""}`}>{hasUnsavedChanges ? "Unsaved changes" : "All changes saved"}</span>}</div><div><button className="button button--primary" type="submit" form="admin-content-form" disabled={saving || guestMode || !hasUnsavedChanges} aria-disabled={guestMode || !hasUnsavedChanges} aria-describedby={guestMode ? "guest-read-only-message" : undefined}><FloppyDisk /> {saving ? "Saving…" : "Save changes"}</button><Link className="button button--ghost" data-guest-allowed="true" to="/" onClick={confirmLeave}><ArrowLeft /> View site</Link>{guestMode ? <button className="button button--ghost guest-exit" data-guest-allowed="true" type="button" onClick={closeGuestPreview}><ArrowLeft /> Exit preview</button> : <button className="button button--ghost" type="button" onClick={logout}><SignOut /> Log out</button>}</div></header>
    {guestMode && <aside className="admin-guest-banner"><LockKey size={24} weight="fill" /><div><strong>Guest Preview — view only</strong><p id="guest-read-only-message">This is a live demonstration of the portfolio CMS. Locked controls are unavailable; only an authenticated Admin can change Supabase content or files.</p></div></aside>}
    {message && <div className={`admin-toast ${successMessage ? "" : "admin-toast--error"}`} role="status"><span>{message}</span><button type="button" data-guest-allowed="true" onClick={() => setMessage("")} aria-label="Dismiss message"><X /></button></div>}
    {/* Every editor below updates the shared draft submitted by this form. */}
    <form id="admin-content-form" className="admin-form" onSubmit={save}>
      <section className="admin-card"><h2>Profile</h2><PortraitEditor value={draft.profile.portraitUrl} setMessage={setMessage} onChange={(value) => updateSection("profile", "portraitUrl", value)} onQueueStorageDelete={queueStorageDelete} onUploadComplete={(value, oldUrl) => persistContent({ ...draft, profile: { ...draft.profile, portraitUrl: value } }, "Portrait uploaded and published successfully.", [oldUrl])} /><div className="admin-grid"><Field label="Name" value={draft.profile.name} onChange={(value) => updateSection("profile", "name", value)} /><Field label="Role" value={draft.profile.role} onChange={(value) => updateSection("profile", "role", value)} /><Field label="Hero eyebrow" value={draft.profile.eyebrow} onChange={(value) => updateSection("profile", "eyebrow", value)} /><Field label="Availability" value={draft.profile.availability} onChange={(value) => updateSection("profile", "availability", value)} /><Field label="Intro" multiline value={draft.profile.intro} onChange={(value) => updateSection("profile", "intro", value)} /><Field label="Availability detail" multiline value={draft.profile.availabilityDetail} onChange={(value) => updateSection("profile", "availabilityDetail", value)} /></div></section>
      <section className="admin-card"><h2>About heading</h2><Field label="Heading" value={draft.about.heading} onChange={(value) => updateSection("about", "heading", value)} /></section>
      <ListEditor title="About paragraphs" description="Updates the Home and About pages." multiline addLabel="Add paragraph" items={draft.about.paragraphs} onChange={(value) => updateSection("about", "paragraphs", value)} setMessage={setMessage} />
      <ListEditor title="Skills" description="Updates the Home, About, and Resume pages together." items={draft.about.skills} onChange={(value) => updateSection("about", "skills", value)} setMessage={setMessage} collapsible />
      <ProjectEditor items={draft.projects} defaultUrl={draft.contact.github} onChange={setArray("projects")} onQueueStorageDelete={queueStorageDelete} setMessage={setMessage} onUploadComplete={(items, oldUrl) => persistContent({ ...draft, projects: items }, "Project logo uploaded and published successfully.", [oldUrl])} />
      <RecordEditor title="Semester Results" description="Hide the whole section or individual semester results without deleting them." addLabel="Add result" items={draft.semesterResults} fields={semesterFields} createItem={() => ({ id: crypto.randomUUID(), semester: "", gpa: "", visible: true })} onChange={setArray("semesterResults")} setMessage={setMessage} allowVisibility sectionVisible={draft.sectionVisibility.semesterResults} onSectionVisibilityChange={(value) => updateSection("sectionVisibility", "semesterResults", value)} />
      <RecordEditor title="Education" description="Shown on the Resume page in this order." items={draft.education} fields={educationFields} createItem={() => ({ id: crypto.randomUUID(), institution: "", qualification: "", period: "" })} onChange={setArray("education")} setMessage={setMessage} />
      <AdminCard title="Current Employment" description="Show your present workplace above previous experience when the Experience section is enabled." collapsible actions={<VisibilityToggle checked={Boolean(draft.currentEmployment.visible)} onChange={(value) => updateSection("currentEmployment", "visible", value)} />}><div className="admin-grid"><Field label="Company" value={draft.currentEmployment.company} onChange={(value) => updateSection("currentEmployment", "company", value)} /><Field label="Role" value={draft.currentEmployment.role} onChange={(value) => updateSection("currentEmployment", "role", value)} /><Field label="Period" value={draft.currentEmployment.period} onChange={(value) => updateSection("currentEmployment", "period", value)} /><Field label="Description" multiline value={draft.currentEmployment.description} onChange={(value) => updateSection("currentEmployment", "description", value)} /></div></AdminCard>
      <RecordEditor title="Experience" description="Automatically ordered newest to oldest. Hide the whole section or individual jobs without deleting them." items={sortRecent(draft.experience, "period")} fields={experienceFields} createItem={() => ({ id: crypto.randomUUID(), company: "", role: "", period: "", description: "", visible: true })} onChange={setRecentArray("experience", "period")} setMessage={setMessage} allowVisibility sectionVisible={draft.sectionVisibility.experience} onSectionVisibilityChange={(value) => updateSection("sectionVisibility", "experience", value)} />
      <RecordEditor title="Extra Curricular Activities" description="Hide the whole section or individual activities while keeping the information for later." items={sortRecent(draft.extraCurricularActivities, "period")} fields={activityFields} createItem={() => ({ id: crypto.randomUUID(), club: "", position: "", period: "", description: "", visible: true })} onChange={setRecentArray("extraCurricularActivities", "period")} setMessage={setMessage} allowVisibility sectionVisible={draft.sectionVisibility.extraCurricularActivities} onSectionVisibilityChange={(value) => updateSection("sectionVisibility", "extraCurricularActivities", value)} />
      <AdminCard title="Contact" description="Save once here to update the footer, Home contact panel, and Contact page together." collapsible><div className="admin-grid"><Field label="Gmail address" type="email" value={draft.contact.email} onChange={(value) => updateSection("contact", "email", value)} /><Field label="GitHub URL" value={draft.contact.github} onChange={(value) => updateSection("contact", "github", value)} /><Field label="LinkedIn URL (optional)" value={draft.contact.linkedin} onChange={(value) => updateSection("contact", "linkedin", value)} /><Field label="Facebook URL" value={draft.contact.facebook} onChange={(value) => updateSection("contact", "facebook", value)} /><Field label="WhatsApp number (country code, no +)" value={draft.contact.whatsapp} onChange={(value) => updateSection("contact", "whatsapp", value.replace(/\D/g, ""))} /></div></AdminCard>
      <DocumentEditor title="Awards" items={sortRecent(draft.awards, "date")} setMessage={setMessage} onChange={setRecentArray("awards", "date")} onQueueStorageDelete={queueStorageDelete} onUploadComplete={(items, oldUrl) => persistContent({ ...draft, awards: sortRecent(items, "date") }, "Award document uploaded and published successfully.", [oldUrl])} />
      <DocumentEditor title="Certificates" items={draft.certifications} setMessage={setMessage} onChange={setArray("certifications")} onQueueStorageDelete={queueStorageDelete} onUploadComplete={(items, oldUrl) => persistContent({ ...draft, certifications: items }, "Certificate uploaded and published successfully.", [oldUrl])} />
    </form>
  </main></AdminReadOnlyContext.Provider>;
}
