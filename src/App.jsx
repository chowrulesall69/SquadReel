import { useState, useRef, useEffect } from "react";

// ── Supabase Config ────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://hhmjoeoushxpasatklry.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhobWpvZW91c2h4cGFzYXRrbHJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNjk2NTIsImV4cCI6MjA4ODk0NTY1Mn0.Pw6Wd8MiehLURtlpCMQA-WWt8xYfKR47gcLBbcHAweI";

const sb = async (path, opts = {}) => {
  const { headers: extraHeaders, prefer, ...restOpts } = opts;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": prefer || "return=representation",
      ...(extraHeaders || {})
    },
    ...restOpts
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const DB = {
  get: async (table, match) => {
    const params = Object.entries(match).map(([k,v]) => `${k}=eq.${encodeURIComponent(v)}`).join("&");
    const rows = await sb(`${table}?${params}&limit=1`);
    return rows?.[0] || null;
  },
  getAll: async (table, match = {}) => {
    const params = Object.entries(match).map(([k,v]) => `${k}=eq.${encodeURIComponent(v)}`).join("&");
    return await sb(`${table}${params ? "?" + params : ""}`) || [];
  },
  insert: async (table, data) => {
    const rows = await sb(table, { method: "POST", body: JSON.stringify(data), prefer: "return=representation" });
    return Array.isArray(rows) ? rows[0] : rows;
  },
  update: async (table, match, data) => {
    const params = Object.entries(match).map(([k,v]) => `${k}=eq.${encodeURIComponent(v)}`).join("&");
    const rows = await sb(`${table}?${params}`, { method: "PATCH", body: JSON.stringify(data), prefer: "return=representation" });
    return Array.isArray(rows) ? rows[0] : rows;
  },
  upsert: async (table, data) => {
    const rows = await sb(table, {
      method: "POST",
      body: JSON.stringify(data),
      prefer: "resolution=merge-duplicates,return=representation"
    });
    return Array.isArray(rows) ? rows[0] : rows;
  },
  delete: async (table, match) => {
    const params = Object.entries(match).map(([k,v]) => `${k}=eq.${encodeURIComponent(v)}`).join("&");
    return await sb(`${table}?${params}`, { method: "DELETE", prefer: "return=minimal" });
  }
};

// ── AI Helper ─────────────────────────────────────────────────────────────────
const callAI = async (messages, systemPrompt, imageBase64 = null) => {
  const userContent = imageBase64
    ? [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64.split(",")[1] } }, { type: "text", text: messages }]
    : messages;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt, messages: [{ role: "user", content: userContent }] })
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
};

// ── Utils ─────────────────────────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const hash = s => s.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0).toString(36);
const timeAgo = ts => { const d = Date.now() - ts, m = Math.floor(d / 60000); if (m < 1) return "just now"; if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; return `${Math.floor(h / 24)}d ago`; };
const fmtSize = b => b < 1024 ? b + "B" : b < 1048576 ? (b / 1024).toFixed(1) + "KB" : (b / 1048576).toFixed(1) + "MB";
const f2b64 = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });

const ICONS = ["⚽", "🏌️", "🏀", "🎾", "🏈", "🏒", "🎱", "🥊", "🏋️", "🎮", "🎯", "🏄"];
const COLORS = ["#ff4d00", "#00b4d8", "#06d6a0", "#ffd60a", "#c77dff", "#ff006e", "#fb5607", "#3a86ff"];
const REACTIONS = ["🔥", "💪", "👏", "😤", "🎯", "⚡"];
const STICKERS = ["⚽", "🔥", "💪", "🏆", "🎯", "⚡", "👑", "💥", "🌟", "😤", "🥇", "📸", "🎬", "💨", "🏅"];
const FILTERS = [
  { name: "Original", fn: () => "none" }, { name: "Vivid", fn: () => "brightness(105%) contrast(120%) saturate(150%)" },
  { name: "Muted", fn: () => "saturate(60%) brightness(105%)" }, { name: "Chrome", fn: () => "contrast(130%) saturate(110%) brightness(105%)" },
  { name: "Fade", fn: () => "brightness(115%) contrast(85%) saturate(80%)" }, { name: "Noir", fn: () => "grayscale(100%) contrast(120%)" },
  { name: "Warm", fn: () => "sepia(40%) saturate(130%) brightness(105%)" }, { name: "Cold", fn: () => "hue-rotate(200deg) saturate(120%) brightness(105%)" },
  { name: "Drama", fn: () => "contrast(150%) brightness(90%) saturate(120%)" }, { name: "Golden", fn: () => "sepia(60%) saturate(180%) brightness(110%)" },
];

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your elementary school?",
  "What was your childhood nickname?",
  "What is the name of your favorite sports team?"
];

const FF = "Barlow,sans-serif", FN = "'Bebas Neue',sans-serif", BD = "#0d0d14", B1 = "#111", BF = "#0a0a0f", BA = "#1a1a1a";
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;700;800;900&family=Barlow:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0d0d14}::-webkit-scrollbar-thumb{background:#ff4d00;border-radius:2px}
input,textarea,button{font-family:'Barlow Condensed',sans-serif;}
.hov{transition:all 0.15s;cursor:pointer}.hov:hover{filter:brightness(1.2)}.hov:active{transform:scale(0.97)}
.ch{transition:transform 0.2s,box-shadow 0.2s;cursor:pointer}.ch:hover{transform:translateY(-3px);box-shadow:0 0 0 2px #ff4d00,0 12px 32px rgba(255,77,0,0.2)}
@keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes glow{0%,100%{box-shadow:0 0 8px #ff4d0055}50%{box-shadow:0 0 22px #ff4d00aa}}
@keyframes tagPop{0%{transform:translate(-50%,-100%) scale(0)}60%{transform:translate(-50%,-100%) scale(1.2)}100%{transform:translate(-50%,-100%) scale(1)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
.fu{animation:fadeUp 0.35s ease both}.fu2{animation:fadeUp 0.35s 0.07s ease both}.fu3{animation:fadeUp 0.35s 0.14s ease both}
.slider{-webkit-appearance:none;appearance:none;height:3px;border-radius:2px;background:#222;outline:none;width:100%}
.slider::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#ff4d00;cursor:pointer}
.rbtn{cursor:pointer;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:20px;padding:4px 10px;font-size:14px;display:inline-flex;align-items:center;gap:4px;transition:all 0.15s;font-family:inherit}
.rbtn:hover,.rbtn.on{border-color:#ff4d00;background:#1f1208}
.tb{background:none;border:none;cursor:pointer;font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:0.08em;padding:10px 14px;transition:all 0.15s;border-bottom:2px solid transparent;white-space:nowrap}
.tb.act{color:#ff4d00;border-bottom-color:#ff4d00}.tb:not(.act){color:#555}.tb:hover:not(.act){color:#888}
`;

const Spin = () => <div style={{ width: 26, height: 26, border: "3px solid #1a1a1a", borderTopColor: "#ff4d00", borderRadius: "50%", animation: "spin 0.75s linear infinite", margin: "0 auto" }} />;
const Btn = ({ children, onClick, bg = "#ff4d00", fg = "#fff", style = {}, ...p }) => (
  <button onClick={onClick} className="hov" style={{ border: "none", background: bg, color: fg, fontFamily: FN, fontSize: 15, letterSpacing: "0.08em", padding: "9px 18px", cursor: "pointer", ...style }} {...p}>{children}</button>
);
const Inp = ({ style = {}, ...p }) => (
  <input style={{ width: "100%", background: "#fff", border: "1px solid #2a2a2a", color: "#111", padding: "11px 14px", fontSize: 15, outline: "none", fontFamily: FF, ...style }} {...p} />
);
const Avatar = ({ src, name, size = 36, color = "#ff4d00", onClick }) => (
  <div onClick={onClick} style={{ width: size, height: size, borderRadius: "50%", background: src ? "transparent" : `linear-gradient(135deg,${color},${color}88)`, border: `2px solid ${color}`, overflow: "hidden", flexShrink: 0, cursor: onClick ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>
    {src ? <img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: size * .38, fontFamily: FN, color: "#fff" }}>{(name || "?")[0].toUpperCase()}</span>}
  </div>
);

// ── Password field with show/hide toggle ──────────────────────────────────────
const PwdInp = ({ value, onChange, onKeyDown, placeholder = "Password" }) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <Inp
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        style={{ paddingRight: 44, color: "#111" }}
      />
      <button type="button" onClick={() => setShow(s => !s)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 17, color: "#888", padding: 0, lineHeight: 1 }}>
        {show ? "🙈" : "👁️"}
      </button>
    </div>
  );
};

export default function SquadReel() {
  const [screen, setScreen] = useState("splash");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [groupMedia, setGroupMedia] = useState([]);
  const [allMyMedia, setAllMyMedia] = useState([]);
  const [taggedMedia, setTaggedMedia] = useState([]);
  const [selected, setSelected] = useState(null);
  const [profileTab, setProfileTab] = useState("posts");
  const [viewingUser, setViewingUser] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [newComment, setNewComment] = useState("");
  const [reactionOpen, setReactionOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProg, setUploadProg] = useState(0);
  const [tagMode, setTagMode] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [pendingTagPos, setPendingTagPos] = useState(null);
  const [hoveredTag, setHoveredTag] = useState(null);
  const [editScreen, setEditScreen] = useState("adjust");
  const [editState, setEditState] = useState(null);
  const [textOverlays, setTextOverlays] = useState([]);
  const [stickerOverlays, setStickerOverlays] = useState([]);
  const [activeFilter, setActiveFilter] = useState(0);
  const [editingTextId, setEditingTextId] = useState(null);
  const [aiLoading, setAiLoading] = useState(null);
  const [aiTagSuggestions, setAiTagSuggestions] = useState([]);
  const [aiCaption, setAiCaption] = useState(null);
  const [aiCoachFeedback, setAiCoachFeedback] = useState(null);
  const [aiReelPicks, setAiReelPicks] = useState([]);
  const [showAiPanel, setShowAiPanel] = useState(null);
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);

  const fileRef = useRef(); const avatarRef = useRef(); const canvasRef = useRef(); const imgRef = useRef();
  const toast$ = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };
  const F = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const ac = profile?.accentColor || activeGroup?.color || "#ff4d00";
  const unread = notifications.filter(n => !n.read).length;

  // ── DB Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        // Test connection
        await sb("users?limit=1", { prefer: "count=none" });
        setDbReady(true);
        // Auto-login
        try {
          const sessRaw = localStorage.getItem("sr_session");
          if (!sessRaw) return;
          const { username, passwordHash } = JSON.parse(sessRaw);
          const u = await DB.get("users", { username: username.toLowerCase() });
          if (!u || u.password_hash !== passwordHash) return;
          const p = await DB.get("profiles", { username: username.toLowerCase() });
          setUser(u); setProfile(p || defaultProfile());
          await loadGroups(u); await loadNotifs(username); setScreen("dashboard");
        } catch { }
      } catch (e) {
        setDbError("Cannot connect to database. Please check your Supabase setup.");
        setDbReady(true);
      }
    })();
  }, []);

  const defaultProfile = () => ({ bio: "", avatar: "", accentColor: "#ff4d00", pinned_ids: [], approved_tag_ids: [] });

  const saveSession = u => localStorage.setItem("sr_session", JSON.stringify({ username: u.username, passwordHash: u.password_hash }));
  const clearSession = () => localStorage.removeItem("sr_session");

  // ── Auth ──────────────────────────────────────────────────────────────────────
  const register = async () => {
    const { username = "", password = "", secQuestion = "", secAnswer = "" } = form;
    if (!username.trim() || !password.trim()) return toast$("Fill all fields", "err");
    if (username.trim().length < 2) return toast$("Username too short", "err");
    if (password.length < 4) return toast$("Min 4 chars", "err");
    if (!secQuestion || !secAnswer.trim()) return toast$("Set a recovery question", "err");
    setLoading(true);
    try {
      const existing = await DB.get("users", { username: username.toLowerCase() });
      if (existing) { setLoading(false); return toast$("Username taken", "err"); }
      const u = await DB.insert("users", {
        username: username.toLowerCase(),
        display_name: username.trim(),
        password_hash: hash(password),
        security_question: secQuestion,
        security_answer: hash(secAnswer.trim().toLowerCase()),
        group_ids: [],
        created_at: Date.now()
      });
      const p = await DB.insert("profiles", { username: username.toLowerCase(), ...defaultProfile() });
      setUser(u); setProfile(p); setForm({}); saveSession(u);
      await loadGroups(u); setScreen("dashboard"); toast$(`Welcome, ${u.display_name}! 🔥`);
    } catch (e) { toast$("Registration failed: " + e.message, "err"); }
    setLoading(false);
  };

  const login = async () => {
    const { username = "", password = "" } = form;
    if (!username.trim() || !password.trim()) return toast$("Fill all fields", "err");
    setLoading(true);
    try {
      const u = await DB.get("users", { username: username.toLowerCase() });
      if (!u) { setLoading(false); return toast$("User not found", "err"); }
      if (u.password_hash !== hash(password)) { setLoading(false); return toast$("Wrong password", "err"); }
      const p = await DB.get("profiles", { username: username.toLowerCase() });
      setUser(u); setProfile(p || defaultProfile()); setForm({}); saveSession(u);
      await loadGroups(u); await loadNotifs(u.username); setScreen("dashboard"); toast$(`Back, ${u.display_name}! 🔥`);
    } catch (e) { toast$("Login failed: " + e.message, "err"); }
    setLoading(false);
  };

  const recoverAccount = async () => {
    const { username = "", secAnswer = "", newPassword = "" } = form;
    if (!username.trim() || !secAnswer.trim() || !newPassword.trim()) return toast$("Fill all fields", "err");
    setLoading(true);
    try {
      const u = await DB.get("users", { username: username.toLowerCase() });
      if (!u) { setLoading(false); return toast$("User not found", "err"); }
      if (u.security_answer !== hash(secAnswer.trim().toLowerCase())) { setLoading(false); return toast$("Wrong answer", "err"); }
      if (newPassword.length < 4) { setLoading(false); return toast$("Min 4 chars", "err"); }
      await DB.update("users", { username: username.toLowerCase() }, { password_hash: hash(newPassword) });
      setForm({}); setScreen("login"); toast$("Password reset! Sign in now 🔥");
    } catch (e) { toast$("Recovery failed", "err"); }
    setLoading(false);
  };

  const getUserSecurityQuestion = async () => {
    const { username = "" } = form;
    if (!username.trim()) return toast$("Enter your username first", "err");
    try {
      const u = await DB.get("users", { username: username.toLowerCase() });
      if (!u) return toast$("User not found", "err");
      setForm(f => ({ ...f, secQuestion: u.security_question }));
    } catch { toast$("User not found", "err"); }
  };

  const saveProfile = async updates => {
    const p = { ...profile, ...updates };
    setProfile(p);
    try { await DB.update("profiles", { username: user.username }, p); } catch { }
  };

  const handleAvatar = async file => {
    if (!file || !file.type.startsWith("image/")) return;
    await saveProfile({ avatar: await f2b64(file) }); toast$("Profile pic updated!");
  };

  // ── Notifications ──────────────────────────────────────────────────────────
  const loadNotifs = async username => {
    try {
      const rows = await DB.getAll("notifications", { to_user: username.toLowerCase() });
      rows.sort((a, b) => b.ts - a.ts);
      setNotifications(rows);
    } catch { }
  };

  const pushNotif = async (toUser, notif) => {
    try {
      await DB.insert("notifications", { id: uid(), to_user: toUser.toLowerCase(), ...notif, ts: Date.now(), is_read: false });
    } catch { }
  };

  const markRead = async () => {
    const ids = notifications.filter(n => !n.is_read).map(n => n.id);
    const updated = notifications.map(n => ({ ...n, is_read: true }));
    setNotifications(updated);
    for (const id of ids) {
      try { await DB.update("notifications", { id }, { is_read: true }); } catch { }
    }
  };

  // ── Groups ─────────────────────────────────────────────────────────────────
  const loadGroups = async u => {
    setLoading(true);
    try {
      const ids = u.group_ids || [];
      const loaded = [];
      for (const gid of ids) {
        const g = await DB.get("groups", { id: gid });
        if (g) loaded.push(g);
      }
      setGroups(loaded);
    } catch { }
    setLoading(false);
  };

  const createGroup = async () => {
    const { groupName = "", groupIcon = "⚽", groupColor = "#ff4d00" } = form;
    if (!groupName.trim()) return toast$("Name your group", "err");
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    try {
      const g = await DB.insert("groups", {
        id: uid(), name: groupName.trim(), icon: groupIcon || "⚽", color: groupColor || "#ff4d00",
        code, created_by: user.username, created_at: Date.now(), members: [user.username],
        admins: [user.username], media_count: 0
      });
      const updUser = { ...user, group_ids: [...(user.group_ids || []), g.id] };
      await DB.update("users", { username: user.username }, { group_ids: updUser.group_ids });
      setUser(updUser); setGroups(prev => [g, ...prev]);
      setModal(null); setForm({}); toast$(`"${g.name}" created! Code: ${code} 🎉`);
    } catch (e) { toast$("Failed: " + e.message, "err"); }
  };

  const joinGroup = async () => {
    const code = (form.joinCode || "").trim().toUpperCase();
    if (!code) return toast$("Enter a code", "err");
    setLoading(true);
    try {
      const allGroups = await DB.getAll("groups");
      const found = allGroups.find(g => g.code === code);
      if (!found) { setLoading(false); return toast$("Invalid code", "err"); }
      if ((user.group_ids || []).includes(found.id)) { setLoading(false); return toast$("Already a member!", "err"); }
      const updMembers = [...found.members, user.username];
      await DB.update("groups", { id: found.id }, { members: updMembers });
      const updG = { ...found, members: updMembers };
      const updUser = { ...user, group_ids: [...(user.group_ids || []), found.id] };
      await DB.update("users", { username: user.username }, { group_ids: updUser.group_ids });
      setUser(updUser); setGroups(prev => [updG, ...prev]);
      setModal(null); setForm({}); toast$(`Joined "${found.name}"! 🔥`);
    } catch (e) { toast$("Failed: " + e.message, "err"); }
    setLoading(false);
  };

  const saveGroupEdit = async () => {
    if (!editingGroup) return;
    const { name, icon, color } = editingGroup;
    if (!name?.trim()) return toast$("Name required", "err");
    try {
      await DB.update("groups", { id: activeGroup.id }, { name: name.trim(), icon, color });
      const updG = { ...activeGroup, name: name.trim(), icon, color };
      setActiveGroup(updG);
      setGroups(prev => prev.map(g => g.id === updG.id ? updG : g));
      setEditingGroup(null); setModal(null); toast$("Group updated! ✅");
    } catch { toast$("Update failed", "err"); }
  };

  const openGroup = async g => {
    setActiveGroup(g); setLoading(true);
    try {
      const media = await DB.getAll("media", { group_id: g.id });
      media.sort((a, b) => b.ts - a.ts);
      setGroupMedia(media);
    } catch { }
    setFilter("all"); setSearch(""); setLoading(false); setScreen("group");
  };

  // ── Media ──────────────────────────────────────────────────────────────────
  const handleFiles = async files => {
    const arr = Array.from(files).filter(f => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (!arr.length) return toast$("Images & videos only", "err");
    setUploading(true); const newItems = [];
    for (let i = 0; i < arr.length; i++) {
      setUploadProg(Math.round((i / arr.length) * 100));
      try {
        const src = await f2b64(arr[i]);
        const item = {
          id: uid(), group_id: activeGroup.id, name: arr[i].name,
          type: arr[i].type.startsWith("video/") ? "video" : "photo",
          size: arr[i].size, uploader: user.username,
          uploader_avatar: profile?.avatar || "",
          ts: Date.now(), src, caption: "", reactions: {}, comments: [], tags: []
        };
        await DB.insert("media", item);
        newItems.push(item);
      } catch { toast$(`Failed: ${arr[i].name}`, "err"); }
    }
    setUploadProg(100);
    const updated = [...newItems, ...groupMedia]; setGroupMedia(updated);
    await DB.update("groups", { id: activeGroup.id }, { media_count: updated.length });
    const updG = { ...activeGroup, media_count: updated.length };
    setActiveGroup(updG); setGroups(prev => prev.map(g => g.id === updG.id ? updG : g));
    setUploading(false); setUploadProg(0); toast$(`${newItems.length} file${newItems.length > 1 ? "s" : ""} uploaded! 🔥`);
  };

  const react = async (mediaId, emoji) => {
    const updated = groupMedia.map(m => {
      if (m.id !== mediaId) return m;
      const r = { ...m.reactions };
      if (!r[emoji]) r[emoji] = [];
      r[emoji] = r[emoji].includes(user.username) ? r[emoji].filter(n => n !== user.username) : [...r[emoji], user.username];
      if (!r[emoji].length) delete r[emoji];
      return { ...m, reactions: r };
    });
    setGroupMedia(updated); setSelected(updated.find(m => m.id === mediaId) || null);
    try { await DB.update("media", { id: mediaId }, { reactions: updated.find(m => m.id === mediaId).reactions }); } catch { }
    setReactionOpen(false);
  };

  const addComment = async mediaId => {
    if (!newComment.trim()) return;
    const c = { id: uid(), author: user.username, authorAvatar: profile?.avatar || "", text: newComment.trim(), ts: Date.now() };
    const updated = groupMedia.map(m => m.id === mediaId ? { ...m, comments: [...(m.comments || []), c] } : m);
    setGroupMedia(updated); setSelected(updated.find(m => m.id === mediaId) || null); setNewComment("");
    try { await DB.update("media", { id: mediaId }, { comments: updated.find(m => m.id === mediaId).comments }); } catch { }
  };

  const updateCaption = async (id, caption) => {
    const updated = groupMedia.map(m => m.id === id ? { ...m, caption } : m); setGroupMedia(updated);
    try { await DB.update("media", { id }, { caption }); } catch { }
  };

  const deleteMedia = async id => {
    const updated = groupMedia.filter(m => m.id !== id); setGroupMedia(updated);
    try { await DB.delete("media", { id }); } catch { }
    setSelected(null); setScreen("group"); toast$("Deleted");
  };

  const download = item => { const a = document.createElement("a"); a.href = item.src; a.download = item.name || `squadreel-${item.id}`; a.click(); toast$("Saving 📲"); };

  const togglePin = async mediaId => {
    const pinned = profile.pinned_ids || [];
    const updated = pinned.includes(mediaId) ? pinned.filter(id => id !== mediaId) : [...pinned, mediaId];
    await saveProfile({ pinned_ids: updated }); toast$(pinned.includes(mediaId) ? "Removed" : "Pinned! ⭐");
  };

  // ── Tags ───────────────────────────────────────────────────────────────────
  const placeTag = async (mediaId, username, x, y) => {
    const updated = groupMedia.map(m => {
      if (m.id !== mediaId) return m;
      const tags = [...(m.tags || []).filter(t => t.username !== username), { username, x, y, ts: Date.now() }];
      return { ...m, tags };
    });
    setGroupMedia(updated); setSelected(updated.find(m => m.id === mediaId) || null);
    try { await DB.update("media", { id: mediaId }, { tags: updated.find(m => m.id === mediaId).tags }); } catch { }
    if (username !== user.username) await pushNotif(username, { type: "tag", from_user: user.username, media_id: mediaId, group_name: activeGroup.name, msg: `${user.username} tagged you in ${activeGroup.name}` });
    setPendingTagPos(null); setTagSearch(""); setTagMode(false); toast$(`@${username} tagged! 🏷️`);
  };

  const removeTag = async (mediaId, username) => {
    const updated = groupMedia.map(m => m.id === mediaId ? { ...m, tags: (m.tags || []).filter(t => t.username !== username) } : m);
    setGroupMedia(updated); setSelected(updated.find(m => m.id === mediaId) || null);
    try { await DB.update("media", { id: mediaId }, { tags: updated.find(m => m.id === mediaId).tags }); } catch { }
    toast$("Tag removed");
  };

  const approveTag = async mediaId => {
    const approved = [...(profile.approved_tag_ids || []), mediaId];
    const pinned = [...(profile.pinned_ids || []), mediaId];
    await saveProfile({ approved_tag_ids: approved, pinned_ids: pinned });
    const updN = notifications.map(n => n.media_id === mediaId && n.type === "tag" ? { ...n, approved: true } : n);
    setNotifications(updN);
    try { await DB.update("notifications", { media_id: mediaId, type: "tag", to_user: user.username }, { approved: true }); } catch { }
    setTaggedMedia(tm => tm.map(m => m.id === mediaId ? { ...m, isApproved: true } : m)); toast$("Added to highlights! ⭐");
  };

  const declineTag = async mediaId => {
    const updN = notifications.map(n => n.media_id === mediaId && n.type === "tag" ? { ...n, rejected: true } : n);
    setNotifications(updN);
    try { await DB.update("notifications", { media_id: mediaId, type: "tag", to_user: user.username }, { rejected: true }); } catch { }
    toast$("Tag declined");
  };

  // ── Profile ─────────────────────────────────────────────────────────────────
  const openProfile = async username => {
    setLoading(true);
    try {
      const p = await DB.get("profiles", { username: username.toLowerCase() });
      setViewingUser(username); setViewingProfile(p || defaultProfile());
      const all = [];
      for (const g of groups) {
        const media = await DB.getAll("media", { group_id: g.id });
        for (const m of media) {
          if (m.uploader === username || (p?.approved_tag_ids || []).includes(m.id)) {
            all.push({ ...m, groupName: g.name, groupColor: g.color, groupIcon: g.icon });
          }
        }
      }
      all.sort((a, b) => b.ts - a.ts); setAllMyMedia(all);
      if (username === user.username) {
        const tm = [];
        for (const g of groups) {
          const media = await DB.getAll("media", { group_id: g.id });
          for (const m of media) {
            if ((m.tags || []).some(t => t.username === username)) {
              tm.push({ ...m, groupName: g.name, groupColor: g.color, groupIcon: g.icon, isApproved: (p?.approved_tag_ids || []).includes(m.id) });
            }
          }
        }
        tm.sort((a, b) => b.ts - a.ts); setTaggedMedia(tm);
      }
    } catch { }
    setProfileTab("posts"); setLoading(false); setScreen("profile");
  };

  // ── Editor ─────────────────────────────────────────────────────────────────
  const openEditor = item => {
    if (item.type !== "photo") return toast$("Video editing coming soon!", "err");
    setEditState({ id: item.id, brightness: 100, contrast: 100, saturation: 100, blur: 0, sepia: 0, grayscale: 0, rotate: 0, vignette: false, flip: false });
    setActiveFilter(0); setTextOverlays([]); setStickerOverlays([]); setEditScreen("adjust"); setSelected(item); setScreen("editor");
  };

  const getFilter = (es, fi) => fi > 0 ? FILTERS[fi].fn() : `brightness(${es.brightness}%) contrast(${es.contrast}%) saturate(${es.saturation}%) blur(${es.blur}px) sepia(${es.sepia}%) grayscale(${es.grayscale}%)`;

  const bakeEdit = () => {
    const canvas = canvasRef.current, img = imgRef.current; if (!canvas || !img) return null;
    const W = img.naturalWidth, H = img.naturalHeight; canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d"); ctx.filter = getFilter(editState, activeFilter);
    ctx.save(); if (editState.flip) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    ctx.translate(W / 2, H / 2); ctx.rotate((editState.rotate * Math.PI) / 180); ctx.drawImage(img, -W / 2, -H / 2); ctx.restore();
    if (editState.vignette) { const g = ctx.createRadialGradient(W / 2, H / 2, W * .3, W / 2, H / 2, W * .8); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.72)"); ctx.filter = "none"; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    ctx.filter = "none";
    stickerOverlays.forEach(s => { ctx.font = `${Math.round(s.size * W / 300)}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s.emoji, s.x * W / 100, s.y * H / 100); });
    textOverlays.forEach(t => { const fs = Math.round(t.size * W / 300); ctx.font = `bold ${fs}px 'Bebas Neue',sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; if (t.bg) { ctx.fillStyle = "rgba(0,0,0,0.55)"; const m = ctx.measureText(t.text); ctx.fillRect(t.x * W / 100 - m.width / 2 - 8, t.y * H / 100 - fs / 2 - 4, m.width + 16, fs + 8); } ctx.fillStyle = t.color; ctx.fillText(t.text, t.x * W / 100, t.y * H / 100); });
    return canvas.toDataURL("image/jpeg", .92);
  };

  const saveEdit = async () => {
    const src = bakeEdit(); if (!src) return;
    const updated = groupMedia.map(m => m.id === editState.id ? { ...m, src } : m); setGroupMedia(updated);
    try { await DB.update("media", { id: editState.id }, { src }); } catch { }
    setScreen("group"); toast$("Saved! 🔥");
  };

  const dlEdit = () => { const src = bakeEdit(); if (!src) return; const a = document.createElement("a"); a.href = src; a.download = `edited-${selected?.name || "photo"}.jpg`; a.click(); toast$("Downloaded 📲"); };

  // ── AI ─────────────────────────────────────────────────────────────────────
  const aiSuggestTags = async item => {
    if (!item.src || item.type !== "photo") return toast$("AI tagging: photos only", "err");
    setAiLoading("tags"); setShowAiPanel("tags"); setAiTagSuggestions([]);
    try {
      const members = (activeGroup?.members || []).filter(m => m !== user.username);
      if (!members.length) { setAiLoading(null); return toast$("No squad members to suggest", "err"); }
      const result = await callAI(`Squad members: ${members.join(", ")}. Suggest who might be in this photo. Return ONLY a JSON array of usernames, max 3, like: ["user1","user2"]`, "Return valid JSON only.", item.src);
      const suggestions = JSON.parse(result.replace(/```json|```/g, "").trim());
      const valid = suggestions.filter(s => members.includes(s));
      setAiTagSuggestions(valid.length ? valid : members.slice(0, 2));
    } catch { setAiTagSuggestions((activeGroup?.members || []).filter(m => m !== user.username).slice(0, 2)); }
    setAiLoading(null);
  };

  const aiGenerateCaption = async item => {
    setAiLoading("caption"); setShowAiPanel("caption"); setAiCaption(null);
    try {
      const isPhoto = item.type === "photo";
      const result = await callAI(isPhoto ? `Short hype sports caption for this photo. Group: "${activeGroup?.name}". Max 15 words, 1-2 emojis. Return only caption.` : `Short hype sports caption for video "${item.name}" in group "${activeGroup?.name}". Max 15 words, 1-2 emojis. Return only caption.`, "Write short punchy sports captions. Return only the caption.", isPhoto ? item.src : null);
      setAiCaption(result.trim().replace(/^["']|["']$/g, ""));
    } catch { toast$("AI caption failed", "err"); }
    setAiLoading(null);
  };

  const aiCoachAnalysis = async item => {
    setAiLoading("coach"); setShowAiPanel("coach"); setAiCoachFeedback(null);
    try {
      const isPhoto = item.type === "photo";
      const result = await callAI(isPhoto ? `Coach reviewing this photo from group "${activeGroup?.name}". Brief encouraging feedback + 1 actionable tip. Max 60 words.` : `Coach reviewing clip "${item.name}" from group "${activeGroup?.name}". Brief encouraging feedback + 1 actionable tip. Max 60 words.`, "You are an enthusiastic sports coach. Give short encouraging feedback.", isPhoto ? item.src : null);
      setAiCoachFeedback(result.trim());
    } catch { toast$("AI coach unavailable", "err"); }
    setAiLoading(null);
  };

  const aiPickHighlights = async () => {
    if (groupMedia.length < 2) return toast$("Need more uploads", "err");
    setAiLoading("reel"); setAiReelPicks([]);
    try {
      const photos = groupMedia.filter(m => m.type === "photo").slice(0, 12);
      if (!photos.length) { setAiLoading(null); return toast$("No photos to pick from", "err"); }
      const scored = photos.map(m => {
        const reactions = Object.values(m.reactions || {}).reduce((s, a) => s + a.length, 0);
        const comments = (m.comments || []).length;
        const recency = Math.max(0, 1 - (Date.now() - m.ts) / (1000 * 60 * 60 * 24 * 30));
        return { ...m, score: reactions * 3 + comments * 2 + recency * 5 };
      }).sort((a, b) => b.score - a.score);
      const topPicks = scored.slice(0, Math.min(6, scored.length));
      const intro = await callAI(`Write a short exciting highlight reel intro for group "${activeGroup?.name || "the squad"}". Max 12 words, 1 emoji. Return only the intro.`, "Write exciting sports highlight reel intros.");
      setAiReelPicks({ picks: topPicks, intro: intro.trim() });
    } catch { toast$("AI reel picker failed", "err"); }
    setAiLoading(null);
  };

  const applyAiCaption = async caption => {
    if (!selected) return;
    await updateCaption(selected.id, caption); setSelected(prev => ({ ...prev, caption }));
    setAiCaption(null); setShowAiPanel(null); toast$("Caption applied! ✍️");
  };

  // ── Computed ───────────────────────────────────────────────────────────────
  const filtered = groupMedia.filter(m => {
    if (filter !== "all" && m.type !== filter) return false;
    if (search) { const q = search.toLowerCase(); return m.name.toLowerCase().includes(q) || m.uploader.toLowerCase().includes(q) || (m.caption || "").toLowerCase().includes(q); }
    return true;
  });

  const tagCandidates = (activeGroup?.members || []).filter(m => m !== user?.username && !(selected?.tags || []).find(t => t.username === m) && (tagSearch ? m.toLowerCase().includes(tagSearch.toLowerCase()) : true));
  const myStats = () => ({ uploads: allMyMedia.filter(m => m.uploader === user?.username).length, highlights: (profile?.pinned_ids || []).length, reactions: allMyMedia.reduce((s, m) => s + Object.values(m.reactions || {}).reduce((ss, a) => ss + a.length, 0), 0), groups: groups.length });
  const handleTagClick = e => { if (!tagMode || selected?.type === "video") return; const rect = e.currentTarget.getBoundingClientRect(); setPendingTagPos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 }); };
  const pendingTagCount = notifications.filter(n => n.type === "tag" && !n.approved && !n.rejected).length;
  const totalR = m => Object.values(m.reactions || {}).reduce((s, a) => s + a.length, 0);
  const isAdmin = g => (g?.admins || [g?.created_by]).includes(user?.username);

  // ── Header ────────────────────────────────────────────────────────────────
  const Header = () => (
    <header style={{ background: BF, borderBottom: `3px solid ${screen === "group" ? activeGroup?.color || "#ff4d00" : "#ff4d00"}`, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, position: "sticky", top: 0, zIndex: 50 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {screen !== "dashboard" && <span className="hov" onClick={() => setScreen("dashboard")} style={{ color: "#555", fontSize: 13, fontFamily: FF }}>← BACK</span>}
        {screen === "dashboard" && <div style={{ fontSize: 26, fontWeight: 900 }}>SQUAD<span style={{ color: "#ff4d00" }}>REEL</span></div>}
        {screen === "group" && activeGroup && <><div style={{ width: 1, height: 20, background: "#222" }} /><span style={{ fontSize: 20 }}>{activeGroup.icon}</span><span style={{ fontSize: 20, fontWeight: 900 }}>{activeGroup.name}</span><div style={{ background: `${activeGroup.color}22`, border: `1px solid ${activeGroup.color}44`, padding: "3px 9px", fontSize: 11, fontWeight: 700, color: activeGroup.color }}>👥 {activeGroup.members.length}</div></>}
        {screen === "profile" && <span style={{ fontSize: 20, fontWeight: 900 }}>{viewingUser}'S PROFILE</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {screen === "group" && activeGroup && <>
          <Btn onClick={() => setModal("inviteCode")} bg="#1a1a1a" fg="#aaa" style={{ fontSize: 12, padding: "6px 12px" }}>🔗 INVITE</Btn>
          {isAdmin(activeGroup) && <Btn onClick={() => { setEditingGroup({ name: activeGroup.name, icon: activeGroup.icon, color: activeGroup.color }); setModal("editGroup"); }} bg="#1a1a1a" fg="#aaa" style={{ fontSize: 12, padding: "6px 12px" }}>✏️ EDIT GROUP</Btn>}
        </>}
        <div className="hov" onClick={() => { setModal("notifs"); markRead(); }} style={{ position: "relative", background: B1, border: "1px solid #222", padding: "6px 10px", cursor: "pointer" }}>
          <span style={{ fontSize: 15 }}>🔔</span>
          {unread > 0 && <div style={{ position: "absolute", top: -4, right: -4, background: "#ff4d00", color: "#fff", fontSize: 10, fontWeight: 800, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 1.5s infinite" }}>{unread}</div>}
        </div>
        <div className="hov" onClick={() => openProfile(user.username)} style={{ display: "flex", alignItems: "center", gap: 8, background: B1, border: "1px solid #222", padding: "5px 12px", cursor: "pointer" }}>
          <Avatar src={profile?.avatar} name={user.username} size={24} color={profile?.accentColor || "#ff4d00"} /><span style={{ fontSize: 13 }}>{user.display_name || user.username}</span>
        </div>
        <Btn onClick={async () => { clearSession(); setUser(null); setGroups([]); setProfile(null); setNotifications([]); setScreen("splash"); }} bg="#1a1a1a" fg="#666" style={{ fontSize: 12, padding: "6px 12px" }}>LOG OUT</Btn>
      </div>
    </header>
  );

  if (!dbReady) return (
    <div style={{ minHeight: "100vh", background: "#070709", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <style>{CSS}</style>
      <Spin />
      <div style={{ color: "#555", fontSize: 14, fontFamily: FF }}>Connecting to database...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#070709", color: "#f0ede8", fontFamily: FN, overflowX: "hidden" }}>
      <style>{CSS}</style>
      {toast && <div className="fu" style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", background: toast.type === "err" ? "#c0392b" : "#ff4d00", color: "#fff", padding: "10px 22px", fontWeight: 700, fontSize: 15, zIndex: 9999, whiteSpace: "nowrap" }}>{toast.msg}</div>}
      <input ref={avatarRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files[0] && handleAvatar(e.target.files[0])} />

      {/* SPLASH */}
      {screen === "splash" && (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,77,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,77,0,0.05) 1px,transparent 1px)", backgroundSize: "44px 44px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, background: "#ff4d00", height: 26, overflow: "hidden", display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", animation: "ticker 18s linear infinite", whiteSpace: "nowrap", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#fff" }}>{Array(6).fill("⚽ SQUADREEL • TAG YOUR SQUAD • HIGHLIGHTS • SHARE • REACT • YOUR CREW, YOUR MOMENTS • ").map((t, i) => <span key={i}>{t}</span>)}</div>
          </div>
          <div className="fu" style={{ textAlign: "center", padding: "60px 20px 20px" }}>
            <div style={{ fontSize: 88, lineHeight: 1, fontWeight: 900, letterSpacing: "0.04em", textShadow: "0 0 60px rgba(255,77,0,0.4)" }}>SQUAD<span style={{ color: "#ff4d00" }}>REEL</span></div>
            <div className="fu2" style={{ color: "#555", fontSize: 15, fontFamily: FF, fontWeight: 300, letterSpacing: "0.12em", marginBottom: 44, marginTop: 6, textTransform: "uppercase" }}>Tag your squad. Own your highlights.</div>
            <div className="fu3" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <Btn onClick={() => setScreen("login")} style={{ fontSize: 18, padding: "13px 36px", animation: "glow 2s infinite" }}>SIGN IN</Btn>
              <Btn onClick={() => setScreen("register")} bg="#1a1a1a" fg="#ff4d00" style={{ fontSize: 18, padding: "13px 36px", border: "1px solid #ff4d00" }}>CREATE ACCOUNT</Btn>
            </div>
            {dbError && <div style={{ marginTop: 20, color: "#c0392b", fontSize: 13, fontFamily: FF }}>{dbError}</div>}
          </div>
        </div>
      )}

      {/* LOGIN */}
      {screen === "login" && (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="fu" style={{ background: BD, border: "2px solid #1a1a1a", padding: "36px 32px", width: "100%", maxWidth: 380 }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 34, fontWeight: 900 }}>SQUAD<span style={{ color: "#ff4d00" }}>REEL</span></div>
              <div style={{ color: "#555", fontSize: 13, fontFamily: FF, marginTop: 4 }}>Sign in</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Inp placeholder="Username" value={form.username || ""} onChange={F("username")} onKeyDown={e => e.key === "Enter" && login()} style={{ color: "#111" }} />
              <PwdInp value={form.password || ""} onChange={F("password")} onKeyDown={e => e.key === "Enter" && login()} />
              {loading ? <div style={{ padding: 12, textAlign: "center" }}><Spin /></div> : <Btn onClick={login} style={{ width: "100%", fontSize: 17, padding: "13px", marginTop: 4 }}>SIGN IN →</Btn>}
              <div style={{ textAlign: "center", fontSize: 13, color: "#555", fontFamily: FF, marginTop: 4 }}>
                No account? <span style={{ color: "#ff4d00", cursor: "pointer", fontWeight: 600 }} onClick={() => { setForm({}); setScreen("register"); }}>Register</span>
              </div>
              <div style={{ textAlign: "center" }}>
                <span style={{ color: "#333", cursor: "pointer", fontSize: 12, fontFamily: FF }} onClick={() => setScreen("recover")}>Forgot password?</span>
              </div>
              <div style={{ textAlign: "center" }}><span style={{ color: "#333", cursor: "pointer", fontSize: 12, fontFamily: FF }} onClick={() => setScreen("splash")}>← Back</span></div>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER */}
      {screen === "register" && (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="fu" style={{ background: BD, border: "2px solid #1a1a1a", padding: "36px 32px", width: "100%", maxWidth: 400 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 34, fontWeight: 900 }}>SQUAD<span style={{ color: "#ff4d00" }}>REEL</span></div>
              <div style={{ color: "#555", fontSize: 13, fontFamily: FF, marginTop: 4 }}>Create account</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Inp placeholder="Username" value={form.username || ""} onChange={F("username")} style={{ color: "#111" }} />
              <PwdInp value={form.password || ""} onChange={F("password")} />
              <div style={{ color: "#555", fontSize: 11, fontFamily: FF, letterSpacing: "0.08em", marginTop: 4 }}>ACCOUNT RECOVERY — SET A SECURITY QUESTION</div>
              <select value={form.secQuestion || ""} onChange={F("secQuestion")} style={{ width: "100%", background: "#fff", border: "1px solid #2a2a2a", color: "#111", padding: "11px 14px", fontSize: 13, outline: "none", fontFamily: FF }}>
                <option value="" disabled style={{ color: "#888" }}>Choose a security question...</option>
                {SECURITY_QUESTIONS.map(q => <option key={q} value={q} style={{ color: "#111", background: "#fff" }}>{q}</option>)}
              </select>
              <Inp placeholder="Your answer (remember this!)" value={form.secAnswer || ""} onChange={F("secAnswer")} style={{ color: "#111" }} />
              {loading ? <div style={{ padding: 12, textAlign: "center" }}><Spin /></div> : <Btn onClick={register} style={{ width: "100%", fontSize: 17, padding: "13px", marginTop: 4 }}>CREATE ACCOUNT →</Btn>}
              <div style={{ textAlign: "center", fontSize: 13, color: "#555", fontFamily: FF }}>
                Have one? <span style={{ color: "#ff4d00", cursor: "pointer", fontWeight: 600 }} onClick={() => { setForm({}); setScreen("login"); }}>Sign in</span>
              </div>
              <div style={{ textAlign: "center" }}><span style={{ color: "#333", cursor: "pointer", fontSize: 12, fontFamily: FF }} onClick={() => setScreen("splash")}>← Back</span></div>
            </div>
          </div>
        </div>
      )}

      {/* RECOVER */}
      {screen === "recover" && (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="fu" style={{ background: BD, border: "2px solid #1a1a1a", padding: "36px 32px", width: "100%", maxWidth: 400 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 28, fontWeight: 900 }}>FORGOT PASSWORD</div>
              <div style={{ color: "#555", fontSize: 13, fontFamily: FF, marginTop: 4 }}>Answer your security question to reset</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <Inp placeholder="Your username" value={form.username || ""} onChange={F("username")} style={{ color: "#111" }} />
                <Btn onClick={getUserSecurityQuestion} bg="#1a1a1a" fg="#ff4d00" style={{ fontSize: 12, padding: "11px 12px", whiteSpace: "nowrap" }}>FIND →</Btn>
              </div>
              {form.secQuestion && (
                <>
                  <div style={{ background: "#111", border: "1px solid #2a2a2a", padding: "11px 14px", fontSize: 13, fontFamily: FF, color: "#aaa" }}>🔒 {form.secQuestion}</div>
                  <Inp placeholder="Your answer" value={form.secAnswer || ""} onChange={F("secAnswer")} style={{ color: "#111" }} />
                  <PwdInp value={form.newPassword || ""} onChange={F("newPassword")} placeholder="New password" />
                  {loading ? <div style={{ padding: 12, textAlign: "center" }}><Spin /></div> : <Btn onClick={recoverAccount} style={{ width: "100%", fontSize: 17, padding: "13px" }}>RESET PASSWORD →</Btn>}
                </>
              )}
              <div style={{ textAlign: "center" }}><span style={{ color: "#333", cursor: "pointer", fontSize: 12, fontFamily: FF }} onClick={() => setScreen("login")}>← Back to sign in</span></div>
            </div>
          </div>
        </div>
      )}

      {(screen === "dashboard" || screen === "group" || screen === "profile") && user && <Header />}

      {/* DASHBOARD */}
      {screen === "dashboard" && user && (
        <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
          <div className="fu" style={{ marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div><div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1 }}>YOUR GROUPS</div><div style={{ color: "#555", fontSize: 14, fontFamily: FF, marginTop: 4 }}>Each group is a private media space</div></div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={() => setModal("joinGroup")} bg="#1a1a1a" fg="#ff4d00" style={{ border: "1px solid #ff4d00", fontSize: 14, padding: "9px 18px" }}>🔗 JOIN WITH CODE</Btn>
              <Btn onClick={() => setModal("createGroup")} style={{ fontSize: 14, padding: "9px 18px" }}>+ CREATE GROUP</Btn>
            </div>
          </div>
          {loading && <div style={{ textAlign: "center", padding: 60 }}><Spin /></div>}
          {!loading && groups.length === 0 && <div className="fu" style={{ textAlign: "center", padding: "70px 20px", border: "2px dashed #1a1a1a", color: "#333" }}><div style={{ fontSize: 52, marginBottom: 12 }}>🏟️</div><div style={{ fontSize: 26, fontWeight: 900 }}>NO GROUPS YET</div><div style={{ color: "#444", fontSize: 14, fontFamily: FF, marginTop: 8 }}>Create a group and share the invite code with your squad</div></div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
            {groups.map((g, i) => (
              <div key={g.id} className="ch fu" style={{ background: BD, border: `2px solid ${g.color}22`, overflow: "hidden", animationDelay: `${i * 0.06}s` }} onClick={() => openGroup(g)}>
                <div style={{ height: 90, background: `linear-gradient(135deg,${g.color}22,${g.color}08)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  <div style={{ fontSize: 44 }}>{g.icon}</div>
                  <div style={{ position: "absolute", top: 8, right: 8, background: g.color, padding: "2px 9px", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em" }}>{g.media_count || 0} FILES</div>
                  {isAdmin(g) && <div style={{ position: "absolute", top: 8, left: 8, background: BA, border: `1px solid ${g.color}`, padding: "2px 7px", fontSize: 10, fontWeight: 700, color: g.color }}>ADMIN</div>}
                </div>
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>{g.name}</div>
                  <div style={{ color: "#555", fontSize: 12, fontFamily: FF, marginTop: 3, display: "flex", justifyContent: "space-between" }}><span>👥 {g.members.length} member{g.members.length !== 1 ? "s" : ""}</span><span>{timeAgo(g.created_at)}</span></div>
                  <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                    <div style={{ flex: 1, background: g.color, color: "#fff", padding: "7px 0", fontSize: 13, fontWeight: 700, textAlign: "center", letterSpacing: "0.06em" }}>OPEN →</div>
                    <div onClick={e => { e.stopPropagation(); setActiveGroup(g); setModal("inviteCode"); }} className="hov" style={{ background: BA, border: "1px solid #2a2a2a", padding: "7px 10px", fontSize: 13, color: "#666", cursor: "pointer" }}>🔗</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* PROFILE */}
      {screen === "profile" && user && viewingProfile && (
        <main style={{ maxWidth: 860, margin: "0 auto", paddingBottom: 40 }}>
          <div style={{ background: "linear-gradient(180deg,#0d0d14 0%,#070709 100%)", padding: "32px 24px 0", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(ellipse at 50% 0%,${viewingProfile.accentColor || "#ff4d00"}18 0%,transparent 65%)`, pointerEvents: "none" }} />
            <div style={{ display: "flex", gap: 24, alignItems: "flex-start", position: "relative", flexWrap: "wrap" }}>
              <div style={{ flexShrink: 0 }}>
                {viewingUser === user.username ? (
                  <div onClick={() => avatarRef.current?.click()} style={{ cursor: "pointer", position: "relative" }}>
                    <Avatar src={profile?.avatar} name={user.username} size={96} color={profile?.accentColor || "#ff4d00"} />
                    <div style={{ position: "absolute", bottom: 0, right: 0, background: profile?.accentColor || "#ff4d00", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>📷</div>
                  </div>
                ) : <Avatar src={viewingProfile.avatar} name={viewingUser} size={96} color={viewingProfile.accentColor || "#ff4d00"} />}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1 }}>{viewingUser === user.username ? (user.display_name || user.username) : viewingUser}</div>
                {viewingUser === user.username ? (
                  <input defaultValue={profile?.bio || ""} placeholder="Add a bio..." onBlur={e => saveProfile({ bio: e.target.value })} style={{ background: "transparent", border: "none", borderBottom: "1px solid #333", color: "#888", padding: "6px 0", fontSize: 14, fontFamily: FF, outline: "none", marginTop: 8, width: "100%", maxWidth: 320 }} />
                ) : <div style={{ color: "#777", fontSize: 14, fontFamily: FF, marginTop: 8 }}>{viewingProfile.bio || "No bio yet"}</div>}
                {viewingUser === user.username && (() => { const s = myStats(); return (<div style={{ display: "flex", gap: 22, marginTop: 16, flexWrap: "wrap" }}>{[["POSTS", s.uploads], ["HIGHLIGHTS", s.highlights], ["REACTIONS", s.reactions], ["GROUPS", s.groups]].map(([l, v]) => (<div key={l} style={{ textAlign: "center" }}><div style={{ fontSize: 26, fontWeight: 900, color: profile?.accentColor || "#ff4d00", lineHeight: 1 }}>{v}</div><div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em", marginTop: 2 }}>{l}</div></div>))}</div>); })()}
                {viewingUser === user.username && (<div style={{ marginTop: 14, display: "flex", gap: 6, alignItems: "center" }}><span style={{ fontSize: 11, color: "#444", letterSpacing: "0.08em", marginRight: 4 }}>COLOR</span>{COLORS.map(c => <div key={c} onClick={() => saveProfile({ accentColor: c })} className="hov" style={{ width: 20, height: 20, background: c, borderRadius: "50%", cursor: "pointer", border: `2px solid ${(profile?.accentColor || "#ff4d00") === c ? "#fff" : "transparent"}` }} />)}</div>)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 0, marginTop: 24, borderBottom: "1px solid #1a1a1a", overflowX: "auto" }}>
              {(viewingUser === user.username ? ["posts", "highlights", "tagged", "stats"] : ["posts", "highlights"]).map(t => (
                <button key={t} className={`tb${profileTab === t ? " act" : ""}`} onClick={() => setProfileTab(t)} style={{ color: profileTab === t ? (profile?.accentColor || "#ff4d00") : "#555", borderBottomColor: profileTab === t ? (profile?.accentColor || "#ff4d00") : "transparent", position: "relative" }}>
                  {t === "posts" ? "📷 POSTS" : t === "highlights" ? "⭐ HIGHLIGHTS" : t === "tagged" ? "🏷️ TAGGED" : "📊 STATS"}
                  {t === "tagged" && pendingTagCount > 0 && <div style={{ position: "absolute", top: 8, right: 4, width: 7, height: 7, background: "#ff4d00", borderRadius: "50%" }} />}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: "20px 24px" }}>
            {loading && <div style={{ textAlign: "center", padding: 60 }}><Spin /></div>}
            {profileTab === "posts" && !loading && (<>
              {allMyMedia.length === 0 && <div style={{ textAlign: "center", padding: "50px 20px", color: "#333" }}><div style={{ fontSize: 42, marginBottom: 10 }}>📷</div><div style={{ fontSize: 22, fontWeight: 900 }}>NO POSTS YET</div></div>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
                {allMyMedia.map((item, i) => {
                  const isPinned = (profile?.pinned_ids || []).includes(item.id);
                  return (
                    <div key={item.id} className="ch fu" style={{ aspectRatio: "1", position: "relative", overflow: "hidden", animationDelay: `${i * 0.03}s` }} onClick={() => { setSelected(item); setScreen("lightbox"); }}>
                      {item.type === "video" ? <><video src={item.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted /><div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)" }}><div style={{ width: 28, height: 28, background: `${profile?.accentColor || "#ff4d00"}ee`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>▶</div></div></> : <img src={item.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                      {isPinned && <div style={{ position: "absolute", top: 5, right: 5, fontSize: 13 }}>⭐</div>}
                      {(item.tags || []).length > 0 && <div style={{ position: "absolute", top: 5, left: 5, background: "rgba(0,0,0,0.7)", padding: "2px 6px", fontSize: 10, fontWeight: 700 }}>🏷️{(item.tags || []).length}</div>}
                      {totalR(item) > 0 && <div style={{ position: "absolute", bottom: 4, left: 4, background: "rgba(0,0,0,0.7)", padding: "2px 5px", fontSize: 11 }}>🔥{totalR(item)}</div>}
                      <div style={{ position: "absolute", bottom: 4, right: 4, background: `${item.groupColor || "#ff4d00"}cc`, padding: "2px 5px", fontSize: 9, fontWeight: 800 }}>{item.groupIcon}</div>
                    </div>
                  );
                })}
              </div>
            </>)}
            {profileTab === "highlights" && !loading && (() => {
              const pinned = allMyMedia.filter(m => (profile?.pinned_ids || []).includes(m.id));
              return (
                <div>
                  {pinned.length === 0 && <div style={{ textAlign: "center", padding: "50px 20px", color: "#333" }}><div style={{ fontSize: 42, marginBottom: 10 }}>⭐</div><div style={{ fontSize: 22, fontWeight: 900 }}>NO HIGHLIGHTS</div></div>}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
                    {pinned.map((item, i) => (
                      <div key={item.id} className="ch fu" style={{ background: BD, overflow: "hidden", border: `1px solid ${profile?.accentColor || "#ff4d00"}33`, animationDelay: `${i * 0.05}s` }}>
                        <div style={{ aspectRatio: "16/9", position: "relative", overflow: "hidden", cursor: "pointer" }} onClick={() => { setSelected(item); setScreen("lightbox"); }}>
                          {item.type === "video" ? <><video src={item.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted /><div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.38)" }}><div style={{ width: 34, height: 34, background: `${profile?.accentColor || "#ff4d00"}ee`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>▶</div></div></> : <img src={item.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                        </div>
                        <div style={{ padding: "8px 11px" }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                          <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
                            <Btn onClick={() => { setSelected(item); setScreen("lightbox"); }} bg="#1a1a1a" fg="#ccc" style={{ flex: 1, fontSize: 11, padding: "5px 0" }}>VIEW</Btn>
                            <Btn onClick={() => togglePin(item.id)} bg="#1a1a1a" fg="#888" style={{ padding: "5px 10px", fontSize: 13 }}>✕</Btn>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            {profileTab === "tagged" && viewingUser === user.username && !loading && (
              <div>
                <div style={{ marginBottom: 14, color: "#555", fontSize: 13, fontFamily: FF }}>When a teammate tags you, it appears here. Approve to add to Highlights.</div>
                {taggedMedia.length === 0 && <div style={{ textAlign: "center", padding: "50px 20px", color: "#333" }}><div style={{ fontSize: 42, marginBottom: 10 }}>🏷️</div><div style={{ fontSize: 22, fontWeight: 900 }}>NO TAGS YET</div></div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {taggedMedia.map((item, i) => {
                    const isApproved = item.isApproved || (profile?.approved_tag_ids || []).includes(item.id);
                    return (
                      <div key={item.id} className="fu" style={{ background: BD, border: `2px solid ${isApproved ? (profile?.accentColor || "#ff4d00") : "#222"}`, display: "flex", gap: 14, padding: 12, animationDelay: `${i * 0.05}s`, flexWrap: "wrap" }}>
                        <div style={{ width: 110, aspectRatio: "16/9", flexShrink: 0, position: "relative", overflow: "hidden", cursor: "pointer" }} onClick={() => { setSelected(item); setScreen("lightbox"); }}>
                          {item.type === "video" ? <><video src={item.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted /><div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}><span style={{ fontSize: 18 }}>▶</span></div></> : <img src={item.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 160 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{item.name}</div>
                          {isApproved ? (
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <div style={{ background: `${profile?.accentColor || "#ff4d00"}22`, border: `1px solid ${profile?.accentColor || "#ff4d00"}`, padding: "4px 12px", fontSize: 12, color: profile?.accentColor || "#ff4d00", fontWeight: 700 }}>⭐ IN HIGHLIGHTS</div>
                              <Btn onClick={() => { const a = (profile.approved_tag_ids || []).filter(id => id !== item.id); const p = (profile.pinned_ids || []).filter(id => id !== item.id); saveProfile({ approved_tag_ids: a, pinned_ids: p }); setTaggedMedia(prev => prev.map(m => m.id === item.id ? { ...m, isApproved: false } : m)); toast$("Removed"); }} bg="#1a1a1a" fg="#888" style={{ fontSize: 12, padding: "5px 12px" }}>REMOVE</Btn>
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <Btn onClick={() => approveTag(item.id)} style={{ fontSize: 13, padding: "7px 16px" }}>⭐ ADD TO HIGHLIGHTS</Btn>
                              <Btn onClick={() => declineTag(item.id)} bg="#1a1a1a" fg="#888" style={{ fontSize: 13, padding: "7px 14px" }}>✕ DECLINE</Btn>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {profileTab === "stats" && viewingUser === user.username && !loading && (() => { const s = myStats(); return (<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>{[["📤", "TOTAL UPLOADS", s.uploads, "Files you've shared"], ["⭐", "HIGHLIGHTS", s.highlights, "Pinned to profile"], ["🔥", "REACTIONS", s.reactions, "Received on posts"], ["👥", "GROUPS", s.groups, "Member of"]].map(([icon, label, val, desc]) => (<div key={label} className="fu" style={{ background: BD, border: `1px solid ${profile?.accentColor || "#ff4d00"}22`, padding: "20px 18px" }}><div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div><div style={{ fontSize: 38, fontWeight: 900, color: profile?.accentColor || "#ff4d00", lineHeight: 1 }}>{val}</div><div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", marginTop: 4 }}>{label}</div><div style={{ fontSize: 11, color: "#555", fontFamily: FF, marginTop: 3 }}>{desc}</div></div>))}</div>); })()}
          </div>
        </main>
      )}

      {/* GROUP */}
      {screen === "group" && activeGroup && (
        <main style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
          <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }} onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${dragOver ? activeGroup.color : "#1f1f1f"}`, background: dragOver ? `${activeGroup.color}08` : "#0a0a0f", padding: "18px 24px", textAlign: "center", cursor: "pointer", marginBottom: 18, transition: "all 0.2s" }}>
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
            {uploading ? <div><div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>UPLOADING... {uploadProg}%</div><div style={{ background: BA, height: 4, borderRadius: 2 }}><div style={{ width: `${uploadProg}%`, height: "100%", background: activeGroup.color, transition: "width 0.3s", borderRadius: 2 }} /></div></div> : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}><span style={{ fontSize: 22 }}>⬆️</span><div><div style={{ fontWeight: 800, fontSize: 15 }}>DROP FILES OR CLICK TO UPLOAD</div><div style={{ color: "#555", fontSize: 12, fontFamily: FF, marginTop: 1 }}>Shared with {activeGroup.name}</div></div></div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
              <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#444", fontSize: 13 }}>🔍</span>
              <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%", background: BD, border: "1px solid #1f1f1f", color: "#ddd", padding: "8px 12px 8px 32px", fontSize: 13, outline: "none", fontFamily: FF }} />
            </div>
            {["all", "photo", "video"].map(f => (
              <button key={f} className="hov" onClick={() => setFilter(f)} style={{ border: "none", background: filter === f ? activeGroup.color : "#1a1a1a", color: filter === f ? "#fff" : "#666", padding: "8px 14px", fontSize: 12, fontFamily: FN, letterSpacing: "0.06em", cursor: "pointer", transition: "all 0.15s" }}>
                {f === "all" ? `ALL (${groupMedia.length})` : f === "photo" ? `📷 PHOTOS (${groupMedia.filter(m => m.type === "photo").length})` : `🎬 VIDEOS (${groupMedia.filter(m => m.type === "video").length})`}
              </button>
            ))}
            <button className="hov" onClick={() => { setModal("aiReel"); aiPickHighlights(); }} style={{ border: "1px solid #a855f744", background: "#0d0b14", color: "#a855f7", padding: "8px 14px", fontSize: 12, fontFamily: FN, letterSpacing: "0.06em", cursor: "pointer" }}>
              {aiLoading === "reel" ? "⏳ ANALYZING..." : "✨ AI HIGHLIGHT REEL"}
            </button>
          </div>
          {loading && <div style={{ textAlign: "center", padding: 60 }}><Spin /></div>}
          {!loading && filtered.length === 0 && <div style={{ textAlign: "center", padding: "60px 20px", color: "#222" }}><div style={{ fontSize: 44, marginBottom: 10 }}>🎬</div><div style={{ fontSize: 24, fontWeight: 900 }}>NO MEDIA YET</div></div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
            {filtered.map((item, i) => (
              <div key={item.id} className="ch fu" style={{ background: BD, overflow: "hidden", animationDelay: `${i * 0.035}s` }}>
                <div style={{ aspectRatio: "16/9", position: "relative", overflow: "hidden" }} onClick={() => { setSelected(item); setScreen("lightbox"); }}>
                  {item.type === "video" ? <><video src={item.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted /><div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.38)" }}><div style={{ width: 36, height: 36, background: `${activeGroup.color}ee`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>▶</div></div></> : <img src={item.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  <div style={{ position: "absolute", top: 6, right: 6, background: item.type === "video" ? activeGroup.color : "rgba(0,0,0,0.7)", padding: "2px 7px", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em" }}>{item.type === "video" ? "VID" : "IMG"}</div>
                  {totalR(item) > 0 && <div style={{ position: "absolute", bottom: 5, left: 5, background: "rgba(0,0,0,0.75)", padding: "2px 7px", fontSize: 12 }}>{Object.entries(item.reactions || {}).slice(0, 3).map(([e]) => e)} {totalR(item)}</div>}
                  {(item.tags || []).length > 0 && <div style={{ position: "absolute", bottom: 5, right: 5, background: "rgba(0,0,0,0.75)", padding: "2px 7px", fontSize: 11, color: "#aaa" }}>🏷️{(item.tags || []).length}</div>}
                </div>
                <div style={{ padding: "9px 11px" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                  <div style={{ color: "#555", fontSize: 11, marginTop: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="hov" style={{ color: "#777", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }} onClick={() => openProfile(item.uploader)}><Avatar src={item.uploader_avatar} name={item.uploader} size={16} color={activeGroup.color} />{item.uploader}</span>
                    <span>{timeAgo(item.ts)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 5, marginTop: 9 }}>
                    <button className="hov" onClick={() => { setSelected(item); setScreen("lightbox"); }} style={{ flex: 1, background: BA, color: "#ccc", border: "none", padding: "6px 0", fontSize: 11, fontFamily: FN, cursor: "pointer" }}>VIEW</button>
                    <button className="hov" onClick={() => openEditor(item)} style={{ flex: 1, background: item.type === "photo" ? "#1a1a1a" : "#111", color: item.type === "photo" ? activeGroup.color : "#333", border: "none", padding: "6px 0", fontSize: 11, fontFamily: FN, cursor: "pointer" }}>EDIT</button>
                    <button className="hov" onClick={() => download(item)} style={{ background: activeGroup.color, color: "#fff", border: "none", padding: "6px 10px", fontSize: 13, cursor: "pointer" }}>↓</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* LIGHTBOX */}
      {screen === "lightbox" && selected && (
        <div className="fu" style={{ position: "fixed", inset: 0, background: "#070709", zIndex: 100, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 18px", borderBottom: `2px solid ${ac}`, background: BF, flexShrink: 0, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontWeight: 900, fontSize: 17, maxWidth: "25%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.name}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {selected.type === "photo" && <Btn onClick={() => openEditor(selected)} bg="#1a1a1a" fg={ac} style={{ fontSize: 12, padding: "7px 12px" }}>✏️ EDIT</Btn>}
              <Btn onClick={() => { setTagMode(!tagMode); setPendingTagPos(null); setTagSearch(""); }} bg={tagMode ? ac : "#1a1a1a"} fg={tagMode ? "#fff" : "#aaa"} style={{ fontSize: 12, padding: "7px 12px" }}>🏷️ {tagMode ? "TAGGING" : "TAG"}</Btn>
              <Btn onClick={() => { setShowAiPanel("tags"); aiSuggestTags(selected); }} bg={showAiPanel === "tags" ? "#a855f7" : "#1a1a1a"} fg={showAiPanel === "tags" ? "#fff" : "#a855f7"} style={{ fontSize: 12, padding: "7px 12px", border: "1px solid #a855f733" }}>✨ AI TAG</Btn>
              <Btn onClick={() => { setShowAiPanel("caption"); aiGenerateCaption(selected); }} bg={showAiPanel === "caption" ? "#a855f7" : "#1a1a1a"} fg={showAiPanel === "caption" ? "#fff" : "#a855f7"} style={{ fontSize: 12, padding: "7px 12px", border: "1px solid #a855f733" }}>✨ CAPTION</Btn>
              <Btn onClick={() => { setShowAiPanel("coach"); aiCoachAnalysis(selected); }} bg={showAiPanel === "coach" ? "#a855f7" : "#1a1a1a"} fg={showAiPanel === "coach" ? "#fff" : "#a855f7"} style={{ fontSize: 12, padding: "7px 12px", border: "1px solid #a855f733" }}>🏆 COACH</Btn>
              <Btn onClick={() => togglePin(selected.id)} bg="#1a1a1a" fg={(profile?.pinned_ids || []).includes(selected.id) ? "#ffd60a" : "#888"} style={{ fontSize: 12, padding: "7px 12px" }}>{(profile?.pinned_ids || []).includes(selected.id) ? "⭐" : "☆"} HL</Btn>
              <Btn onClick={() => download(selected)} bg={ac} style={{ fontSize: 12, padding: "7px 12px" }}>↓ SAVE</Btn>
              {selected.uploader === user.username && <Btn onClick={() => deleteMedia(selected.id)} bg="#1a1a1a" fg="#c0392b" style={{ fontSize: 12, padding: "7px 12px" }}>🗑</Btn>}
              <Btn onClick={() => { setScreen(activeGroup ? "group" : "profile"); setTagMode(false); setPendingTagPos(null); setShowAiPanel(null); }} bg="#1a1a1a" fg="#666" style={{ fontSize: 12, padding: "7px 10px" }}>✕</Btn>
            </div>
          </div>
          {tagMode && selected.type === "photo" && <div style={{ background: "#ff4d0022", borderBottom: "1px solid #ff4d0055", padding: "8px 18px", fontSize: 13, color: "#ff4d00", fontFamily: FF, flexShrink: 0 }}>🏷️ <strong>TAG MODE</strong> — Click photo to place tag</div>}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "#050507", position: "relative" }}>
              <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
                {selected.type === "video" ? <video src={selected.src} controls autoPlay style={{ maxWidth: "100%", maxHeight: "calc(100vh - 200px)", background: "#000", display: "block" }} /> : (
                  <img src={selected.src} alt={selected.name} style={{ maxWidth: "100%", maxHeight: "calc(100vh - 200px)", objectFit: "contain", display: "block", cursor: tagMode ? "crosshair" : "default" }} onClick={handleTagClick} />
                )}
                {(selected.tags || []).map(tag => (
                  <div key={tag.username} style={{ position: "absolute", left: `${tag.x}%`, top: `${tag.y}%`, transform: "translate(-50%,-100%)", zIndex: 10, animation: "tagPop 0.3s ease both" }} onMouseEnter={() => setHoveredTag(tag.username)} onMouseLeave={() => setHoveredTag(null)}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: hoveredTag === tag.username ? `${ac}88` : "rgba(255,255,255,0.2)", border: `2px solid ${hoveredTag === tag.username ? ac : "#fff"}`, backdropFilter: "blur(4px)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}><span style={{ fontSize: 10 }}>🏷️</span></div>
                    {hoveredTag === tag.username && (
                      <div style={{ position: "absolute", bottom: "calc(100% + 4px)", left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.88)", border: "1px solid rgba(255,255,255,0.15)", padding: "5px 10px", whiteSpace: "nowrap", fontFamily: FN, fontSize: 13, letterSpacing: "0.06em", borderRadius: 2, zIndex: 20 }}>
                        <span style={{ color: ac }}>@</span>{tag.username}
                        {selected.uploader === user.username && <span className="hov" onClick={() => removeTag(selected.id, tag.username)} style={{ marginLeft: 8, color: "#c0392b", cursor: "pointer", fontSize: 11 }}>✕</span>}
                      </div>
                    )}
                  </div>
                ))}
                {pendingTagPos && <div style={{ position: "absolute", left: `${pendingTagPos.x}%`, top: `${pendingTagPos.y}%`, transform: "translate(-50%,-50%)", width: 22, height: 22, borderRadius: "50%", background: `${ac}88`, border: `2px solid ${ac}`, zIndex: 15, animation: "tagPop 0.3s ease both" }} />}
              </div>
              {pendingTagPos && (
                <div className="fu" style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", background: B1, border: `2px solid ${ac}`, padding: "14px 16px", minWidth: 240, zIndex: 30 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: ac, marginBottom: 8, letterSpacing: "0.06em" }}>TAG WHO?</div>
                  <input placeholder="Search member..." value={tagSearch} onChange={e => setTagSearch(e.target.value)} autoFocus style={{ width: "100%", background: "#0a0a0a", border: "1px solid #2a2a2a", color: "#fff", padding: "8px 10px", fontSize: 14, outline: "none", fontFamily: FF, marginBottom: 8 }} />
                  <div style={{ maxHeight: 130, overflowY: "auto" }}>
                    {tagCandidates.length === 0 && <div style={{ color: "#555", fontSize: 13, fontFamily: FF, padding: "6px 0" }}>No members found</div>}
                    {tagCandidates.map(m => (
                      <div key={m} className="hov" onClick={() => placeTag(selected.id, m, pendingTagPos.x, pendingTagPos.y)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", background: BD, marginBottom: 4, cursor: "pointer", border: "1px solid #1a1a1a" }}>
                        <Avatar name={m} size={26} color={ac} /><span style={{ fontWeight: 700, fontSize: 14 }}>@{m}</span>
                      </div>
                    ))}
                  </div>
                  <Btn onClick={() => { setPendingTagPos(null); setTagSearch(""); }} bg="#1a1a1a" fg="#666" style={{ width: "100%", fontSize: 12, padding: "7px", marginTop: 8 }}>CANCEL</Btn>
                </div>
              )}
            </div>
            <div style={{ width: 288, background: BF, borderLeft: "1px solid #1a1a1a", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {showAiPanel && (
                <div style={{ background: "#0d0b14", borderBottom: "2px solid #a855f744", padding: "13px 15px", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "#a855f7", letterSpacing: "0.08em" }}>{showAiPanel === "tags" ? "✨ AI TAG SUGGESTIONS" : showAiPanel === "caption" ? "✨ AI CAPTION" : "🏆 AI COACH FEEDBACK"}</div>
                    <span className="hov" onClick={() => { setShowAiPanel(null); setAiTagSuggestions([]); setAiCaption(null); setAiCoachFeedback(null); }} style={{ color: "#555", cursor: "pointer", fontSize: 13 }}>✕</span>
                  </div>
                  {aiLoading === showAiPanel && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}><div style={{ width: 14, height: 14, border: "2px solid #a855f744", borderTopColor: "#a855f7", borderRadius: "50%", animation: "spin 0.75s linear infinite", flexShrink: 0 }} /><span style={{ fontSize: 12, color: "#a855f7", fontFamily: FF }}>AI is analyzing...</span></div>}
                  {showAiPanel === "tags" && !aiLoading && aiTagSuggestions.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: "#666", fontFamily: FF, marginBottom: 8 }}>AI thinks these members might be in this photo:</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {aiTagSuggestions.map(m => (
                          <div key={m} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: B1, border: "1px solid #a855f733", padding: "7px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={m} size={24} color="#a855f7" /><span style={{ fontWeight: 700, fontSize: 13 }}>@{m}</span></div>
                            <div style={{ display: "flex", gap: 5 }}>
                              <Btn onClick={() => placeTag(selected.id, m, 50, 50)} bg="#a855f7" style={{ fontSize: 11, padding: "4px 10px" }}>TAG ✓</Btn>
                              <Btn onClick={() => setAiTagSuggestions(prev => prev.filter(x => x !== m))} bg="#1a1a1a" fg="#555" style={{ fontSize: 11, padding: "4px 8px" }}>✕</Btn>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {showAiPanel === "caption" && !aiLoading && aiCaption && (
                    <div>
                      <div style={{ background: B1, border: "1px solid #a855f744", padding: "11px 12px", marginBottom: 9, fontSize: 14, color: "#e0c8ff", fontFamily: FF, lineHeight: 1.5, fontStyle: "italic" }}>"{aiCaption}"</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn onClick={() => applyAiCaption(aiCaption)} bg="#a855f7" style={{ flex: 1, fontSize: 12, padding: "7px" }}>✓ USE THIS</Btn>
                        <Btn onClick={() => aiGenerateCaption(selected)} bg="#1a1a1a" fg="#a855f7" style={{ flex: 1, fontSize: 12, padding: "7px", border: "1px solid #a855f733" }}>↺ RETRY</Btn>
                      </div>
                    </div>
                  )}
                  {showAiPanel === "coach" && !aiLoading && aiCoachFeedback && (
                    <div>
                      <div style={{ background: B1, border: "1px solid #a855f744", padding: "11px 12px", fontSize: 13, color: "#e0c8ff", fontFamily: FF, lineHeight: 1.6 }}>{aiCoachFeedback}</div>
                      <Btn onClick={() => aiCoachAnalysis(selected)} bg="#1a1a1a" fg="#a855f7" style={{ width: "100%", fontSize: 12, padding: "7px", marginTop: 8, border: "1px solid #a855f733" }}>↺ MORE FEEDBACK</Btn>
                    </div>
                  )}
                </div>
              )}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1a1a" }}>
                <div className="hov" onClick={() => openProfile(selected.uploader)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 6 }}>
                  <Avatar src={selected.uploader_avatar} name={selected.uploader} size={32} color={ac} />
                  <div><div style={{ fontWeight: 700, fontSize: 14 }}>{selected.uploader}</div><div style={{ fontSize: 11, color: "#444" }}>{timeAgo(selected.ts)} • {fmtSize(selected.size)}</div></div>
                </div>
                {(selected.tags || []).length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.08em", marginBottom: 5 }}>TAGGED</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {(selected.tags || []).map(t => <div key={t.username} className="hov" onClick={() => openProfile(t.username)} style={{ background: `${ac}22`, border: `1px solid ${ac}44`, padding: "3px 9px", fontSize: 12, color: ac, cursor: "pointer", fontWeight: 700 }}>@{t.username}</div>)}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid #1a1a1a" }}>
                <div style={{ fontSize: 11, color: "#444", letterSpacing: "0.08em", marginBottom: 5 }}>CAPTION</div>
                <textarea placeholder="Add a caption..." defaultValue={selected.caption || ""} onBlur={e => updateCaption(selected.id, e.target.value)} style={{ width: "100%", background: B1, border: "1px solid #1f1f1f", color: "#ccc", padding: "7px 10px", fontSize: 13, resize: "none", height: 50, outline: "none", fontFamily: FF }} />
              </div>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid #1a1a1a" }}>
                <div style={{ fontSize: 11, color: "#444", letterSpacing: "0.08em", marginBottom: 6 }}>REACTIONS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6 }}>{Object.entries(selected.reactions || {}).map(([e, users]) => <button key={e} className={`rbtn${users.includes(user.username) ? " on" : ""}`} onClick={() => react(selected.id, e)}>{e} <span style={{ fontSize: 11, color: "#888" }}>{users.length}</span></button>)}</div>
                {reactionOpen ? <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{REACTIONS.map(e => <button key={e} className="rbtn" onClick={() => react(selected.id, e)} style={{ fontSize: 18 }}>{e}</button>)}</div> : <Btn onClick={() => setReactionOpen(true)} bg="#1a1a1a" fg="#888" style={{ fontSize: 12, padding: "6px 12px" }}>+ REACT</Btn>}
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ padding: "10px 16px 4px", fontSize: 11, color: "#444", letterSpacing: "0.08em" }}>COMMENTS ({(selected.comments || []).length})</div>
                <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
                  {!(selected.comments || []).length && <div style={{ color: "#2a2a2a", fontSize: 13, fontFamily: FF, padding: "8px 0" }}>No comments yet</div>}
                  {(selected.comments || []).map(c => (
                    <div key={c.id} style={{ marginBottom: 8, padding: "7px 9px", background: B1, borderLeft: `2px solid ${ac}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <Avatar src={c.authorAvatar} name={c.author} size={18} color={ac} onClick={() => openProfile(c.author)} />
                        <span style={{ fontWeight: 700, fontSize: 12, color: ac }}>{c.author}</span>
                        <span style={{ color: "#333", fontSize: 10 }}>{timeAgo(c.ts)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "#bbb", fontFamily: FF, paddingLeft: 24 }}>{c.text}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "9px 14px", borderTop: "1px solid #1a1a1a", display: "flex", gap: 6 }}>
                  <input placeholder="Comment..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === "Enter" && addComment(selected.id)} style={{ flex: 1, background: B1, border: "1px solid #1f1f1f", color: "#ddd", padding: "8px 10px", fontSize: 13, outline: "none", fontFamily: FF }} />
                  <Btn onClick={() => addComment(selected.id)} bg={ac} style={{ padding: "8px 12px", fontSize: 14 }}>→</Btn>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDITOR */}
      {screen === "editor" && selected && editState && (
        <div className="fu" style={{ position: "fixed", inset: 0, background: "#070709", zIndex: 100, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px", borderBottom: `2px solid ${ac}`, background: BF, flexShrink: 0, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 900 }}>📸 PRO EDITOR</div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={dlEdit} bg="#1a1a1a" fg={ac} style={{ fontSize: 12, padding: "7px 14px" }}>↓ DOWNLOAD</Btn>
              <Btn onClick={saveEdit} bg={ac} style={{ fontSize: 12, padding: "7px 14px" }}>✓ SAVE & SHARE</Btn>
              <Btn onClick={() => setScreen("group")} bg="#1a1a1a" fg="#666" style={{ fontSize: 12, padding: "7px 12px" }}>✕</Btn>
            </div>
          </div>
          <div style={{ display: "flex", background: BF, borderBottom: "1px solid #1a1a1a", padding: "0 16px", flexShrink: 0, overflowX: "auto" }}>
            {[["adjust", "🎛 ADJUST"], ["filters", "✨ FILTERS"], ["text", "✏️ TEXT"], ["stickers", "🔥 STICKERS"], ["crop", "✂️ TRANSFORM"]].map(([id, label]) => (
              <button key={id} className={`tb${editScreen === id ? " act" : ""}`} onClick={() => setEditScreen(id)} style={{ color: editScreen === id ? ac : "#555", borderBottomColor: editScreen === id ? ac : "transparent", fontSize: 12, padding: "10px 12px" }}>{label}</button>
            ))}
          </div>
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 14, background: "#050507", position: "relative" }}>
              <div style={{ position: "relative", display: "inline-block" }}>
                <img ref={imgRef} src={selected.src} alt="edit" crossOrigin="anonymous" style={{ maxWidth: "100%", maxHeight: "calc(100vh - 200px)", objectFit: "contain", filter: getFilter(editState, activeFilter), transform: `rotate(${editState.rotate}deg) scaleX(${editState.flip ? -1 : 1})`, transition: "filter 0.08s,transform 0.2s", display: "block" }} />
                {textOverlays.map(t => <div key={t.id} onClick={() => setEditingTextId(t.id === editingTextId ? null : t.id)} style={{ position: "absolute", left: `${t.x}%`, top: `${t.y}%`, transform: "translate(-50%,-50%)", fontFamily: FN, fontSize: t.size, color: t.color, background: t.bg ? "rgba(0,0,0,0.5)" : "transparent", padding: t.bg ? "4px 10px" : "0", cursor: "move", userSelect: "none", whiteSpace: "nowrap", letterSpacing: "0.06em", border: editingTextId === t.id ? `1px dashed ${ac}` : "1px dashed transparent", zIndex: 10 }}>{t.text}</div>)}
                {stickerOverlays.map(s => <div key={s.id} style={{ position: "absolute", left: `${s.x}%`, top: `${s.y}%`, transform: "translate(-50%,-50%)", fontSize: s.size, cursor: "move", userSelect: "none", zIndex: 10 }}>{s.emoji}</div>)}
              </div>
              <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>
            <div style={{ width: 268, background: BF, borderLeft: "1px solid #1a1a1a", padding: 15, overflowY: "auto", flexShrink: 0 }}>
              {editScreen === "adjust" && <>
                <div style={{ fontSize: 11, fontWeight: 900, color: ac, letterSpacing: "0.1em", marginBottom: 13 }}>LIGHT & COLOR</div>
                {[{ key: "brightness", icon: "☀️", label: "Brightness", min: 0, max: 200, step: 1 }, { key: "contrast", icon: "◑", label: "Contrast", min: 0, max: 200, step: 1 }, { key: "saturation", icon: "🎨", label: "Saturation", min: 0, max: 200, step: 1 }, { key: "sepia", icon: "🟫", label: "Warmth", min: 0, max: 100, step: 1 }, { key: "grayscale", icon: "⬛", label: "Grayscale", min: 0, max: 100, step: 1 }, { key: "blur", icon: "💨", label: "Blur", min: 0, max: 10, step: 0.1 }].map(c => (
                  <div key={c.key} style={{ marginBottom: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 12 }}><span style={{ color: "#777" }}>{c.icon} {c.label}</span><span style={{ color: ac, fontWeight: 700, fontSize: 11 }}>{parseFloat(editState[c.key]).toFixed(c.step < 1 ? 1 : 0)}</span></div>
                    <input type="range" className="slider" min={c.min} max={c.max} step={c.step} value={editState[c.key]} onChange={e => setEditState(s => ({ ...s, [c.key]: parseFloat(e.target.value) }))} />
                  </div>
                ))}
                <Btn onClick={() => setEditState(s => ({ ...s, brightness: 100, contrast: 100, saturation: 100, blur: 0, sepia: 0, grayscale: 0, rotate: 0, vignette: false, flip: false }))} bg="#111" fg="#555" style={{ width: "100%", fontSize: 12 }}>↺ RESET</Btn>
              </>}
              {editScreen === "filters" && <>
                <div style={{ fontSize: 11, fontWeight: 900, color: ac, letterSpacing: "0.1em", marginBottom: 12 }}>PRESETS</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  {FILTERS.map((f, i) => (
                    <div key={f.name} onClick={() => setActiveFilter(i)} style={{ cursor: "pointer", border: `2px solid ${activeFilter === i ? ac : "#1f1f1f"}`, overflow: "hidden", background: B1 }}>
                      <div style={{ height: 52, overflow: "hidden" }}><img src={selected.src} style={{ width: "100%", height: "100%", objectFit: "cover", filter: f.fn() }} /></div>
                      <div style={{ padding: "4px 7px", fontSize: 11, fontWeight: 700, color: activeFilter === i ? ac : "#666" }}>{f.name}</div>
                    </div>
                  ))}
                </div>
              </>}
              {editScreen === "crop" && <>
                <div style={{ fontSize: 11, fontWeight: 900, color: ac, letterSpacing: "0.1em", marginBottom: 10 }}>ROTATE</div>
                <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>{[0, 90, 180, 270].map(d => <button key={d} className="hov" onClick={() => setEditState(s => ({ ...s, rotate: d }))} style={{ flex: 1, background: editState.rotate === d ? ac : "#1a1a1a", color: editState.rotate === d ? "#fff" : "#666", border: "none", padding: "8px 0", fontSize: 12, fontFamily: FN, cursor: "pointer" }}>{d}°</button>)}</div>
                <Btn onClick={() => setEditState(s => ({ ...s, rotate: 0, flip: false }))} bg="#111" fg="#555" style={{ width: "100%", fontSize: 12 }}>↺ RESET</Btn>
              </>}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="fu" style={{ background: BD, border: `2px solid ${ac}`, padding: "28px 26px", width: "100%", maxWidth: modal === "notifs" ? 400 : 380, maxHeight: "85vh", overflowY: "auto" }}>

            {modal === "createGroup" && <>
              <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 18 }}>CREATE GROUP</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Inp placeholder="Group name..." value={form.groupName || ""} onChange={F("groupName")} style={{ color: "#111" }} />
                <div><div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em", marginBottom: 6 }}>ICON</div><div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{ICONS.map(icon => <span key={icon} onClick={() => setForm(f => ({ ...f, groupIcon: icon }))} style={{ fontSize: 21, cursor: "pointer", padding: 6, background: form.groupIcon === icon ? "#1f1f1f" : "transparent", border: `1px solid ${form.groupIcon === icon ? ac : "transparent"}`, borderRadius: 4 }}>{icon}</span>)}</div></div>
                <div><div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em", marginBottom: 6 }}>COLOR</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{COLORS.map(c => <div key={c} onClick={() => setForm(f => ({ ...f, groupColor: c }))} style={{ width: 24, height: 24, background: c, borderRadius: "50%", cursor: "pointer", border: `2px solid ${form.groupColor === c ? "#fff" : "transparent"}` }} />)}</div></div>
                <div style={{ display: "flex", gap: 7, marginTop: 4 }}><Btn onClick={createGroup} style={{ flex: 1, fontSize: 14, padding: "10px" }}>CREATE →</Btn><Btn onClick={() => { setModal(null); setForm({}); }} bg="#1a1a1a" fg="#666" style={{ flex: 1, fontSize: 14, padding: "10px" }}>CANCEL</Btn></div>
              </div>
            </>}

            {modal === "editGroup" && editingGroup && <>
              <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 18 }}>EDIT GROUP</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Inp placeholder="Group name..." value={editingGroup.name || ""} onChange={e => setEditingGroup(g => ({ ...g, name: e.target.value }))} style={{ color: "#111" }} />
                <div><div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em", marginBottom: 6 }}>ICON</div><div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{ICONS.map(icon => <span key={icon} onClick={() => setEditingGroup(g => ({ ...g, icon }))} style={{ fontSize: 21, cursor: "pointer", padding: 6, background: editingGroup.icon === icon ? "#1f1f1f" : "transparent", border: `1px solid ${editingGroup.icon === icon ? ac : "transparent"}`, borderRadius: 4 }}>{icon}</span>)}</div></div>
                <div><div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em", marginBottom: 6 }}>COLOR</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{COLORS.map(c => <div key={c} onClick={() => setEditingGroup(g => ({ ...g, color: c }))} style={{ width: 24, height: 24, background: c, borderRadius: "50%", cursor: "pointer", border: `2px solid ${editingGroup.color === c ? "#fff" : "transparent"}` }} />)}</div></div>
                <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em", marginBottom: 4 }}>CO-ADMINS (can also edit this group)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 140, overflowY: "auto" }}>
                  {(activeGroup?.members || []).filter(m => m !== activeGroup?.created_by).map(m => {
                    const isCoAdmin = (activeGroup?.admins || []).includes(m);
                    return (
                      <div key={m} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: B1, border: `1px solid ${isCoAdmin ? ac : "#2a2a2a"}`, padding: "7px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={m} size={24} color={ac} /><span style={{ fontWeight: 700, fontSize: 13 }}>@{m}</span></div>
                        <Btn onClick={async () => {
                          const admins = isCoAdmin ? (activeGroup.admins || []).filter(a => a !== m) : [...(activeGroup.admins || [activeGroup.created_by]), m];
                          await DB.update("groups", { id: activeGroup.id }, { admins });
                          const updG = { ...activeGroup, admins };
                          setActiveGroup(updG); setGroups(prev => prev.map(g => g.id === updG.id ? updG : g));
                          toast$(isCoAdmin ? `@${m} removed as admin` : `@${m} is now co-admin ✅`);
                        }} bg={isCoAdmin ? "#1a1a1a" : ac} fg={isCoAdmin ? "#888" : "#fff"} style={{ fontSize: 11, padding: "4px 10px" }}>{isCoAdmin ? "REMOVE ADMIN" : "MAKE ADMIN"}</Btn>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 7, marginTop: 4 }}><Btn onClick={saveGroupEdit} style={{ flex: 1, fontSize: 14, padding: "10px" }}>SAVE →</Btn><Btn onClick={() => { setModal(null); setEditingGroup(null); }} bg="#1a1a1a" fg="#666" style={{ flex: 1, fontSize: 14, padding: "10px" }}>CANCEL</Btn></div>
              </div>
            </>}

            {modal === "joinGroup" && <>
              <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>JOIN A GROUP</div>
              <div style={{ color: "#555", fontSize: 13, fontFamily: FF, marginBottom: 16 }}>Enter the 6-character invite code</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Inp placeholder="e.g. A3K9PQ" value={form.joinCode || ""} onChange={e => setForm(f => ({ ...f, joinCode: e.target.value.toUpperCase() }))} style={{ textTransform: "uppercase", letterSpacing: "0.2em", fontSize: 20, textAlign: "center", color: "#111" }} maxLength={6} />
                {loading ? <div style={{ textAlign: "center", padding: 10 }}><Spin /></div> : <div style={{ display: "flex", gap: 7 }}><Btn onClick={joinGroup} style={{ flex: 1, fontSize: 14, padding: "10px" }}>JOIN →</Btn><Btn onClick={() => { setModal(null); setForm({}); }} bg="#1a1a1a" fg="#666" style={{ flex: 1, fontSize: 14, padding: "10px" }}>CANCEL</Btn></div>}
              </div>
            </>}

            {modal === "inviteCode" && activeGroup && <>
              <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>INVITE TO {activeGroup.name.toUpperCase()}</div>
              <div style={{ color: "#555", fontSize: 13, fontFamily: FF, marginBottom: 16 }}>Share this code with your squad</div>
              <div style={{ background: B1, border: `2px solid ${activeGroup.color}`, padding: "18px", textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: "0.3em", color: activeGroup.color, animation: "glow 2s infinite" }}>{activeGroup.code}</div>
                <div style={{ color: "#555", fontSize: 12, fontFamily: FF, marginTop: 5 }}>Dashboard → Join with Code</div>
              </div>
              <div style={{ background: B1, padding: "10px 12px", marginBottom: 14, fontSize: 13, color: "#666", fontFamily: FF }}>👥 Members: <span style={{ color: "#aaa" }}>{activeGroup.members.join(", ")}</span></div>
              <Btn onClick={() => setModal(null)} bg="#1a1a1a" fg="#888" style={{ width: "100%", fontSize: 14, padding: "10px" }}>CLOSE</Btn>
            </>}

            {modal === "aiReel" && <>
              <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>✨ AI HIGHLIGHT REEL</span>
                <Btn onClick={() => setModal(null)} bg="#1a1a1a" fg="#666" style={{ fontSize: 11, padding: "5px 10px" }}>CLOSE</Btn>
              </div>
              <div style={{ color: "#555", fontSize: 13, fontFamily: FF, marginBottom: 14 }}>AI picks your squad's best moments</div>
              {aiLoading === "reel" && <div style={{ textAlign: "center", padding: "30px 0" }}><div style={{ width: 28, height: 28, border: "3px solid #a855f744", borderTopColor: "#a855f7", borderRadius: "50%", animation: "spin 0.75s linear infinite", margin: "0 auto 12px" }} /><div style={{ fontSize: 13, color: "#a855f7", fontFamily: FF }}>AI is scanning your uploads...</div></div>}
              {!aiLoading && aiReelPicks?.intro && (
                <div>
                  <div style={{ background: "linear-gradient(135deg,#1a0d2e,#0d0b14)", border: "1px solid #a855f744", padding: "14px 16px", marginBottom: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#a855f7", letterSpacing: "0.1em", marginBottom: 4 }}>AI REEL INTRO</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#e0c8ff", fontStyle: "italic" }}>"{aiReelPicks.intro}"</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 14 }}>
                    {(aiReelPicks.picks || []).map((item, i) => (
                      <div key={item.id} className="ch" style={{ background: B1, border: "1px solid #a855f733", overflow: "hidden", cursor: "pointer" }} onClick={() => { setSelected(item); setModal(null); setScreen("lightbox"); }}>
                        <div style={{ aspectRatio: "16/9", position: "relative", overflow: "hidden" }}>
                          {item.type === "video" ? <video src={item.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted /> : <img src={item.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                          <div style={{ position: "absolute", top: 4, left: 4, background: "#a855f7", color: "#fff", padding: "2px 6px", fontSize: 10, fontWeight: 800 }}>#{i + 1}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 7 }}>
                    <Btn onClick={() => { (aiReelPicks.picks || []).forEach(item => togglePin(item.id)); setModal(null); toast$("AI picks added to highlights! ⭐"); }} bg="#a855f7" style={{ flex: 1, fontSize: 13, padding: "9px" }}>⭐ PIN ALL TO HIGHLIGHTS</Btn>
                    <Btn onClick={() => aiPickHighlights()} bg="#1a1a1a" fg="#a855f7" style={{ flex: 1, fontSize: 13, padding: "9px", border: "1px solid #a855f733" }}>↺ REPICK</Btn>
                  </div>
                </div>
              )}
            </>}

            {modal === "notifs" && <>
              <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                NOTIFICATIONS <Btn onClick={() => setModal(null)} bg="#1a1a1a" fg="#666" style={{ fontSize: 11, padding: "5px 10px" }}>CLOSE</Btn>
              </div>
              {notifications.length === 0 && <div style={{ textAlign: "center", padding: "30px 20px", color: "#333" }}><div style={{ fontSize: 36, marginBottom: 8 }}>🔔</div><div style={{ fontSize: 18, fontWeight: 900 }}>ALL CAUGHT UP</div></div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {notifications.map(n => (
                  <div key={n.id} style={{ background: n.is_read ? "#0d0d14" : "#111", border: `1px solid ${n.is_read ? "#1a1a1a" : ac}`, padding: "11px 13px", position: "relative" }}>
                    {!n.is_read && <div style={{ position: "absolute", top: 9, right: 9, width: 7, height: 7, background: ac, borderRadius: "50%" }} />}
                    <div style={{ fontSize: 13, fontFamily: FF, color: n.is_read ? "#666" : "#ccc", lineHeight: 1.4, marginBottom: 5 }}>{n.msg}</div>
                    <div style={{ fontSize: 11, color: "#444", fontFamily: FF, marginBottom: n.type === "tag" && !n.approved && !n.rejected ? 9 : 0 }}>{timeAgo(n.ts)}</div>
                    {n.type === "tag" && !n.approved && !n.rejected && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn onClick={() => approveTag(n.media_id)} bg={ac} style={{ fontSize: 12, padding: "6px 13px" }}>⭐ ADD TO HIGHLIGHTS</Btn>
                        <Btn onClick={() => declineTag(n.media_id)} bg="#1a1a1a" fg="#888" style={{ fontSize: 12, padding: "6px 11px" }}>DECLINE</Btn>
                      </div>
                    )}
                    {n.type === "tag" && n.approved && <div style={{ fontSize: 11, color: ac, fontWeight: 700 }}>✓ Added to highlights</div>}
                    {n.type === "tag" && n.rejected && <div style={{ fontSize: 11, color: "#555", fontWeight: 700 }}>Declined</div>}
                  </div>
                ))}
              </div>
            </>}
          </div>
        </div>
      )}
    </div>
  );
}
