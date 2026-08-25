import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search, Plus, X, Pencil, Trash2, AlertTriangle, Package,
  Wrench, Boxes, TrendingUp, MapPin, Filter, Check, ChevronDown, Gauge, Calendar, Zap, UserCheck, Tag,
  RefreshCw, Users, Loader2, CloudOff, IdCard, LogOut
} from "lucide-react";
import { supabase } from "./supabaseClient";
import AuthGate from "./AuthGate";

const C = {
  bg: "#17181A",
  surface: "#1F2124",
  surfaceRaised: "#26282C",
  border: "#34373C",
  borderLight: "#3E4146",
  text: "#EDEEEF",
  textMuted: "#9A9CA2",
  textFaint: "#6B6E74",
  accent: "#FF6A1A",
  accentDim: "#4A2A16",
  amber: "#F2B705",
  ok: "#4CAF7D",
  danger: "#E5534B",
  plateBlue: "#1246A0",
};

const PALETTE = ["#E5534B", "#FF6A1A", "#5B8DEF", "#F2B705", "#7C8B99", "#4CAF7D", "#A78BFA", "#9CA3AF", "#22C1C3", "#EC4899", "#84CC16", "#38BDF8"];

const SEARCH_SCOPES = [
  { id: "tout", label: "Tout" },
  { id: "ref", label: "Référence" },
  { id: "nom", label: "Désignation" },
  { id: "plaque", label: "Plaque d'immatriculation" },
  { id: "affectation", label: "Client / Affectation" },
];

function catInfoFor(categories, label) {
  return categories.find((c) => c.label.toLowerCase() === (label || "").toLowerCase())
    || { label: label || "Sans catégorie", color: C.textFaint };
}

const emptyForm = {
  ref: "", nom: "", categorie: "", marque: "", modele: "", annee: "",
  cylindree: "", chevaux: "", affectation: "", plaque: "", qte: 0, seuil: 1,
  prixAchat: 0, prixVente: 0, emplacement: "", fournisseur: "",
};

function rowToPart(r) {
  return {
    id: r.id, ref: r.ref, nom: r.nom, categorie: r.categorie, marque: r.marque || "",
    modele: r.modele || "", annee: r.annee || "", cylindree: r.cylindree || "",
    chevaux: r.chevaux || 0, affectation: r.affectation || "", plaque: r.plaque || "",
    qte: r.qte || 0, seuil: r.seuil || 1, prixAchat: Number(r.prix_achat) || 0,
    prixVente: Number(r.prix_vente) || 0, emplacement: r.emplacement || "", fournisseur: r.fournisseur || "",
  };
}
function formToRow(f) {
  return {
    ref: f.ref, nom: f.nom, categorie: f.categorie, marque: f.marque, modele: f.modele,
    annee: f.annee, cylindree: f.cylindree, chevaux: Number(f.chevaux) || 0,
    affectation: f.affectation, plaque: f.plaque, qte: Number(f.qte) || 0, seuil: Number(f.seuil) || 1,
    prix_achat: Number(f.prixAchat) || 0, prix_vente: Number(f.prixVente) || 0,
    emplacement: f.emplacement, fournisseur: f.fournisseur,
  };
}

function BarStrip({ seed }) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const bars = Array.from({ length: 28 }, (_, i) => {
    const v = (h >> (i % 24)) & 1;
    return v ? 2 + ((h >> i) % 3) : 1;
  });
  return (
    <div style={{ display: "flex", alignItems: "stretch", height: 20, gap: 1, opacity: 0.55 }}>
      {bars.map((w, i) => (
        <div key={i} style={{ width: w, background: i % 2 === 0 ? C.textFaint : "transparent" }} />
      ))}
    </div>
  );
}

function PlateBadge({ value }) {
  if (!value) return null;
  return (
    <div style={{ border: "1.5px solid #111", borderRadius: 4, overflow: "hidden", display: "inline-flex", height: 22 }} title="Plaque d'immatriculation">
      <div style={{ background: C.plateBlue, width: 14 }} />
      <div style={{ background: "#F2F2F0", color: "#111", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, letterSpacing: "0.03em", padding: "0 7px", display: "flex", alignItems: "center" }}>
        {value}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }} className="p-4 flex-1 min-w-[150px]">
      <div className="flex items-center justify-between mb-3">
        <span style={{ color: C.textMuted, fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em" }} className="uppercase">{label}</span>
        <Icon size={16} color={accent || C.textFaint} />
      </div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", color: C.text, fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: C.textFaint, fontFamily: "Inter, sans-serif", fontSize: 12 }} className="mt-1">{sub}</div>}
    </div>
  );
}

function Spec({ icon: Icon, value }) {
  if (!value || value === "—" || value === 0) return null;
  return (
    <div className="flex items-center gap-1" style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 }}>
      <Icon size={12} color={C.textFaint} /> {value}
    </div>
  );
}

function PartCard({ p, categories, onEdit, onDelete, confirming, onConfirmDelete, onCancelDelete }) {
  const cat = catInfoFor(categories, p.categorie);
  const low = p.qte <= p.seuil;
  const marge = p.prixVente - p.prixAchat;
  const assigned = p.affectation && p.affectation.trim().length > 0;
  return (
    <div style={{ background: C.surface, border: `1px solid ${low ? C.danger + "55" : C.border}`, borderRadius: 10, position: "relative", overflow: "hidden" }} className="flex flex-col">
      {low && (
        <div style={{ position: "absolute", top: 0, right: 0, width: 64, height: 64, background: `repeating-linear-gradient(45deg, ${C.danger}, ${C.danger} 6px, #1a1a1a 6px, #1a1a1a 12px)`, clipPath: "polygon(100% 0, 0 0, 100% 100%)", opacity: 0.9 }} />
      )}
      <div className="p-4 pb-3 flex items-start justify-between gap-2">
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", color: C.accent, fontSize: 12, letterSpacing: "0.03em" }}>{p.ref}</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", color: C.text, fontSize: 21, fontWeight: 700, lineHeight: 1.15 }} className="mt-1">{p.nom}</div>
        </div>
      </div>

      <div className="px-4 flex items-center gap-2 flex-wrap">
        <span style={{ background: cat.color + "22", color: cat.color, border: `1px solid ${cat.color}55`, fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600 }} className="px-2 py-0.5 rounded-full uppercase tracking-wide">
          {cat.label}
        </span>
        <span style={{ color: C.textFaint, fontFamily: "Inter, sans-serif", fontSize: 12 }}>{p.marque} {p.modele && p.modele !== "—" ? `· ${p.modele}` : ""}</span>
      </div>

      <div className="px-4 mt-2.5 flex items-center gap-3 flex-wrap">
        <Spec icon={Calendar} value={p.annee} />
        <Spec icon={Gauge} value={p.cylindree} />
        <Spec icon={Zap} value={p.chevaux ? `${p.chevaux} ch` : 0} />
      </div>

      <div className="px-4 mt-2.5 flex items-center gap-2 flex-wrap">
        <span style={{ background: assigned ? C.amber + "1c" : C.ok + "1c", color: assigned ? C.amber : C.ok, border: `1px solid ${assigned ? C.amber : C.ok}44`, fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 600 }} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md">
          <UserCheck size={12} /> {assigned ? p.affectation : "Stock libre"}
        </span>
        <PlateBadge value={p.plaque} />
      </div>

      <div className="px-4 mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1" style={{ color: C.textMuted, fontFamily: "Inter, sans-serif", fontSize: 12 }}>
          <MapPin size={13} /> {p.emplacement} · {p.fournisseur}
        </div>
      </div>

      <div className="px-4 mt-3 flex items-end justify-between">
        <div>
          <div style={{ color: C.textFaint, fontFamily: "Inter, sans-serif", fontSize: 10 }} className="uppercase tracking-wide">Stock</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: low ? C.danger : C.text }}>
            {p.qte}<span style={{ color: C.textFaint, fontSize: 12 }}> / seuil {p.seuil}</span>
          </div>
        </div>
        <div className="text-right">
          <div style={{ color: C.textFaint, fontFamily: "Inter, sans-serif", fontSize: 10 }} className="uppercase tracking-wide">Achat / Vente</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: C.textMuted }}>{p.prixAchat.toFixed(2)} €</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, color: C.text }}>{p.prixVente.toFixed(2)} €</div>
          <div style={{ color: C.ok, fontFamily: "Inter, sans-serif", fontSize: 11 }}>+{marge.toFixed(2)} € marge</div>
        </div>
      </div>

      <div className="px-4 mt-3"><BarStrip seed={p.ref} /></div>

      <div style={{ borderTop: `1px solid ${C.border}` }} className="mt-3 px-2 py-2 flex items-center justify-end gap-1">
        {confirming ? (
          <div className="flex items-center gap-2 pr-1">
            <span style={{ color: C.textMuted, fontFamily: "Inter, sans-serif", fontSize: 12 }}>Supprimer ?</span>
            <button onClick={onCancelDelete} style={{ color: C.textMuted, fontFamily: "Inter, sans-serif", fontSize: 12 }} className="px-2 py-1 rounded hover:opacity-80">Annuler</button>
            <button onClick={onConfirmDelete} style={{ background: C.danger, color: "#fff", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600 }} className="px-2 py-1 rounded">Confirmer</button>
          </div>
        ) : (
          <>
            <button onClick={onEdit} style={{ color: C.textMuted }} className="p-2 rounded hover:opacity-80" aria-label="Modifier"><Pencil size={15} /></button>
            <button onClick={onDelete} style={{ color: C.textMuted }} className="p-2 rounded hover:opacity-80" aria-label="Supprimer"><Trash2 size={15} /></button>
          </>
        )}
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span style={{ color: C.textMuted, fontFamily: "Inter, sans-serif", fontSize: 11 }} className="uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  background: "#1B1D20", border: `1px solid ${C.borderLight}`, borderRadius: 7, color: C.text,
  fontFamily: "Inter, sans-serif", fontSize: 14, padding: "9px 10px", outline: "none", width: "100%",
};

function PartModal({ initial, categories, onClose, onSave, saving }) {
  const [form, setForm] = useState(initial);
  const isEdit = !!initial.id;
  const set = (k) => (e) => { const v = e && e.target ? e.target.value : e; setForm((f) => ({ ...f, [k]: v })); };
  const setNum = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value === "" ? "" : Number(e.target.value) }));
  const setPlaque = (e) => setForm((f) => ({ ...f, plaque: e.target.value.toUpperCase() }));

  const valid = form.ref.trim() && form.nom.trim() && form.categorie.trim() && form.qte !== "" && form.seuil !== "";
  const catPreview = form.categorie.trim() ? catInfoFor(categories, form.categorie.trim()) : null;
  const isNewCat = catPreview && !categories.some((c) => c.label.toLowerCase() === form.categorie.trim().toLowerCase());

  return (
    <div style={{ background: "rgba(10,10,11,0.72)", backdropFilter: "blur(2px)" }} className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div style={{ background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 12, maxHeight: "88vh" }} className="w-full max-w-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div style={{ borderBottom: `1px solid ${C.border}`, background: C.surfaceRaised }} className="px-5 py-4 flex items-center justify-between sticky top-0">
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", color: C.text, fontSize: 22, fontWeight: 700 }}>{isEdit ? "Modifier la pièce" : "Nouvelle pièce"}</h2>
          <button onClick={onClose} style={{ color: C.textMuted }} className="p-1 rounded hover:opacity-80"><X size={18} /></button>
        </div>

        <div className="px-5 pt-4">
          <span style={{ color: C.textFaint, fontFamily: "Inter, sans-serif", fontSize: 12 }}>
            Les champs marqués <span style={{ color: C.accent }}>*</span> sont obligatoires.
          </span>
        </div>

        <div className="p-5 grid grid-cols-2 gap-3">
          <FormField label={<>Référence <span style={{ color: C.accent }}>*</span></>}>
            <input style={{ ...inputStyle, borderColor: form.ref.trim() ? C.borderLight : C.danger + "88" }} value={form.ref} onChange={set("ref")} placeholder="FRE-2201" />
          </FormField>

          <FormField label={<>Catégorie <span style={{ color: C.accent }}>*</span> — libre</>}>
            <input style={{ ...inputStyle, borderColor: form.categorie.trim() ? C.borderLight : C.danger + "88" }} value={form.categorie} onChange={set("categorie")} placeholder="Freinage, Turbo…" list="categories-list" />
            <datalist id="categories-list">{categories.map((c) => <option key={c.label} value={c.label} />)}</datalist>
          </FormField>

          {catPreview && (
            <div className="col-span-2 -mt-1">
              <span style={{ background: catPreview.color + "22", color: catPreview.color, border: `1px solid ${catPreview.color}55`, fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600 }} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full uppercase tracking-wide">
                <Tag size={11} /> {catPreview.label}{isNewCat ? " · nouvelle catégorie" : ""}
              </span>
            </div>
          )}

          <div className="col-span-2">
            <FormField label={<>Désignation <span style={{ color: C.accent }}>*</span></>}>
              <input style={{ ...inputStyle, borderColor: form.nom.trim() ? C.borderLight : C.danger + "88" }} value={form.nom} onChange={set("nom")} placeholder="Plaquettes de frein avant" />
            </FormField>
          </div>

          <FormField label="Marque"><input style={inputStyle} value={form.marque} onChange={set("marque")} placeholder="Peugeot" /></FormField>
          <FormField label="Modèle"><input style={inputStyle} value={form.modele} onChange={set("modele")} placeholder="308 / 3008" /></FormField>

          <FormField label="Année(s)"><input style={inputStyle} value={form.annee} onChange={set("annee")} placeholder="2016-2022" /></FormField>
          <FormField label="Cylindrée"><input style={inputStyle} value={form.cylindree} onChange={set("cylindree")} placeholder="1.6L" /></FormField>

          <FormField label="Puissance (ch)"><input type="number" style={inputStyle} value={form.chevaux} onChange={setNum("chevaux")} placeholder="130" /></FormField>
          <FormField label="Emplacement"><input style={inputStyle} value={form.emplacement} onChange={set("emplacement")} placeholder="A1-03" /></FormField>

          <div className="col-span-2">
            <FormField label="Affectation (client / OR / véhicule — vide = stock libre)">
              <input style={inputStyle} value={form.affectation} onChange={set("affectation")} placeholder="Client Marchal" />
            </FormField>
          </div>

          <div className="col-span-2">
            <FormField label="Plaque d'immatriculation">
              <input style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }} value={form.plaque} onChange={setPlaque} placeholder="AB-123-CD" maxLength={12} />
            </FormField>
          </div>

          <FormField label={<>Quantité en stock <span style={{ color: C.accent }}>*</span></>}>
            <input type="number" style={{ ...inputStyle, borderColor: form.qte !== "" ? C.borderLight : C.danger + "88" }} value={form.qte} onChange={setNum("qte")} />
          </FormField>
          <FormField label={<>Seuil d'alerte <span style={{ color: C.accent }}>*</span></>}>
            <input type="number" style={{ ...inputStyle, borderColor: form.seuil !== "" ? C.borderLight : C.danger + "88" }} value={form.seuil} onChange={setNum("seuil")} />
          </FormField>

          <FormField label="Prix d'achat (€)"><input type="number" step="0.01" style={inputStyle} value={form.prixAchat} onChange={setNum("prixAchat")} /></FormField>
          <FormField label="Prix de vente (€)"><input type="number" step="0.01" style={inputStyle} value={form.prixVente} onChange={setNum("prixVente")} /></FormField>

          <div className="col-span-2">
            <FormField label="Fournisseur"><input style={inputStyle} value={form.fournisseur} onChange={set("fournisseur")} placeholder="Bosch" /></FormField>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}` }} className="px-5 py-4 flex justify-end gap-2">
          <button onClick={onClose} style={{ color: C.textMuted, fontFamily: "Inter, sans-serif", fontSize: 14 }} className="px-4 py-2 rounded-md hover:opacity-80">Annuler</button>
          <button
            disabled={!valid || saving}
            onClick={() => valid && onSave(form)}
            style={{ background: valid ? C.accent : C.borderLight, color: valid ? "#1a1108" : C.textFaint, fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 700 }}
            className="px-4 py-2 rounded-md flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? "Enregistrer" : "Ajouter la pièce"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StockApp({ session, signOut }) {
  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [searchScope, setSearchScope] = useState("tout");
  const [cat, setCat] = useState("all");
  const [onlyLow, setOnlyLow] = useState(false);
  const [modal, setModal] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncState, setSyncState] = useState("idle");
  const [storageOk, setStorageOk] = useState(true);

  const fetchAll = useCallback(async () => {
    const [{ data: catRows, error: catErr }, { data: partRows, error: partErr }] = await Promise.all([
      supabase.from("categories").select("*").order("created_at"),
      supabase.from("parts").select("*").order("created_at"),
    ]);
    if (catErr || partErr) { setStorageOk(false); return false; }
    setCategories(catRows.map((r) => ({ label: r.label, color: r.color })));
    setParts(partRows.map(rowToPart));
    setStorageOk(true);
    return true;
  }, []);

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
    const channel = supabase
      .channel("stock-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "parts" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const filtered = useMemo(() => {
    return parts.filter((p) => {
      if (cat !== "all" && p.categorie.toLowerCase() !== cat.toLowerCase()) return false;
      if (onlyLow && p.qte > p.seuil) return false;
      const q = query.trim().toLowerCase();
      if (q) {
        if (searchScope === "ref") { if (!p.ref.toLowerCase().includes(q)) return false; }
        else if (searchScope === "nom") { if (!p.nom.toLowerCase().includes(q)) return false; }
        else if (searchScope === "plaque") { if (!(p.plaque || "").toLowerCase().includes(q)) return false; }
        else if (searchScope === "affectation") { if (!(p.affectation || "").toLowerCase().includes(q)) return false; }
        else {
          const hay = [p.ref, p.nom, p.marque, p.modele, p.affectation, p.plaque, p.categorie].join(" ").toLowerCase();
          if (!hay.includes(q)) return false;
        }
      }
      return true;
    });
  }, [parts, query, searchScope, cat, onlyLow]);

  const stats = useMemo(() => {
    const valeur = parts.reduce((s, p) => s + p.qte * p.prixAchat, 0);
    const unites = parts.reduce((s, p) => s + p.qte, 0);
    const alertes = parts.filter((p) => p.qte <= p.seuil).length;
    return { refs: parts.length, valeur, unites, alertes };
  }, [parts]);

  const ensureCategory = async (name) => {
    const existing = categories.find((c) => c.label.toLowerCase() === name.toLowerCase());
    if (existing) return existing.label;
    const color = PALETTE[categories.length % PALETTE.length];
    const { error } = await supabase.from("categories").insert({ label: name, color });
    if (error && !String(error.message).includes("duplicate")) throw error;
    return name;
  };

  const save = async (form) => {
    setSaving(true);
    setSyncState("saving");
    try {
      const label = await ensureCategory(form.categorie.trim());
      const row = formToRow({ ...form, categorie: label });
      if (form.id) {
        const { error } = await supabase.from("parts").update(row).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("parts").insert({ ...row, created_by: session.user.id });
        if (error) throw error;
      }
      await fetchAll();
      setSyncState("saved");
      setStorageOk(true);
      setModal(null);
    } catch (e) {
      setSyncState("error");
      setStorageOk(false);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    setConfirmId(null);
    setSyncState("saving");
    try {
      const { error } = await supabase.from("parts").delete().eq("id", id);
      if (error) throw error;
      await fetchAll();
      setSyncState("saved");
      setStorageOk(true);
    } catch (e) {
      setSyncState("error");
      setStorageOk(false);
    }
  };

  const scopePlaceholder = {
    tout: "Référence, désignation, marque, plaque, catégorie…",
    ref: "Rechercher une référence…",
    nom: "Rechercher une désignation…",
    plaque: "Rechercher une plaque (ex. AB-123-CD)…",
    affectation: "Rechercher un client, un OR…",
  }[searchScope];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text }}>
      {loading ? (
        <div className="flex items-center justify-center" style={{ minHeight: "100vh" }}>
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={26} color={C.accent} className="animate-spin" />
            <div style={{ color: C.textMuted, fontFamily: "Inter, sans-serif", fontSize: 13 }}>Chargement du stock…</div>
          </div>
        </div>
      ) : (
        <>
          <header style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }} className="sticky top-0 z-30">
            <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div style={{ background: C.accent, borderRadius: 8 }} className="w-9 h-9 flex items-center justify-center">
                  <Wrench size={18} color="#1a1108" />
                </div>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 24, letterSpacing: "0.01em", lineHeight: 1 }}>
                    SOS AUTO PIÈCES <span style={{ color: C.accent }}>68</span>
                  </div>
                  <div style={{ color: C.textFaint, fontFamily: "Inter, sans-serif", fontSize: 11 }} className="uppercase tracking-wide">Gestion de stock — pièces automobiles</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => fetchAll()} style={{ color: C.textMuted, border: `1px solid ${C.border}`, background: C.surface, fontFamily: "Inter, sans-serif", fontSize: 13 }} className="px-3 py-2.5 rounded-md flex items-center gap-2" aria-label="Actualiser">
                  <RefreshCw size={15} /> <span className="hidden sm:inline">Actualiser</span>
                </button>
                <button onClick={() => setModal(emptyForm)} style={{ background: C.accent, color: "#1a1108", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14 }} className="px-4 py-2.5 rounded-md flex items-center gap-2">
                  <Plus size={16} /> <span className="hidden sm:inline">Nouvelle pièce</span>
                </button>
                <button onClick={signOut} style={{ color: C.textFaint, border: `1px solid ${C.border}`, background: C.surface }} className="p-2.5 rounded-md" aria-label="Déconnexion" title={session.user.email}>
                  <LogOut size={15} />
                </button>
              </div>
            </div>

            <div className="max-w-6xl mx-auto px-5 pb-3 flex items-center gap-2 flex-wrap">
              {storageOk ? (
                <span className="flex items-center gap-1.5" style={{ color: C.textFaint, fontFamily: "Inter, sans-serif", fontSize: 11.5 }}>
                  <Users size={12} /> Connecté en tant que {session.user.email} — stock partagé, temps réel
                  {syncState === "saving" && <span style={{ color: C.textMuted }}>· enregistrement…</span>}
                  {syncState === "saved" && <span style={{ color: C.ok }}>· à jour</span>}
                </span>
              ) : (
                <span className="flex items-center gap-1.5" style={{ color: C.danger, fontFamily: "Inter, sans-serif", fontSize: 11.5 }}>
                  <CloudOff size={12} /> Problème de connexion à la base de données — réessaie.
                </span>
              )}
            </div>
          </header>

          <main className="max-w-6xl mx-auto px-5 py-6">
            <div className="flex gap-3 flex-wrap mb-6">
              <StatCard icon={Boxes} label="Références actives" value={stats.refs} accent={C.text} />
              <StatCard icon={Package} label="Unités en stock" value={stats.unites} accent={C.text} />
              <StatCard icon={TrendingUp} label="Valeur du stock" value={`${stats.valeur.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`} sub="au prix d'achat" accent={C.ok} />
              <StatCard icon={AlertTriangle} label="Alertes stock bas" value={stats.alertes} sub={stats.alertes > 0 ? "à réapprovisionner" : "rien à signaler"} accent={stats.alertes > 0 ? C.danger : C.ok} />
            </div>

            <div className="flex items-center gap-2.5 flex-wrap mb-2">
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }} className="flex items-center px-3 py-2 gap-2 flex-1 min-w-[220px]">
                {searchScope === "plaque" ? <IdCard size={15} color={C.textFaint} /> : <Search size={15} color={C.textFaint} />}
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={scopePlaceholder}
                  style={{ background: "transparent", border: "none", outline: "none", color: C.text, width: "100%", fontFamily: searchScope === "plaque" ? "'JetBrains Mono', monospace" : "Inter, sans-serif", fontSize: 14, letterSpacing: searchScope === "plaque" ? "0.04em" : "normal" }}
                />
              </div>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }} className="flex items-center px-3 py-2 gap-2">
                <Filter size={14} color={C.textFaint} />
                <select value={searchScope} onChange={(e) => setSearchScope(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", color: C.text, fontFamily: "Inter, sans-serif", fontSize: 13 }}>
                  {SEARCH_SCOPES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <ChevronDown size={13} color={C.textFaint} />
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap mb-5">
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }} className="flex items-center px-3 py-2 gap-2">
                <Tag size={14} color={C.textFaint} />
                <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", color: C.text, fontFamily: "Inter, sans-serif", fontSize: 13 }}>
                  <option value="all">Toutes catégories</option>
                  {categories.map((c) => <option key={c.label} value={c.label}>{c.label}</option>)}
                </select>
                <ChevronDown size={13} color={C.textFaint} />
              </div>
              <button onClick={() => setOnlyLow((v) => !v)} style={{ background: onlyLow ? C.danger + "22" : C.surface, border: `1px solid ${onlyLow ? C.danger : C.border}`, color: onlyLow ? C.danger : C.textMuted, fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600 }} className="flex items-center gap-2 px-3 py-2 rounded-md">
                {onlyLow && <Check size={14} />}<AlertTriangle size={14} /> Alertes uniquement
              </button>
            </div>

            {filtered.length === 0 ? (
              <div style={{ border: `1px dashed ${C.border}`, borderRadius: 12, color: C.textMuted }} className="py-16 text-center">
                <Package size={28} className="mx-auto mb-3" color={C.textFaint} />
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, color: C.text }}>Aucune pièce trouvée</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }} className="mt-1">Ajustez la recherche ou les filtres, ou ajoutez une nouvelle pièce.</div>
              </div>
            ) : (
              <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                {filtered.map((p) => (
                  <PartCard key={p.id} p={p} categories={categories} onEdit={() => setModal(p)} onDelete={() => setConfirmId(p.id)} confirming={confirmId === p.id} onConfirmDelete={() => remove(p.id)} onCancelDelete={() => setConfirmId(null)} />
                ))}
              </div>
            )}
          </main>

          {modal && (
            <PartModal initial={modal.id ? modal : emptyForm} categories={categories} onClose={() => setModal(null)} onSave={save} saving={saving} />
          )}
        </>
      )}
    </div>
  );
}

export default function App() {
  return <AuthGate>{({ session, signOut }) => <StockApp session={session} signOut={signOut} />}</AuthGate>;
}
