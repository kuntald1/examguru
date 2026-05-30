import { useState, useRef, useCallback, useEffect } from "react"

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:       #F8F7FF;
    --bg2:      #FFFFFF;
    --bg3:      #FAF5FF;
    --border:   #EDE9FE;
    --border2:  #DDD6FE;
    --text:     #1A2E1A;
    --muted:    #6B8F6B;
    --accent:   #7C3AED;
    --accent2:  #5B21B6;
    --light:    #F5F3FF;
    --yellow:   #FDD835;
    --yellow2:  #F9A825;
    --success:  #43A047;
    --warning:  #FB8C00;
    --danger:   #E53935;
    --font:     'Inter', sans-serif;
  }
  body { font-family: var(--font); background: var(--bg); color: var(--text); min-height: 100vh; }
  .mfrac { display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; margin: 0 2px; font-size: 0.92em; line-height: 1.2; }
  .mnum { border-bottom: 1.5px solid var(--text); padding: 0 2px 1px; text-align: center; }
  .mden { padding: 1px 2px 0; text-align: center; }

  ::-webkit-scrollbar-track { background: var(--bg3); }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

  .shell { display: flex; min-height: 100vh; }
  .sidebar { width: 200px; flex-shrink: 0; background: linear-gradient(180deg, #5b21b6 0%, #7c3aed 100%); border-right: none; padding: 24px 0; display: flex; flex-direction: column; box-shadow: 2px 0 8px rgba(0,0,0,0.04); }
  .main { flex: 1; overflow-y: auto; background: var(--bg); }
  .page { padding: 28px 32px; }

  .logo { padding: 0 20px 20px; border-bottom: 1px solid rgba(255,255,255,0.15); margin-bottom: 12px; }
  .logo-mark { font-size: 20px; font-weight: 700; color: #fff; letter-spacing: -0.5px; }
  .logo-mark span { color: #c4b5fd; }
  .logo-sub { font-size: 10px; color: rgba(255,255,255,0.5); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.05em; }

  .nav-item { display: flex; align-items: center; gap: 9px; padding: 9px 20px; font-size: 13px; color: rgba(255,255,255,0.65); cursor: pointer; transition: all 0.15s; border-radius: 0; font-weight: 500; }
  .nav-item:hover { color: #fff; background: rgba(255,255,255,0.1); }
  .nav-item.active { color: #fff; background: rgba(255,255,255,0.15); border-left: 3px solid #c4b5fd; font-weight: 600; }
  .nav-icon { font-size: 14px; width: 18px; text-align: center; }

  .sidebar-bottom { margin-top: auto; padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.15); }
  .user-chip { display: flex; align-items: center; gap: 10px; }
  .user-avatar { width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #fff; }
  .user-name { font-size: 13px; font-weight: 600; color: #fff; }
  .user-role { font-size: 11px; color: rgba(255,255,255,0.55); }

  .steps { display: flex; align-items: center; margin-bottom: 24px; background: var(--bg2); border-radius: 12px; padding: 14px 20px; border: 1px solid var(--border); box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
  .step { display: flex; align-items: center; gap: 8px; }
  .step-dot { width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--border2); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--muted); transition: all 0.2s; }
  .step.done .step-dot { background: var(--accent); border-color: var(--accent); color: #fff; }
  .step.active .step-dot { background: var(--accent2); border-color: var(--accent2); color: #fff; }
  .step-label { font-size: 12px; color: var(--muted); font-weight: 500; }
  .step.active .step-label { color: var(--accent2); font-weight: 600; }
  .step.done .step-label { color: var(--accent); }
  .step-line { flex: 1; height: 2px; background: var(--border); margin: 0 10px; min-width: 16px; border-radius: 1px; }
  .step.done + .step-line { background: var(--accent); }

  .card { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 22px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
  .card-title { font-size: 14px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; color: var(--text); }

  label { display: block; font-size: 11px; font-weight: 600; color: var(--muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
  input, select, textarea { width: 100%; background: var(--bg3); border: 1.5px solid var(--border); border-radius: 10px; padding: 10px 14px; color: var(--text); font-family: var(--font); font-size: 13px; outline: none; transition: border-color 0.15s; }
  input:focus, select:focus, textarea:focus { border-color: var(--accent); background: #fff; }
  textarea { resize: vertical; min-height: 80px; line-height: 1.6; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .form-group { margin-bottom: 14px; }
  .field-hint { font-size: 11px; color: var(--muted); margin-top: 5px; }
  .field-error { font-size: 11px; color: var(--danger); margin-top: 5px; font-weight: 500; }

  .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; font-family: var(--font); font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; }
  .btn-primary { background: linear-gradient(135deg, #5b21b6, #7c3aed); color: #fff; }
  .btn-primary:hover { background: #1B5E20; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(46,125,50,0.3); }
  .btn-secondary { background: var(--bg3); color: var(--text); border: 1.5px solid var(--border2); }
  .btn-secondary:hover { border-color: var(--accent); color: var(--accent2); }
  .btn-success { background: var(--accent); color: #fff; }
  .btn-success:hover { background: var(--accent2); }
  .btn-danger { background: transparent; color: var(--danger); border: 1.5px solid var(--danger); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; box-shadow: none !important; }
  .btn-lg { padding: 12px 28px; font-size: 14px; border-radius: 12px; }
  .btn-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }

  .choice-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 18px; }
  .choice-card { background: var(--bg3); border: 2px solid var(--border); border-radius: 14px; padding: 18px; cursor: pointer; transition: all 0.2s; text-align: center; }
  .choice-card:hover { border-color: var(--accent); background: var(--light); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(124,58,237,0.15); }
  .choice-card.selected { border-color: var(--accent2); background: var(--light); box-shadow: 0 4px 12px rgba(91,33,182,0.15); }
  .choice-icon { font-size: 28px; margin-bottom: 10px; }
  .choice-title { font-size: 13px; font-weight: 700; margin-bottom: 4px; color: var(--text); }
  .choice-desc { font-size: 11px; color: var(--muted); line-height: 1.5; }

  .upload-zone { border: 2px dashed var(--border2); border-radius: 16px; padding: 44px; text-align: center; cursor: pointer; transition: all 0.2s; background: var(--bg3); }
  .upload-zone:hover, .upload-zone.dragging { border-color: var(--accent); background: var(--light); }
  .upload-zone.has-file { border-color: var(--accent); background: var(--light); border-style: solid; }
  .upload-icon { font-size: 40px; margin-bottom: 12px; }
  .upload-text { font-size: 15px; font-weight: 600; margin-bottom: 5px; color: var(--text); }
  .upload-sub { font-size: 12px; color: var(--muted); }
  .file-badge { display: inline-flex; align-items: center; gap: 8px; background: var(--light); border: 1.5px solid var(--accent); border-radius: 10px; padding: 8px 16px; color: var(--accent2); font-size: 13px; font-weight: 600; margin-top: 14px; }

  .page-header { margin-bottom: 22px; }
  .page-title { font-size: 24px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 5px; color: var(--text); }
  .page-sub { font-size: 13px; color: var(--muted); }

  .badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .badge-blue { background: var(--light); color: var(--accent2); border: 1px solid var(--border2); }
  .badge-green { background: #E8F5E9; color: var(--accent2); border: 1px solid var(--border2); }
  .badge-amber { background: #FFF8E1; color: var(--warning); border: 1px solid #FFE082; }
  .badge-teal { background: #E0F2F1; color: #00695C; border: 1px solid #80CBC4; }

  .q-item { background: var(--bg3); border: 1.5px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 10px; transition: border-color 0.15s; }
  .q-item:hover { border-color: var(--border2); }
  .q-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .q-num { width: 26px; height: 26px; border-radius: 50%; background: var(--accent2); color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .q-marks { margin-left: auto; font-size: 12px; color: var(--muted); font-weight: 600; background: var(--light); padding: 2px 8px; border-radius: 6px; }

  .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .stat-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; padding: 18px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
  .stat-value { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
  .stat-label { font-size: 11px; color: var(--muted); font-weight: 500; }
  .stat-icon { font-size: 20px; margin-bottom: 8px; }

  .pdf-card { background: var(--bg3); border: 1.5px solid var(--border); border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 16px; margin-bottom: 10px; }
  .pdf-icon { font-size: 28px; flex-shrink: 0; }
  .pdf-info { flex: 1; }
  .pdf-name { font-size: 13px; font-weight: 700; margin-bottom: 3px; color: var(--text); }
  .pdf-meta { font-size: 11px; color: var(--muted); }

  .login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #5b21b6 0%, #7c3aed 50%, #6d28d9 100%); }
  .login-card { background: #fff; border-radius: 20px; padding: 40px; width: 100%; max-width: 400px; box-shadow: 0 8px 40px rgba(46,125,50,0.12); border: 1px solid var(--border); }
  .login-logo { text-align: center; margin-bottom: 28px; }
  .login-logo-mark { font-size: 24px; font-weight: 700; color: var(--text); }
  .login-logo-sub { font-size: 12px; color: var(--muted); margin-top: 4px; }
  .login-title { font-size: 20px; font-weight: 700; margin-bottom: 6px; color: var(--text); }
  .login-sub { font-size: 13px; color: var(--muted); margin-bottom: 24px; }

  .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .alert { padding: 12px 16px; border-radius: 10px; font-size: 13px; margin-bottom: 14px; display: flex; align-items: center; gap: 10px; font-weight: 500; }
  .alert-error { background: #FFEBEE; border: 1.5px solid #FFCDD2; color: #C62828; }
  .alert-success { background: #E8F5E9; border: 1.5px solid #C8E6C9; color: #2E7D32; }
  .alert-info { background: var(--light); border: 1.5px solid var(--border2); color: var(--accent2); }

  .add-pattern { display: inline-flex; align-items: center; gap: 6px; color: var(--accent2); font-size: 13px; cursor: pointer; padding: 6px 0; font-weight: 600; }
  .add-pattern:hover { color: var(--accent); }

  .top-bar { background: var(--bg2); border-bottom: 1px solid var(--border); padding: 14px 32px; display: flex; align-items: center; gap: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
  .top-bar-title { font-size: 15px; font-weight: 700; color: var(--text); }
  .top-bar-sub { font-size: 12px; color: var(--muted); }
  .greeting { font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
  .greeting-sub { font-size: 13px; color: var(--muted); margin-bottom: 24px; }
`

const API = ""
async function apiGenerate(fd) {
  const t = getToken()
  const r = await fetch(`${API}/api/generate`, {
    method: "POST",
    headers: t ? { "Authorization": `Bearer ${t}` } : {},
    body: fd
  })
  return r.json()
}
async function apiTest(fd) { const r = await fetch(`${API}/api/test`, { method: "POST", body: fd }); return r.json() }

function inject(css) {
  if (typeof document === "undefined") return
  const el = document.getElementById("omr-styles") || (() => { const s = document.createElement("style"); s.id = "omr-styles"; document.head.appendChild(s); return s })()
  el.textContent = css
}
inject(CSS)

function Sidebar({ page, go, user }) {
  const nav = [
    { id: "dashboard",    icon: "⊞", label: "Dashboard" },
    { id: "upload",       icon: "✦", label: "Generate Questions" },
    { id: "omrExams",     icon: "☰", label: "OMR Exams" },
    { id: "batches",      icon: "◈", label: "Batches" },
    { id: "students",     icon: "◉", label: "Students" },
    { id: "omrResults",   icon: "◎", label: "Results" },
    { id: "fees",         icon: "💰", label: "Fees" },
    { id: "billing",      icon: "🧾", label: "Billing & Plans" },
  ]
  return (
    <div className="sidebar">
      <div className="logo">
        <div className="logo-mark">Exam<span>Guru</span></div>
        <div className="logo-sub">ExamGuru · AI Exams</div>
      </div>
      {nav.map(n => (
        <div key={n.id}
          className={`nav-item${page === n.id ? " active" : ""}`}
          style={{ opacity: n.p2 ? 0.45 : 1, cursor: n.p2 ? "default" : "pointer" }}
          onClick={() => !n.p2 && go(n.id)}
        >
          <span className="nav-icon">{n.icon}</span>
          {n.label}
          {n.p2 && <span style={{ marginLeft: "auto", fontSize: 9, background: "#FFF8E1", color: "#F9A825", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>P2</span>}
        </div>
      ))}
      <div className="sidebar-bottom">
        <div className="user-chip">
          <div className="user-avatar">{(user?.name || "A")[0].toUpperCase()}</div>
          <div style={{flex:1,minWidth:0}}>
            <div className="user-name" style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.name || "Admin"}</div>
            <div className="user-role">{user?.plan || "Administrator"}</div>
          </div>
        </div>
        <button className="btn btn-secondary" style={{width:"100%",justifyContent:"center",marginTop:10,fontSize:12,padding:"7px 12px"}}
          onClick={()=>{ clearToken(); go("login") }}>Sign out</button>
      </div>
    </div>
  )
}

function Steps({ steps, current }) {
  return (
    <div className="steps">
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? "1" : "none" }}>
          <div className={`step${i < current ? " done" : i === current ? " active" : ""}`}>
            <div className="step-dot">{i < current ? "✓" : i + 1}</div>
            <div className="step-label">{s}</div>
          </div>
          {i < steps.length - 1 && <div className="step-line" />}
        </div>
      ))}
    </div>
  )
}

function LoginPage({ go, updateState }) {
  const [email, setEmail] = useState("admin@vorpet.com")
  const [pass, setPass] = useState("admin123")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const login = async () => {
    if (!email || !pass) { setError("Please enter email and password"); return }
    setLoading(true); setError("")
    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: pass })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || "Login failed"); setLoading(false); return }
      setToken(data.access_token)
      updateState({ user: data.institute, token: data.access_token })
      if (data.institute.plan === "superadmin") go("superadmin")
      else go("dashboard")
    } catch (e) {
      setError("Cannot reach server. Is Docker running?")
    }
    setLoading(false)
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <div style={{ fontSize: 48, marginBottom: 8 }}>📋</div>
          <div className="login-logo-mark">Exam<span style={{ color: "#7c3aed" }}>Guru</span></div>
          <div className="login-logo-sub">AI-Powered Exam & Question Management</div>
        </div>
        <div className="login-title">Good morning! 👋</div>
        <div className="login-sub">Sign in to your account to continue</div>
        {error && <div className="alert alert-error">⚠ {error}</div>}
        <div className="form-group">
          <label>Email address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} />
        </div>
        <button className="btn btn-primary btn-lg" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} onClick={login} disabled={loading}>
          {loading ? <div className="spinner" /> : "Sign in →"}
        </button>
        <div style={{marginTop:12,textAlign:"center"}}>
          <div style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>Are you a student?</div>
          <button className="btn btn-secondary btn-lg" style={{width:"100%",justifyContent:"center"}} onClick={()=>{ updateState({user:{name:"Student"}}); go("studentExam") }}>
            📋 Student Exam Portal →
          </button>
        </div>
      </div>
    </div>
  )
}

function DashboardPage({ state, go }) {
  const d = new Date()
  const hour = d.getHours()
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening"
  const [stats, setStats] = useState({exams:0, students:0, batches:0})
  const [feesSummary, setFeesSummary] = useState({collected:0, pending:0, fully_paid:0, total:0})
  const [usage, setUsage] = useState(null)

  useEffect(()=>{
    Promise.all([
      p2get("/exam/list"), p2get("/student/list"), p2get("/batch/list"),
      p2get("/fees/monthly/summary"),
      fetch("/api/usage", {headers: authHeaders()}).then(r=>r.json()),
    ])
    .then(([e, s, b, f, u])=>{
      setStats({
        exams: (e.exams||[]).filter(x=>x.status==="active").length,
        students: (s.students||[]).length,
        batches: (b.batches||[]).length,
      })
      setFeesSummary(f)
      setUsage(u)
    }).catch(()=>{})
  },[])

  return (
    <div className="shell">
      <Sidebar page="dashboard" go={go} user={state.user} />
      <div className="main">
        <div className="top-bar">
          <div style={{ flex: 1 }}>
            <div className="top-bar-title">Dashboard</div>
            <div className="top-bar-sub">Overview of your question management system</div>
          </div>
        </div>
        <div className="page">
          <div className="greeting">{greeting}, {state.user?.name?.split(" ")[0]} 👋</div>
          <div className="greeting-sub">Here's what's happening today</div>
          <div className="stats-row">
            {[
              { value: stats.students, label: "Students",     color: "#1976D2",         icon: "👥" },
              { value: stats.batches,  label: "Batches",      color: "var(--accent2)",  icon: "📦" },
              { value: stats.exams,    label: "Active Exams", color: "var(--success)",  icon: "📝" },
              { value: usage ? `${usage.used}/${usage.limit}` : "…", label: "Questions Used", color: usage && usage.percent >= 90 ? "var(--danger)" : "var(--warning)", icon: "📋" },
            ].map((s, i) => (
              <div className="stat-card" key={i}>
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-title">⚡ Quick Actions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { icon:"📄", title:"Generate Questions", desc:"Upload image → AI generates → PDF + Online Exam", page:"upload" },
                  { icon:"📋", title:"OMR Exams",          desc:"Manage exams, assign to batches, edit MCQ options", page:"omrExams" },
                  { icon:"👥", title:"Students",           desc:"Add students, set passwords, manage profiles", page:"students" },
                  { icon:"📊", title:"Results",            desc:"View scores, rank lists, question-wise analysis", page:"omrResults" },
                ].map((a,i)=>(
                  <div key={i} className="choice-card" onClick={()=>go(a.page)}
                    style={{textAlign:"left",display:"flex",alignItems:"center",gap:12,padding:"12px 16px"}}>
                    <div style={{fontSize:22}}>{a.icon}</div>
                    <div>
                      <div className="choice-title" style={{textAlign:"left",marginBottom:2,fontSize:13}}>{a.title}</div>
                      <div className="choice-desc" style={{textAlign:"left",fontSize:11}}>{a.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-title">💰 Fees Overview
                <span style={{fontSize:11,fontWeight:400,color:"var(--muted)",marginLeft:8}}>
                  {feesSummary.month ? new Date(feesSummary.month+"-01").toLocaleString('default',{month:'long',year:'numeric'}) : "Current Month"}
                </span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                {[
                  {v:"₹"+(feesSummary.collected||0), l:"Collected",      c:"var(--success)"},
                  {v:"₹"+(feesSummary.pending||0),   l:"Pending This Month", c:feesSummary.pending>0?"var(--danger)":"var(--success)"},
                  {v:feesSummary.fully_paid||0,       l:"Fully Paid",     c:"var(--success)"},
                  {v:feesSummary.students_with_fees||0, l:"Students Tracked", c:"var(--accent2)"},
                ].map((s,i)=>(
                  <div key={i} style={{background:"var(--bg3)",borderRadius:10,padding:"12px",textAlign:"center"}}>
                    <div style={{fontSize:20,fontWeight:700,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:11,color:"var(--muted)"}}>{s.l}</div>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" style={{width:"100%"}} onClick={()=>go("fees")}>
                💰 Manage Fees →
              </button>
            </div>
            {/* Plan & Quota Card */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-title">🎯 Plan & Usage
                <span style={{fontSize:11,fontWeight:400,color:"var(--muted)",marginLeft:8}}>
                  {usage?.month || ""}
                </span>
              </div>
              {usage ? (
                <>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{
                      background: usage.plan==="school"?"#FFF3E0":usage.plan==="premium"?"#F3E5F5":usage.plan==="basic"?"#E8F5E9":"#E3F2FD",
                      color: usage.plan==="school"?"#E65100":usage.plan==="premium"?"#6A1B9A":usage.plan==="basic"?"#2E7D32":"#1565C0",
                      borderRadius:20, padding:"4px 14px", fontSize:13, fontWeight:700, textTransform:"capitalize"
                    }}>{usage.plan} Plan</span>
                    <span style={{fontSize:13,fontWeight:700,color:usage.percent>=90?"var(--danger)":"var(--text)"}}>
                      {usage.used} / {usage.limit} Q
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{height:10,background:"var(--bg3)",borderRadius:5,marginBottom:8,overflow:"hidden",border:"1px solid var(--border)"}}>
                    <div style={{
                      height:"100%",
                      width: Math.min(usage.percent,100)+"%",
                      background: usage.percent>=90?"var(--danger)":usage.percent>=70?"var(--warning)":"var(--accent)",
                      borderRadius:5,
                      transition:"width 0.5s"
                    }}/>
                  </div>
                  <div style={{fontSize:12,color:"var(--muted)",marginBottom:16}}>
                    {usage.remaining > 0
                      ? <span><b style={{color:"var(--accent2)"}}>{usage.remaining}</b> questions remaining this month</span>
                      : <span style={{color:"var(--danger)"}}>⚠ Monthly limit reached</span>
                    }
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
                    <div style={{background:"var(--bg3)",borderRadius:10,padding:"10px",textAlign:"center"}}>
                      <div style={{fontSize:18,fontWeight:700,color:"var(--accent2)"}}>{usage.files_per_session}</div>
                      <div style={{fontSize:11,color:"var(--muted)"}}>Files/Session</div>
                    </div>
                    <div style={{background:"var(--bg3)",borderRadius:10,padding:"10px",textAlign:"center"}}>
                      <div style={{fontSize:18,fontWeight:700,color:"var(--accent2)"}}>{usage.limit}</div>
                      <div style={{fontSize:11,color:"var(--muted)"}}>Monthly Limit</div>
                    </div>
                  </div>
                  <button className="btn btn-primary" style={{width:"100%"}} onClick={()=>go("upload")}>
                    ✦ Generate Questions →
                  </button>
                </>
              ) : (
                <div style={{textAlign:"center",padding:20,color:"var(--muted)"}}>Loading plan info…</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FilePreviewRow({ file, index, onRemove }) {
  const [preview, setPreview] = useState(null)
  const [expanded, setExpanded] = useState(false)

  useState(() => {
    if (file.type.includes("image")) {
      const url = URL.createObjectURL(file)
      setPreview(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [file])

  return (
    <div style={{ background: "var(--bg3)", border: "1.5px solid var(--border)", borderRadius: 12, marginBottom: 8, overflow: "hidden" }}>
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px" }}>
        {/* Thumbnail */}
        {preview ? (
          <img
            src={preview}
            alt={"Page " + (index + 1)}
            onClick={() => setExpanded(!expanded)}
            style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 8, border: "1.5px solid var(--border2)", cursor: "pointer", flexShrink: 0, transition: "transform 0.15s" }}
            onMouseOver={e => e.target.style.transform = "scale(1.05)"}
            onMouseOut={e => e.target.style.transform = "scale(1)"}
          />
        ) : (
          <div style={{ width: 52, height: 52, background: "var(--light)", borderRadius: 8, border: "1.5px solid var(--border2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
            📕
          </div>
        )}

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{(file.size / 1024).toFixed(0)} KB · {file.type.includes("pdf") ? "PDF Document" : "Image"}</div>
        </div>

        {/* Page badge */}
        <div style={{ fontSize: 11, background: "var(--light)", color: "var(--accent2)", padding: "3px 10px", borderRadius: 6, fontWeight: 700, flexShrink: 0 }}>
          Page {index + 1}
        </div>

        {/* Preview toggle (images only) */}
        {preview && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ background: "none", border: "1px solid var(--border2)", color: "var(--muted)", cursor: "pointer", fontSize: 11, padding: "3px 8px", borderRadius: 6, flexShrink: 0 }}
          >
            {expanded ? "▲ Hide" : "▼ Preview"}
          </button>
        )}

        {/* Remove */}
        <button
          onClick={onRemove}
          style={{ background: "none", border: "1px solid var(--danger)", color: "var(--danger)", cursor: "pointer", fontSize: 12, padding: "3px 8px", borderRadius: 6, flexShrink: 0 }}
        >✕</button>
      </div>

      {/* Expanded preview with zoom */}
      {expanded && preview && (
        <div style={{ padding: "0 14px 14px" }}>
          <div style={{ position: "relative" }}>
            <img
              src={preview}
              alt={"Page " + (index + 1) + " preview"}
              onClick={() => window.open(preview, "_blank")}
              title="Click to open full size"
              style={{ width: "100%", maxHeight: 500, objectFit: "contain", borderRadius: 10, border: "1.5px solid var(--border)", background: "#fff", cursor: "zoom-in" }}
            />
            <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,0.6)", color: "#fff", padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}
              onClick={() => window.open(preview, "_blank")}>
              🔍 Open full size
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UploadPage({ state, updateState, go }) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState("")
  const fileRef = useRef()
  const files = state.uploadedFiles || []

  const maxFiles = state.user?.files_per_session || (
    state.user?.plan === "school" ? 999 :
    state.user?.plan === "premium" ? 10 :
    state.user?.plan === "basic" ? 5 : 3
  )

  const addFiles = (fileList) => {
    const arr = Array.from(fileList)
    const valid = arr.filter(f => f.type.includes("image") || f.type === "application/pdf")
    const bad = arr.length - valid.length
    if (bad > 0) setError(bad + " file(s) skipped — only images and PDFs allowed")
    else setError("")
    if (valid.length > 0) {
      const updated = [...files, ...valid]
      if (updated.length > maxFiles) {
        setError(`Your ${state.user?.plan || "Starter"} plan allows max ${maxFiles} files per session. Remove some files first.`)
        return
      }
      updateState({ uploadedFiles: updated })
    }
  }

  const removeFile = (idx) => {
    updateState({ uploadedFiles: files.filter((_, i) => i !== idx) })
  }

  const totalSize = files.reduce((a, f) => a + f.size, 0)

  const [uploadUsage, setUploadUsage] = useState(null)
  useEffect(()=>{
    fetch("/api/usage", {headers: authHeaders()}).then(r=>r.json()).then(setUploadUsage).catch(()=>{})
  },[])

  return (
    <div className="shell">
      <Sidebar page="upload" go={go} user={state.user} />
      <div className="main">
        <div className="top-bar">
          <div style={{ flex: 1 }}>
            <div className="top-bar-title">Generate Questions</div>
            <div className="top-bar-sub">Step 1 of 5 — Upload textbook pages</div>
          </div>
          {files.length > 0 && (
            <span className="badge badge-green">{files.length} file{files.length > 1 ? "s" : ""} selected</span>
          )}
        </div>
        <div className="page">
          <Steps steps={["Upload", "Type", "Configure", "Edit", "Export"]} current={0} />
          {error && <div className="alert alert-error">⚠ {error}</div>}

          {/* Quota banner */}
          {uploadUsage && (
            <div style={{
              display:"flex", alignItems:"center", gap:14, padding:"10px 16px",
              background: uploadUsage.remaining === 0 ? "#FFEBEE" : uploadUsage.percent >= 80 ? "#FFF8E1" : "var(--light)",
              border: `1.5px solid ${uploadUsage.remaining === 0 ? "#FFCDD2" : uploadUsage.percent >= 80 ? "#FFE082" : "var(--border2)"}`,
              borderRadius:10, marginBottom:14, fontSize:13
            }}>
              <div style={{flex:1}}>
                <b style={{color: uploadUsage.remaining===0?"var(--danger)":uploadUsage.percent>=80?"var(--warning)":"var(--accent2)"}}>
                  {uploadUsage.remaining === 0 ? "⚠ Monthly limit reached" : `📋 ${uploadUsage.remaining} questions remaining`}
                </b>
                <span style={{color:"var(--muted)",marginLeft:8}}>
                  ({uploadUsage.used}/{uploadUsage.limit} used · {uploadUsage.plan} plan · max {maxFiles} files/session)
                </span>
              </div>
              <div style={{width:100,height:6,background:"var(--border)",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:Math.min(uploadUsage.percent,100)+"%",
                  background:uploadUsage.remaining===0?"var(--danger)":uploadUsage.percent>=80?"var(--warning)":"var(--accent)",
                  borderRadius:3}}/>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-title">
              📁 Upload textbook pages
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)", fontWeight: 400, background: "var(--light)", padding: "3px 8px", borderRadius: 6 }}>
                Max {maxFiles} files · Ctrl+Click for multiple
              </span>
            </div>

            <div
              className={"upload-zone" + (dragging ? " dragging" : "") + (files.length > 0 ? " has-file" : "")}
              onClick={() => fileRef.current && fileRef.current.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                style={{ display: "none" }}
                onChange={e => { addFiles(e.target.files); e.target.value = "" }}
              />
              <div className="upload-icon">{files.length > 0 ? "📚" : "⬆️"}</div>
              <div className="upload-text">
                {files.length > 0 ? "Click to add more files" : "Drop files here or click to browse"}
              </div>
              <div className="upload-sub">JPG, PNG, PDF · Select multiple · All pages sent to AI together</div>
            </div>

            {files.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {files.length} file{files.length > 1 ? "s" : ""} · {(totalSize / 1024).toFixed(0)} KB total
                  </div>
                  <button className="btn btn-danger" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => updateState({ uploadedFiles: [] })}>
                    Clear all
                  </button>
                </div>
                {files.map((f, i) => (
                  <FilePreviewRow key={i} file={f} index={i} onRemove={() => removeFile(i)} />
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">💡 Tips for best OCR results</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { icon: "📚", title: "Upload all pages", desc: "Multiple pages → AI reads all → better questions" },
                { icon: "☀️", title: "Good lighting", desc: "No shadows or glare on the pages" },
                { icon: "🔍", title: "High resolution", desc: "At least 1200×1600px recommended" },
                { icon: "🌐", title: "Bengali/Hindi", desc: "Bhashini supports all Indian scripts" },
              ].map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px", background: "var(--bg3)", borderRadius: 10, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 20 }}>{t.icon}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="btn-row">
            <button className="btn btn-primary btn-lg" onClick={() => {
              if (files.length === 0) { setError("Please upload at least one file"); return }
              go("questionType")
            }}>
              Continue → Select type
            </button>
            {files.length > 0 && (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {files.length} page{files.length > 1 ? "s" : ""} will be sent to AI
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
function QuestionTypePage({ state, updateState, go }) {
  const [type, setType] = useState(state.questionType)
  const [sub, setSub] = useState(state.omrSubType)
  return (
    <div className="shell">
      <Sidebar page="upload" go={go} user={state.user} />
      <div className="main">
        <div className="top-bar"><div style={{ flex: 1 }}><div className="top-bar-title">Question Type</div><div className="top-bar-sub">Step 2 of 5</div></div></div>
        <div className="page">
          <Steps steps={["Upload", "Type", "Configure", "Edit", "Export"]} current={1} />
          <div className="card">
            <div className="card-title">📋 Choose question format</div>
            <div className="choice-grid">
              <div className={`choice-card${type === "omr" ? " selected" : ""}`} onClick={() => setType("omr")}>
                <div className="choice-icon">⬭</div>
                <div className="choice-title">Question OMR</div>
                <div className="choice-desc">MCQ with bubble sheet. Online exam + offline PDF.</div>
              </div>
              <div className={`choice-card${type === "details" ? " selected" : ""}`} onClick={() => { setType("details"); setSub(null) }}>
                <div className="choice-icon">📝</div>
                <div className="choice-title">Question Details</div>
                <div className="choice-desc">Mixed pattern — 1, 3, 5 mark subjective questions.</div>
              </div>
            </div>
          </div>
          {type === "omr" && (
            <div className="card">
              <div className="card-title">🎯 OMR sub-type</div>
              <div className="choice-grid">
                <div className={`choice-card${sub === "create_exam" ? " selected" : ""}`} onClick={() => setSub("create_exam")}>
                  <div className="choice-icon">🏫</div>
                  <div className="choice-title">Create exam room</div>
                  <div className="choice-desc">Full online exam with student login, timer, auto-evaluation, batch linking.</div>
                </div>
                <div className={`choice-card${sub === "only_omr" ? " selected" : ""}`} onClick={() => setSub("only_omr")}>
                  <div className="choice-icon">📄</div>
                  <div className="choice-title">Only OMR</div>
                  <div className="choice-desc">Generate PDF only. Saved against class. No online exam.</div>
                </div>
              </div>
            </div>
          )}
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => go("upload")}>← Back</button>
            <button className="btn btn-primary btn-lg" onClick={() => { if (!type || (type==="omr" && !sub)) return; updateState({ questionType: type, omrSubType: sub }); go("examConfig") }} disabled={!type || (type==="omr" && !sub)}>
              Continue → Configure
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExamConfigPage({ state, updateState, go }) {
  const isOMR = state.questionType === "omr"
  const [tm, setTm] = useState("")
  const [mpq, setMpq] = useState("")
  const [time, setTime] = useState("60")
  const [neg, setNeg] = useState(false)
  const [negVal, setNegVal] = useState("0.25")
  const [lang, setLang] = useState("bengali")
  const [cls, setCls] = useState("")
  const [school, setSchool] = useState("")
  const [subj, setSubj] = useState("গণিত")
  const [patterns, setPatterns] = useState([{ marks: "1", total: "12", attempt: "10", negative: false }])
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const nq = tm && mpq ? parseInt(tm) / parseInt(mpq) : 0
  const validNq = Number.isInteger(nq) && nq > 0
  const valErr = tm && mpq && !validNq ? `${tm} ÷ ${mpq} = ${(parseInt(tm)/parseInt(mpq)).toFixed(2)} — must be a whole number` : ""

  const generate = async () => {
    const e = {}
    if (!school) e.school = "Required"
    if (!cls) e.cls = "Required"
    if (isOMR && !tm) e.tm = "Required"
    if (isOMR && !mpq) e.mpq = "Required"
    if (isOMR && valErr) e.val = valErr
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true); setErrors({})
    const config = { type: state.questionType, subType: state.omrSubType, totalMarks: parseInt(tm), marksPerQ: parseInt(mpq), numQuestions: isOMR ? nq : null, totalTime: parseInt(time), negativeMarking: neg, negativeValue: neg ? parseFloat(negVal) : 0, language: lang, className: cls, schoolName: school, subject: subj, patterns: !isOMR ? patterns : null }
    const fd = new FormData()
    if (state.uploadedFiles && state.uploadedFiles.length > 0) { state.uploadedFiles.forEach(f => fd.append("images", f)) }
    const totalQs = isOMR ? nq : patterns.reduce((s,p)=>s+parseInt(p.total||0),0)
    fd.append("marks_1", isOMR ? nq : (patterns[0]?.attempt || 5))
    fd.append("marks_5", isOMR ? 0 : (patterns[patterns.length-1]?.attempt || 2))
    if (!isOMR) fd.append("patterns_json", JSON.stringify(patterns.map(p=>({marks:parseInt(p.marks),total:parseInt(p.total),attempt:parseInt(p.attempt)}))))
    fd.append("duration_minutes", parseInt(time)||60)
    fd.append("language", lang); fd.append("school_name", school); fd.append("class_name", cls); fd.append("subject", subj)
    try {
      let r = state.uploadedFiles && state.uploadedFiles.length > 0 ? await apiGenerate(fd) : await apiTest(fd)
      // Fallback to test endpoint if OCR fails (Bhashini approval pending)
      if (!r.success && !r.questions && r.detail && r.detail.includes("OCR")) {
        const fd2 = new FormData()
        fd2.append("marks_1", isOMR ? nq : (patterns[0]?.attempt || 5))
        fd2.append("marks_5", isOMR ? 0 : (patterns[patterns.length-1]?.attempt || 2))
        if (!isOMR) fd2.append("patterns_json", JSON.stringify(patterns.map(p=>({marks:parseInt(p.marks),total:parseInt(p.total),attempt:parseInt(p.attempt)}))))
        fd2.append("language", lang); fd2.append("school_name", school); fd2.append("class_name", cls); fd2.append("subject", subj)
        r = await apiTest(fd2)
        if (r.success || r.questions) setErrors({ api: "⚠ OCR pending approval — showing AI demo questions instead. Real questions will generate from your images once Bhashini approves." })
      }
      if (r.success || r.questions) {
        // Convert FRAC notation to readable format for editor display
        const convertQ = (text) => {
          if (!text) return text
          text = text.replace(/FRAC\(([^,]+),([^)]+)\)/g, (_, n, d) => {
            n = n.replace(/\^2/g,"²").replace(/\^3/g,"³").replace(/\^4/g,"⁴")
            d = d.replace(/\^2/g,"²").replace(/\^3/g,"³").replace(/\^4/g,"⁴")
            return n + "/" + d
          })
          return text.replace(/\^2/g,"²").replace(/\^3/g,"³").replace(/\^4/g,"⁴")
        }
        const qs = r.questions
        if (qs) {
          if (qs.marks_1_questions) qs.marks_1_questions = qs.marks_1_questions.map(q => ({...q, question: convertQ(q.question)}))
          if (qs.marks_5_questions) qs.marks_5_questions = qs.marks_5_questions.map(q => ({...q, question: convertQ(q.question)}))
        }
        updateState({ examConfig: config, questions: qs, generatedPDFs: r.pdf_url ? { question: r.pdf_url } : null })
        go("questionEditor")
      }
      else {
        // Handle quota exceeded (429) response
        const errMsg = r.detail?.message || r.detail || "Generation failed"
        const isQuota = r.detail?.error === "quota_exceeded" || (typeof r.detail === "string" && r.detail.includes("quota"))
        setErrors({ api: isQuota ? "⚠ " + errMsg + " Upgrade your plan at vorpet.com" : errMsg })
      }
    } catch { setErrors({ api: "Cannot reach API. Is Docker running?" }) }
    setLoading(false)
  }

  return (
    <div className="shell">
      <Sidebar page="upload" go={go} user={state.user} />
      <div className="main">
        <div className="top-bar"><div style={{ flex: 1 }}><div className="top-bar-title">Configure</div><div className="top-bar-sub">Step 3 of 5 — Set exam parameters</div></div></div>
        <div className="page">
          <Steps steps={["Upload", "Type", "Configure", "Edit", "Export"]} current={2} />
          {errors.api && <div className="alert alert-error">⚠ {errors.api}</div>}
          <div className="card">
            <div className="card-title">🏫 School information</div>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>School name *</label>
                <input value={school} onChange={e => setSchool(e.target.value)} placeholder="বাংলা মাধ্যমিক বিদ্যালয়" />
                {errors.school && <div className="field-error">{errors.school}</div>}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Class *</label>
                <input value={cls} onChange={e => setCls(e.target.value)} placeholder="Class VIII / অষ্টম শ্রেণি" />
                {errors.cls && <div className="field-error">{errors.cls}</div>}
              </div>
            </div>
            <div style={{ marginTop: 12 }}><label>Subject</label><input value={subj} onChange={e => setSubj(e.target.value)} placeholder="গণিত" /></div>
            {!isOMR && (
              <div style={{ marginTop: 12, maxWidth: 200 }}>
                <label>Time (minutes)</label>
                <input type="number" value={time} onChange={e => setTime(e.target.value)} placeholder="60" min="5" max="300" />
              </div>
            )}
          </div>
          {isOMR && (
            <div className="card">
              <div className="card-title">⬭ OMR configuration</div>
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Total marks *</label>
                  <input type="number" value={tm} onChange={e => setTm(e.target.value)} placeholder="e.g. 25" min="1" />
                  {errors.tm && <div className="field-error">{errors.tm}</div>}
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Marks per question *</label>
                  <input type="number" value={mpq} onChange={e => setMpq(e.target.value)} placeholder="e.g. 5" min="1" />
                  {errors.mpq && <div className="field-error">{errors.mpq}</div>}
                </div>
              </div>
              {tm && mpq && (
                <div className={`alert ${valErr ? "alert-error" : "alert-success"}`} style={{ marginTop: 8 }}>
                  {valErr ? `⚠ ${valErr}` : `✓ ${tm} ÷ ${mpq} = ${nq} questions will be generated`}
                </div>
              )}
              <div className="form-row" style={{ marginTop: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Time (minutes)</label>
                  <input type="number" value={time} onChange={e => setTime(e.target.value)} placeholder="60" min="5" max="180" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Negative marking</label>
                  <select value={neg ? "yes" : "no"} onChange={e => setNeg(e.target.value === "yes")}>
                    <option value="no">No negative marking</option>
                    <option value="yes">Yes — deduct marks</option>
                  </select>
                </div>
              </div>
              {neg && (
                <div style={{ marginTop: 12 }}>
                  <label>Marks deducted per wrong</label>
                  <select value={negVal} onChange={e => setNegVal(e.target.value)}>
                    <option value="0.25">-0.25</option><option value="0.33">-0.33</option><option value="0.5">-0.5</option><option value="1">-1</option>
                  </select>
                </div>
              )}
            </div>
          )}
          {!isOMR && (
            <div className="card">
              <div className="card-title">📝 Question pattern</div>
              <div style={{ display: "grid", gridTemplateColumns: "70px 90px 110px 130px 36px", gap: 8, marginBottom: 8 }}>
                {["Marks","Total Qs","Attempt","Negative",""].map((h,i)=><div key={i} style={{fontSize:10,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.05em",fontWeight:600}}>{h}</div>)}
              </div>
              {patterns.map((p,i)=>(
                <div key={i} style={{ display:"grid",gridTemplateColumns:"70px 90px 110px 130px 36px",gap:8,marginBottom:8,alignItems:"center" }}>
                  <input type="number" value={p.marks} onChange={e=>setPatterns(patterns.map((x,j)=>j===i?{...x,marks:e.target.value}:x))} min="1"/>
                  <input type="number" value={p.total} onChange={e=>setPatterns(patterns.map((x,j)=>j===i?{...x,total:e.target.value}:x))} min="1"/>
                  <input type="number" value={p.attempt} onChange={e=>setPatterns(patterns.map((x,j)=>j===i?{...x,attempt:e.target.value}:x))} min="1"/>
                  <select value={p.negative?"yes":"no"} onChange={e=>setPatterns(patterns.map((x,j)=>j===i?{...x,negative:e.target.value==="yes"}:x))}>
                    <option value="no">No negative</option><option value="yes">-0.25</option>
                  </select>
                  {patterns.length>1&&<button className="btn btn-danger" style={{padding:"6px 8px",fontSize:12}} onClick={()=>setPatterns(patterns.filter((_,j)=>j!==i))}>✕</button>}
                </div>
              ))}
              <div className="add-pattern" onClick={()=>setPatterns([...patterns,{marks:"3",total:"5",attempt:"3",negative:false}])}>+ Add row</div>
              <div className="field-hint" style={{marginTop:8}}>Example: Marks=1, Total=12, Attempt=10 → student answers any 10 of 12 one-mark questions.</div>
            </div>
          )}
          <div className="card">
            <div className="card-title">🌐 Output language</div>
            <div className="choice-grid">
              {[{v:"bengali",l:"Bengali",s:"বাংলা"},{v:"hindi",l:"Hindi",s:"हिन्दी"},{v:"english",l:"English",s:"English"}].map(x=>(
                <div key={x.v} className={`choice-card${lang===x.v?" selected":""}`} onClick={()=>setLang(x.v)}>
                  <div className="choice-icon" style={{fontFamily:"serif",fontSize:20}}>{x.s}</div>
                  <div className="choice-title">{x.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => go("questionType")}>← Back</button>
            <button className="btn btn-primary btn-lg" onClick={generate} disabled={loading || (isOMR && !!valErr)}>
              {loading ? <><div className="spinner"/> Generating…</> : "Generate questions →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


function displayMath(text) {
  if (!text) return ""

  // Fix: move superscript outside parenthesis (m-2²) → (m-2)²
  text = text.replace(/\(([^)]+)\^2\)/g, '($1)^2')
  text = text.replace(/\(([^)]+)\^3\)/g, '($1)^3')
  text = text.replace(/\(([^)]+)²\)/g, '($1)²')
  text = text.replace(/\(([^)]+)³\)/g, '($1)³')

  const sup = t => t
    .replace(/\^2/g,"²").replace(/\^3/g,"³").replace(/\^4/g,"⁴")

  // Convert FRAC(numerator,denominator) → HTML fraction bar
  text = text.replace(/FRAC\(([^,]+),([^)]+)\)/g, (_, n, d) => {
    return `<span class="mfrac"><span class="mnum">${sup(n.trim())}</span><span class="mden">${sup(d.trim())}</span></span>`
  })

  // Convert 1/(expr) and digit/(expr) — parenthesized denominator
  text = text.replace(/([a-zA-Z0-9]+)\s*\/\s*(\([^)]+\)(?:[²³⁴]|\^[234])?)/g, (_, n, d) => {
    return `<span class="mfrac"><span class="mnum">${sup(n)}</span><span class="mden">${sup(d)}</span></span>`
  })

  // Convert digit/word-hyphen e.g. 1/m-2
  text = text.replace(/(\d+)\s*\/\s*([a-zA-Z][a-zA-Z0-9]*-[0-9]+(?:\^[234]|[²³⁴])?)/g, (_, n, d) => {
    return `<span class="mfrac"><span class="mnum">${sup(n)}</span><span class="mden">${sup(d)}</span></span>`
  })

  // Convert token/token patterns — x/y, x²/y², x^2/y^2, 1/x etc.
  const tok = '[a-zA-Z0-9][a-zA-Z0-9\\^²³⁴]*'
  text = text.replace(new RegExp(`(${tok})\\s*/\\s*(${tok})`, 'g'), (_, n, d) => {
    return `<span class="mfrac"><span class="mnum">${sup(n)}</span><span class="mden">${sup(d)}</span></span>`
  })

  // Any remaining expr/(expr)
  text = text.replace(/([a-zA-Z0-9²³⁴]+)\s*\/\s*(\([^)]+\)(?:\^[234]|[²³⁴])?)/g, (_, n, d) => {
    return `<span class="mfrac"><span class="mnum">${sup(n)}</span><span class="mden">${sup(d)}</span></span>`
  })

  text = sup(text)
  return text
}

function QuestionEditorPage({ state, updateState, go }) {
  const qs = state.questions || {}

  // Collect all section keys dynamically
  const sectionKeys = Object.keys(qs).filter(k => k.endsWith("_questions") && qs[k]?.length > 0)
    .sort((a, b) => parseInt(a.split("_")[1]) - parseInt(b.split("_")[1]))

  const totalQs    = sectionKeys.reduce((s,k) => s + (qs[k]||[]).length, 0)
  const totalMarks = sectionKeys.reduce((s,k) => {
    const m = parseInt(k.split("_")[1])
    return s + (qs[k]||[]).reduce((ss,q) => ss + (q.attempt || q.total || (qs[k]||[]).length) * m, 0) / (qs[k]||[]).length
  }, 0)

  const updateQ = (key, i, val) => {
    updateState({ questions: { ...qs, [key]: (qs[key]||[]).map((q,j) => j===i ? {...q, question:val} : q) } })
  }

  const sectionColors = ["var(--accent)","var(--warning)","var(--accent2)","#9C27B0","#F44336"]
  const sectionBadges = ["badge-blue","badge-amber","badge-green","badge-purple","badge-red"]

  return (
    <div className="shell">
      <Sidebar page="upload" go={go} user={state.user} />
      <div className="main">
        <div className="top-bar"><div style={{flex:1}}><div className="top-bar-title">Edit Questions</div><div className="top-bar-sub">Step 4 of 5 — Review and edit before export</div></div><span className="badge badge-green">✓ Generated</span></div>
        <div className="page">
          <Steps steps={["Upload","Type","Configure","Edit","Export"]} current={3} />
          <div className="stats-row" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
            {[
              {v:totalQs, l:"Total questions", c:"var(--accent2)", i:"📋"},
              {v:sectionKeys.length, l:"Sections", c:"var(--warning)", i:"📂"},
              {v:state.examConfig?.language||"Bengali", l:"Language", c:"#1976D2", i:"🌐"}
            ].map((s,i)=>(
              <div className="stat-card" key={i}><div className="stat-icon">{s.i}</div><div className="stat-value" style={{color:s.c}}>{s.v}</div><div className="stat-label">{s.l}</div></div>
            ))}
          </div>
          <div className="alert alert-info">💡 Each question shows a <strong>formatted preview</strong> (with proper fractions/exponents) above the raw edit box. Edit the raw text below to make changes.</div>

          {sectionKeys.map((key, si) => {
            const questions = qs[key] || []
            const marks = parseInt(key.split("_")[1])
            const first = questions[0] || {}
            const total = first.total || questions.length
            const attempt = first.attempt || total
            const label = first.section_label || String.fromCharCode(65+si)
            const attemptInstruction = first.attempt_instruction || ""
            const color = sectionColors[si % sectionColors.length]
            const needsAttempt = attempt < total

            return (
              <div className="card" key={key}>
                <div className="card-title" style={{justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                  <span>📋 {state.examConfig?.language === "english" ? "Section" : "বিভাগ"}-{label}</span>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    <span className={`badge ${sectionBadges[si%sectionBadges.length]}`}>{attempt} × {marks} {state.examConfig?.language === "english" ? "marks" : "নম্বর"}</span>
                    {needsAttempt && (
                      <span style={{background:"#F3E5F5",color:"#6A1B9A",border:"1px solid #CE93D8",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600}}>
                        {total}টি থেকে যেকোনো {attempt}টি
                      </span>
                    )}
                  </div>
                </div>
                {attemptInstruction && (
                  <div style={{background:"#F1F8E9",border:"1px solid #C8E6C9",borderRadius:8,padding:"8px 14px",marginBottom:12,fontSize:13,color:"#2E7D32",fontFamily:"var(--font)"}}>
                    ✏️ {attemptInstruction}
                  </div>
                )}
                {questions.map((q,i) => (
                  <div className="q-item" key={i}>
                    <div className="q-header">
                      <div className="q-num" style={{background:color}}>{i+1}</div>
                      <div style={{fontSize:11,color:"var(--muted)",fontWeight:500}}>{marks}-mark question</div>
                      <div className="q-marks">[{marks} {state.examConfig?.language === "english" ? "mark" : "নম্বর"}]</div>
                    </div>
                    <div style={{fontSize:13,color:"var(--text)",padding:"8px 10px",background:"var(--bg2)",borderRadius:8,marginBottom:6,border:"1px solid var(--border)",lineHeight:2,fontFamily:"var(--font)"}} dangerouslySetInnerHTML={{__html:displayMath(q.question)}}/>
                    <textarea value={q.question} onChange={e=>updateQ(key,i,e.target.value)} style={{fontFamily:"var(--font)",minHeight:marks>=5?100:70,fontSize:12,color:"var(--muted)"}} placeholder="Edit raw text here..."/>
                  </div>
                ))}
              </div>
            )
          })}

          {sectionKeys.length === 0 && (
            <div className="alert alert-error">No questions generated. Please go back and try again.</div>
          )}

          <div className="btn-row">
            <button className="btn btn-secondary" onClick={()=>go("examConfig")}>← Regenerate</button>
            <button className="btn btn-primary btn-lg" onClick={()=>go("pdfExport")}>
              {state.omrSubType==="exam_room" ? "Export PDF & Setup Exam →" : "Export to PDF →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2+3 — API HELPERS (JWT-aware)
// ═══════════════════════════════════════════════════════════════
const API2 = ""

// Token storage helpers
const getToken = () => localStorage.getItem("vorpet_token")
const setToken = (t) => localStorage.setItem("vorpet_token", t)
const clearToken = () => localStorage.removeItem("vorpet_token")

const authHeaders = () => {
  const t = getToken()
  return t ? { "Authorization": `Bearer ${t}`, "Content-Type": "application/json" }
           : { "Content-Type": "application/json" }
}

const p2get  = (path) => fetch(`${API2}/api/v2${path}`, { headers: authHeaders() }).then(r=>r.json())
const p2post = (path,body) => fetch(`${API2}/api/v2${path}`, { method:"POST", headers: authHeaders(), body:JSON.stringify(body) }).then(r=>r.json())
const p2put  = (path,body) => fetch(`${API2}/api/v2${path}`, { method:"PUT",  headers: authHeaders(), body:JSON.stringify(body) }).then(r=>r.json())
const p2del  = (path)      => fetch(`${API2}/api/v2${path}`, { method:"DELETE", headers: authHeaders() }).then(r=>r.json())

const saGet  = (path) => fetch(`${API2}${path}`, { headers: authHeaders() }).then(r=>r.json())
const saPost = (path,body) => fetch(`${API2}${path}`, { method:"POST", headers: authHeaders(), body:JSON.stringify(body) }).then(r=>r.json())
const saPut  = (path,body) => fetch(`${API2}${path}`, { method:"PUT",  headers: authHeaders(), body:JSON.stringify(body) }).then(r=>r.json())
const saDel  = (path)      => fetch(`${API2}${path}`, { method:"DELETE", headers: authHeaders() }).then(r=>r.json())

function PDFExportPage({ state, updateState, go }) {
  const [loading, setLoading]           = useState(false)
  const [loadingAnswer, setLoadingAnswer] = useState(false)
  const [saving, setSaving]             = useState(false)
  const [pdfUrl, setPdfUrl]             = useState(state.generatedPDFs?.question||null)
  const [answerPdfUrl, setAnswerPdfUrl] = useState(null)
  const [published, setPublished]       = useState(false)
  const [batches, setBatches]           = useState([])
  const [selBatch, setSelBatch]         = useState("")
  const [savedExamId, setSavedExamId]   = useState(null)
  const [examSeq, setExamSeq]           = useState("001")
  const [msg, setMsg]                   = useState("")
  const isOMR = state.questionType === "omr" && state.omrSubType === "exam_room"

  const now = new Date()
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  const examName = `${String(now.getDate()).padStart(2,"0")}_${months[now.getMonth()]}_${String(now.getFullYear()).slice(2)}_${examSeq}`

  useEffect(()=>{
    p2get("/batch/list").then(d=>setBatches(d.batches||[]))
  },[])

  const [examDuration, setExamDuration] = useState(state.examConfig?.totalTime||60)

  // Sync duration when examConfig loads
  useEffect(() => {
    if (state.examConfig?.totalTime) {
      setExamDuration(state.examConfig.totalTime)
    }
  }, [state.examConfig?.totalTime])

  const buildDirectFD = (includeAnswers=false) => {
    const fd = new FormData()
    const qs = state.questions || {}
    const allSections = {}
    Object.keys(qs).forEach(key => {
      if (key.endsWith("_questions") && qs[key]?.length > 0) {
        allSections[key] = qs[key]
      }
    })
    fd.append("language", state.examConfig?.language||"bengali")
    fd.append("school_name", state.examConfig?.schoolName||"")
    fd.append("class_name", state.examConfig?.className||"")
    fd.append("subject", state.examConfig?.subject||"গণিত")
    fd.append("duration_minutes", examDuration)
    fd.append("questions_json", JSON.stringify(allSections))
    fd.append("include_answers", includeAnswers ? "1" : "0")
    return fd
  }

  const exportPDF = async () => {
    setLoading(true); setMsg("")
    try {
      const r = await fetch("/api/pdf-direct", {method:"POST", body: buildDirectFD(false)}).then(r=>r.json())
      if(r.pdf_url) { setPdfUrl(r.pdf_url); window.open(r.pdf_url, "_blank") }
      else setMsg("⚠ PDF generation failed")
    } catch { setMsg("⚠ PDF generation error") }
    setLoading(false)
  }

  const exportAnswerPDF = async () => {
    setLoadingAnswer(true); setMsg("")
    try {
      const r = await fetch("/api/pdf-direct", {method:"POST", body: buildDirectFD(true)}).then(r=>r.json())
      if(r.pdf_url) { setAnswerPdfUrl(r.pdf_url); window.open(r.pdf_url, "_blank") }
      else setMsg("⚠ Answer PDF generation failed")
    } catch { setMsg("⚠ Answer PDF generation error") }
    setLoadingAnswer(false)
  }

  // Button 2: Save to batch + Export PDF
  const saveAndExport = async () => {
    if(!selBatch) return setMsg("⚠ Please select a batch before saving")
    setSaving(true); setMsg("")
    try {
      const cfg = state.examConfig || {}
      const qs = state.questions || {}
      const allQ = [...(qs.marks_1_questions||[]), ...(qs.marks_5_questions||[])]

      if(!allQ.length) { setMsg("⚠ No questions to save"); setSaving(false); return }

      // 1. Save exam to DB with placeholder MCQ options
      const questions = allQ.map(q => ({
        question_text: q.question,
        option_a: "Option A",
        option_b: "Option B",
        option_c: "Option C",
        option_d: "Option D",
        correct_answer: "A",
        marks: 1,
        negative_marks: cfg.negativeValue || 0
      }))

      const examRes = await p2post("/exam/create", {
        school_name: cfg.schoolName || "",
        class_name: cfg.className || "",
        subject: `${cfg.subject||"গণিত"} [${examName}]`,
        language: cfg.language || "bengali",
        duration_minutes: cfg.totalTime || 60,
        questions
      })
      if(!examRes.exam_id) { setMsg("⚠ Failed to save: "+(examRes.detail||"Unknown")); setSaving(false); return }

      // 2. Publish to batch
      const pubRes = await p2post(`/exam/${examRes.exam_id}/publish`, {batch_id: parseInt(selBatch)})
      if(!pubRes.success) { setMsg("⚠ Saved but failed to publish: "+(pubRes.detail||"")); setSaving(false); return }

      setSavedExamId(examRes.exam_id)
      setPublished(true)
      // Store in app state so OMR Exams page can pre-select it
      updateState({lastSavedExamId: examRes.exam_id, lastSavedBatchId: parseInt(selBatch)})
      setSaving(false)

      // 3. Generate PDF fast — uses questions directly, no LLM
      setLoading(true)
      try {
        const r = await fetch("/api/pdf-direct", {method:"POST", body: buildDirectFD()}).then(r=>r.json())
        if(r.pdf_url) {
          setPdfUrl(r.pdf_url)
          window.open(r.pdf_url, "_blank")
        }
      } catch {}
      setLoading(false)

    } catch(e) { setMsg("⚠ Error: "+e.message); setSaving(false) }
  }

  const selectedBatch = batches.find(b=>b.id==selBatch)

  return (
    <div className="shell">
      <Sidebar page="upload" go={go} user={state.user} />
      <div className="main">
        <div className="top-bar">
          <div style={{flex:1}}>
            <div className="top-bar-title">Export PDF</div>
            <div className="top-bar-sub">Step 5 of 5 — Download your question paper</div>
          </div>
        </div>
        <div className="page">
          <Steps steps={["Upload","Type","Configure","Edit","Export"]} current={4} />

          {msg&&<div className="alert alert-error">{msg}</div>}

          {/* ── SUCCESS BANNER ── */}
          {published&&(
            <div className="alert alert-success" style={{fontSize:14,gap:14}}>
              <span style={{fontSize:20}}>🎉</span>
              <div>
                <strong>{examName}</strong> saved and published to <strong>{selectedBatch?.name}</strong>!
                All students in this batch can now see and take this exam.
                <span style={{color:"var(--accent2)",cursor:"pointer",marginLeft:8,fontWeight:600}} onClick={()=>go("omrExams")}> Edit MCQ options →</span>
              </div>
            </div>
          )}

          {/* ── MAIN ACTION CARD ── */}
          <div className="card">
            <div className="card-title" style={{justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
              <span>📄 Question Paper — {state.examConfig?.subject} · {state.examConfig?.className}</span>
              <div style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>
                <span style={{color:"var(--muted)"}}>⏱ Exam duration:</span>
                <input type="number" value={examDuration} onChange={e=>setExamDuration(parseInt(e.target.value)||60)}
                  style={{width:70,padding:"4px 8px",borderRadius:6,border:"1.5px solid var(--border2)",fontSize:13,textAlign:"center"}}
                  min="5" max="300"/>
                <span style={{color:"var(--muted)"}}>min</span>
              </div>
            </div>

            {/* Exam name + batch row — always visible */}
            <div style={{background:"var(--bg3)",borderRadius:12,padding:16,marginBottom:16,border:"1px solid var(--border)"}}>
              <div className="form-row" style={{marginBottom:0}}>
                <div className="form-group" style={{marginBottom:0}}>
                  <label>Batch <span style={{fontSize:10,fontWeight:400}}>(required for "Save & Export")</span></label>
                  <select value={selBatch} onChange={e=>setSelBatch(e.target.value)}>
                    <option value="">— Select batch —</option>
                    {batches.map(b=><option key={b.id} value={b.id}>{b.name} · {b.class_name}</option>)}
                  </select>
                  {batches.length===0&&<div className="field-hint">No batches yet. <span style={{color:"var(--accent2)",cursor:"pointer",fontWeight:600}} onClick={()=>go("batches")}>Create a batch first →</span></div>}
                </div>
                <div className="form-group" style={{marginBottom:0}}>
                  <label>Sequence No <span style={{fontSize:10,fontWeight:400}}>(for naming)</span></label>
                  <input value={examSeq} onChange={e=>setExamSeq(e.target.value)} style={{maxWidth:100}} maxLength={3} placeholder="001"/>
                  <div className="field-hint">Exam name: <strong style={{color:"var(--accent2)",fontFamily:"monospace"}}>{examName}</strong></div>
                </div>
              </div>
            </div>

            {/* 3 Action Buttons */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:pdfUrl||answerPdfUrl?16:0}}>
              {/* Button 1 — Export PDF only */}
              <div style={{background:"var(--bg3)",borderRadius:12,padding:20,border:"1.5px solid var(--border)",textAlign:"center"}}>
                <div style={{fontSize:32,marginBottom:8}}>📄</div>
                <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>Question Paper</div>
                <div style={{fontSize:12,color:"var(--muted)",marginBottom:16}}>Questions only. No answers. For students.</div>
                <button className="btn btn-secondary btn-lg" onClick={exportPDF} disabled={loading||saving} style={{width:"100%",justifyContent:"center"}}>
                  {loading?<><div className="spinner"/> Generating…</>:"🖨 Export to PDF"}
                </button>
              </div>

              {/* Button 2 — Answer Key PDF */}
              <div style={{background:"#F3E5F5",borderRadius:12,padding:20,border:"1.5px solid #CE93D8",textAlign:"center"}}>
                <div style={{fontSize:32,marginBottom:8}}>📋</div>
                <div style={{fontSize:14,fontWeight:700,marginBottom:4,color:"#6A1B9A"}}>Answer Key</div>
                <div style={{fontSize:12,color:"#7B1FA2",marginBottom:16}}>Questions + AI answers. For teacher use only.</div>
                <button className="btn btn-primary btn-lg" onClick={exportAnswerPDF} disabled={loadingAnswer||saving}
                  style={{width:"100%",justifyContent:"center",background:"#7B1FA2",borderColor:"#7B1FA2"}}>
                  {loadingAnswer?<><div className="spinner"/> Generating…</>:"📋 With Answers"}
                </button>
              </div>

              {/* Button 3 — Save + Export */}
              <div style={{background:selBatch?"var(--light)":"var(--bg3)",borderRadius:12,padding:20,border:`1.5px solid ${selBatch?"var(--accent)":"var(--border)"}`,textAlign:"center",transition:"all 0.2s"}}>
                <div style={{fontSize:32,marginBottom:8}}>🚀</div>
                <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>Save & Export to PDF</div>
                <div style={{fontSize:12,color:"var(--muted)",marginBottom:16}}>
                  Save exam to <strong>{selectedBatch?.name||"selected batch"}</strong>. All students in batch can take it online.
                </div>
                <button className="btn btn-primary btn-lg" onClick={saveAndExport} disabled={loading||saving||!selBatch||published} style={{width:"100%",justifyContent:"center"}}>
                  {saving?<><div className="spinner" style={{borderTopColor:"#fff"}}/> Saving…</>:published?"✓ Already Saved":"💾 Save & Export to PDF"}
                </button>
                {!selBatch&&<div style={{fontSize:11,color:"var(--warning)",marginTop:8}}>⚠ Select a batch first</div>}
              </div>
            </div>

            {/* PDF download link after generation */}
            {pdfUrl&&(
              <div className="pdf-card" style={{marginTop:8}}>
                <div className="pdf-icon">📋</div>
                <div className="pdf-info">
                  <div className="pdf-name">{published ? examName : "Question Paper"}</div>
                  <div className="pdf-meta">{state.examConfig?.schoolName} · {state.examConfig?.className} · {state.examConfig?.subject}</div>
                </div>
                <a href={pdfUrl} target="_blank" rel="noreferrer" className="btn btn-primary">⬇ Download PDF</a>
              </div>
            )}
            {answerPdfUrl&&(
              <div className="pdf-card" style={{marginTop:8,background:"#F3E5F5",border:"1.5px solid #CE93D8"}}>
                <div className="pdf-icon">📝</div>
                <div className="pdf-info">
                  <div className="pdf-name" style={{color:"#6A1B9A"}}>Answer Key — Teacher Copy</div>
                  <div className="pdf-meta" style={{color:"#7B1FA2"}}>{state.examConfig?.schoolName} · {state.examConfig?.className} · {state.examConfig?.subject}</div>
                </div>
                <a href={answerPdfUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{background:"#7B1FA2",borderColor:"#7B1FA2"}}>⬇ Download Answer Key</a>
              </div>
            )}
          </div>

          <div className="btn-row" style={{marginTop:8}}>
            <button className="btn btn-secondary" onClick={()=>go("questionEditor")}>← Back to editor</button>
            <button className="btn btn-primary" onClick={()=>go("dashboard")}>Go to dashboard</button>
          </div>
        </div>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════
// DOWNLOAD PDF BUTTON — generates PDF from saved exam questions
// ═══════════════════════════════════════════════════════════════
function DownloadPDFButton({ exam }) {
  const [loading, setLoading] = useState(false)

  const download = async () => {
    setLoading(true)
    try {
      // Fetch full exam questions from DB
      const full = await p2get(`/exam/${exam.id}/full`)
      const qs = full.questions || []
      const fd = new FormData()
      fd.append("language", exam.language || "bengali")
      fd.append("school_name", exam.school_name || "")
      fd.append("class_name", exam.class_name || "")
      fd.append("subject", exam.subject || "")
      fd.append("questions_json", JSON.stringify(qs.map(q=>({question: q.question_text, marks: 1}))))
      const r = await fetch("/api/pdf-direct", {method:"POST", body:fd}).then(r=>r.json())
      if(r.pdf_url) window.open(r.pdf_url, "_blank")
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  return (
    <button className="btn btn-secondary" style={{padding:"3px 12px",fontSize:12}} onClick={download} disabled={loading}>
      {loading ? "Generating…" : "⬇ Download PDF"}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════
// CONFIRMATION DIALOG COMPONENT
// ═══════════════════════════════════════════════════════════════
function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel="Confirm", danger=true }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#fff",borderRadius:16,padding:32,maxWidth:420,width:"90%",boxShadow:"0 20px 60px rgba(0,0,0,0.3)",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:12}}>⚠️</div>
        <div style={{fontSize:18,fontWeight:700,marginBottom:8,color:"var(--text)"}}>{title}</div>
        <div style={{fontSize:13,color:"var(--muted)",marginBottom:24,lineHeight:1.6}}>{message}</div>
        <div style={{display:"flex",gap:12,justifyContent:"center"}}>
          <button className="btn btn-secondary btn-lg" onClick={onCancel}>Cancel</button>
          <button className="btn btn-lg" style={{background:danger?"var(--danger)":"var(--accent2)",color:"#fff"}} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// EXAM DETAIL / EDIT PAGE
// ═══════════════════════════════════════════════════════════════
function ExamDetailPage({ state, go }) {
  const examId = state.currentExamId
  const [exam, setExam] = useState(null)
  const [questions, setQuestions] = useState([])
  const [assignedBatches, setAssignedBatches] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [generating, setGenerating] = useState({})
  const [msg, setMsg] = useState("")
  const [edits, setEdits] = useState({})
  const [assignBatch, setAssignBatch] = useState("")
  const [confirm, setConfirm] = useState(null)

  const load = async () => {
    setLoading(true)
    const [full, bd] = await Promise.all([p2get(`/exam/${examId}/full`), p2get("/batch/list")])
    setExam(full.exam); setQuestions(full.questions||[]); setAssignedBatches(full.assigned_batches||[])
    setBatches(bd.batches||[])
    const e = {}
    full.questions?.forEach(q=>{ e[q.id]={...q} })
    setEdits(e)
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  const saveQuestion = async (qid) => {
    setSaving(s=>({...s,[qid]:true}))
    const q = edits[qid]
    await fetch(`/api/v2/question/${qid}`, {
      method:"PUT", headers:authHeaders(),
      body: JSON.stringify({
        question_text: q.question_text, option_a: q.option_a,
        option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
        correct_answer: q.correct_answer, marks: q.marks
      })
    })
    setMsg("✓ Question saved!")
    setSaving(s=>({...s,[qid]:false}))
  }

  const generateOptions = async (qid) => {
    setGenerating(g=>({...g,[qid]:true}))
    const q = edits[qid]
    const fd = new FormData()
    fd.append("question_text", q.question_text)
    fd.append("language", exam?.language||"bengali")
    try {
      const res = await fetch("/api/generate-mcq-options", {method:"POST", body:fd}).then(r=>r.json())
      if(res.success && res.option_a && res.option_b && res.option_c && res.option_d) {
        const updated = {
          ...edits[qid],
          option_a: res.option_a, option_b: res.option_b,
          option_c: res.option_c, option_d: res.option_d,
          correct_answer: res.correct_answer
        }
        setEdits(e=>({...e,[qid]:updated}))
        await fetch(`/api/v2/question/${qid}`, {
          method:"PUT", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            option_a: updated.option_a, option_b: updated.option_b,
            option_c: updated.option_c, option_d: updated.option_d,
            correct_answer: updated.correct_answer, marks: updated.marks
          })
        })
        setMsg(`✓ Q${q.question_no||""} saved! Correct: ${res.correct_answer} = ${res.correct_value||""}`)
      } else {
        // AI failed — mark as needing manual entry but don't block
        setMsg(`⚠ Q${q.question_no||""} AI failed (${res.error||"no options returned"}) — enter options manually.`)
      }
    } catch(e) {
      setMsg(`⚠ Q${q.question_no||""} network error: ${e.message}`)
    }
    setGenerating(g=>({...g,[qid]:false}))
  }

  const generateAllOptions = async () => {
    setMsg("🤖 Generating options for all questions…")
    const failed = []
    let done = 0
    for(const q of questions) {
      await generateOptions(q.id)
      done++
      setMsg(`🤖 Processing ${done}/${questions.length}…`)
    }
    // Retry failed ones once
    if(failed.length > 0) {
      setMsg(`🔄 Retrying ${failed.length} failed questions…`)
      for(const qid of failed) {
        await generateOptions(qid)
      }
    }
    setMsg(`✓ All ${questions.length} questions processed! Check any still showing "Options not set".`)
  }

  const unassignBatch = async (batchId) => {
    await fetch(`/api/v2/exam/${examId}/batch/${batchId}`, {method:"DELETE", headers:authHeaders()})
    setMsg("✓ Batch unassigned"); load()
  }

  const assignToBatch = async () => {
    if(!assignBatch) return
    const res = await fetch(`/api/v2/exam/${examId}/publish`, {
      method:"POST", headers:authHeaders(),
      body: JSON.stringify({batch_id: parseInt(assignBatch)})
    }).then(r=>r.json())
    if(res.success) { setMsg("✓ Assigned to batch!"); setAssignBatch(""); load() }
    else setMsg("Error: "+(res.detail||"Unknown"))
  }

  const updEdit = (qid, field, val) => setEdits(e=>({...e,[qid]:{...e[qid],[field]:val}}))

  const isPlaceholder = (opt) => !opt || opt.startsWith("Option ")

  if(loading) return <div style={{padding:40,textAlign:"center",color:"var(--muted)"}}>Loading…</div>

  const allPlaceholders = questions.every(q => isPlaceholder(edits[q.id]?.option_a))

  return (
    <div className="shell">
      {confirm && <ConfirmDialog {...confirm}/>}
      <Sidebar page="omrExams" go={go} user={state.user}/>
      <div className="main">
        <div className="top-bar">
          <div style={{flex:1}}>
            <div className="top-bar-title">{exam?.subject}</div>
            <div className="top-bar-sub">{exam?.school_name} · {exam?.class_name} · {exam?.duration_minutes} min · {exam?.total_marks} marks</div>
          </div>
          {exam && <DownloadPDFButton exam={exam}/>}
          <button className="btn btn-secondary" onClick={()=>go("omrExams")}>← Back to Exams</button>
        </div>
        <div className="page">
          {msg&&<div className={`alert ${msg.startsWith("✓")?"alert-success":msg.startsWith("🤖")?"alert-info":"alert-error"}`}>{msg}
            <button style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer"}} onClick={()=>setMsg("")}>✕</button>
          </div>}

          {/* Batch assignment panel */}
          <div className="card">
            <div className="card-title">🏫 Assigned Batches</div>
            {assignedBatches.length===0 ?
              <div style={{color:"var(--muted)",fontSize:13,marginBottom:12}}>Not assigned to any batch yet</div> :
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
                {assignedBatches.map(b=>(
                  <div key={b.id} style={{display:"flex",alignItems:"center",gap:8,background:"var(--light)",border:"1.5px solid var(--accent)",borderRadius:20,padding:"4px 12px"}}>
                    <span style={{fontSize:13,fontWeight:600,color:"var(--accent2)"}}>{b.name} · {b.class_name}</span>
                    <button style={{background:"none",border:"none",color:"var(--danger)",cursor:"pointer",fontSize:14}}
                      onClick={()=>setConfirm({
                        title:"Unassign Batch",
                        message:`Remove this exam from "${b.name}"? Students will no longer see it.`,
                        onConfirm:()=>{ setConfirm(null); unassignBatch(b.id) },
                        onCancel:()=>setConfirm(null),
                        confirmLabel:"Unassign", danger:true
                      })}>✕</button>
                  </div>
                ))}
              </div>
            }
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <select value={assignBatch} onChange={e=>setAssignBatch(e.target.value)} style={{flex:1,maxWidth:300}}>
                <option value="">— Assign to another batch —</option>
                {batches.filter(b=>!assignedBatches.find(ab=>ab.id===b.id)).map(b=>(
                  <option key={b.id} value={b.id}>{b.name} · {b.class_name}</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={assignToBatch} disabled={!assignBatch}>Assign</button>
            </div>
          </div>

          {/* AI Generate All button */}
          {allPlaceholders && (
            <div className="alert alert-info" style={{justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <strong>Options not set yet.</strong> Use AI to auto-generate MCQ options and calculate correct answers for all questions.
              </div>
              <button className="btn btn-primary" style={{flexShrink:0,marginLeft:16}} onClick={generateAllOptions}>
                🤖 Generate All Options with AI
              </button>
            </div>
          )}

          {/* Questions editor */}
          <div className="card">
            <div className="card-title">
              📝 Questions ({questions.length})
              <span style={{fontSize:11,fontWeight:400,color:"var(--muted)",marginLeft:8}}>Edit options and correct answers</span>
              {!allPlaceholders && (
                <button className="btn btn-secondary" style={{marginLeft:"auto",padding:"3px 12px",fontSize:11}} onClick={generateAllOptions}>
                  🤖 Regenerate All with AI
                </button>
              )}
            </div>
            {questions.map((q,i)=>{
              const ed = edits[q.id] || q
              const hasPlaceholders = isPlaceholder(ed.option_a)
              return (
                <div key={q.id} style={{background:"var(--bg3)",border:`1.5px solid ${hasPlaceholders?"var(--warning)":"var(--border)"}`,borderRadius:12,padding:16,marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                    <div style={{width:26,height:26,borderRadius:"50%",background:"var(--accent2)",color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
                    <div style={{fontSize:12,fontWeight:600,color:"var(--muted)"}}>{ed.marks} mark{ed.marks>1?"s":""}</div>
                    {hasPlaceholders && <span className="badge badge-amber">Options not set</span>}
                    <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                      <button className="btn btn-secondary" style={{padding:"3px 10px",fontSize:11}} onClick={()=>generateOptions(q.id)} disabled={generating[q.id]}>
                        {generating[q.id]? <><div className="spinner" style={{width:10,height:10,borderTopColor:"var(--accent2)"}}/> Generating…</> : "🤖 AI Options"}
                      </button>
                      <label style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:0}}>Correct:</label>
                      <select value={ed.correct_answer||"A"} onChange={e=>updEdit(q.id,"correct_answer",e.target.value)}
                        style={{padding:"3px 8px",fontSize:13,fontWeight:700,color:"var(--accent2)",border:"2px solid var(--accent)",borderRadius:6,width:70}}>
                        <option>A</option><option>B</option><option>C</option><option>D</option>
                      </select>
                      <button className="btn btn-primary" style={{padding:"4px 14px",fontSize:12}} onClick={()=>saveQuestion(q.id)} disabled={saving[q.id]}>
                        {saving[q.id]?"Saving…":"💾 Save"}
                      </button>
                    </div>
                  </div>

                  {/* Formatted preview */}
                  <div style={{fontSize:14,color:"var(--text)",padding:"8px 10px",background:"var(--bg2)",borderRadius:8,marginBottom:6,border:"1px solid var(--border)",lineHeight:2,fontFamily:"var(--font)"}}
                    dangerouslySetInnerHTML={{__html:displayMath(ed.question_text||"")}}/>
                  {/* Raw edit textarea */}
                  <textarea value={ed.question_text||""} onChange={e=>updEdit(q.id,"question_text",e.target.value)}
                    style={{width:"100%",fontFamily:"var(--font)",fontSize:12,minHeight:50,padding:"8px 10px",borderRadius:8,border:"1px solid var(--border)",marginBottom:10,background:"var(--bg3)",color:"var(--muted)"}}
                    placeholder="Edit raw text here…"/>

                  {/* Options A B C D */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {["a","b","c","d"].map(opt=>{
                      const isCorrect = ed.correct_answer?.toLowerCase()===opt
                      return (
                        <div key={opt} style={{display:"flex",alignItems:"center",gap:8}}>
                          <div onClick={()=>updEdit(q.id,"correct_answer",opt.toUpperCase())}
                            style={{width:28,height:28,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,cursor:"pointer",transition:"all 0.15s",
                              background:isCorrect?"var(--accent2)":"transparent",
                              border:`2px solid ${isCorrect?"var(--accent2)":"var(--border2)"}`,
                              color:isCorrect?"#fff":"var(--muted)"}}>
                            {opt.toUpperCase()}
                          </div>
                          <input value={ed[`option_${opt}`]||""} onChange={e=>updEdit(q.id,`option_${opt}`,e.target.value)}
                            style={{flex:1,padding:"6px 10px",fontSize:13,borderRadius:8,border:`1.5px solid ${isCorrect?"var(--accent)":"var(--border)"}`,background:isCorrect?"var(--light)":"#fff",fontWeight:isCorrect?600:400}}
                            placeholder={`Option ${opt.toUpperCase()}`}/>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2 — OMR EXAMS PAGE (Admin)
// ═══════════════════════════════════════════════════════════════
function OMRExamsPage({ state, go }) {
  const [exams, setExams] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({school_name:"",class_name:"",subject:"",language:"bengali",duration_minutes:60})
  const [questions, setQuestions] = useState([{question_text:"",option_a:"",option_b:"",option_c:"",option_d:"",correct_answer:"A",marks:1,negative_marks:0}])
  const [msg, setMsg] = useState("")
  const [assignBatch, setAssignBatch] = useState({})
  const [assigning, setAssigning] = useState({})
  const [confirm, setConfirm] = useState(null)

  const [examBatches, setExamBatches] = useState({}) // examId → [batches]

  const load = async () => {
    setLoading(true)
    const [ed, bd] = await Promise.all([p2get("/exam/list"), p2get("/batch/list")])
    const examList = ed.exams||[]
    setExams(examList); setBatches(bd.batches||[])
    // Load assigned batches for each exam
    const batchMap = {}
    await Promise.all(examList.map(async e => {
      const full = await p2get(`/exam/${e.id}/full`)
      batchMap[e.id] = full.assigned_batches || []
    }))
    setExamBatches(batchMap)
    // Pre-select batch for last saved exam
    if(state.lastSavedExamId && state.lastSavedBatchId) {
      setAssignBatch(a=>({...a,[state.lastSavedExamId]: state.lastSavedBatchId}))
    }
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  const addQ = () => setQuestions([...questions,{question_text:"",option_a:"",option_b:"",option_c:"",option_d:"",correct_answer:"A",marks:1,negative_marks:0}])
  const updQ = (i,k,v) => setQuestions(questions.map((q,j)=>j===i?{...q,[k]:v}:q))
  const delQ = (i) => setQuestions(questions.filter((_,j)=>j!==i))

  const createExam = async () => {
    if(!form.school_name||!form.class_name||!form.subject) return setMsg("Fill all exam details")
    for(const q of questions){ if(!q.question_text||!q.option_a||!q.option_b||!q.option_c||!q.option_d) return setMsg("All question fields required") }
    setCreating(true); setMsg("")
    const res = await p2post("/exam/create",{...form,questions})
    if(res.exam_id){ setMsg("✓ Exam created! ID: "+res.exam_id); setShowCreate(false); load() }
    else setMsg("Error: "+(res.detail||"Unknown"))
    setCreating(false)
  }

  const activate = async (id) => { await p2post(`/exam/${id}/activate`,{}); load() }

  const closeExam = (e) => {
    setConfirm({
      title: "Close Exam?",
      message: `Are you sure you want to close "${e.subject}"? Students will no longer be able to submit answers. This cannot be undone.`,
      onConfirm: async () => { setConfirm(null); await p2post(`/exam/${e.id}/close`,{}); load() },
      onCancel: () => setConfirm(null),
      confirmLabel: "Yes, Close Exam",
      danger: true
    })
  }

  const assignToBatch = async (examId) => {
    const batchId = assignBatch[examId]
    if(!batchId) return setMsg("Select a batch first")
    setAssigning(a=>({...a,[examId]:true}))
    const res = await p2post(`/exam/${examId}/publish`, {batch_id: parseInt(batchId)})
    if(res.success) {
      setMsg("✓ Exam assigned to batch!")
      setAssignBatch(a=>({...a,[examId]:""}))
      // Refresh this exam's batch list
      const full = await p2get(`/exam/${examId}/full`)
      setExamBatches(prev=>({...prev,[examId]: full.assigned_batches||[]}))
    } else setMsg("Error: "+(res.detail||"Unknown"))
    setAssigning(a=>({...a,[examId]:false}))
  }

  const statusBadge = (s) => s==="active"
    ? <span className="badge badge-green">● Active</span>
    : s==="closed"
    ? <span className="badge" style={{background:"#ffebee",color:"#c62828",border:"1px solid #ffcdd2"}}>✕ Closed</span>
    : <span className="badge badge-amber">○ Draft</span>

  return (
    <div className="shell">
      {confirm && <ConfirmDialog {...confirm}/>}
      <Sidebar page="omrExams" go={go} user={state.user}/>
      <div className="main">
        <div className="top-bar">
          <div style={{flex:1}}><div className="top-bar-title">OMR Exams</div><div className="top-bar-sub">Manage online MCQ exams and batch assignment</div></div>
          <button className="btn btn-primary" onClick={()=>setShowCreate(!showCreate)}>+ Create Exam</button>
        </div>
        <div className="page">
          {msg&&<div className={`alert ${msg.startsWith("✓")?"alert-success":"alert-error"}`}>{msg}
            <button style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer"}} onClick={()=>setMsg("")}>✕</button>
          </div>}

          {showCreate&&(
            <div className="card" style={{border:"2px solid var(--accent)"}}>
              <div className="card-title">📝 Create New MCQ Exam</div>
              <div className="form-row">
                <div className="form-group"><label>School Name</label><input value={form.school_name} onChange={e=>setForm({...form,school_name:e.target.value})} placeholder="বাংলা মাধ্যমিক বিদ্যালয়"/></div>
                <div className="form-group"><label>Class</label><input value={form.class_name} onChange={e=>setForm({...form,class_name:e.target.value})} placeholder="Class VII"/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Subject</label><input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="গণিত"/></div>
                <div className="form-group"><label>Duration (minutes)</label><input type="number" value={form.duration_minutes} onChange={e=>setForm({...form,duration_minutes:+e.target.value})}/></div>
              </div>
              <div style={{fontWeight:700,fontSize:13,margin:"16px 0 10px",color:"var(--accent2)"}}>Questions ({questions.length})</div>
              {questions.map((q,i)=>(
                <div key={i} style={{background:"var(--bg)",border:"1.5px solid var(--border)",borderRadius:12,padding:14,marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontSize:12,fontWeight:700,color:"var(--accent2)"}}>Q{i+1}</span>
                    {questions.length>1&&<button className="btn btn-danger" style={{padding:"2px 8px",fontSize:11}} onClick={()=>delQ(i)}>✕</button>}
                  </div>
                  <div className="form-group"><label>Question</label><textarea value={q.question_text} onChange={e=>updQ(i,"question_text",e.target.value)} style={{minHeight:60}}/></div>
                  <div className="form-row">
                    <div className="form-group"><label>Option A</label><input value={q.option_a} onChange={e=>updQ(i,"option_a",e.target.value)}/></div>
                    <div className="form-group"><label>Option B</label><input value={q.option_b} onChange={e=>updQ(i,"option_b",e.target.value)}/></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>Option C</label><input value={q.option_c} onChange={e=>updQ(i,"option_c",e.target.value)}/></div>
                    <div className="form-group"><label>Option D</label><input value={q.option_d} onChange={e=>updQ(i,"option_d",e.target.value)}/></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>Correct Answer</label>
                      <select value={q.correct_answer} onChange={e=>updQ(i,"correct_answer",e.target.value)}>
                        <option>A</option><option>B</option><option>C</option><option>D</option>
                      </select>
                    </div>
                    <div className="form-group"><label>Marks</label><input type="number" value={q.marks} onChange={e=>updQ(i,"marks",+e.target.value)} min={1}/></div>
                  </div>
                </div>
              ))}
              <div className="btn-row">
                <button className="btn btn-secondary" onClick={addQ}>+ Add Question</button>
                <button className="btn btn-primary btn-lg" onClick={createExam} disabled={creating}>{creating?"Creating…":"Create Exam"}</button>
                <button className="btn btn-secondary" onClick={()=>setShowCreate(false)}>Cancel</button>
              </div>
            </div>
          )}

          {loading ? <div style={{textAlign:"center",padding:40,color:"var(--muted)"}}>Loading exams…</div> :
          exams.length===0 ? (
            <div className="card" style={{textAlign:"center",padding:40}}>
              <div style={{fontSize:48,marginBottom:12}}>📋</div>
              <div style={{fontSize:16,fontWeight:600,marginBottom:8}}>No exams yet</div>
              <div style={{fontSize:13,color:"var(--muted)"}}>Exams appear here after you "Save & Export" from the question editor.</div>
            </div>
          ) : exams.map(e=>(
            <div className="card" key={e.id}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:200}}>
                  {/* Clickable title → open exam detail */}
                  <div style={{fontSize:15,fontWeight:700,marginBottom:4,color:"var(--accent2)",cursor:"pointer",textDecoration:"underline"}}
                    onClick={()=>{ go("examDetail",{examId:e.id}) }}>
                    {e.subject}
                  </div>
                  <div style={{fontSize:12,color:"var(--muted)",marginBottom:10}}>
                    {e.school_name} · {e.class_name} · {e.duration_minutes} min · {e.total_marks} marks · #{e.id}
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                    {statusBadge(e.status)}
                    {e.status==="draft"&&<button className="btn btn-success" style={{padding:"3px 12px",fontSize:12}} onClick={()=>activate(e.id)}>▶ Activate</button>}
                    {e.status==="active"&&<button className="btn btn-danger" style={{padding:"3px 12px",fontSize:12}} onClick={()=>closeExam(e)}>■ Close</button>}
                    <button className="btn btn-secondary" style={{padding:"3px 12px",fontSize:12}} onClick={()=>go("omrResults",{examId:e.id})}>📊 Results</button>
                    <button className="btn btn-secondary" style={{padding:"3px 12px",fontSize:12}} onClick={()=>go("examDetail",{examId:e.id})}>✏ Edit Questions</button>
                    <DownloadPDFButton exam={e}/>
                  </div>
                </div>

                {/* Assign to Batch inline */}
                <div style={{display:"flex",alignItems:"center",gap:8,background:"var(--bg3)",padding:"10px 14px",borderRadius:10,border:"1px solid var(--border)",flexShrink:0}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--muted)"}}>ASSIGN TO BATCH</div>
                  <select
                    value={assignBatch[e.id] ?? ((examBatches[e.id]||[])[0]?.id || "")}
                    onChange={ev=>setAssignBatch(a=>({...a,[e.id]:ev.target.value}))}
                    style={{fontSize:12,padding:"4px 8px",minWidth:180}}>
                    <option value="">— Select batch —</option>
                    {batches.map(b=>(
                      <option key={b.id} value={b.id}>
                        {(examBatches[e.id]||[]).find(ab=>ab.id===b.id) ? "✓ " : ""}{b.name} · {b.class_name}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-primary" style={{padding:"4px 12px",fontSize:12}}
                    onClick={()=>assignToBatch(e.id)} disabled={assigning[e.id]||!assignBatch[e.id]}>
                    {assigning[e.id]?"…":"Assign"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}



// ═══════════════════════════════════════════════════════════════
// PHASE 2 — STUDENTS PAGE (Admin)
// ═══════════════════════════════════════════════════════════════
function StudentsPage({ state, go }) {
  const [students, setStudents] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editStudent, setEditStudent] = useState(null)
  const emptyForm = {name:"",roll_no:"",batch_id:"",school_name:"",email:"",phone:"",password:"",admission_date:""}
  const [form, setForm] = useState(emptyForm)
  const [msg, setMsg] = useState("")

  const load = async () => {
    setLoading(true)
    const [sd, bd] = await Promise.all([p2get("/student/list"), p2get("/batch/list")])
    setStudents(sd.students||[]); setBatches(bd.batches||[])
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  const saveStudent = async () => {
    if(!form.name) return setMsg("Name is required")
    if(!form.roll_no) return setMsg("Roll No is required")
    if(!form.password) return setMsg("Password is required for student login")
    // Create student
    const res = await p2post("/student/create", {
      name:form.name, roll_no:form.roll_no,
      batch: batches.find(b=>b.id==form.batch_id)?.name||"",
      school_name:form.school_name, email:form.email, phone:form.phone, admission_date:form.admission_date
    })
    if(!res.student_id) return setMsg("Error: "+(res.detail||"Unknown"))
    // Set password
    await p2post("/student/set-password", {student_id: res.student_id, password: form.password})
    // Add to batch if selected
    if(form.batch_id) await p2post(`/batch/${form.batch_id}/students`, {student_ids:[res.student_id]})
    setMsg("✓ Student added with password!"); setForm(emptyForm); setShowAdd(false); load()
  }

  const updateStudent = async (s) => {
    if(!editStudent?.name) return setMsg("Name is required")
    // Update student details
    await fetch(`/api/v2/student/${s.id}`, {
      method:"PUT", headers:authHeaders(),
      body: JSON.stringify({
        name: editStudent.name, roll_no: editStudent.roll_no,
        phone: editStudent.phone, school_name: editStudent.school_name,
        email: editStudent.email, admission_date: editStudent.admission_date||"",
        batch_id: editStudent.batch_id
      })
    })
    if(editStudent.newPwd) await p2post("/student/set-password", {student_id: s.id, password: editStudent.newPwd})
    setMsg("✓ Student updated!"); setEditStudent(null); load()
  }

  const batchName = (s) => {
    const b = batches.find(b=>b.id===s.batch_id)
    return b ? b.name : (s.batch||"—")
  }

  return (
    <div className="shell">
      <Sidebar page="students" go={go} user={state.user}/>
      <div className="main">
        <div className="top-bar"><div style={{flex:1}}><div className="top-bar-title">Students</div><div className="top-bar-sub">Manage student profiles and login passwords</div></div>
          <a href="/export/students/excel" download className="btn btn-secondary" style={{fontSize:12,textDecoration:"none"}}>📊 Export Excel</a>
          <button className="btn btn-primary" onClick={()=>{setShowAdd(!showAdd);setEditStudent(null)}}>+ Add Student</button>
        </div>
        <div className="page">
          {msg&&<div className={`alert ${msg.startsWith("✓")?"alert-success":"alert-error"}`}>{msg}
            <button style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer"}} onClick={()=>setMsg("")}>✕</button>
          </div>}

          {showAdd&&(
            <div className="card" style={{border:"2px solid var(--accent)"}}>
              <div className="card-title">➕ Add Student</div>
              <div className="form-row">
                <div className="form-group"><label>Full Name *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Student name"/></div>
                <div className="form-group"><label>Roll No *</label><input value={form.roll_no} onChange={e=>setForm({...form,roll_no:e.target.value})} placeholder="001"/></div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Batch</label>
                  <select value={form.batch_id} onChange={e=>setForm({...form,batch_id:e.target.value})}>
                    <option value="">— Select batch —</option>
                    {batches.map(b=><option key={b.id} value={b.id}>{b.name} · {b.class_name}</option>)}
                  </select>
                  {batches.length===0&&<div className="field-hint">No batches yet. <span style={{color:"var(--accent2)",cursor:"pointer"}} onClick={()=>go("batches")}>Create a batch first →</span></div>}
                </div>
                <div className="form-group"><label>School</label><input value={form.school_name} onChange={e=>setForm({...form,school_name:e.target.value})} placeholder="School name"/></div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Password * <span style={{fontSize:10,color:"var(--muted)",fontWeight:400}}>(student uses this to login to exam portal)</span></label>
                  <input type="text" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="e.g. student123"/>
                </div>
                <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Phone number"/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
                <div className="form-group">
                  <label>Admission Date *</label>
                  <input type="date" value={form.admission_date} onChange={e=>setForm({...form,admission_date:e.target.value})}/>
                  <div className="field-hint" style={{fontSize:10,color:"var(--muted)"}}>Used to calculate fees from joining month onwards</div>
                </div>
              </div>
              <div className="alert alert-info" style={{fontSize:12,marginBottom:12}}>
                💡 Student will login with: <strong>Roll No</strong> + <strong>Batch</strong> + <strong>Password</strong>
              </div>
              <div className="btn-row">
                <button className="btn btn-primary" onClick={saveStudent}>Save Student</button>
                <button className="btn btn-secondary" onClick={()=>setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-title">👥 All Students <span className="badge badge-blue">{students.length}</span></div>
            {loading?<div style={{color:"var(--muted)",fontSize:13}}>Loading…</div>:
            students.length===0?<div style={{color:"var(--muted)",fontSize:13,padding:"20px 0",textAlign:"center"}}>No students yet.</div>:
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{borderBottom:"2px solid var(--border)"}}>
                {["#","Name","Roll No","Batch","School","Phone","Admission","Password",""].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"8px 10px",fontSize:11,color:"var(--muted)",fontWeight:700}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{students.map((s,i)=>(
                <>
                <tr key={s.id} style={{borderBottom:editStudent?.id===s.id?"none":"1px solid var(--border)"}}>
                  <td style={{padding:"9px 10px",color:"var(--muted)"}}>{i+1}</td>
                  <td style={{padding:"9px 10px",fontWeight:600}}>{s.name}</td>
                  <td style={{padding:"9px 10px"}}>{s.roll_no||"—"}</td>
                  <td style={{padding:"9px 10px"}}>{batchName(s)}</td>
                  <td style={{padding:"9px 10px"}}>{s.school_name||"—"}</td>
                  <td style={{padding:"9px 10px"}}>{s.phone||"—"}</td>
                  <td style={{padding:"9px 10px",fontSize:11,color:"var(--muted)"}}>{s.admission_date?String(s.admission_date).substring(0,10):"—"}</td>
                  <td style={{padding:"9px 10px"}}>
                    <span style={{fontFamily:"monospace",background:"var(--bg3)",padding:"2px 8px",borderRadius:6,fontSize:12}}>
                      {s.password?"••••••":"not set"}
                    </span>
                  </td>
                  <td style={{padding:"9px 10px"}}>
                    <button className="btn btn-secondary" style={{padding:"3px 10px",fontSize:11}}
                      onClick={()=>setEditStudent(editStudent?.id===s.id?null:{...s,newPwd:""})}>
                      ✏ Edit
                    </button>
                  </td>
                </tr>
                {editStudent?.id===s.id&&(
                  <tr key={s.id+"edit"} style={{borderBottom:"2px solid var(--accent)",background:"var(--light)"}}>
                    <td colSpan={9} style={{padding:"16px"}}>
                      <div style={{fontSize:13,fontWeight:700,color:"var(--accent2)",marginBottom:12}}>✏ Edit Student — {s.name}</div>
                      <div className="form-row">
                        <div className="form-group"><label>Full Name</label>
                          <input value={editStudent.name} onChange={e=>setEditStudent({...editStudent,name:e.target.value})}/>
                        </div>
                        <div className="form-group"><label>Roll No</label>
                          <input value={editStudent.roll_no||""} onChange={e=>setEditStudent({...editStudent,roll_no:e.target.value})}/>
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group"><label>Batch</label>
                          <select value={editStudent.batch_id||""} onChange={e=>setEditStudent({...editStudent,batch_id:e.target.value})}>
                            <option value="">— Select batch —</option>
                            {batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                        </div>
                        <div className="form-group"><label>School</label>
                          <input value={editStudent.school_name||""} onChange={e=>setEditStudent({...editStudent,school_name:e.target.value})}/>
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group"><label>Phone</label>
                          <input value={editStudent.phone||""} onChange={e=>setEditStudent({...editStudent,phone:e.target.value})}/>
                        </div>
                        <div className="form-group"><label>Email</label>
                          <input value={editStudent.email||""} onChange={e=>setEditStudent({...editStudent,email:e.target.value})}/>
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group"><label>Admission Date</label>
                          <input type="date" value={editStudent.admission_date?String(editStudent.admission_date).substring(0,10):""} onChange={e=>setEditStudent({...editStudent,admission_date:e.target.value})}/>
                        </div>
                        <div className="form-group"><label>New Password <span style={{fontSize:10,color:"var(--muted)"}}>(leave blank to keep current)</span></label>
                          <input type="text" placeholder="New password (optional)" value={editStudent.newPwd||""} onChange={e=>setEditStudent({...editStudent,newPwd:e.target.value})}/>
                        </div>
                      </div>
                      <div className="btn-row">
                        <button className="btn btn-primary" onClick={()=>updateStudent(s)}>✓ Save Changes</button>
                        <button className="btn btn-secondary" onClick={()=>setEditStudent(null)}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                )}
                </>
              ))}</tbody>
            </table>}
          </div>
        </div>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════
// PHASE 2 — ASSIGN STUDENTS PAGE (Admin)
// ═══════════════════════════════════════════════════════════════
function AssignStudentsPage({ state, go }) {
  const examId = state.currentExamId
  const [exam, setExam] = useState(null)
  const [students, setStudents] = useState([])
  const [selected, setSelected] = useState([])
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [msg, setMsg] = useState("")

  useState(()=>{
    Promise.all([p2get(`/exam/${examId}`),p2get("/student/list"),p2get(`/exam/${examId}/codes`)]).then(([e,s,c])=>{
      setExam(e.exam); setStudents(s.students||[]); setCodes(c.codes||[]); setLoading(false)
    })
  },[])

  const toggle = (id) => setSelected(sel=>sel.includes(id)?sel.filter(x=>x!==id):[...sel,id])

  const assign = async () => {
    if(!selected.length) return setMsg("Select at least one student")
    setAssigning(true)
    const res = await p2post("/exam/assign",{exam_id:examId,student_ids:selected,expires_hours:48})
    if(res.codes){ setCodes([...codes,...res.codes]); setSelected([]); setMsg(`✓ ${res.assigned} code(s) generated!`) }
    else setMsg("Error: "+(res.detail||"Unknown"))
    setAssigning(false)
  }

  const copyAll = () => {
    const text = codes.map(c=>`${c.student_name}: ${c.access_code}`).join("\n")
    navigator.clipboard.writeText(text)
    setMsg("✓ All codes copied to clipboard!")
  }

  if(loading) return <div style={{padding:40,textAlign:"center",color:"var(--muted)"}}>Loading…</div>

  return (
    <div className="shell">
      <Sidebar page="omrExams" go={go} user={state.user}/>
      <div className="main">
        <div className="top-bar"><div style={{flex:1}}><div className="top-bar-title">Assign Students</div><div className="top-bar-sub">{exam?.school_name} — {exam?.subject} — {exam?.class_name}</div></div>
          <button className="btn btn-secondary" onClick={()=>go("omrExams")}>← Back to Exams</button>
        </div>
        <div className="page">
          {msg&&<div className={`alert ${msg.startsWith("✓")?"alert-success":"alert-error"}`}>{msg}</div>}

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div className="card">
              <div className="card-title">👥 Select Students <span className="badge badge-blue">{selected.length} selected</span></div>
              {students.length===0?<div style={{color:"var(--muted)",fontSize:13}}>No students yet. <span style={{color:"var(--accent2)",cursor:"pointer"}} onClick={()=>go("students")}>Add students first →</span></div>:
              students.map(s=>(
                <div key={s.id} onClick={()=>toggle(s.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:8,cursor:"pointer",background:selected.includes(s.id)?"var(--light)":"",border:selected.includes(s.id)?"1.5px solid var(--accent)":"1.5px solid transparent",marginBottom:4}}>
                  <div style={{width:18,height:18,borderRadius:4,border:"2px solid",borderColor:selected.includes(s.id)?"var(--accent2)":"var(--border2)",background:selected.includes(s.id)?"var(--accent2)":"",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,flexShrink:0}}>{selected.includes(s.id)?"✓":""}</div>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{s.name}</div><div style={{fontSize:11,color:"var(--muted)"}}>{s.roll_no?`Roll: ${s.roll_no}`:""} {s.batch?`· ${s.batch}`:""}</div></div>
                </div>
              ))}
              <div className="btn-row" style={{marginTop:12}}>
                <button className="btn btn-primary" onClick={assign} disabled={assigning||!selected.length}>{assigning?"Generating…":"Generate Codes"}</button>
              </div>
            </div>

            <div className="card">
              <div className="card-title">🔑 Student Codes <span className="badge badge-green">{codes.length}</span>
                {codes.length>0&&<button className="btn btn-secondary" style={{marginLeft:"auto",padding:"3px 10px",fontSize:11}} onClick={copyAll}>📋 Copy All</button>}
              </div>
              {codes.length===0?<div style={{color:"var(--muted)",fontSize:13,textAlign:"center",padding:"20px 0"}}>No codes generated yet</div>:
              codes.map((c,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",background:"var(--bg3)",borderRadius:8,marginBottom:6,border:"1px solid var(--border)"}}>
                  <div><div style={{fontSize:13,fontWeight:600}}>{c.student_name}</div><div style={{fontSize:11,color:"var(--muted)"}}>{c.roll_no||""}</div></div>
                  <div style={{fontFamily:"monospace",fontSize:15,fontWeight:700,color:"var(--accent2)",background:"var(--light)",padding:"4px 12px",borderRadius:8,letterSpacing:1}}>{c.access_code}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2 — RESULTS PAGE (Admin)
// ═══════════════════════════════════════════════════════════════
function OMRResultsPage({ state, go }) {
  const examId = state.currentExamId
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exams, setExams] = useState([])
  const [batches, setBatches] = useState([])
  const [selExam, setSelExam] = useState(examId||"")
  const [selBatch, setSelBatch] = useState("")
  const [expandedStudent, setExpandedStudent] = useState(null)
  const [studentDetail, setStudentDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadResults = async (eid) => {
    if(!eid) return
    setLoading(true); setExpandedStudent(null); setStudentDetail(null)
    const d = await p2get(`/results/${eid}`)
    setData(d); setLoading(false)
  }

  useEffect(()=>{
    Promise.all([p2get("/exam/list"), p2get("/batch/list")]).then(([ed, bd])=>{
      setExams(ed.exams||[]); setBatches(bd.batches||[])
      if(selExam){ loadResults(selExam) } else { setLoading(false) }
    })
  },[])

  const loadStudentDetail = async (r) => {
    if(expandedStudent===r.exam_access_id) { setExpandedStudent(null); return }
    setExpandedStudent(r.exam_access_id); setDetailLoading(true)
    const d = await p2get(`/results/${selExam}/student/${r.exam_access_id}`)
    setStudentDetail(d); setDetailLoading(false)
  }

  const pctColor = (p) => p>=75?"var(--success)":p>=40?"var(--warning)":"var(--danger)"

  // Filter by batch if selected
  const filteredResults = data?.results?.filter(r =>
    !selBatch || String(r.batch_id) === String(selBatch)
  ) || []

  return (
    <div className="shell">
      <Sidebar page="omrResults" go={go} user={state.user}/>
      <div className="main">
        <div className="top-bar"><div style={{flex:1}}><div className="top-bar-title">Results</div><div className="top-bar-sub">Exam results — student & batch analytics</div></div></div>
        <div className="page">
          {/* Filters */}
          <div className="card">
            <div className="form-row" style={{marginBottom:0}}>
              <div className="form-group" style={{marginBottom:0}}>
                <label>Select Exam</label>
                <select value={selExam} onChange={e=>{setSelExam(e.target.value);loadResults(e.target.value)}} style={{maxWidth:400}}>
                  <option value="">— Choose an exam —</option>
                  {exams.map(e=><option key={e.id} value={e.id}>#{e.id} {e.subject} — {e.class_name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{marginBottom:0}}>
                <label>Filter by Batch</label>
                <select value={selBatch} onChange={e=>setSelBatch(e.target.value)} style={{maxWidth:250}}>
                  <option value="">— All batches —</option>
                  {batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            {/* Export buttons */}
            {selExam && (
              <div style={{display:"flex",gap:8,marginTop:14,paddingTop:14,borderTop:"1px solid var(--border)"}}>
                <a href={`/export/results/${selExam}/excel`}
                  download
                  className="btn btn-secondary"
                  style={{fontSize:12,padding:"6px 14px",textDecoration:"none"}}
                  onClick={e=>{ const t=e.currentTarget; const orig=t.className; t.style.opacity="0.6"; setTimeout(()=>t.style.opacity="1",1500) }}>
                  📊 Download Excel
                </a>
                <a href={`/export/results/${selExam}/pdf`}
                  download
                  className="btn btn-secondary"
                  style={{fontSize:12,padding:"6px 14px",textDecoration:"none"}}
                  onClick={e=>{ const t=e.currentTarget; t.style.opacity="0.6"; setTimeout(()=>t.style.opacity="1",1500) }}>
                  🖨 Download PDF
                </a>
              </div>
            )}
          </div>

          {loading&&selExam&&<div style={{textAlign:"center",padding:40,color:"var(--muted)"}}>Loading results…</div>}

          {data&&!loading&&(
            <>
              {/* Summary Stats */}
              <div className="stats-row">
                {[
                  {v:filteredResults.length,         l:"Submissions",    c:"var(--accent2)", i:"👥"},
                  {v:(filteredResults.reduce((a,r)=>a+r.percentage,0)/Math.max(filteredResults.length,1)).toFixed(1)+"%", l:"Average Score", c:"var(--warning)", i:"📈"},
                  {v:Math.max(...filteredResults.map(r=>r.marks_obtained),0), l:"Highest Marks", c:"var(--success)", i:"🏆"},
                  {v:filteredResults.filter(r=>r.percentage>=40).length, l:"Passed (≥40%)", c:"#1976D2", i:"✓"},
                ].map((s,i)=>(
                  <div className="stat-card" key={i}>
                    <div className="stat-icon">{s.i}</div>
                    <div className="stat-value" style={{color:s.c}}>{s.v}</div>
                    <div className="stat-label">{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Pie Chart — Score Distribution */}
              {filteredResults.length > 0 && (() => {
                const cats = [
                  {label:"90%+",      color:"#4CAF50", min:90, max:101},
                  {label:"80–90%",    color:"#2196F3", min:80, max:90},
                  {label:"65–80%",    color:"#FF9800", min:65, max:80},
                  {label:"Below 65%", color:"#F44336", min:0,  max:65},
                ]
                const counts = cats.map(c=>filteredResults.filter(r=>r.percentage>=c.min&&r.percentage<c.max).length)
                const total = filteredResults.length

                // SVG Pie chart
                const cx=110, cy=110, r=90
                let startAngle = -Math.PI/2
                const slices = cats.map((c,i)=>{
                  const pct = counts[i]/Math.max(total,1)
                  const angle = pct * 2 * Math.PI
                  const x1 = cx + r*Math.cos(startAngle)
                  const y1 = cy + r*Math.sin(startAngle)
                  const x2 = cx + r*Math.cos(startAngle+angle)
                  const y2 = cy + r*Math.sin(startAngle+angle)
                  const midAngle = startAngle + angle/2
                  const lx = cx + (r*0.65)*Math.cos(midAngle)
                  const ly = cy + (r*0.65)*Math.sin(midAngle)
                  const largeArc = angle > Math.PI ? 1 : 0
                  const path = pct===0 ? "" :
                    pct===1 ? `M${cx},${cy-r} A${r},${r} 0 1,1 ${cx-0.01},${cy-r} Z` :
                    `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`
                  const result = {path, lx, ly, pct, color:c.color, count:counts[i]}
                  startAngle += angle
                  return result
                })

                return (
                  <div className="card" style={{marginBottom:16}}>
                    <div className="card-title">📊 Score Distribution</div>
                    <div style={{display:"flex",alignItems:"center",gap:32,flexWrap:"wrap"}}>
                      {/* SVG Pie */}
                      <svg width={220} height={220} style={{flexShrink:0}}>
                        {slices.map((s,i)=>(
                          <g key={i}>
                            {s.path && <path d={s.path} fill={s.color} stroke="#fff" strokeWidth={2}/>}
                            {s.pct>0.05 && (
                              <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="middle"
                                fontSize={12} fontWeight={700} fill="#fff">
                                {Math.round(s.pct*100)}%
                              </text>
                            )}
                          </g>
                        ))}
                        {total===0 && <circle cx={cx} cy={cy} r={r} fill="var(--border)"/>}
                      </svg>

                      {/* Legend + Progress bars */}
                      <div style={{flex:1,minWidth:200}}>
                        {cats.map((c,i)=>(
                          <div key={i} style={{marginBottom:14}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                              <div style={{width:12,height:12,borderRadius:"50%",background:c.color,flexShrink:0}}/>
                              <span style={{fontSize:13,fontWeight:600,flex:1}}>{c.label}</span>
                              <span style={{fontSize:13,fontWeight:700,color:c.color}}>{counts[i]} students</span>
                              <span style={{fontSize:12,color:"var(--muted)",minWidth:35,textAlign:"right"}}>
                                {total>0?Math.round(counts[i]/total*100):0}%
                              </span>
                            </div>
                            <div style={{height:8,background:"var(--border)",borderRadius:4,overflow:"hidden"}}>
                              <div style={{height:"100%",background:c.color,borderRadius:4,width:total>0?(counts[i]/total*100)+"%":"0%",transition:"width 0.5s"}}/>
                            </div>
                          </div>
                        ))}
                        <div style={{fontSize:11,color:"var(--muted)",marginTop:8}}>
                          Total: {total} submissions {selBatch?"(filtered by batch)":"(all batches)"}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Results Table */}
              <div className="card">
                <div className="card-title">🎯 Student Results
                  <span className="badge badge-blue" style={{marginLeft:8}}>{filteredResults.length} students</span>
                  <span style={{marginLeft:"auto",fontSize:11,color:"var(--muted)"}}>Click a row to see question details</span>
                </div>
                {filteredResults.length===0 ?
                  <div style={{color:"var(--muted)",fontSize:13,textAlign:"center",padding:20}}>No submissions yet</div> :
                  filteredResults.map((r,i)=>(
                    <div key={r.exam_access_id||i}>
                      {/* Student row */}
                      <div onClick={()=>loadStudentDetail(r)}
                        style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,cursor:"pointer",marginBottom:4,
                          background:expandedStudent===r.exam_access_id?"var(--light)":"var(--bg3)",
                          border:expandedStudent===r.exam_access_id?"1.5px solid var(--accent)":"1.5px solid transparent",
                          transition:"all 0.15s"}}>
                        <div style={{width:28,height:28,borderRadius:"50%",background:"var(--accent2)",color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:700}}>{r.student_name}</div>
                          <div style={{fontSize:11,color:"var(--muted)"}}>{r.roll_no?"Roll: "+r.roll_no:""} {r.batch?"· "+r.batch:""}</div>
                        </div>
                        <div style={{textAlign:"center",minWidth:60}}>
                          <div style={{fontSize:15,fontWeight:700}}>{r.marks_obtained}/{r.total_marks}</div>
                          <div style={{fontSize:10,color:"var(--muted)"}}>marks</div>
                        </div>
                        <div style={{textAlign:"center",minWidth:60}}>
                          <div style={{fontSize:18,fontWeight:700,color:pctColor(r.percentage)}}>{r.percentage}%</div>
                        </div>
                        <div style={{display:"flex",gap:12,fontSize:12,minWidth:120}}>
                          <span style={{color:"var(--success)"}}>✓{r.total_correct}</span>
                          <span style={{color:"var(--danger)"}}>✗{r.total_wrong}</span>
                          <span style={{color:"var(--muted)"}}>⊘{r.total_skipped}</span>
                        </div>
                        <div style={{fontSize:11,color:"var(--muted)",minWidth:40}}>{Math.floor((r.time_taken_seconds||0)/60)}m</div>
                        {r.auto_submitted?<span className="badge badge-amber">Auto</span>:<span className="badge badge-green">Manual</span>}
                        <span style={{fontSize:16,color:"var(--muted)"}}>{expandedStudent===r.exam_access_id?"▲":"▼"}</span>
                      </div>

                      {/* Expanded detail */}
                      {expandedStudent===r.exam_access_id&&(
                        <div style={{background:"var(--bg2)",borderRadius:10,padding:16,marginBottom:8,border:"1px solid var(--border)"}}>
                          {detailLoading ? <div style={{textAlign:"center",color:"var(--muted)",padding:20}}>Loading…</div> :
                          studentDetail?.responses?.length > 0 ? (
                            <div>
                              <div style={{fontSize:12,fontWeight:700,color:"var(--muted)",marginBottom:10,textTransform:"uppercase"}}>Question by Question</div>
                              {studentDetail.responses.map((resp,j)=>{
                                const isCorrect = resp.is_correct
                                const isSkipped = !resp.selected_answer
                                return (
                                  <div key={j} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 10px",borderRadius:8,marginBottom:6,
                                    background:isSkipped?"var(--bg3)":isCorrect?"#E8F5E9":"#FFEBEE",
                                    border:`1px solid ${isSkipped?"var(--border)":isCorrect?"var(--success)":"var(--danger)"}`}}>
                                    <div style={{fontSize:12,fontWeight:700,minWidth:20,color:isSkipped?"var(--muted)":isCorrect?"var(--success)":"var(--danger)"}}>{j+1}</div>
                                    <div style={{flex:1,fontSize:12}} dangerouslySetInnerHTML={{__html:displayMath((resp.question_text||"").substring(0,80)+"…")}}/>
                                    <div style={{fontSize:12,minWidth:120,textAlign:"right"}}>
                                      <span style={{color:"var(--muted)"}}>Student: </span>
                                      <strong style={{color:isCorrect?"var(--success)":isSkipped?"var(--muted)":"var(--danger)"}}>{resp.selected_answer||"—"}</strong>
                                      <span style={{color:"var(--muted)"}}> · Correct: </span>
                                      <strong style={{color:"var(--success)"}}>{resp.correct_answer}</strong>
                                    </div>
                                    <div style={{fontSize:11,color:isCorrect?"var(--success)":"var(--danger)",minWidth:50,textAlign:"right",fontWeight:700}}>
                                      {isCorrect?"+"+resp.marks:isSkipped?"0":resp.marks_awarded}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : <div style={{color:"var(--muted)",fontSize:13}}>No detailed responses found</div>}
                        </div>
                      )}
                    </div>
                  ))
                }
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════
// PHASE 2 — BATCHES PAGE (Admin)
// ═══════════════════════════════════════════════════════════════
function BatchesPage({ state, go }) {
  const [batches, setBatches] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({name:"",class_name:""})
  const [selBatch, setSelBatch] = useState(null)
  const [batchStudents, setBatchStudents] = useState([])
  const [selStudents, setSelStudents] = useState([])
  const [msg, setMsg] = useState("")
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState("")
  const [editClass, setEditClass] = useState("")
  const [batchFee, setBatchFee] = useState("")
  const [settingFee, setSettingFee] = useState(false)

  const load = async () => {
    setLoading(true)
    const [bd, sd] = await Promise.all([p2get("/batch/list"), p2get("/student/list")])
    setBatches(bd.batches||[]); setStudents(sd.students||[])
    setLoading(false)
  }

  const loadBatch = async (b) => {
    const d = await p2get(`/batch/${b.id}`)
    setSelBatch(d.batch); setBatchStudents(d.students||[]); setSelStudents([])
    setEditName(d.batch?.name||""); setEditClass(d.batch?.class_name||"")
    setEditingName(false)
    // Load current default fee from batch
    setBatchFee(String(d.batch?.default_fee||""))
  }

  useEffect(()=>{ load() },[])

  const createBatch = async () => {
    if(!form.name||!form.class_name) return setMsg("Batch name and class are required")
    const res = await p2post("/batch/create", {...form, school_name:"", subject:""})
    if(res.batch_id){ setMsg("✓ Batch created!"); setShowCreate(false); setForm({name:"",class_name:""}); load() }
    else setMsg("Error: "+(res.detail||"Unknown"))
  }

  const renameBatch = async () => {
    if(!editName||!editClass) return setMsg("Name and class required")
    const res = await fetch(`/api/v2/batch/${selBatch.id}`, {
      method:"PUT", headers:authHeaders(),
      body: JSON.stringify({name:editName, class_name:editClass})
    }).then(r=>r.json())
    if(res.success) { setMsg("✓ Batch renamed!"); setEditingName(false); load(); setSelBatch({...selBatch,name:editName,class_name:editClass}) }
    else setMsg("Error updating batch")
  }

  const setBatchFeeForAll = async () => {
    if(!batchFee||!selBatch) return
    setSettingFee(true)
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
    // Save as batch default fee
    await fetch(`/api/v2/batch/${selBatch.id}`, {
      method:"PUT", headers:authHeaders(),
      body: JSON.stringify({name:selBatch.name, class_name:selBatch.class_name, default_fee:parseFloat(batchFee)})
    })
    // Set for all students this month
    for(const s of batchStudents) {
      await p2post("/fees/monthly/set", {student_id:s.id, month, amount:parseFloat(batchFee), note:`${selBatch.name} monthly fee`})
    }
    setSettingFee(false)
    setMsg(`✓ Fee ₹${batchFee}/month saved as default for ${selBatch.name}! Applied to ${batchStudents.length} students for ${month}.`)
    // Reload batch to show updated default fee
    loadBatch(selBatch)
  }

  const addStudents = async () => {
    if(!selBatch||!selStudents.length) return
    const res = await p2post(`/batch/${selBatch.id}/students`, {student_ids: selStudents})
    if(res.success){ setMsg("✓ "+selStudents.length+" student(s) added!"); setSelStudents([]); loadBatch(selBatch) }
  }

  const removeStudent = async (studentId) => {
    await fetch(`/api/v2/batch/${selBatch.id}/students/${studentId}`, {method:"DELETE", headers:authHeaders()})
    loadBatch(selBatch)
  }

  const toggle = (id) => setSelStudents(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])
  const notInBatch = students.filter(s=>!batchStudents.find(b=>b.id===s.id))

  return (
    <div className="shell">
      <Sidebar page="batches" go={go} user={state.user}/>
      <div className="main">
        <div className="top-bar">
          <div style={{flex:1}}><div className="top-bar-title">Batches</div><div className="top-bar-sub">Group students into batches for exam assignment</div></div>
          <button className="btn btn-primary" onClick={()=>setShowCreate(!showCreate)}>+ Create Batch</button>
        </div>
        <div className="page">
          {msg&&<div className={`alert ${msg.startsWith("✓")?"alert-success":"alert-error"}`}>{msg}
            <button style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer"}} onClick={()=>setMsg("")}>✕</button>
          </div>}

          {showCreate&&(
            <div className="card" style={{border:"2px solid var(--accent)"}}>
              <div className="card-title">➕ Create New Batch</div>
              <div className="form-row">
                <div className="form-group"><label>Batch Name *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Class VII - Morning"/></div>
                <div className="form-group"><label>Class *</label><input value={form.class_name} onChange={e=>setForm({...form,class_name:e.target.value})} placeholder="Class VII"/></div>
              </div>
              <div className="btn-row">
                <button className="btn btn-primary" onClick={createBatch}>Create Batch</button>
                <button className="btn btn-secondary" onClick={()=>setShowCreate(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:16}}>
            {/* Left — Batch list */}
            <div className="card" style={{height:"fit-content"}}>
              <div className="card-title">📦 All Batches <span className="badge badge-blue">{batches.length}</span></div>
              {loading?<div style={{color:"var(--muted)",fontSize:13}}>Loading…</div>:
              batches.length===0?<div style={{color:"var(--muted)",fontSize:13,textAlign:"center",padding:"16px 0"}}>No batches yet</div>:
              batches.map(b=>(
                <div key={b.id} onClick={()=>loadBatch(b)} style={{padding:"10px 12px",borderRadius:10,cursor:"pointer",marginBottom:6,
                  background:selBatch?.id===b.id?"var(--light)":"var(--bg3)",
                  border:selBatch?.id===b.id?"2px solid var(--accent)":"2px solid transparent"}}>
                  <div style={{fontSize:13,fontWeight:700}}>{b.name}</div>
                  <div style={{fontSize:11,color:"var(--muted)"}}>{b.class_name} · {b.student_count||0} student{b.student_count!==1?"s":""}</div>
                </div>
              ))}
            </div>

            {/* Right — Batch detail */}
            {selBatch ? (
              <div>
                <div className="card">
                  {/* Batch name edit */}
                  {editingName ? (
                    <div style={{marginBottom:16}}>
                      <div className="form-row">
                        <div className="form-group"><label>Batch Name</label>
                          <input value={editName} onChange={e=>setEditName(e.target.value)} autoFocus/>
                        </div>
                        <div className="form-group"><label>Class</label>
                          <input value={editClass} onChange={e=>setEditClass(e.target.value)}/>
                        </div>
                      </div>
                      <div className="btn-row">
                        <button className="btn btn-primary" onClick={renameBatch}>✓ Save Name</button>
                        <button className="btn btn-secondary" onClick={()=>setEditingName(false)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="card-title">
                      👥 {selBatch.name}
                      <span className="badge badge-blue" style={{marginLeft:8}}>{batchStudents.length} students</span>
                      <button className="btn btn-secondary" style={{marginLeft:8,padding:"3px 10px",fontSize:11}} onClick={()=>setEditingName(true)}>✏ Rename</button>
                      <button className="btn btn-secondary" style={{marginLeft:"auto",padding:"3px 10px",fontSize:11}} onClick={()=>go("students")}>+ Add new student →</button>
                    </div>
                  )}

                  {/* Batch fee setter */}
                  <div style={{background:"var(--light)",border:"1.5px solid var(--accent)",borderRadius:10,padding:"10px 14px",marginBottom:16}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                      <span style={{fontSize:12,fontWeight:700,color:"var(--accent2)"}}>💰 Monthly Fee for All Students</span>
                      {selBatch?.default_fee>0 && (
                        <span className="badge badge-green" style={{fontSize:11}}>Current: ₹{selBatch.default_fee}/month</span>
                      )}
                      <input type="number" value={batchFee} onChange={e=>setBatchFee(e.target.value)}
                        placeholder={selBatch?.default_fee>0?`Change from ₹${selBatch.default_fee}`:"₹ Set amount"}
                        style={{width:160,padding:"5px 8px",fontSize:13,borderRadius:6,border:"1px solid var(--border)"}}/>
                      <button className="btn btn-primary" style={{padding:"5px 14px",fontSize:12}} onClick={setBatchFeeForAll} disabled={!batchFee||settingFee}>
                        {settingFee?"Setting…":selBatch?.default_fee>0?"Update & Apply →":"Set for All →"}
                      </button>
                    </div>
                    <div style={{fontSize:11,color:"var(--muted)",marginTop:6}}>
                      {selBatch?.default_fee>0
                        ? `✓ ₹${selBatch.default_fee}/month saved. This auto-fills new months for all ${batchStudents.length} students.`
                        : `Set once → auto-fills every month for all ${batchStudents.length} students in this batch.`}
                    </div>
                  </div>

                  {/* Students in batch */}
                  {batchStudents.length===0 ? (
                    <div style={{color:"var(--muted)",fontSize:13,padding:"16px 0",textAlign:"center"}}>No students in this batch yet</div>
                  ) : (
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,marginBottom:16}}>
                      <thead><tr style={{borderBottom:"2px solid var(--border)"}}>
                        {["#","Name","Roll No","Phone",""].map(h=>(
                          <th key={h} style={{textAlign:"left",padding:"7px 10px",fontSize:11,color:"var(--muted)",fontWeight:700}}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>{batchStudents.map((s,i)=>(
                        <tr key={s.id} style={{borderBottom:"1px solid var(--border)"}}>
                          <td style={{padding:"8px 10px",color:"var(--muted)"}}>{i+1}</td>
                          <td style={{padding:"8px 10px",fontWeight:600}}>{s.name}</td>
                          <td style={{padding:"8px 10px"}}>{s.roll_no||"—"}</td>
                          <td style={{padding:"8px 10px",color:"var(--muted)"}}>{s.phone||"—"}</td>
                          <td style={{padding:"8px 10px"}}>
                            <button style={{background:"none",border:"none",color:"var(--danger)",cursor:"pointer",fontSize:12}} onClick={()=>removeStudent(s.id)}>✕ Remove</button>
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}

                  {/* Add existing students */}
                  {notInBatch.length>0&&(
                    <>
                      <div style={{fontSize:12,fontWeight:700,color:"var(--muted)",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>Add existing students to this batch</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
                        {notInBatch.map(s=>(
                          <div key={s.id} onClick={()=>toggle(s.id)} style={{padding:"5px 14px",borderRadius:20,cursor:"pointer",fontSize:12,fontWeight:600,transition:"all 0.15s",
                            background:selStudents.includes(s.id)?"var(--accent2)":"var(--bg3)",
                            color:selStudents.includes(s.id)?"#fff":"var(--text)",
                            border:`1.5px solid ${selStudents.includes(s.id)?"var(--accent2)":"var(--border2)"}`}}>
                            {selStudents.includes(s.id)?"✓ ":""}{s.name} {s.roll_no?`(${s.roll_no})`:""}
                          </div>
                        ))}
                      </div>
                      <button className="btn btn-primary" onClick={addStudents} disabled={!selStudents.length}>
                        Add {selStudents.length>0?selStudents.length:""} Student{selStudents.length!==1?"s":""} to Batch
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="card" style={{textAlign:"center",padding:48}}>
                <div style={{fontSize:48,marginBottom:12}}>👈</div>
                <div style={{fontSize:15,fontWeight:600,marginBottom:6}}>Select a batch</div>
                <div style={{fontSize:13,color:"var(--muted)"}}>Click a batch on the left to view and manage its students</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════
// PHASE 2 — STUDENT EXAM PORTAL (batch login + exam list)
// ═══════════════════════════════════════════════════════════════
function StudentExamPage({ state, updateState, go }) {
  const [phase, setPhase] = useState("login")
  const [batches, setBatches] = useState([])
  const [loginForm, setLoginForm] = useState({roll_no:"",batch_id:"",password:""})
  const [studentData, setStudentData] = useState(null)
  const [examList, setExamList] = useState([])
  const [examData, setExamData] = useState(null)
  const [currentExamId, setCurrentExamId] = useState(null)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [startTime, setStartTime] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [resultDetail, setResultDetail] = useState([])
  const [rankList, setRankList] = useState([])
  const [error, setError] = useState("")
  const [warnings, setWarnings] = useState(0)
  const [currentQ, setCurrentQ] = useState(0)
  const timerRef = useRef(null)
  const examRef = useRef(null)

  useEffect(()=>{ p2get("/batch/list").then(d=>setBatches(d.batches||[])) },[])

  // Security events during exam
  useEffect(()=>{
    if(phase!=="exam") return
    const onBlur = () => { setWarnings(w=>w+1) }
    const onFs = () => { if(!document.fullscreenElement) setWarnings(w=>w+1) }
    window.addEventListener("blur",onBlur)
    document.addEventListener("fullscreenchange",onFs)
    return ()=>{ window.removeEventListener("blur",onBlur); document.removeEventListener("fullscreenchange",onFs) }
  },[phase])

  // Timer
  useEffect(()=>{
    if(phase!=="exam"||!timeLeft) return
    timerRef.current = setInterval(()=>{
      setTimeLeft(t=>{ if(t<=1){ clearInterval(timerRef.current); handleSubmit(true); return 0 } return t-1 })
    },1000)
    return ()=>clearInterval(timerRef.current)
  },[phase])

  const enterFullscreen = () => {
    const el = examRef.current||document.documentElement
    if(el.requestFullscreen) el.requestFullscreen()
  }

  const login = async () => {
    if(!loginForm.roll_no||!loginForm.batch_id||!loginForm.password) return setError("All fields required")
    setError("")
    const res = await p2post("/student/login", {...loginForm, batch_id: parseInt(loginForm.batch_id)})
    if(res.detail) return setError(res.detail)
    setStudentData({student: res.student, batch: res.batch})
    // Load exams for batch
    const exRes = await p2get(`/student/${res.student.id}/exams/${loginForm.batch_id}`)
    setExamList(exRes.exams||[])
    setPhase("examList")
  }

  const startExam = async (examId) => {
    setCurrentExamId(examId)
    const res = await p2post("/student/start-exam", {exam_id: examId, student_id: studentData.student.id})
    if(res.already_submitted){
      // Load rank list and detailed result
      const [rankRes, detailRes] = await Promise.all([
        p2get(`/results/${examId}`),
        p2get(`/student/${studentData.student.id}/result/${examId}`)
      ])
      setRankList(rankRes.results||[])
      setResult(detailRes.result)
      setResultDetail(detailRes.responses||[])
      setPhase("rankList")
      return
    }
    setExamData(res)
    setAnswers({})
    setTimeLeft(res.exam.duration_minutes*60)
    setStartTime(Date.now())
    setCurrentQ(0)
    setPhase("exam")
    setTimeout(enterFullscreen,300)
  }

  const selectAnswer = (qId, ans) => setAnswers(a=>({...a,[qId]:ans}))

  const handleSubmit = async (auto=false) => {
    if(submitting) return
    setSubmitting(true)
    clearInterval(timerRef.current)
    if(document.fullscreenElement) document.exitFullscreen()
    const timeTaken = startTime ? Math.floor((Date.now()-startTime)/1000) : 0
    const answerList = examData.questions.map(q=>({question_id:q.id, selected_answer:answers[q.id]||null}))
    const res = await p2post("/student/submit-exam",{
      exam_id: examData.exam.id,
      student_id: studentData.student.id,
      answers: answerList,
      time_taken_seconds: timeTaken,
      auto_submitted: auto
    })
    setResult(res.result)
    // Load rank list
    try {
      const rankRes = await p2get(`/results/${examData.exam.id}`)
      setRankList(rankRes.results||[])
    } catch {}
    setPhase("rankList")
    setSubmitting(false)
    // Fetch detailed responses
    try {
      const detail = await p2get(`/student/${studentData.student.id}/result/${examData.exam.id}`)
      setResultDetail(detail.responses||[])
    } catch {}
  }

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`
  const timerColor = timeLeft<300?"var(--danger)":timeLeft<600?"var(--warning)":"var(--accent2)"

  // ── LOGIN ──
  if(phase==="login") return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#E8F5E9,#F0F7EE,#DCEDC8)"}}>
      <div style={{background:"#fff",borderRadius:20,padding:40,width:"100%",maxWidth:420,boxShadow:"0 8px 40px rgba(46,125,50,0.12)",border:"1px solid var(--border)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:48,marginBottom:8}}>📋</div>
          <div style={{fontSize:22,fontWeight:700}}>Exam<span style={{color:"var(--accent2)"}}>Guru</span></div>
          <div style={{fontSize:13,color:"var(--muted)",marginTop:4}}>Student Exam Portal</div>
        </div>
        {error&&<div className="alert alert-error">⚠ {error}</div>}
        <div className="form-group">
          <label>Your Batch</label>
          <select value={loginForm.batch_id} onChange={e=>setLoginForm({...loginForm,batch_id:e.target.value})}>
            <option value="">— Select your batch —</option>
            {batches.map(b=><option key={b.id} value={b.id}>{b.name} · {b.class_name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Roll Number</label>
          <input value={loginForm.roll_no} onChange={e=>setLoginForm({...loginForm,roll_no:e.target.value})} placeholder="e.g. 001"/>
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm,password:e.target.value})} onKeyDown={e=>e.key==="Enter"&&login()}/>
        </div>
        <button className="btn btn-primary btn-lg" style={{width:"100%",justifyContent:"center"}} onClick={login}>Login →</button>
        <div style={{textAlign:"center",marginTop:16,fontSize:12,color:"var(--muted)"}}>
          <span style={{cursor:"pointer",color:"var(--accent2)"}} onClick={()=>go("dashboard")}>← Admin Login</span>
        </div>
      </div>
    </div>
  )

  // ── EXAM LIST ──
  if(phase==="examList") return (
    <div style={{minHeight:"100vh",background:"var(--bg)"}}>
      <div style={{background:"var(--bg2)",borderBottom:"1px solid var(--border)",padding:"14px 32px",display:"flex",alignItems:"center",gap:16}}>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:700}}>Welcome, {studentData?.student?.name} 👋</div>
          <div style={{fontSize:12,color:"var(--muted)"}}>{studentData?.batch?.name} · {studentData?.batch?.class_name}</div>
        </div>
        <button className="btn btn-secondary" style={{fontSize:12}} onClick={()=>setPhase("login")}>Logout</button>
      </div>
      <div style={{padding:32,maxWidth:800,margin:"0 auto"}}>
        <div style={{fontSize:20,fontWeight:700,marginBottom:20}}>Available Exams</div>
        {examList.length===0?(
          <div style={{textAlign:"center",padding:60,color:"var(--muted)"}}>
            <div style={{fontSize:48,marginBottom:12}}>📭</div>
            <div style={{fontSize:15}}>No exams available for your batch yet</div>
          </div>
        ):examList.map(e=>(
          <div key={e.id} style={{background:"#fff",borderRadius:16,padding:24,marginBottom:16,border:"1px solid var(--border)",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
            <div style={{display:"flex",alignItems:"center",gap:16}}>
              <div style={{fontSize:36}}>📝</div>
              <div style={{flex:1}}>
                <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>{e.subject}</div>
                <div style={{fontSize:13,color:"var(--muted)",marginBottom:8}}>{e.class_name} · {e.duration_minutes} minutes · {e.total_marks} marks</div>
                <div style={{display:"flex",gap:8}}>
                  {e.submitted?<span className="badge badge-green">✓ Submitted</span>:<span className="badge badge-amber">● Available</span>}
                  <span className="badge badge-blue">{e.total_marks} marks</span>
                </div>
              </div>
              {e.submitted?(
                <button className="btn btn-secondary" onClick={()=>startExam(e.id)}>View Result</button>
              ):(
                <button className="btn btn-primary btn-lg" onClick={()=>startExam(e.id)}>Start Exam →</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // ── EXAM ──
  if(phase==="exam"&&examData) {
    const q = examData.questions[currentQ]
    const answered = Object.keys(answers).length
    const total = examData.questions.length
    return (
      <div ref={examRef} style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column"}}>
        <div style={{background:"var(--bg2)",borderBottom:"1px solid var(--border)",padding:"10px 24px",display:"flex",alignItems:"center",gap:16,position:"sticky",top:0,zIndex:100}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700}}>{examData.exam.subject} — {examData.exam.class_name}</div>
            <div style={{fontSize:11,color:"var(--muted)"}}>{studentData?.student?.name}</div>
          </div>
          {warnings>0&&<span className="badge badge-amber">⚠ {warnings} warning{warnings>1?"s":""}</span>}
          <div style={{fontFamily:"monospace",fontSize:22,fontWeight:700,color:timerColor,background:"var(--bg3)",padding:"6px 16px",borderRadius:10,border:`2px solid ${timerColor}`}}>{fmt(timeLeft)}</div>
          <div style={{fontSize:12,color:"var(--muted)"}}>{answered}/{total} answered</div>
          <button className="btn btn-primary" onClick={()=>handleSubmit(false)} disabled={submitting}>{submitting?"Submitting…":"Submit Exam"}</button>
        </div>
        <div style={{display:"flex",flex:1}}>
          <div style={{width:200,background:"var(--bg2)",borderRight:"1px solid var(--border)",padding:16,overflowY:"auto"}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--muted)",marginBottom:10,textTransform:"uppercase"}}>Questions</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
              {examData.questions.map((q2,i)=>(
                <div key={i} onClick={()=>setCurrentQ(i)} style={{width:36,height:36,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,cursor:"pointer",
                  background:answers[q2.id]?(currentQ===i?"var(--accent2)":"var(--accent)"):(currentQ===i?"var(--light)":"var(--bg3)"),
                  color:answers[q2.id]?"#fff":(currentQ===i?"var(--accent2)":"var(--muted)"),
                  border:currentQ===i?"2px solid var(--accent2)":"2px solid transparent"}}>{i+1}</div>
              ))}
            </div>
            <div style={{marginTop:16,fontSize:11,color:"var(--muted)"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><div style={{width:14,height:14,borderRadius:3,background:"var(--accent)"}}></div> Answered</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:14,height:14,borderRadius:3,background:"var(--bg3)",border:"1px solid var(--border2)"}}></div> Not answered</div>
            </div>
          </div>
          <div style={{flex:1,padding:32,maxWidth:720}}>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>Question {currentQ+1} of {total} · {q.marks} mark{q.marks>1?"s":""}</div>
            <div style={{fontSize:16,fontWeight:600,lineHeight:1.7,marginBottom:28,background:"var(--bg2)",padding:20,borderRadius:12,border:"1px solid var(--border)"}}
              dangerouslySetInnerHTML={{__html:displayMath(q.question_text)}}/>
            {["a","b","c","d"].map(opt=>(
              <div key={opt} onClick={()=>selectAnswer(q.id,opt.toUpperCase())}
                style={{display:"flex",alignItems:"center",gap:14,padding:"14px 20px",marginBottom:10,borderRadius:12,cursor:"pointer",transition:"all 0.15s",
                  background:answers[q.id]===opt.toUpperCase()?"var(--light)":"var(--bg2)",
                  border:answers[q.id]===opt.toUpperCase()?"2px solid var(--accent2)":"2px solid var(--border)"}}>
                <div style={{width:32,height:32,borderRadius:"50%",border:"2px solid",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,
                  borderColor:answers[q.id]===opt.toUpperCase()?"var(--accent2)":"var(--border2)",
                  background:answers[q.id]===opt.toUpperCase()?"var(--accent2)":"transparent",
                  color:answers[q.id]===opt.toUpperCase()?"#fff":"var(--muted)"}}>{opt.toUpperCase()}</div>
                <div style={{fontSize:14}} dangerouslySetInnerHTML={{__html:displayMath(q[`option_${opt}`])}}/>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",marginTop:20,alignItems:"center"}}>
              <button className="btn btn-secondary" style={{fontSize:12}} onClick={()=>selectAnswer(q.id,null)}>✕ Clear</button>
              <div style={{display:"flex",gap:10}}>
                {currentQ>0&&<button className="btn btn-secondary" onClick={()=>setCurrentQ(currentQ-1)}>← Prev</button>}
                {currentQ<total-1&&<button className="btn btn-primary" onClick={()=>setCurrentQ(currentQ+1)}>Next →</button>}
                {currentQ===total-1&&<button className="btn btn-success btn-lg" onClick={()=>handleSubmit(false)} disabled={submitting}>Submit ✓</button>}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── RANK LIST ──
  if(phase==="rankList") {
    const myResult = result
    const pct = myResult?.percentage||0
    const color = pct>=75?"var(--success)":pct>=40?"var(--warning)":"var(--danger)"
    const myRank = rankList.findIndex(r=>r.student_name===studentData?.student?.name)+1

    return (
      <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#E8F5E9,#F0F7EE)",padding:"24px 16px"}}>
        <div style={{maxWidth:800,margin:"0 auto"}}>
          {/* My Score Card */}
          <div style={{background:"#fff",borderRadius:20,padding:24,boxShadow:"0 8px 40px rgba(0,0,0,0.1)",marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
              <div style={{fontSize:48}}>{pct>=75?"🏆":pct>=40?"👍":"📚"}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:18,fontWeight:700}}>{studentData?.student?.name}</div>
                <div style={{fontSize:13,color:"var(--muted)",marginBottom:8}}>{studentData?.batch?.name}</div>
                <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                  <span style={{fontSize:28,fontWeight:700,color}}>{pct}%</span>
                  <span style={{fontSize:16,color:"var(--muted)",alignSelf:"flex-end",marginBottom:4}}>{myResult?.marks_obtained}/{myResult?.total_marks} marks</span>
                  {myRank>0&&<span style={{fontSize:14,background:"var(--light)",border:"1.5px solid var(--accent)",borderRadius:20,padding:"2px 12px",color:"var(--accent2)",fontWeight:700,alignSelf:"flex-end",marginBottom:4}}>Rank #{myRank}</span>}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,textAlign:"center"}}>
                {[
                  {v:myResult?.total_correct,  l:"Correct", c:"var(--success)"},
                  {v:myResult?.total_wrong,    l:"Wrong",   c:"var(--danger)"},
                  {v:myResult?.total_skipped,  l:"Skipped", c:"var(--muted)"}
                ].map((s,i)=>(
                  <div key={i} style={{background:"var(--bg3)",borderRadius:10,padding:"8px 12px"}}>
                    <div style={{fontSize:20,fontWeight:700,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:11,color:"var(--muted)"}}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{marginTop:16,display:"flex",gap:10}}>
              <button className="btn btn-primary" onClick={()=>setPhase("result")}>📋 View My Detailed Answers</button>
              <button className="btn btn-secondary" onClick={()=>setPhase("examList")}>← Back to Exam List</button>
            </div>
          </div>

          {/* Rank List */}
          <div style={{background:"#fff",borderRadius:20,padding:24,boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
            <div style={{fontSize:16,fontWeight:700,marginBottom:16}}>🏅 Class Rank List</div>
            {rankList.length===0 ? (
              <div style={{color:"var(--muted)",textAlign:"center",padding:20}}>No other submissions yet</div>
            ) : rankList.map((r,i)=>{
              const isMe = r.student_name===studentData?.student?.name
              const rpct = r.percentage||0
              const rcolor = rpct>=75?"var(--success)":rpct>=40?"var(--warning)":"var(--danger)"
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:12,marginBottom:8,
                  background:isMe?"var(--light)":"var(--bg3)",
                  border:isMe?"2px solid var(--accent)":"1px solid var(--border)"}}>
                  {/* Rank badge */}
                  <div style={{width:32,height:32,borderRadius:"50%",
                    background:i===0?"#FFD700":i===1?"#C0C0C0":i===2?"#CD7F32":"var(--bg2)",
                    color:i<3?"#fff":"var(--muted)",
                    fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {i+1}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:isMe?700:600}}>
                      {r.student_name} {isMe&&<span style={{fontSize:11,color:"var(--accent2)",fontWeight:700}}>(You)</span>}
                    </div>
                    <div style={{fontSize:11,color:"var(--muted)"}}>{r.roll_no?"Roll: "+r.roll_no:""}</div>
                  </div>
                  <div style={{textAlign:"center",minWidth:60}}>
                    <div style={{fontSize:15,fontWeight:700}}>{r.marks_obtained}/{r.total_marks}</div>
                    <div style={{fontSize:10,color:"var(--muted)"}}>marks</div>
                  </div>
                  <div style={{fontSize:20,fontWeight:700,color:rcolor,minWidth:55,textAlign:"right"}}>{rpct}%</div>
                  <div style={{display:"flex",gap:8,fontSize:11,minWidth:80}}>
                    <span style={{color:"var(--success)"}}>✓{r.total_correct}</span>
                    <span style={{color:"var(--danger)"}}>✗{r.total_wrong}</span>
                    <span style={{color:"var(--muted)"}}>⊘{r.total_skipped}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── RESULT ──
  if(phase==="result"&&result) {
    const pct = result.percentage||0
    const color = pct>=75?"var(--success)":pct>=40?"var(--warning)":"var(--danger)"
    return (
      <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#E8F5E9,#F0F7EE)",padding:"32px 16px"}}>
        <div style={{maxWidth:700,margin:"0 auto"}}>
          {/* Score Card */}
          <div style={{background:"#fff",borderRadius:20,padding:32,boxShadow:"0 8px 40px rgba(0,0,0,0.1)",textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:56,marginBottom:8}}>{pct>=75?"🏆":pct>=40?"👍":"📚"}</div>
            <div style={{fontSize:22,fontWeight:700,marginBottom:4}}>Exam Submitted!</div>
            <div style={{fontSize:14,color:"var(--muted)",marginBottom:20}}>{studentData?.student?.name}</div>
            <div style={{fontSize:52,fontWeight:700,color,marginBottom:4}}>{pct}%</div>
            <div style={{fontSize:16,color:"var(--muted)",marginBottom:20}}>{result.marks_obtained} / {result.total_marks} marks</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
              {[
                {v:result.total_correct, l:"Correct",  c:"var(--success)", bg:"#E8F5E9"},
                {v:result.total_wrong,   l:"Wrong",    c:"var(--danger)",  bg:"#FFEBEE"},
                {v:result.total_skipped, l:"Skipped",  c:"var(--muted)",   bg:"var(--bg3)"}
              ].map((s,i)=>(
                <div key={i} style={{background:s.bg,borderRadius:12,padding:14}}>
                  <div style={{fontSize:28,fontWeight:700,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:12,color:"var(--muted)"}}>{s.l}</div>
                </div>
              ))}
            </div>
            {result.auto_submitted&&<div className="alert alert-info" style={{marginBottom:12}}>⏱ Auto-submitted when time ran out</div>}
            <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
              <button className="btn btn-primary" onClick={()=>setPhase("rankList")}>🏅 View Rank List</button>
              <button className="btn btn-secondary" onClick={()=>setPhase("examList")}>← Exam List</button>
            </div>
          </div>

          {/* Question by Question Detail */}
          {resultDetail && resultDetail.length > 0 && (
            <div style={{background:"#fff",borderRadius:20,padding:24,boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:16}}>📋 Question Details</div>
              {resultDetail.map((r,i)=>{
                const isCorrect = r.is_correct
                const isSkipped = !r.selected_answer
                const bgColor = isSkipped?"var(--bg3)":isCorrect?"#E8F5E9":"#FFEBEE"
                const borderColor = isSkipped?"var(--border)":isCorrect?"var(--success)":"var(--danger)"
                return (
                  <div key={i} style={{border:`1.5px solid ${borderColor}`,borderRadius:12,padding:14,marginBottom:10,background:bgColor}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <div style={{width:26,height:26,borderRadius:"50%",background:isSkipped?"var(--muted)":isCorrect?"var(--success)":"var(--danger)",color:"#fff",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {i+1}
                      </div>
                      <span style={{fontSize:12,fontWeight:700,color:isSkipped?"var(--muted)":isCorrect?"var(--success)":"var(--danger)"}}>
                        {isSkipped?"⊘ Skipped":isCorrect?"✓ Correct":"✗ Wrong"}
                      </span>
                      <span style={{marginLeft:"auto",fontSize:11,color:"var(--muted)"}}>
                        {isCorrect?"+"+r.marks+" mark":isSkipped?"0":r.marks_awarded+" mark"}
                      </span>
                    </div>
                    <div style={{fontSize:13,marginBottom:8,color:"var(--text)"}}
                      dangerouslySetInnerHTML={{__html:displayMath(r.question_text||"")}}/>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                      {["a","b","c","d"].map(opt=>{
                        const val = r[`option_${opt}`]
                        const isSelected = r.selected_answer?.toLowerCase()===opt
                        const isRight = r.correct_answer?.toLowerCase()===opt
                        let bg = "var(--bg2)", border = "var(--border)", fw = 400
                        if(isRight) { bg="#E8F5E9"; border="var(--success)"; fw=700 }
                        if(isSelected && !isRight) { bg="#FFEBEE"; border="var(--danger)"; fw=700 }
                        return (
                          <div key={opt} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderRadius:8,background:bg,border:`1.5px solid ${border}`}}>
                            <span style={{fontWeight:700,fontSize:11,color:isRight?"var(--success)":isSelected&&!isRight?"var(--danger)":"var(--muted)"}}>{opt.toUpperCase()}</span>
                            <span style={{fontSize:12,fontWeight:fw}}>{val}</span>
                            {isRight&&<span style={{marginLeft:"auto",fontSize:10,color:"var(--success)"}}>✓</span>}
                            {isSelected&&!isRight&&<span style={{marginLeft:"auto",fontSize:10,color:"var(--danger)"}}>✗</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }
  return null
}


function FeesPage({ state, go }) {
  const now = new Date()
  const [selMonth, setSelMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`)
  const [selBatch, setSelBatch] = useState("")
  const [students, setStudents] = useState([])
  const [batches, setBatches] = useState([])
  const [fees, setFees] = useState([]) // monthly fee records
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState(null) // {student_id, name}
  const [editForm, setEditForm] = useState({amount:"", note:""})
  const [payModal, setPayModal] = useState(null)
  const [payAmount, setPayAmount] = useState("")
  const [msg, setMsg] = useState("")
  const [outstanding, setOutstanding] = useState({students:[], total_due:0})
  const [showOutstanding, setShowOutstanding] = useState(false)
  const [outstandingLoading, setOutstandingLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const [s, b, f] = await Promise.all([p2get("/student/list"), p2get("/batch/list"), p2get("/fees/monthly")])
    const studentList = s.students||[]
    const batchList = b.batches||[]
    const feeList = f.fees||[]
    setStudents(studentList)
    setBatches(batchList)
    setFees(feeList)
    setLoading(false)
    return {studentList, batchList, feeList}
  }

  const ensureMonthFees = async (month, studentList, batchList, feeList) => {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`

    // Never auto-create fees for future months
    if(month > currentMonth) return false

    const feeSet = new Set(feeList.filter(f=>f.month===month).map(f=>Number(f.student_id)))
    const toCreate = []
    for(const s of studentList) {
      if(!feeSet.has(Number(s.id))) {
        // Don't create fees for months before admission
        if(s.admission_date) {
          const admMonth = String(s.admission_date).substring(0,7)
          if(admMonth > month) continue
        }
        const batch = batchList.find(b=>String(b.id)===String(s.batch_id))
        const defaultFee = parseFloat(batch?.default_fee||0)
        if(defaultFee > 0) {
          toCreate.push({student_id:s.id, amount:defaultFee, note:`${batch.name} monthly fee (auto)`})
        }
      }
    }
    if(toCreate.length > 0) {
      await Promise.all(toCreate.map(t=>p2post("/fees/monthly/set",{...t,month})))
      return true
    }
    return false
  }

  useEffect(()=>{
    load().then(({studentList,batchList,feeList})=>{
      // Apply defaults for current month on first load
      ensureMonthFees(selMonth, studentList, batchList, feeList).then(changed=>{ if(changed) load() })
    })
    // Load outstanding dues
    p2get("/fees/outstanding").then(d=>setOutstanding(d))
  },[])

  // When month changes, ensure fees exist for that month
  useEffect(()=>{
    if(!students.length||!batches.length) return
    ensureMonthFees(selMonth, students, batches, fees).then(changed=>{ if(changed) load() })
  },[selMonth])

  // Generate 3 future + current + 11 past months
  const months = Array.from({length:15},(_,i)=>{
    const d = new Date(now.getFullYear(), now.getMonth()+(3-i), 1)
    return {
      value:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
      label:d.toLocaleString('default',{month:'long',year:'numeric'}),
      isFuture: i < 3,
      isCurrent: i === 3
    }
  })

  // Fee map for selected month: studentId → fee record
  const feeMap = {}
  fees.filter(f=>f.month===selMonth).forEach(f=>{ feeMap[f.student_id]=f })

  // Only show students admitted on or before selected month
  const eligibleStudents = students.filter(s => {
    if(!s.admission_date) return true // no admission date = always show
    const admMonth = String(s.admission_date).substring(0,7) // "2026-04"
    return admMonth <= selMonth
  })

  const filteredStudents = selBatch
    ? eligibleStudents.filter(s=>String(s.batch_id)===String(selBatch))
    : eligibleStudents

  const totalCollected = filteredStudents.reduce((a,s)=>a+(parseFloat(feeMap[s.id]?.paid)||0),0)
  const totalDue = filteredStudents.reduce((a,s)=>{
    const f=feeMap[s.id]; return a+Math.max(0,(parseFloat(f?.amount)||0)-(parseFloat(f?.paid)||0))
  },0)
  const fullyPaid = filteredStudents.filter(s=>feeMap[s.id]?.status==="paid").length
  const notSet = filteredStudents.filter(s=>!feeMap[s.id]).length

  const saveFee = async () => {
    await p2post("/fees/monthly/set", {student_id:editModal.student_id, month:selMonth, amount:parseFloat(editForm.amount)||0, note:editForm.note})
    setEditModal(null); setMsg("✓ Fee set for "+editModal.name+" — "+months.find(m=>m.value===selMonth)?.label); load()
  }

  const payFee = async () => {
    await p2post("/fees/monthly/pay", {student_id:payModal.student_id, month:selMonth, paid:parseFloat(payAmount)||0})
    setPayModal(null); setMsg("✓ Payment recorded!"); load()
  }

  const deleteFee = async (sid) => {
    await fetch(`/api/v2/fees/monthly/${sid}/${selMonth}`, {method:"DELETE", headers:authHeaders()})
    setMsg("✓ Fee record deleted!"); load()
  }

  const statusBadge = (f) => {
    if(!f) return <span className="badge" style={{background:"var(--bg3)",color:"var(--muted)",fontSize:10}}>Not Set</span>
    if(f.status==="paid") return <span className="badge badge-green" style={{fontSize:10}}>✓ Paid</span>
    if(f.status==="partial") return <span className="badge badge-amber" style={{fontSize:10}}>Partial</span>
    return <span className="badge" style={{background:"#FFEBEE",color:"var(--danger)",border:"1px solid #FFCDD2",fontSize:10}}>Pending</span>
  }

  return (
    <div className="shell">
      <Sidebar page="fees" go={go} user={state.user}/>
      <div className="main">
        <div className="top-bar">
          <div style={{flex:1}}><div className="top-bar-title">Fees Management</div><div className="top-bar-sub">Monthly fee tracking per student</div></div>
          <a href={`/export/fees/excel?month=${selMonth}`} download className="btn btn-secondary" style={{fontSize:12,textDecoration:"none",marginRight:8}}>📊 Export Excel</a>
          <select value={selMonth} onChange={e=>setSelMonth(e.target.value)} style={{minWidth:180,marginRight:8}}>
            {months.map(m=>(
              <option key={m.value} value={m.value}>
                {m.isFuture?"→ ":m.isCurrent?"● ":""}{m.label}
              </option>
            ))}
          </select>
          <select value={selBatch} onChange={e=>setSelBatch(e.target.value)} style={{minWidth:160}}>
            <option value="">— All Batches —</option>
            {batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="page">
          {msg&&<div className="alert alert-success">{msg}<button style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer"}} onClick={()=>setMsg("")}>✕</button></div>}

          {/* Monthly Summary */}
          <div className="stats-row">
            {[
              {v:filteredStudents.length, l:"Students",      c:"var(--accent2)", i:"👥"},
              {v:"₹"+totalCollected.toFixed(0), l:"Collected", c:"var(--success)", i:"✓"},
              {v:"₹"+totalDue.toFixed(0),  l:"Pending Dues", c:totalDue>0?"var(--danger)":"var(--muted)", i:"⚠"},
              {v:notSet,                   l:"Not Set",       c:"var(--muted)",    i:"?"},
            ].map((s,i)=>(
              <div className="stat-card" key={i}>
                <div className="stat-icon">{s.i}</div>
                <div className="stat-value" style={{color:s.c}}>{s.v}</div>
                <div className="stat-label">{s.l}</div>
              </div>
            ))}
          </div>

          {/* Set Fee Modal */}
          {editModal && (
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{background:"#fff",borderRadius:16,padding:28,maxWidth:380,width:"90%",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
                <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>💰 Set Fee — {editModal.name}</div>
                <div style={{fontSize:12,color:"var(--muted)",marginBottom:16}}>{months.find(m=>m.value===selMonth)?.label}</div>
                <div className="form-group"><label>Fee Amount (₹)</label>
                  <input type="number" value={editForm.amount} onChange={e=>setEditForm({...editForm,amount:e.target.value})} placeholder="e.g. 500" autoFocus/>
                </div>
                <div className="form-group"><label>Note (optional)</label>
                  <input value={editForm.note} onChange={e=>setEditForm({...editForm,note:e.target.value})} placeholder="e.g. Tuition fee"/>
                </div>
                <div className="btn-row">
                  <button className="btn btn-primary" onClick={saveFee}>Save</button>
                  <button className="btn btn-secondary" onClick={()=>setEditModal(null)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Pay Modal */}
          {payModal && (
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{background:"#fff",borderRadius:16,padding:28,maxWidth:380,width:"90%",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
                <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>💳 Record Payment — {payModal.name}</div>
                <div style={{fontSize:12,color:"var(--muted)",marginBottom:16}}>{months.find(m=>m.value===selMonth)?.label} · Total: ₹{feeMap[payModal.student_id]?.amount}</div>
                <div className="form-group"><label>Amount Paid (₹)</label>
                  <input type="number" value={payAmount} onChange={e=>setPayAmount(e.target.value)}
                    placeholder={"Full: ₹"+feeMap[payModal.student_id]?.amount} autoFocus/>
                </div>
                <div style={{display:"flex",gap:8,marginBottom:12}}>
                  <button className="btn btn-secondary" style={{fontSize:11,padding:"4px 10px"}}
                    onClick={()=>setPayAmount(String(feeMap[payModal.student_id]?.amount||""))}>Full Amount</button>
                  <button className="btn btn-secondary" style={{fontSize:11,padding:"4px 10px"}}
                    onClick={()=>setPayAmount(String(Math.round((feeMap[payModal.student_id]?.amount||0)/2)))}>Half</button>
                </div>
                <div className="btn-row">
                  <button className="btn btn-primary" onClick={payFee}>Record Payment</button>
                  <button className="btn btn-secondary" onClick={()=>setPayModal(null)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Outstanding Dues Summary — clickable to expand */}
          {outstanding.total_due > 0 && (
            <div style={{border:`2px solid ${showOutstanding?"var(--accent)":"var(--danger)"}`,borderRadius:12,padding:16,marginBottom:16,cursor:"pointer",background:"#fff"}}
              onClick={()=>setShowOutstanding(s=>!s)}>
              <div style={{display:"flex",alignItems:"center",gap:16}}>
                <div style={{fontSize:36}}>⚠️</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:700,color:"var(--danger)"}}>Total Outstanding Dues</div>
                  <div style={{fontSize:12,color:"var(--muted)"}}>Across all months from admission · {outstanding.students?.length||0} students</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:28,fontWeight:700,color:"var(--danger)"}}>₹{parseFloat(outstanding.total_due||0).toFixed(0)}</div>
                  <div style={{fontSize:11,color:"var(--muted)"}}>{showOutstanding?"▲ Hide":"▼ Show details"}</div>
                </div>
              </div>
              {showOutstanding && (
                <div style={{marginTop:16,borderTop:"1px solid var(--border)",paddingTop:12}} onClick={e=>e.stopPropagation()}>
                  {(outstanding.students||[]).map(s=>(
                    <div key={s.student_id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:10,marginBottom:6,background:"var(--bg3)",border:"1px solid var(--border)",flexWrap:"wrap"}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:"var(--danger)",color:"#fff",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{s.student_name?.[0]}</div>
                      <div style={{flex:1,minWidth:120}}>
                        <div style={{fontSize:13,fontWeight:700}}>{s.student_name}</div>
                        <div style={{fontSize:11,color:"var(--muted)"}}>Roll: {s.roll_no||"—"} · {s.batch_name||"No batch"}</div>
                      </div>
                      <div style={{textAlign:"center",minWidth:80}}>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--success)"}}>₹{parseFloat(s.total_paid||0).toFixed(0)}</div>
                        <div style={{fontSize:10,color:"var(--muted)"}}>paid</div>
                      </div>
                      <div style={{textAlign:"center",minWidth:80}}>
                        <div style={{fontSize:14,fontWeight:700,color:"var(--danger)"}}>₹{parseFloat(s.total_due||0).toFixed(0)}</div>
                        <div style={{fontSize:10,color:"var(--muted)"}}>total due</div>
                      </div>
                      <div style={{fontSize:11,color:"var(--warning)",minWidth:90}}>{s.months_pending} month{s.months_pending!==1?"s":""} pending</div>
                      <button className="btn btn-primary" style={{padding:"4px 14px",fontSize:12}}
                        onClick={async()=>{
                          const studentFees = fees.filter(f=>Number(f.student_id)===Number(s.student_id)&&parseFloat(f.amount)>parseFloat(f.paid||0))
                          for(const f of studentFees) await p2post("/fees/monthly/pay",{student_id:s.student_id,month:f.month,paid:parseFloat(f.amount)})
                          setMsg(`✓ All dues cleared for ${s.student_name}!`)
                          load(); p2get("/fees/outstanding").then(d=>setOutstanding(d))
                        }}>
                        💳 Clear All Dues
                      </button>
                    </div>
                  ))}
                  <div style={{textAlign:"right",fontSize:12,fontWeight:700,color:"var(--danger)",marginTop:8}}>
                    Total Outstanding: ₹{parseFloat(outstanding.total_due||0).toFixed(0)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Student Fee List */}
          <div className="card">
            <div style={{display:"flex",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
              <div className="card-title" style={{marginBottom:0}}>
                📅 {months.find(m=>m.value===selMonth)?.label}
              </div>
              <span className="badge badge-blue">{filteredStudents.length} students</span>
              <div style={{marginLeft:"auto",display:"flex",gap:8}}>
                <button className="btn btn-success" style={{padding:"4px 14px",fontSize:12}}
                  onClick={async()=>{
                    const unpaid = filteredStudents.filter(s=>{
                      const f=feeMap[s.id]; return f && parseFloat(f.amount)>0 && parseFloat(f.paid)<parseFloat(f.amount)
                    })
                    if(!unpaid.length) return setMsg("All students are already paid!")
                    for(const s of unpaid) {
                      const f=feeMap[s.id]
                      const due=Math.max(0,parseFloat(f.amount)-parseFloat(f.paid))
                      await p2post("/fees/monthly/pay",{student_id:s.id,month:selMonth,paid:parseFloat(f.amount)})
                    }
                    setMsg(`✓ Marked all ${unpaid.length} students as paid!`); load()
                  }}>
                  💳 Pay All
                </button>
              </div>
            </div>

            {loading ? <div style={{textAlign:"center",padding:20,color:"var(--muted)"}}>Loading…</div> :
            filteredStudents.map(s=>{
              const f = feeMap[s.id]
              const paid = parseFloat(f?.paid)||0
              const amount = parseFloat(f?.amount)||0
              const due = Math.max(0, amount - paid)
              const pct = amount>0 ? Math.round(paid/amount*100) : 0
              return (
                <div key={s.id} style={{borderRadius:12,marginBottom:8,border:"1px solid var(--border)",overflow:"hidden"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"var(--bg3)",flexWrap:"wrap"}}>
                    <div style={{width:34,height:34,borderRadius:"50%",background:"var(--accent2)",color:"#fff",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{s.name?.[0]}</div>
                    <div style={{flex:1,minWidth:120}}>
                      <div style={{fontSize:13,fontWeight:700}}>{s.name}</div>
                      <div style={{fontSize:11,color:"var(--muted)"}}>Roll: {s.roll_no||"—"}</div>
                    </div>
                    {f ? <>
                      <div style={{textAlign:"center",minWidth:70}}>
                        <div style={{fontSize:14,fontWeight:700}}>₹{amount.toFixed(0)}</div>
                        <div style={{fontSize:10,color:"var(--muted)"}}>total</div>
                      </div>
                      <div style={{textAlign:"center",minWidth:70}}>
                        <div style={{fontSize:14,fontWeight:700,color:"var(--success)"}}>₹{paid.toFixed(0)}</div>
                        <div style={{fontSize:10,color:"var(--muted)"}}>paid</div>
                      </div>
                      <div style={{textAlign:"center",minWidth:70}}>
                        <div style={{fontSize:14,fontWeight:700,color:due>0?"var(--danger)":"var(--success)"}}>₹{due.toFixed(0)}</div>
                        <div style={{fontSize:10,color:"var(--muted)"}}>due</div>
                      </div>
                      {statusBadge(f)}
                    </> : <div style={{flex:1,textAlign:"right",color:"var(--muted)",fontSize:12}}>Fee not set for this month</div>}
                    <div style={{display:"flex",gap:6}}>
                      <button className="btn btn-secondary" style={{padding:"3px 10px",fontSize:11}}
                        onClick={()=>{setEditModal({student_id:s.id,name:s.name});setEditForm({amount:f?.amount||"",note:f?.note||""})}}>
                        ✏ {f?"Edit":"Set Fee"}
                      </button>
                      {f && due>0 && <button className="btn btn-primary" style={{padding:"3px 10px",fontSize:11}}
                        onClick={()=>{setPayModal({student_id:s.id,name:s.name});setPayAmount(String(due))}}>
                        💳 Pay
                      </button>}
                      {f && <button className="btn btn-danger" style={{padding:"3px 10px",fontSize:11}} onClick={()=>deleteFee(s.id)}>🗑</button>}
                    </div>
                  </div>
                  {/* Progress bar */}
                  {f && <div style={{height:4,background:"var(--bg)",borderRadius:0}}>
                    <div style={{height:"100%",width:pct+"%",background:pct>=100?"var(--success)":pct>0?"var(--warning)":"var(--danger)",transition:"width 0.4s"}}/>
                  </div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}



// ── Reusable Confirm Modal ────────────────────────────────────────────────────
function ConfirmModal({ modal, onClose }) {
  const [inputVal, setInputVal] = useState("")
  if (!modal) return null
  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:9999,
      display:"flex",alignItems:"center",justifyContent:"center",padding:24
    }}>
      <div style={{
        background:"#fff",borderRadius:16,padding:"28px 32px",maxWidth:440,width:"100%",
        boxShadow:"0 20px 60px rgba(0,0,0,0.25)",animation:"fadeIn 0.15s ease"
      }}>
        <div style={{fontSize:18,fontWeight:700,color:"#1A2E1A",marginBottom:10}}>
          {modal.title}
        </div>
        <div style={{fontSize:14,color:"#555",lineHeight:1.6,marginBottom:16,whiteSpace:"pre-line"}}>
          {modal.message}
        </div>
        {modal.hasInput && (
          <div className="form-group" style={{marginBottom:16}}>
            <label>{modal.inputLabel || "Note"}</label>
            <input value={inputVal} onChange={e=>setInputVal(e.target.value)}
              placeholder="Optional reason…" autoFocus/>
          </div>
        )}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button className="btn btn-secondary" onClick={onClose} style={{minWidth:80}}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{
              minWidth:120, justifyContent:"center",
              background: modal.danger ? "var(--danger)" : "var(--accent)",
              borderColor: modal.danger ? "var(--danger)" : "var(--accent)"
            }}
            onClick={()=>modal.onConfirm(inputVal)}>
            {modal.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════
// PHASE 3 — SUPERADMIN PAGE
// ═══════════════════════════════════════════════════════════════

const PLAN_LABELS = {
  starter:    { label:"Starter",    color:"#1565C0", bg:"#E3F2FD", price:"₹299" },
  basic:      { label:"Basic",      color:"#2E7D32", bg:"#E8F5E9", price:"₹699" },
  premium:    { label:"Premium",    color:"#6A1B9A", bg:"#F3E5F5", price:"₹1,499" },
  school:     { label:"School",     color:"#E65100", bg:"#FFF3E0", price:"₹3,999" },
  superadmin: { label:"Superadmin", color:"#B71C1C", bg:"#FFEBEE", price:"—" },
}

function PlanBadge({ plan }) {
  const p = PLAN_LABELS[plan] || { label: plan, color: "#555", bg: "#eee" }
  return (
    <span style={{ background: p.bg, color: p.color, border: `1px solid ${p.color}40`,
      borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
      {p.label}
    </span>
  )
}

function SuperadminPage({ state, updateState, go }) {
  const [institutes, setInstitutes] = useState([])
  const [stats, setStats]           = useState({})
  const [loading, setLoading]       = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating]     = useState(false)
  const [form, setForm]             = useState({ name:"", email:"", password:"", plan:"starter" })
  const [formErr, setFormErr]       = useState("")
  const [msg, setMsg]               = useState("")

  const [usageMap, setUsageMap]       = useState({})
  const [pendingPay, setPendingPay]   = useState([])
  const [allPayments, setAllPayments] = useState([])
  const [totalCollected, setTotalCollected] = useState(0)
  const [approvingId, setApprovingId] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null) // {title, message, onConfirm, danger}

  const loadBilling = async () => {
    const [pRes, aRes] = await Promise.all([
      saGet("/billing/admin/pending"),
      saGet("/billing/admin/all"),
    ])
    setPendingPay(pRes.payments || [])
    setAllPayments(aRes.payments || [])
    setTotalCollected(aRes.total_collected || 0)
  }

  const approvePayment = (id, inst) => {
    setConfirmModal({
      title: "Approve Payment",
      message: `Approve ₹${inst.amount} payment from "${inst.institute_name}" for ${inst.plan?.toUpperCase()} plan?

Txn ID: ${inst.transaction_id}`,
      confirmLabel: "✅ Yes, Approve",
      danger: false,
      onConfirm: async () => {
        setConfirmModal(null)
        setApprovingId(id)
        const res = await saPost(`/billing/admin/approve/${id}`, {notes:""})
        if (res.success) { setMsg(`✅ Payment approved — ${inst.institute_name} upgraded to ${inst.plan?.toUpperCase()}`) ; loadBilling(); load() }
        else setMsg(`❌ ${res.detail || "Error"}`)
        setApprovingId(null)
      }
    })
  }

  const rejectPayment = (id, inst) => {
    setConfirmModal({
      title: "Reject Payment",
      message: `Reject payment from "${inst.institute_name}"?

Txn ID: ${inst.transaction_id}
This action cannot be undone.`,
      confirmLabel: "✕ Yes, Reject",
      danger: true,
      hasInput: true,
      inputLabel: "Reason (optional)",
      onConfirm: async (reason) => {
        setConfirmModal(null)
        const res = await saPost(`/billing/admin/reject/${id}`, {notes: reason || "Rejected by admin"})
        if (res.success) { setMsg("Payment rejected"); loadBilling() }
      }
    })
  }

  const load = async () => {
    setLoading(true)
    const [iRes, sRes] = await Promise.all([
      saGet("/superadmin/institutes"),
      saGet("/superadmin/stats"),
    ])
    const instList = iRes.institutes || []
    setInstitutes(instList)
    setStats(sRes)
    // Load usage for each non-superadmin institute
    const uMap = {}
    await Promise.all(
      instList.filter(i => i.plan !== "superadmin").map(async i => {
        try {
          const u = await saGet(`/superadmin/institutes/${i.id}/usage`)
          uMap[i.id] = u
        } catch {}
      })
    )
    setUsageMap(uMap)
    setLoading(false)
  }

  useEffect(() => { load(); loadBilling() }, [])

  const createInstitute = async () => {
    if (!form.name || !form.email || !form.password) { setFormErr("All fields required"); return }
    setCreating(true); setFormErr("")
    const res = await saPost("/superadmin/institutes", form)
    if (res.success) {
      setMsg("✅ Institute created: " + form.name)
      setShowCreate(false)
      setForm({ name:"", email:"", password:"", plan:"starter" })
      load()
    } else {
      setFormErr(res.detail || "Failed to create")
    }
    setCreating(false)
  }

  const toggleSuspend = (inst) => {
    const action = inst.active ? "suspend" : "reactivate"
    setConfirmModal({
      title: `${action.charAt(0).toUpperCase()+action.slice(1)} Institute`,
      message: `Are you sure you want to ${action} "${inst.name}"?` + (inst.active ? "\n\nThey will not be able to login until reactivated." : ""),
      confirmLabel: inst.active ? "🔒 Yes, Suspend" : "✅ Yes, Reactivate",
      danger: inst.active,
      onConfirm: async () => {
        setConfirmModal(null)
        await saPut(`/superadmin/institutes/${inst.id}/suspend`, { active: !inst.active })
        setMsg(`✅ Institute ${action}d`)
        load()
      }
    })
  }

  const changePlan = async (inst, plan) => {
    await saPut(`/superadmin/institutes/${inst.id}/plan`, { plan })
    setMsg(`✅ Plan updated to ${plan}`)
    load()
  }

  const resetUsage = (inst) => {
    setConfirmModal({
      title: "Reset Question Usage",
      message: `Reset this month's question usage for "${inst.name}" back to 0?

This gives them a fresh quota for the current month.`,
      confirmLabel: "🔄 Yes, Reset",
      danger: false,
      onConfirm: async () => {
        setConfirmModal(null)
        await saPost(`/superadmin/institutes/${inst.id}/reset-usage`, {})
        setMsg(`✅ Usage reset for ${inst.name}`)
        load()
      }
    })
  }

  const logout = () => {
    clearToken()
    updateState({ user: null, token: null })
    go("login")
  }

  const isSelf = (id) => id === state.user?.id

  return (
    <div style={{ minHeight:"100vh", background:"#F5F5F5" }}>
      <ConfirmModal modal={confirmModal} onClose={()=>setConfirmModal(null)} />
      {/* Top bar */}
      <div style={{ background:"#B71C1C", color:"#fff", padding:"0 32px", height:56,
        display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 2px 8px rgba(0,0,0,0.15)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:22 }}>🛡️</span>
          <span style={{ fontWeight:700, fontSize:18 }}>ExamGuru Superadmin</span>
          <span style={{ fontSize:12, opacity:0.7, marginLeft:4 }}>Platform Control Panel</span>
        </div>
        <button className="btn" style={{ background:"rgba(255,255,255,0.15)", color:"#fff", border:"1px solid rgba(255,255,255,0.3)" }}
          onClick={logout}>Sign out</button>
      </div>

      <div style={{ padding:"28px 32px" }}>
        {msg && <div className="alert alert-success" style={{marginBottom:16}} onClick={()=>setMsg("")}>{msg}</div>}

        {/* Stats row */}
        {!loading && (
          <div className="stats-row" style={{ marginBottom:24 }}>
            {[
              { icon:"🏫", val: stats.total_institutes||0,  label:"Total Institutes" },
              { icon:"✅", val: stats.active_institutes||0, label:"Active" },
              { icon:"👥", val: stats.total_students||0,    label:"Total Students" },
              { icon:"📝", val: stats.total_exams||0,       label:"Total Exams" },
              { icon:"💰", val: `₹${totalCollected.toLocaleString()}`, label:"Total Collected" },
              { icon:"⏳", val: pendingPay.length,          label:"Pending Payments" },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-value">{s.val}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Pending payments */}
        {pendingPay.length > 0 && (
          <div className="card" style={{marginBottom:20,border:"2px solid #FFE082"}}>
            <div className="card-title" style={{color:"#F9A825"}}>
              ⏳ Pending Payments ({pendingPay.length})
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr style={{borderBottom:"2px solid var(--border)"}}>
                    {["Institute","Email","Plan","Amount","Txn ID","App","Submitted","Actions"].map(h=>(
                      <th key={h} style={{textAlign:"left",padding:"8px 12px",fontSize:11,color:"var(--muted)",fontWeight:700,textTransform:"uppercase"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingPay.map(p=>(
                    <tr key={p.id} style={{borderBottom:"1px solid var(--border)",background:"#FFFDE7"}}>
                      <td style={{padding:"10px 12px",fontWeight:600}}>{p.institute_name}</td>
                      <td style={{padding:"10px 12px",color:"var(--muted)",fontSize:11}}>{p.institute_email}</td>
                      <td style={{padding:"10px 12px"}}><b style={{textTransform:"uppercase"}}>{p.plan}</b></td>
                      <td style={{padding:"10px 12px",fontWeight:700,color:"var(--accent2)"}}>₹{p.amount}</td>
                      <td style={{padding:"10px 12px"}}><code style={{background:"#f5f5f5",padding:"2px 6px",borderRadius:4,fontSize:11}}>{p.transaction_id}</code></td>
                      <td style={{padding:"10px 12px",fontSize:11}}>{p.upi_app}</td>
                      <td style={{padding:"10px 12px",fontSize:11,color:"var(--muted)"}}>{p.submitted_at?.slice(0,16)}</td>
                      <td style={{padding:"10px 12px"}}>
                        <div style={{display:"flex",gap:6}}>
                          <button className="btn btn-primary" style={{padding:"3px 12px",fontSize:11,background:"#2E7D32"}}
                            onClick={()=>approvePayment(p.id, p)}
                            disabled={approvingId===p.id}>
                            {approvingId===p.id ? <div className="spinner"/> : "✅ Approve"}
                          </button>
                          <button className="btn btn-secondary" style={{padding:"3px 10px",fontSize:11,color:"var(--danger)"}}
                            onClick={()=>rejectPayment(p.id, p)}>
                            ✕ Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Plan breakdown */}
        {!loading && stats.by_plan && (
          <div className="card" style={{marginBottom:20}}>
            <div className="card-title">📊 Institutes by Plan</div>
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              {Object.entries(PLAN_LABELS).filter(([k])=>k!=="superadmin").map(([plan,info])=>(
                <div key={plan} style={{background:info.bg,border:`1px solid ${info.color}40`,borderRadius:12,
                  padding:"12px 20px",textAlign:"center",minWidth:100}}>
                  <div style={{fontSize:22,fontWeight:700,color:info.color}}>{stats.by_plan?.[plan]||0}</div>
                  <div style={{fontSize:12,color:info.color,fontWeight:600}}>{info.label}</div>
                  <div style={{fontSize:11,color:"#888"}}>{info.price}/mo</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Institutes table */}
        <div className="card">
          <div className="card-title" style={{justifyContent:"space-between"}}>
            <span>🏫 Institutes ({institutes.filter(i=>i.plan!=="superadmin").length})</span>
            <button className="btn btn-primary" onClick={()=>setShowCreate(true)}>+ New Institute</button>
          </div>

          {/* Create form */}
          {showCreate && (
            <div style={{background:"var(--light)",border:"1.5px solid var(--border2)",borderRadius:12,padding:20,marginBottom:20}}>
              <div style={{fontWeight:700,marginBottom:14,fontSize:14}}>➕ Create New Institute</div>
              {formErr && <div className="alert alert-error">{formErr}</div>}
              <div className="form-row">
                <div className="form-group">
                  <label>Institute / School Name</label>
                  <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Sunrise Coaching Centre" />
                </div>
                <div className="form-group">
                  <label>Email (login)</label>
                  <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="owner@school.com" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Min 6 characters" />
                </div>
                <div className="form-group">
                  <label>Plan</label>
                  <select value={form.plan} onChange={e=>setForm({...form,plan:e.target.value})}>
                    <option value="starter">Starter — ₹299/mo (80 Q)</option>
                    <option value="basic">Basic — ₹699/mo (200 Q)</option>
                    <option value="premium">Premium — ₹1,499/mo (500 Q)</option>
                    <option value="school">School — ₹3,999/mo (1500 Q)</option>
                  </select>
                </div>
              </div>
              <div className="btn-row">
                <button className="btn btn-primary" onClick={createInstitute} disabled={creating}>
                  {creating ? <div className="spinner"/> : "Create Institute"}
                </button>
                <button className="btn btn-secondary" onClick={()=>{ setShowCreate(false); setFormErr("") }}>Cancel</button>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{textAlign:"center",padding:40,color:"var(--muted)"}}>Loading...</div>
          ) : (
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr style={{borderBottom:"2px solid var(--border)"}}>
                    {["#","Name","Email","Plan","Usage","Students","Exams","Joined","Status","Actions"].map(h=>(
                      <th key={h} style={{textAlign:"left",padding:"8px 12px",fontSize:11,
                        color:"var(--muted)",fontWeight:700,textTransform:"uppercase"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {institutes.filter(i=>i.plan!=="superadmin").map(inst => (
                    <tr key={inst.id} style={{borderBottom:"1px solid var(--border)",
                      background: inst.active ? "transparent" : "#FFF3F3",
                      opacity: inst.active ? 1 : 0.7}}>
                      <td style={{padding:"10px 12px",color:"var(--muted)"}}>{inst.id}</td>
                      <td style={{padding:"10px 12px",fontWeight:600}}>{inst.name}</td>
                      <td style={{padding:"10px 12px",color:"var(--muted)"}}>{inst.email}</td>
                      <td style={{padding:"10px 12px"}}>
                        <select value={inst.plan} onChange={e=>changePlan(inst,e.target.value)}
                          style={{width:"auto",padding:"3px 8px",fontSize:11,borderRadius:6}}>
                          <option value="starter">Starter</option>
                          <option value="basic">Basic</option>
                          <option value="premium">Premium</option>
                          <option value="school">School</option>
                        </select>
                      </td>
                      <td style={{padding:"10px 12px"}}>
                        {usageMap[inst.id] ? (
                          <div style={{minWidth:80}}>
                            <div style={{fontSize:11,fontWeight:700,color:usageMap[inst.id].percent>=90?"var(--danger)":"var(--text)"}}>
                              {usageMap[inst.id].used}/{usageMap[inst.id].limit}
                            </div>
                            <div style={{height:4,background:"var(--border)",borderRadius:2,marginTop:2,overflow:"hidden"}}>
                              <div style={{height:"100%",width:Math.min(usageMap[inst.id].percent,100)+"%",
                                background:usageMap[inst.id].percent>=90?"var(--danger)":usageMap[inst.id].percent>=70?"var(--warning)":"var(--accent)",
                                borderRadius:2}}/>
                            </div>
                          </div>
                        ) : "—"}
                      </td>
                      <td style={{padding:"10px 12px",textAlign:"center"}}>{inst.student_count}</td>
                      <td style={{padding:"10px 12px",textAlign:"center"}}>{inst.exam_count}</td>
                      <td style={{padding:"10px 12px",color:"var(--muted)",fontSize:11}}>
                        {inst.created_at ? inst.created_at.slice(0,10) : "—"}
                      </td>
                      <td style={{padding:"10px 12px"}}>
                        <span style={{
                          background: inst.active ? "#E8F5E9" : "#FFEBEE",
                          color: inst.active ? "#2E7D32" : "#C62828",
                          borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700
                        }}>{inst.active ? "Active" : "Suspended"}</span>
                      </td>
                      <td style={{padding:"10px 12px"}}>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          <button className="btn btn-secondary" style={{padding:"3px 10px",fontSize:11}}
                            onClick={()=>toggleSuspend(inst)}>
                            {inst.active ? "🔒 Suspend" : "✅ Reactivate"}
                          </button>
                          <button className="btn btn-secondary" style={{padding:"3px 10px",fontSize:11}}
                            onClick={()=>resetUsage(inst)} title="Reset monthly question usage">
                            🔄 Reset Q
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {institutes.filter(i=>i.plan!=="superadmin").length === 0 && (
                    <tr><td colSpan={9} style={{textAlign:"center",padding:40,color:"var(--muted)"}}>
                      No institutes yet. Create one above.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════
// PHASE 4 — BILLING & PLANS PAGE
// ═══════════════════════════════════════════════════════════════

const PLAN_CONFIG = {
  starter:  { label:"Starter",  price:299,  q:80,   files:3,   color:"#1565C0", bg:"#E3F2FD" },
  basic:    { label:"Basic",    price:699,  q:200,  files:5,   color:"#2E7D32", bg:"#E8F5E9" },
  premium:  { label:"Premium",  price:1499, q:500,  files:10,  color:"#6A1B9A", bg:"#F3E5F5" },
  school:   { label:"School",   price:3999, q:1500, files:999, color:"#E65100", bg:"#FFF3E0" },
}

function BillingPage({ state, go }) {
  const [plans, setPlans]           = useState(null)
  const [history, setHistory]       = useState([])
  const [status, setStatus]         = useState(null)
  const [selPlan, setSelPlan]       = useState("")
  const [txnId, setTxnId]           = useState("")
  const [upiApp, setUpiApp]         = useState("PhonePe")
  const [notes, setNotes]           = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg]               = useState("")
  const [err, setErr]               = useState("")
  const [showQR, setShowQR]         = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/billing/plans",   {headers:authHeaders()}).then(r=>r.json()),
      fetch("/billing/history", {headers:authHeaders()}).then(r=>r.json()),
      fetch("/billing/status",  {headers:authHeaders()}).then(r=>r.json()),
    ]).then(([p, h, s]) => {
      setPlans(p)
      setHistory(h.payments || [])
      setStatus(s)
      if (!selPlan) setSelPlan(p.plans?.find(x=>!x.current)?.key || "basic")
    }).catch(()=>{})
  }, [])

  const submitPayment = async () => {
    if (!selPlan) { setErr("Select a plan"); return }
    if (!txnId.trim()) { setErr("Enter Transaction ID"); return }
    setSubmitting(true); setErr("")
    const res = await fetch("/billing/submit", {
      method:"POST", headers:authHeaders(),
      body: JSON.stringify({plan:selPlan, transaction_id:txnId.trim(), upi_app:upiApp, notes})
    }).then(r=>r.json())
    if (res.success) {
      setMsg(res.message)
      setTxnId(""); setNotes("")
      // Reload history
      const h = await fetch("/billing/history", {headers:authHeaders()}).then(r=>r.json())
      setHistory(h.payments || [])
      const s = await fetch("/billing/status", {headers:authHeaders()}).then(r=>r.json())
      setStatus(s)
    } else {
      setErr(res.detail || "Submission failed")
    }
    setSubmitting(false)
  }

  const cfg = PLAN_CONFIG[state.user?.plan] || PLAN_CONFIG.starter
  const selCfg = PLAN_CONFIG[selPlan] || PLAN_CONFIG.basic

  return (
    <div className="shell">
      <Sidebar page="billing" go={go} user={state.user} />
      <div className="main">
        <div className="top-bar">
          <div style={{flex:1}}>
            <div className="top-bar-title">Billing & Plans</div>
            <div className="top-bar-sub">Manage your subscription and payment history</div>
          </div>
        </div>
        <div className="page">
          {msg && <div className="alert alert-success" onClick={()=>setMsg("")}>{msg}</div>}
          {err && <div className="alert alert-error">⚠ {err}</div>}

          {/* Current plan */}
          <div className="card" style={{marginBottom:16}}>
            <div className="card-title">📋 Current Plan</div>
            <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
              <div style={{background:cfg.bg,border:`2px solid ${cfg.color}40`,borderRadius:12,padding:"16px 24px",textAlign:"center",minWidth:140}}>
                <div style={{fontSize:22,fontWeight:700,color:cfg.color}}>{cfg.label}</div>
                <div style={{fontSize:13,color:"#555",marginTop:2}}>{cfg.q} Q/month</div>
                <div style={{fontSize:13,color:"#555"}}>{cfg.files === 999 ? "Unlimited" : cfg.files} files/session</div>
              </div>
              {status?.pending_payment && (
                <div style={{background:"#FFF8E1",border:"1.5px solid #FFE082",borderRadius:10,padding:"12px 16px",fontSize:13}}>
                  <div style={{fontWeight:700,color:"#F9A825",marginBottom:4}}>⏳ Payment Pending Approval</div>
                  <div style={{color:"#555"}}>Plan: <b>{status.pending_payment.plan?.toUpperCase()}</b></div>
                  <div style={{color:"#555"}}>Txn ID: <code style={{background:"#FFF3E0",padding:"2px 6px",borderRadius:4}}>{status.pending_payment.transaction_id}</code></div>
                  <div style={{color:"#888",fontSize:11,marginTop:4}}>Submitted {status.pending_payment.submitted_at?.slice(0,16)}</div>
                </div>
              )}
              {status?.last_payment && !status?.pending_payment && (
                <div style={{fontSize:13,color:"var(--muted)"}}>
                  <div>Last payment: <b>₹{status.last_payment.amount}</b></div>
                  <div>Approved: {status.last_payment.approved_at?.slice(0,10)}</div>
                </div>
              )}
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            {/* Plan selection + payment */}
            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">💳 Upgrade Plan</div>

              {/* Plan cards */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
                {Object.entries(PLAN_CONFIG).map(([key,c])=>(
                  <div key={key} onClick={()=>setSelPlan(key)}
                    style={{border:`2px solid ${selPlan===key?c.color:key===state.user?.plan?"#ccc":"var(--border)"}`,
                      background:selPlan===key?c.bg:key===state.user?.plan?"#f5f5f5":"#fff",
                      borderRadius:10,padding:"12px",cursor:key===state.user?.plan?"default":"pointer",
                      opacity:key===state.user?.plan?0.6:1,transition:"all 0.15s"}}>
                    <div style={{fontWeight:700,color:c.color,fontSize:13}}>{c.label}</div>
                    <div style={{fontSize:20,fontWeight:700,color:"#333",margin:"4px 0"}}>₹{c.price}<span style={{fontSize:11,color:"#888"}}>/mo</span></div>
                    <div style={{fontSize:11,color:"#666"}}>{c.q} Q · {c.files===999?"∞":c.files} files</div>
                    {key===state.user?.plan && <div style={{fontSize:10,color:"#999",marginTop:4}}>Current plan</div>}
                  </div>
                ))}
              </div>

              {selPlan && selPlan !== state.user?.plan && (
                <>
                  <div style={{background:"var(--light)",border:"1px solid var(--border2)",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:13}}>
                    Pay <b style={{color:"var(--accent2)"}}>₹{selCfg.price}</b> via PhonePe/GPay/Paytm to <b>Kuntal Das</b>
                    <br/><span style={{fontSize:11,color:"var(--muted)"}}>Add your institute name in UPI remarks</span>
                    <div style={{marginTop:8}}>
                      <button className="btn btn-secondary" style={{fontSize:12,padding:"5px 12px"}} onClick={()=>setShowQR(!showQR)}>
                        {showQR?"▲ Hide":"📱 Show"} QR Code
                      </button>
                    </div>
                    {showQR && (
                      <div style={{display:"flex",gap:12,marginTop:12,justifyContent:"center"}}>
                        <img src="/static/qr/qr1.jpg" alt="PhonePe QR" style={{width:130,borderRadius:8,border:"1px solid var(--border)"}}/>
                        <img src="/static/qr/qr2.jpg" alt="PhonePe QR 2" style={{width:130,borderRadius:8,border:"1px solid var(--border)"}}/>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>UPI App Used</label>
                    <select value={upiApp} onChange={e=>setUpiApp(e.target.value)}>
                      <option>PhonePe</option><option>Google Pay</option>
                      <option>Paytm</option><option>BHIM</option><option>Other UPI</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Transaction ID *</label>
                    <input value={txnId} onChange={e=>setTxnId(e.target.value.toUpperCase())}
                      placeholder="e.g. T2605281234567890" style={{fontFamily:"monospace"}}/>
                    <div className="field-hint">Find in PhonePe → History → Transaction ID</div>
                  </div>
                  <div className="form-group">
                    <label>Notes (optional)</label>
                    <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any additional info"/>
                  </div>
                  <button className="btn btn-primary" style={{width:"100%",justifyContent:"center"}}
                    onClick={submitPayment} disabled={submitting}>
                    {submitting ? <div className="spinner"/> : `Submit Payment for ${selCfg.label} (₹${selCfg.price})`}
                  </button>
                </>
              )}
              {selPlan === state.user?.plan && (
                <div className="alert alert-info">✅ You are already on the {cfg.label} plan.</div>
              )}
            </div>

            {/* Payment history */}
            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">🧾 Payment History</div>
              {history.length === 0 ? (
                <div style={{textAlign:"center",padding:40,color:"var(--muted)"}}>No payments yet</div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {history.map(p=>(
                    <div key={p.id} style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <span style={{fontWeight:700,fontSize:13}}>{p.plan?.toUpperCase()} — ₹{p.amount}</span>
                        <span style={{
                          background:p.status==="approved"?"#E8F5E9":p.status==="rejected"?"#FFEBEE":"#FFF8E1",
                          color:p.status==="approved"?"#2E7D32":p.status==="rejected"?"#C62828":"#F9A825",
                          borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700
                        }}>{p.status?.toUpperCase()}</span>
                      </div>
                      <div style={{fontSize:11,color:"var(--muted)"}}>
                        Txn: <code style={{background:"#f0f0f0",padding:"1px 5px",borderRadius:3}}>{p.transaction_id}</code>
                        · {p.upi_app} · {p.month}
                      </div>
                      {p.notes && <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>Note: {p.notes}</div>}
                      <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>
                        Submitted: {p.submitted_at?.slice(0,16)}
                        {p.approved_at && ` · Approved: ${p.approved_at.slice(0,16)}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const PAGES = {
  login:LoginPage, superadmin:SuperadminPage, dashboard:DashboardPage, upload:UploadPage,
  questionType:QuestionTypePage, examConfig:ExamConfigPage,
  questionEditor:QuestionEditorPage, pdfExport:PDFExportPage,
  // Phase 2
  omrExams:OMRExamsPage, examDetail:ExamDetailPage,
  batches:BatchesPage, students:StudentsPage,
  assignStudents:AssignStudentsPage, omrResults:OMRResultsPage,
  studentExam:StudentExamPage,
  fees:FeesPage,
  // Phase 4
  billing:BillingPage,
}

export default function App() {
  const [page, setPage] = useState("login")
  const [state, setState] = useState({
    user:null, token:null, uploadedFiles:[], questionType:null, omrSubType:null,
    examConfig:null, questions:null, generatedPDFs:null,
    currentExamId:null, lastSavedExamId:null, lastSavedBatchId:null,
  })
  const updateState = useCallback(u=>setState(p=>({...p,...u})),[])
  const go = useCallback((p, extra={})=>{
    if(extra.examId !== undefined) setState(s=>({...s,currentExamId:extra.examId}))
    setPage(p)
  },[])

  // Restore login from localStorage on page load/refresh
  useEffect(() => {
    const token = getToken()
    if (token) {
      fetch("/auth/me", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (data.institute) {
            updateState({ user: data.institute, token })
            if (data.institute.plan === "superadmin") setPage("superadmin")
            else setPage("dashboard")
          } else {
            clearToken()
          }
        })
        .catch(() => clearToken())
    }
  }, [])
  const Page = PAGES[page]
  return <Page state={state} updateState={updateState} go={go} />
}
