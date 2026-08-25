import React, { useState } from "react";
import { Wrench, Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { supabase } from "./supabaseClient";

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
  danger: "#E5534B",
  ok: "#4CAF7D",
};

const inputStyle = {
  background: "#1B1D20",
  border: `1px solid ${C.borderLight}`,
  borderRadius: 7,
  color: C.text,
  fontFamily: "Inter, sans-serif",
  fontSize: 15,
  padding: "11px 12px",
  outline: "none",
  width: "100%",
};

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo("Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.");
      }
    } catch (err) {
      setError(traduireErreur(err.message));
    } finally {
      setBusy(false);
    }
  };

  if (session === undefined) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh" }} className="flex items-center justify-center">
        <Loader2 size={26} color={C.accent} className="animate-spin" />
      </div>
    );
  }

  if (session) {
    return children({ session, signOut: () => supabase.auth.signOut() });
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text }} className="flex items-center justify-center p-4">
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14 }} className="w-full max-w-sm p-6">
        <div className="flex flex-col items-center mb-6">
          <div style={{ background: C.accent, borderRadius: 10 }} className="w-12 h-12 flex items-center justify-center mb-3">
            <Wrench size={22} color="#1a1108" />
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22 }}>
            SOS AUTO PIÈCES <span style={{ color: C.accent }}>68</span>
          </div>
          <div style={{ color: C.textFaint, fontFamily: "Inter, sans-serif", fontSize: 12 }} className="mt-1">
            {mode === "login" ? "Connexion à l'espace équipe" : "Créer un compte équipe"}
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex items-center gap-2" style={{ ...inputStyle, padding: "0 12px" }}>
            <Mail size={15} color={C.textFaint} />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="adresse@email.com"
              style={{ background: "transparent", border: "none", outline: "none", color: C.text, fontFamily: "Inter, sans-serif", fontSize: 15, padding: "11px 0", width: "100%" }}
            />
          </div>
          <div className="flex items-center gap-2" style={{ ...inputStyle, padding: "0 12px" }}>
            <Lock size={15} color={C.textFaint} />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe (6 caractères min.)"
              style={{ background: "transparent", border: "none", outline: "none", color: C.text, fontFamily: "Inter, sans-serif", fontSize: 15, padding: "11px 0", width: "100%" }}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2" style={{ color: C.danger, fontFamily: "Inter, sans-serif", fontSize: 13 }}>
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> <span>{error}</span>
            </div>
          )}
          {info && (
            <div style={{ color: C.ok, fontFamily: "Inter, sans-serif", fontSize: 13 }}>{info}</div>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{ background: C.accent, color: "#1a1108", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 15 }}
            className="py-2.5 rounded-md flex items-center justify-center gap-2 mt-1"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setInfo(""); }}
          style={{ color: C.textMuted, fontFamily: "Inter, sans-serif", fontSize: 13 }}
          className="w-full text-center mt-4 hover:opacity-80"
        >
          {mode === "login" ? "Pas encore de compte ? Créer un accès équipe" : "Déjà un compte ? Se connecter"}
        </button>
      </div>
    </div>
  );
}

function traduireErreur(msg) {
  const m = (msg || "").toLowerCase();
  if (m.includes("invalid login credentials")) return "Email ou mot de passe incorrect.";
  if (m.includes("user already registered")) return "Un compte existe déjà avec cet email.";
  if (m.includes("password should be at least")) return "Le mot de passe doit faire au moins 6 caractères.";
  if (m.includes("email not confirmed")) return "Confirme d'abord ton email (lien reçu par mail) avant de te connecter.";
  return msg;
}
