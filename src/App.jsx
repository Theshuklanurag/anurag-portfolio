import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase";

/* ═══════════════════════════════════════════════════
   HOW DATA IS STORED (no storage buckets needed!)
   ─────────────────────────────────────────────────
   Supabase table "portfolio" has 2 columns:
     key   TEXT (primary key)
     value TEXT (stores JSON strings)

   Rows:
     key="config"   → {photo, about, socials, resumeURL}
     key="certs"    → {list: [...certs]}
     key="projects" → {list: [...projects]}

   Images (photos, cert images) are compressed to
   ~100-150KB then stored as base64 strings inside
   the JSON value. No file upload, no buckets, no CORS.
═══════════════════════════════════════════════════ */

const ADMIN_PASS = "@nuragSh2109";
const ROLES = ["Frontend Developer","Problem Solver","CS Student","Hackathon Builder","Innovator"];
const NAV   = ["Home","About","Skills","Education","Projects","Certifications","Contact"];
const DI    = (n,f="original") =>
  `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${n}/${n}-${f}.svg`;

const SKILLS = [
  {name:"HTML5",     logo:DI("html5"),       color:"#e34f26",level:90,cat:"Web"},
  {name:"CSS3",      logo:DI("css3"),        color:"#1572b6",level:88,cat:"Web"},
  {name:"JavaScript",logo:DI("javascript"),  color:"#f7df1e",level:82,cat:"Web"},
  {name:"React",     logo:DI("react"),       color:"#61dafb",level:75,cat:"Web"},
  {name:"Tailwind",  logo:"https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/tailwindcss/tailwindcss-original.svg",color:"#06b6d4",level:72,cat:"Web"},
  {name:"Python",    logo:DI("python"),      color:"#3776ab",level:78,cat:"Languages"},
  {name:"Java",      logo:DI("java"),        color:"#f89820",level:72,cat:"Languages"},
  {name:"C",         logo:DI("c"),           color:"#a8b9cc",level:80,cat:"Languages"},
  {name:"C++",       logo:DI("cplusplus"),   color:"#00599c",level:76,cat:"Languages"},
  {name:"Git",       logo:DI("git"),         color:"#f05032",level:80,cat:"Tools"},
  {name:"GitHub",    logo:DI("github"),      color:"#94a3b8",level:82,cat:"Tools"},
  {name:"VS Code",   logo:DI("vscode"),      color:"#007acc",level:92,cat:"Tools"},
  {name:"MySQL",     logo:DI("mysql"),       color:"#4479a1",level:65,cat:"Tools"},
  {name:"Linux",     logo:DI("linux"),       color:"#fcc624",level:60,cat:"Tools"},
];

const DEFAULT_CERTS = [
  {id:"c1", title:"Data Structures in C++",                issuer:"Scaler Topics",             date:"Sep 12, 2025",imageURL:null},
  {id:"c2", title:"C++ Course: Learn the Essentials",      issuer:"Scaler Topics",             date:"Sep 1, 2025", imageURL:null},
  {id:"c3", title:"Web Development Peer Training",         issuer:"GNIOT CSE-Tech Club",       date:"Apr 25, 2025",imageURL:null},
  {id:"c4", title:"Programming in C",                      issuer:"Infosys Springboard",       date:"May 20, 2025",imageURL:null},
  {id:"c5", title:"Next Gen Technologies",                 issuer:"Infosys Springboard",       date:"May 21, 2025",imageURL:null},
  {id:"c6", title:"C Programming",                         issuer:"E&ICT Academy, IIT Kanpur", date:"May 14, 2025",imageURL:null},
  {id:"c7", title:"Programming Fundamentals using Python", issuer:"Infosys Springboard",       date:"May 31, 2025",imageURL:null},
  {id:"c8", title:"Intro to Front End Development",        issuer:"Simplilearn SkillUp",       date:"Aug 29, 2025",imageURL:null},
  {id:"c9", title:"Web Development for Beginners",         issuer:"Simplilearn SkillUp",       date:"Aug 28, 2025",imageURL:null},
  {id:"c10",title:"Getting Started with AWS",              issuer:"Simplilearn SkillUp",       date:"Aug 31, 2025",imageURL:null},
];
const DEFAULT_PROJS = [
  {id:"p1",title:"WheelAid",         icon:"♿",desc:"A frontend web platform for wheelchair assistance — providing an accessible, user-friendly interface built with HTML, CSS, and JavaScript.",tech:["HTML","CSS","JavaScript"],github:"https://github.com/Theshuklanurag/Smart-wheelchair-guidance-and-assistance-app",demo:"https://theshuklanurag.github.io/Smart-wheelchair-guidance-and-assistance-app/"},
  {id:"p2",title:"VeriSoc",          icon:"🔐",desc:"A KYC authentication system built during Yukti Hackathon — generates unique IDs and streamlines user verification. Ranked 7 out of 104 teams nationally.",tech:["HTML","CSS","JavaScript"],github:"https://github.com/Theshuklanurag/KYC-Verification-for-social-media",demo:"https://theshuklanurag.github.io/KYC-Verification-for-social-media/"},
  {id:"p3",title:"Portfolio Website",icon:"💼",desc:"A modern React portfolio with particle animations, admin control panel, Supabase cloud storage — all content manageable without touching code.",tech:["React","CSS","Supabase"],github:"https://github.com/Theshuklanurag",demo:"https://theshuklanurag.github.io/portfolio/"},
];
const DEFAULT_ABOUT   = "I'm a dedicated B.Tech CSE student at Greater Noida Institute of Technology, driven by a deep passion for web development and problem-solving.\n\nSince 2023, I've been building modern web applications — accessibility tools, KYC systems, and hackathon projects that ranked 7th out of 104 teams nationally.\n\nI love crafting beautiful, functional, user-centric experiences from the ground up and I'm always looking for new challenges.";
const DEFAULT_SOCIALS = {
  linkedin:"https://www.linkedin.com/in/anurag-shukla-48a05832b",
  github:"https://github.com/Theshuklanurag",
  instagram:"https://instagram.com/theshuklanurag",
  twitter:"https://twitter.com/theshuklanurag",
  whatsapp:"+919559096783",
  email:"shuklaanurag338@gmail.com",
};

/* ═══════════════════════════════════════════════════
   SUPABASE DB HELPERS — no buckets, just key/value
═══════════════════════════════════════════════════ */
const dbGet = async (key) => {
  try {
    const { data, error } = await supabase
      .from("portfolio_data")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return null;
    return JSON.parse(data.value);
  } catch { return null; }
};

const dbSet = async (key, value) => {
  try {
    const { error } = await supabase
      .from("portfolio_data")
      .upsert({ key, value: JSON.stringify(value) }, { onConflict: "key" });
    if (error) console.error("dbSet error:", error.message);
  } catch (e) { console.error("dbSet exception:", e); }
};

/* Image compress → base64 (~100-200KB output) */
const compress = (file, maxPx = 900, quality = 0.78) =>
  new Promise(res => {
    const r = new FileReader();
    r.onload = e => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        let { width: w, height: h } = img;
        if (w > maxPx) { h = Math.round(h * maxPx / w); w = maxPx; }
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        res(c.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    r.readAsDataURL(file);
  });

const uid = () => `i${Date.now()}${Math.random().toString(36).slice(2, 6)}`;

/* ═══════════════════════════════════════════════════
   GLOBAL CSS
═══════════════════════════════════════════════════ */
const injectCSS = () => {
  if (document.getElementById("pf-v7")) return;
  const s = document.createElement("style");
  s.id = "pf-v7";
  s.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
:root{
  --bg:#020a18;--bg2:#060f20;--bg3:#0a1528;
  --card:rgba(6,15,32,0.75);
  --br:rgba(0,245,196,0.08);--brh:rgba(0,245,196,0.35);
  --accent:#00f5c4;--a2:#818cf8;--a3:#f472b6;
  --txt:#8fa3bf;--head:#e2e8f0;
  --red:#f87171;--green:#4ade80;
  --mono:'JetBrains Mono',monospace;
  --body:'Outfit',sans-serif;
  --disp:'Syne',sans-serif;
  --rad:14px;--tr:.3s cubic-bezier(.4,0,.2,1);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{font-family:var(--body);background:var(--bg);color:var(--txt);overflow-x:hidden;cursor:none;line-height:1.65;}
*{cursor:none!important;}
::selection{background:rgba(0,245,196,.18);color:var(--head);}
::-webkit-scrollbar{width:4px;}
::-webkit-scrollbar-track{background:var(--bg);}
::-webkit-scrollbar-thumb{background:linear-gradient(var(--accent),var(--a2));border-radius:4px;}
img{max-width:100%;display:block;}a{text-decoration:none;color:inherit;}

@keyframes fadeUp{from{opacity:0;transform:translateY(36px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}}
@keyframes spinCW{to{transform:rotate(360deg)}}
@keyframes spinCCW{to{transform:rotate(-360deg)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes glow{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(0,245,196,.5)}70%{box-shadow:0 0 0 18px rgba(0,245,196,0)}}
@keyframes gradAnim{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
@keyframes slideIn{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes orbitDot{to{transform:rotate(360deg) translateX(var(--r,130px)) rotate(-360deg)}}
@keyframes gridPan{0%{background-position:0 0}100%{background-position:60px 60px}}
@keyframes scanLine{0%{top:-2px}100%{top:100%}}
@keyframes meshFloat{0%,100%{transform:translate(0,0)}50%{transform:translate(25px,15px)}}
@keyframes skillPop{from{opacity:0;transform:translateY(20px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}

/* CURSOR */
.cur-ring{width:28px;height:28px;border:1.5px solid var(--accent);border-radius:50%;position:fixed;pointer-events:none;z-index:99999;transform:translate(-50%,-50%);transition:width .22s,height .22s,background .22s,border-color .22s;}
.cur-dot{width:5px;height:5px;background:var(--accent);border-radius:50%;position:fixed;pointer-events:none;z-index:99999;transform:translate(-50%,-50%);}
.cur-ring.hov{width:54px;height:54px;background:rgba(0,245,196,.05);border-color:rgba(0,245,196,.3);}

/* LOADER */
.loader-screen{position:fixed;inset:0;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9000;}
.loader-ring{width:48px;height:48px;border:3px solid rgba(0,245,196,.15);border-top-color:var(--accent);border-radius:50%;animation:spin 1s linear infinite;margin-bottom:1.2rem;}
.loader-txt{font-family:var(--mono);font-size:.72rem;color:var(--accent);letter-spacing:3px;}
.loader-sub{font-family:var(--mono);font-size:.6rem;color:#334155;letter-spacing:2px;margin-top:.5rem;}

/* LAYOUT */
.wrap{max-width:1150px;margin:0 auto;padding:0 2rem;}
.section{padding:120px 0;position:relative;}
.eyebrow{font-family:var(--mono);font-size:.68rem;color:var(--accent);letter-spacing:5px;text-transform:uppercase;margin-bottom:.75rem;display:flex;align-items:center;gap:.8rem;}
.eyebrow::after{content:'';height:1px;width:36px;background:var(--accent);opacity:.3;}
.sec-title{font-family:var(--disp);font-size:clamp(2.2rem,5vw,3.8rem);font-weight:800;color:var(--head);line-height:.93;margin-bottom:3.5rem;letter-spacing:-2px;}
.sec-title em{font-style:normal;background:linear-gradient(135deg,var(--accent),var(--a2),var(--a3));background-size:300% 300%;animation:gradAnim 5s ease infinite;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.glass{background:var(--card);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid var(--br);border-radius:var(--rad);transition:border-color var(--tr),box-shadow var(--tr),transform var(--tr);}
.glass:hover{border-color:var(--brh);box-shadow:0 0 40px rgba(0,245,196,.04),0 24px 52px rgba(0,0,0,.5);}
.fade-sect{opacity:0;transform:translateY(36px);transition:opacity .8s ease,transform .8s ease;}
.fade-sect.vis{opacity:1;transform:translateY(0);}

/* BUTTONS */
.btn-solid{font-family:var(--mono);font-size:.78rem;font-weight:600;letter-spacing:1px;background:var(--accent);color:#020a18;border:none;padding:.9rem 2.4rem;border-radius:9px;transition:all var(--tr);display:inline-flex;align-items:center;gap:.5rem;position:relative;overflow:hidden;}
.btn-solid:hover{transform:translateY(-3px);box-shadow:0 14px 36px rgba(0,245,196,.45);}
.btn-solid::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);transform:translateX(-100%);transition:transform .55s;}
.btn-solid:hover::before{transform:translateX(100%);}
.btn-outline{font-family:var(--mono);font-size:.78rem;font-weight:500;letter-spacing:1px;background:transparent;color:var(--accent);border:1px solid rgba(0,245,196,.4);padding:.9rem 2.4rem;border-radius:9px;transition:all var(--tr);display:inline-flex;align-items:center;gap:.5rem;}
.btn-outline:hover{background:rgba(0,245,196,.07);border-color:var(--accent);transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,245,196,.15);}
.btn-xs{font-family:var(--mono);font-size:.72rem;padding:.52rem 1.2rem;border-radius:7px;transition:all var(--tr);display:inline-flex;align-items:center;gap:.4rem;border:1px solid transparent;}
.btn-xs-ghost{color:var(--txt);border-color:rgba(148,163,184,.22);}
.btn-xs-ghost:hover{color:var(--head);border-color:rgba(226,232,240,.38);}
.btn-xs-accent{background:rgba(0,245,196,.07);color:var(--accent);border-color:rgba(0,245,196,.22);}
.btn-xs-accent:hover{background:rgba(0,245,196,.18);}

/* NAV */
.pf-nav{position:fixed;top:0;left:0;right:0;z-index:1000;padding:1.5rem 0;transition:all .38s;}
.pf-nav.sc{background:rgba(2,10,24,.93);backdrop-filter:blur(30px);-webkit-backdrop-filter:blur(30px);border-bottom:1px solid rgba(0,245,196,.06);padding:1rem 0;}
.nav-in{display:flex;align-items:center;justify-content:space-between;}
.nav-logo{font-family:var(--disp);font-size:1.5rem;font-weight:800;letter-spacing:-1px;background:linear-gradient(135deg,var(--accent),var(--a2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.nav-links{display:flex;gap:.1rem;list-style:none;}
.nav-links a{font-family:var(--mono);font-size:.72rem;color:var(--txt);padding:.48rem .9rem;border-radius:6px;letter-spacing:.5px;transition:all .2s;}
.nav-links a:hover,.nav-links a.act{color:var(--accent);background:rgba(0,245,196,.06);}
.nav-right{display:flex;align-items:center;gap:.85rem;}
.nav-resume-btn{font-family:var(--mono);font-size:.72rem;background:rgba(0,245,196,.07);color:var(--accent);border:1px solid rgba(0,245,196,.25);padding:.46rem 1.1rem;border-radius:7px;letter-spacing:.5px;transition:all .2s;display:flex;align-items:center;gap:.4rem;}
.nav-resume-btn:hover{background:rgba(0,245,196,.16);transform:translateY(-1px);}
.burger{display:none;flex-direction:column;gap:5px;background:none;border:none;padding:5px;}
.burger span{display:block;width:22px;height:2px;background:var(--txt);border-radius:2px;transition:all .3s;}
.mob-menu{position:fixed;top:62px;left:0;right:0;background:rgba(2,10,24,.97);backdrop-filter:blur(30px);border-bottom:1px solid var(--br);padding:1.5rem 2rem 2rem;display:flex;flex-direction:column;z-index:999;animation:fadeUp .2s ease;}
.mob-menu a{font-family:var(--mono);font-size:.82rem;color:var(--txt);padding:.9rem 0;border-bottom:1px solid rgba(0,245,196,.05);display:block;transition:color .2s;}
.mob-menu a:hover{color:var(--accent);}

/* HERO */
.hero{min-height:100vh;display:flex;align-items:center;position:relative;overflow:hidden;padding-top:90px;}
.hbg-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(0,245,196,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(0,245,196,.018) 1px,transparent 1px);background-size:60px 60px;animation:gridPan 18s linear infinite;}
.hbg-radial{position:absolute;inset:0;background:radial-gradient(ellipse 80% 70% at 50% 40%,rgba(0,245,196,.055) 0%,rgba(129,140,248,.03) 45%,transparent 70%);pointer-events:none;}
.hbg-orb1{position:absolute;width:650px;height:650px;border-radius:50%;background:radial-gradient(circle,rgba(0,245,196,.065) 0%,transparent 70%);top:-120px;right:-180px;animation:meshFloat 14s ease-in-out infinite;}
.hbg-orb2{position:absolute;width:550px;height:550px;border-radius:50%;background:radial-gradient(circle,rgba(129,140,248,.05) 0%,transparent 70%);bottom:-160px;left:-120px;animation:meshFloat 18s ease-in-out infinite reverse;}
.hbg-orb3{position:absolute;width:350px;height:350px;border-radius:50%;background:radial-gradient(circle,rgba(244,114,182,.03) 0%,transparent 70%);top:40%;left:35%;animation:meshFloat 22s ease-in-out infinite 4s;}
.hscan{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(0,245,196,.5),transparent);animation:scanLine 10s linear infinite;pointer-events:none;z-index:1;}
.hero-in{position:relative;z-index:2;display:grid;grid-template-columns:1fr 340px;align-items:center;gap:5rem;width:100%;}
.hero-eyebrow{font-family:var(--mono);font-size:.75rem;color:var(--accent);letter-spacing:4px;margin-bottom:1.2rem;display:flex;align-items:center;gap:.7rem;}
.hero-dot{width:9px;height:9px;background:var(--accent);border-radius:50%;animation:pulse 2.5s infinite;flex-shrink:0;box-shadow:0 0 10px var(--accent);}
.hero-name{font-family:var(--disp);font-size:clamp(3rem,8vw,7rem);font-weight:800;color:var(--head);line-height:.88;letter-spacing:-4px;margin-bottom:.9rem;}
.hero-name .grad{background:linear-gradient(135deg,var(--accent) 0%,var(--a2) 55%,var(--a3) 100%);background-size:300% 300%;animation:gradAnim 4s ease infinite;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.hero-role{font-size:1.2rem;color:var(--txt);margin-bottom:1.6rem;min-height:2rem;}
.hero-role .typed{color:var(--head);font-weight:600;}
.caret{display:inline-block;width:2px;height:1em;background:var(--accent);margin-left:2px;animation:blink 1s step-end infinite;vertical-align:text-bottom;}
.hero-bio{max-width:520px;line-height:1.95;margin-bottom:2.8rem;font-size:.97rem;}
.hero-btns{display:flex;gap:.9rem;flex-wrap:wrap;margin-bottom:3.2rem;}
.hero-stats{display:flex;gap:2.8rem;}
.hstat-n{font-family:var(--disp);font-size:2.2rem;font-weight:800;background:linear-gradient(135deg,var(--accent),var(--a2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1;}
.hstat-l{font-family:var(--mono);font-size:.58rem;color:var(--txt);letter-spacing:2.5px;text-transform:uppercase;margin-top:.3rem;}
.av-section{display:flex;align-items:center;justify-content:center;position:relative;width:340px;height:340px;flex-shrink:0;}
.av-r1{position:absolute;width:320px;height:320px;border-radius:50%;border:1px dashed rgba(0,245,196,.14);animation:spinCW 25s linear infinite;}
.av-r2{position:absolute;width:278px;height:278px;border-radius:50%;border:1px dashed rgba(129,140,248,.1);animation:spinCCW 18s linear infinite;}
.av-r3{position:absolute;width:238px;height:238px;border-radius:50%;border:1px solid rgba(0,245,196,.05);animation:spinCW 12s linear infinite;}
.av-dot1{position:absolute;width:10px;height:10px;background:var(--accent);border-radius:50%;box-shadow:0 0 10px var(--accent);animation:orbitDot 8s linear infinite;top:50%;left:50%;margin:-5px;--r:155px;}
.av-dot2{position:absolute;width:7px;height:7px;background:var(--a2);border-radius:50%;box-shadow:0 0 8px var(--a2);animation:orbitDot 12s linear infinite reverse;top:50%;left:50%;margin:-3.5px;--r:133px;}
.av-dot3{position:absolute;width:5px;height:5px;background:var(--a3);border-radius:50%;box-shadow:0 0 6px var(--a3);animation:orbitDot 6s linear infinite 3s;top:50%;left:50%;margin:-2.5px;--r:108px;}
.hero-av{width:210px;height:210px;border-radius:50%;border:2px solid rgba(0,245,196,.28);object-fit:cover;object-position:center top;animation:float 8s ease-in-out infinite;position:relative;z-index:2;box-shadow:0 0 60px rgba(0,245,196,.12),0 0 130px rgba(0,245,196,.05);}
.hero-av-ph{width:210px;height:210px;border-radius:50%;background:linear-gradient(135deg,#0d1f3c,#060e1f);border:2px solid rgba(0,245,196,.25);display:flex;align-items:center;justify-content:center;font-family:var(--disp);font-size:4.5rem;font-weight:800;color:var(--accent);animation:float 8s ease-in-out infinite;position:relative;z-index:2;box-shadow:0 0 60px rgba(0,245,196,.1);}
.scroll-cue{position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:.5rem;z-index:2;}
.scroll-ln{width:1px;height:55px;background:linear-gradient(var(--accent),transparent);animation:glow 2.5s ease-in-out infinite;}
.scroll-txt{font-family:var(--mono);font-size:.56rem;color:rgba(148,163,184,.4);letter-spacing:3px;}

/* ABOUT */
.about-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:4rem;align-items:start;}
.about-p{line-height:1.95;margin-bottom:1.2rem;font-size:.97rem;}
.chips{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1.5rem;}
.chip{font-family:var(--mono);font-size:.67rem;background:rgba(0,245,196,.05);border:1px solid rgba(0,245,196,.15);color:var(--accent);padding:.35rem .9rem;border-radius:100px;transition:all .2s;}
.chip:hover{background:rgba(0,245,196,.1);transform:translateY(-2px);}
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:.85rem;margin-top:2rem;}
.stat-box{padding:1.4rem;text-align:center;}
.stat-n{font-family:var(--disp);font-size:2.3rem;font-weight:800;background:linear-gradient(135deg,var(--accent),var(--a2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1;}
.stat-l{font-family:var(--mono);font-size:.6rem;color:var(--txt);letter-spacing:2.5px;margin-top:.4rem;text-transform:uppercase;}
.info-card{padding:1.75rem;margin-bottom:1.25rem;}
.irow{display:flex;align-items:center;gap:.85rem;padding:.75rem 0;border-bottom:1px solid rgba(0,245,196,.05);}
.irow:last-child{border:none;}
.iic{width:36px;height:36px;background:rgba(0,245,196,.06);border:1px solid rgba(0,245,196,.12);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:.95rem;flex-shrink:0;}
.ikey{font-family:var(--mono);font-size:.6rem;color:#475569;letter-spacing:1px;text-transform:uppercase;}
.ival{color:var(--head);font-size:.88rem;margin-top:.1rem;}

/* SKILLS */
.skills-section{background:linear-gradient(180deg,transparent,rgba(0,245,196,.018) 50%,transparent);}
.skill-tabs{display:flex;gap:.5rem;margin-bottom:2.2rem;flex-wrap:wrap;}
.stab{font-family:var(--mono);font-size:.7rem;padding:.46rem 1.1rem;border-radius:6px;border:1px solid rgba(148,163,184,.18);color:var(--txt);background:none;transition:all .25s;letter-spacing:.5px;}
.stab.on{background:rgba(0,245,196,.08);border-color:rgba(0,245,196,.3);color:var(--accent);box-shadow:0 0 14px rgba(0,245,196,.1);}
.skills-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:1rem;}
.sk-card{display:flex;align-items:center;gap:1rem;padding:1.1rem 1.25rem;transition:all var(--tr);position:relative;overflow:hidden;animation:skillPop .4s ease both;}
.sk-card::after{content:'';position:absolute;bottom:0;left:0;width:0;height:2px;background:linear-gradient(90deg,var(--c,var(--accent)),transparent);transition:width 1.2s cubic-bezier(.4,0,.2,1);}
.sk-card.bar-go::after{width:var(--pct,0%);}
.sk-card:hover{transform:translateY(-6px) scale(1.02);border-color:rgba(0,245,196,.3);}
.sk-card:hover .sk-logo{transform:scale(1.2) rotate(-4deg);filter:drop-shadow(0 0 10px var(--c,var(--accent)));}
.sk-logo{width:36px;height:36px;object-fit:contain;flex-shrink:0;transition:transform .3s,filter .3s;}
.sk-info{flex:1;min-width:0;}
.sk-name{font-family:var(--mono);font-size:.72rem;color:var(--head);font-weight:500;margin-bottom:.4rem;}
.sk-bar-bg{height:4px;background:rgba(148,163,184,.1);border-radius:2px;overflow:hidden;}
.sk-bar{height:100%;border-radius:2px;background:linear-gradient(90deg,var(--c,var(--accent)),rgba(129,140,248,.6));width:0;transition:width 1.3s cubic-bezier(.4,0,.2,1);}
.sk-bar.go{width:var(--pct,0%);}
.sk-pct{font-family:var(--mono);font-size:.55rem;color:var(--txt);margin-top:.25rem;}

/* EDUCATION */
.edu-grid{display:flex;flex-direction:column;gap:1.4rem;max-width:860px;}
.edu-card{display:grid;grid-template-columns:64px 1fr;gap:1.5rem;padding:1.75rem;align-items:start;transition:all var(--tr);position:relative;overflow:hidden;}
.edu-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(var(--accent),var(--a2));transform:scaleY(0);transform-origin:top;transition:transform .45s ease;border-radius:0 3px 3px 0;}
.edu-card:hover::before{transform:scaleY(1);}
.edu-card:hover{border-color:rgba(0,245,196,.25);transform:translateX(5px);}
.edu-icon-wrap{width:54px;height:54px;background:rgba(0,245,196,.07);border:1px solid rgba(0,245,196,.15);border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;flex-shrink:0;}
.edu-year-badge{font-family:var(--mono);font-size:.62rem;color:var(--accent);background:rgba(0,245,196,.08);border:1px solid rgba(0,245,196,.15);padding:.2rem .7rem;border-radius:100px;letter-spacing:1px;display:inline-block;margin-bottom:.55rem;}
.edu-deg{font-family:var(--disp);font-size:1.15rem;font-weight:700;color:var(--head);margin-bottom:.3rem;}
.edu-school{color:var(--txt);font-size:.9rem;margin-bottom:.65rem;}
.edu-desc{font-size:.87rem;line-height:1.85;}
.edu-marks-row{display:flex;align-items:center;gap:.75rem;margin-top:.9rem;flex-wrap:wrap;}
.edu-score{display:inline-flex;align-items:center;gap:.5rem;background:rgba(0,245,196,.06);border:1px solid rgba(0,245,196,.15);border-radius:8px;padding:.45rem .95rem;}
.edu-score-n{font-family:var(--disp);font-size:1.25rem;font-weight:800;color:var(--accent);}
.edu-score-l{font-family:var(--mono);font-size:.6rem;color:var(--txt);letter-spacing:1px;text-transform:uppercase;}
.edu-tag{font-family:var(--mono);font-size:.62rem;background:rgba(129,140,248,.07);border:1px solid rgba(129,140,248,.18);color:var(--a2);padding:.25rem .7rem;border-radius:6px;}

/* PROJECTS */
.proj-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:1.5rem;}
.proj-card{display:flex;flex-direction:column;transition:all var(--tr);position:relative;overflow:hidden;}
.proj-topbar{height:2px;background:linear-gradient(90deg,var(--accent),var(--a2));opacity:0;transition:opacity var(--tr);margin:-1px -1px 0;border-radius:var(--rad) var(--rad) 0 0;}
.proj-card:hover .proj-topbar{opacity:1;}
.proj-card:hover{transform:translateY(-9px);border-color:rgba(0,245,196,.22);}
.proj-body{padding:2rem;flex:1;display:flex;flex-direction:column;}
.proj-ic{width:52px;height:52px;background:rgba(0,245,196,.06);border:1px solid rgba(0,245,196,.14);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;margin-bottom:1.2rem;}
.proj-title{font-family:var(--disp);font-size:1.3rem;font-weight:700;color:var(--head);margin-bottom:.65rem;}
.proj-desc{font-size:.87rem;line-height:1.82;flex:1;margin-bottom:1.3rem;}
.proj-tech{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:1.5rem;}
.tch{font-family:var(--mono);font-size:.63rem;background:rgba(0,245,196,.05);border:1px solid rgba(0,245,196,.13);color:var(--accent);padding:.22rem .65rem;border-radius:5px;}
.proj-links{display:flex;gap:.75rem;margin-top:auto;}

/* CERTS */
.certs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(265px,1fr));gap:1.2rem;}
.cert-card{overflow:hidden;transition:all var(--tr);}
.cert-card:hover{transform:translateY(-7px);border-color:rgba(0,245,196,.28);}
.cert-thumb{height:155px;background:linear-gradient(135deg,#0a1528,#0d1f3c);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;}
.cert-thumb img{width:100%;height:100%;object-fit:cover;filter:brightness(.85);transition:filter var(--tr);}
.cert-card:hover .cert-thumb img{filter:brightness(1);}
.cert-ph{font-size:3rem;opacity:.18;}
.cert-ov{position:absolute;inset:0;background:rgba(2,10,24,.75);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity var(--tr);font-family:var(--mono);font-size:.68rem;color:var(--accent);letter-spacing:3px;}
.cert-card:hover .cert-ov{opacity:1;}
.cert-body{padding:1.2rem;}
.cert-title{font-family:var(--disp);font-size:.96rem;font-weight:700;color:var(--head);margin-bottom:.3rem;line-height:1.35;transition:color var(--tr);}
.cert-card:hover .cert-title{color:var(--accent);}
.cert-issuer{color:var(--accent);font-size:.78rem;font-weight:500;margin-bottom:.25rem;}
.cert-date{font-family:var(--mono);font-size:.65rem;color:#475569;}

/* CONTACT */
.contact-grid{display:grid;grid-template-columns:1fr 1.1fr;gap:4rem;align-items:start;}
.contact-p{line-height:1.9;margin-bottom:1.1rem;font-size:.97rem;}
.clink{display:flex;align-items:center;gap:1rem;padding:1.1rem 1.4rem;margin-bottom:.85rem;transition:all var(--tr);border-radius:12px;}
.clink:hover{border-color:rgba(0,245,196,.3);transform:translateX(7px);}
.clic{width:44px;height:44px;background:rgba(0,245,196,.06);border:1px solid rgba(0,245,196,.13);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;}
.clink:hover .clic{background:rgba(0,245,196,.14);}
.clbl{font-family:var(--mono);font-size:.6rem;color:#475569;letter-spacing:1px;text-transform:uppercase;}
.cval{color:var(--head);font-size:.88rem;margin-top:.12rem;}
.carr{margin-left:auto;color:#475569;font-size:1.1rem;transition:transform .3s;}
.clink:hover .carr{transform:translateX(4px);color:var(--accent);}

/* FOOTER */
.footer{border-top:1px solid rgba(0,245,196,.06);padding:3rem 0;text-align:center;}
.fsocs{display:flex;justify-content:center;gap:1.4rem;margin-bottom:1.4rem;}
.fsoc{width:44px;height:44px;background:rgba(0,245,196,.05);border:1px solid rgba(0,245,196,.1);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;transition:all .3s;}
.fsoc:hover{background:rgba(0,245,196,.14);transform:translateY(-3px);}
.footer-copy{font-family:var(--mono);font-size:.65rem;color:#2d3748;letter-spacing:.5px;}
.settings-fab{width:38px;height:38px;background:rgba(2,10,24,.8);border:1px solid rgba(0,245,196,.07);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;margin:.9rem auto 0;transition:all .45s;color:rgba(0,245,196,.15);cursor:pointer!important;}
.settings-fab:hover{background:rgba(0,245,196,.1);border-color:rgba(0,245,196,.25);color:rgba(0,245,196,.7);transform:rotate(90deg) scale(1.1);}

/* RESUME MODAL */
.resume-modal{background:#07111f;border:1px solid rgba(0,245,196,.18);border-radius:16px;padding:0;width:90vw;max-width:900px;height:90vh;display:flex;flex-direction:column;animation:fadeUp .28s ease;overflow:hidden;}
.resume-modal-hd{display:flex;align-items:center;justify-content:space-between;padding:1.1rem 1.5rem;border-bottom:1px solid rgba(0,245,196,.08);flex-shrink:0;}
.resume-modal-title{font-family:var(--disp);font-size:1rem;font-weight:700;color:var(--head);}
.resume-modal-acts{display:flex;gap:.75rem;align-items:center;}
.resume-iframe{flex:1;width:100%;border:none;}

/* MODALS */
.overlay{position:fixed;inset:0;background:rgba(2,10,24,.9);backdrop-filter:blur(18px);z-index:2000;display:flex;align-items:center;justify-content:center;padding:1.5rem;animation:fadeIn .2s ease;}
.modal{background:#07111f;border:1px solid rgba(0,245,196,.2);border-radius:18px;padding:2.5rem;width:100%;max-width:440px;animation:fadeUp .28s ease;}
.modal-title{font-family:var(--disp);font-size:1.55rem;font-weight:800;color:var(--head);margin-bottom:.3rem;}
.modal-sub{color:#64748b;font-size:.88rem;margin-bottom:2rem;}
.img-modal{background:#07111f;border:1px solid rgba(0,245,196,.18);border-radius:16px;padding:1rem;max-width:92vw;max-height:92vh;overflow:auto;animation:fadeUp .28s ease;}
.img-modal img{max-width:100%;max-height:80vh;border-radius:10px;display:block;margin:0 auto;}

/* FORM */
.fi{width:100%;padding:.82rem 1rem;background:rgba(2,10,24,.95);border:1px solid rgba(148,163,184,.14);border-radius:9px;color:var(--head);font-family:var(--body);font-size:.9rem;outline:none;transition:border-color var(--tr);margin-bottom:.85rem;}
.fi:focus{border-color:var(--accent);}
.fi::placeholder{color:#475569;}
.fta{resize:vertical;min-height:90px;}
.flbl{font-family:var(--mono);font-size:.63rem;color:#64748b;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:.4rem;}
.fg{margin-bottom:.9rem;}
.f2{display:grid;grid-template-columns:1fr 1fr;gap:1rem;}
.upbox{border:2px dashed rgba(0,245,196,.15);border-radius:10px;padding:1.4rem;text-align:center;color:#64748b;font-size:.82rem;transition:all .2s;position:relative;}
.upbox:hover{border-color:rgba(0,245,196,.3);}
.upbox input{position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer!important;}
.upbox-prev{max-width:100%;border-radius:8px;margin-top:.75rem;max-height:110px;object-fit:contain;display:block;margin-left:auto;margin-right:auto;}
.f-save{background:var(--accent);color:#020a18;border:none;padding:.82rem 2rem;border-radius:8px;font-family:var(--mono);font-size:.78rem;font-weight:700;letter-spacing:1px;transition:all var(--tr);width:100%;margin-top:.5rem;}
.f-save:hover:not(:disabled){background:#00d9ae;transform:translateY(-2px);}
.f-save:disabled{opacity:.5;}
.f-cancel{background:none;border:1px solid rgba(148,163,184,.18);color:var(--txt);padding:.5rem 1.4rem;border-radius:7px;font-family:var(--mono);font-size:.73rem;transition:all .2s;}
.f-cancel:hover{color:var(--head);}

/* TOAST */
.toast{position:fixed;bottom:2rem;right:2rem;background:#0a1528;border:1px solid rgba(0,245,196,.3);border-radius:12px;padding:1rem 1.5rem;color:var(--accent);font-family:var(--mono);font-size:.76rem;z-index:9999;animation:slideIn .3s ease;letter-spacing:.5px;display:flex;align-items:center;gap:.6rem;max-width:320px;}
.toast-err{border-color:rgba(248,113,113,.3);color:var(--red);}

/* ADMIN PANEL */
.cp-shell{min-height:100vh;background:var(--bg);display:flex;}
.cp-side{width:265px;background:#04090f;border-right:1px solid rgba(0,245,196,.07);display:flex;flex-direction:column;flex-shrink:0;position:sticky;top:0;height:100vh;overflow-y:auto;}
.cp-logo-area{padding:1.6rem 1.5rem;border-bottom:1px solid rgba(0,245,196,.07);}
.cp-logo{font-family:var(--disp);font-size:1.1rem;font-weight:800;background:linear-gradient(135deg,var(--accent),var(--a2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.cp-sub{font-family:var(--mono);font-size:.58rem;color:var(--accent);letter-spacing:2.5px;margin-top:.2rem;opacity:.55;}
.cp-badge{display:inline-flex;align-items:center;gap:.4rem;background:rgba(74,222,128,.07);border:1px solid rgba(74,222,128,.18);color:#4ade80;font-family:var(--mono);font-size:.58rem;padding:.22rem .7rem;border-radius:100px;letter-spacing:1px;margin-top:.65rem;}
.cp-badge::before{content:'';width:6px;height:6px;background:#4ade80;border-radius:50%;animation:pulse 2s infinite;}
.cp-nav{padding:.75rem 0;flex:1;}
.cp-sec-lbl{font-family:var(--mono);font-size:.56rem;color:#334155;letter-spacing:3px;text-transform:uppercase;padding:.4rem 1.5rem;margin-top:.25rem;}
.cp-btn{display:flex;align-items:center;gap:.75rem;width:100%;padding:.7rem 1.5rem;font-family:var(--mono);font-size:.72rem;color:var(--txt);background:none;border:none;transition:all .2s;letter-spacing:.3px;text-align:left;position:relative;}
.cp-btn:hover{color:var(--head);background:rgba(0,245,196,.04);}
.cp-btn.act{color:var(--accent);background:rgba(0,245,196,.07);}
.cp-btn.act::before{content:'';position:absolute;left:0;top:4px;bottom:4px;width:3px;background:var(--accent);border-radius:0 3px 3px 0;}
.cp-ic{font-size:1rem;width:20px;text-align:center;}
.cp-nbadge{margin-left:auto;background:rgba(0,245,196,.1);color:var(--accent);font-size:.6rem;padding:.12rem .5rem;border-radius:4px;}
.cp-footer{padding:1rem 1.5rem;border-top:1px solid rgba(0,245,196,.07);display:flex;flex-direction:column;gap:.5rem;}
.cp-view-btn{display:flex;align-items:center;gap:.6rem;background:rgba(0,245,196,.05);border:1px solid rgba(0,245,196,.14);color:var(--accent);padding:.65rem 1rem;border-radius:8px;font-family:var(--mono);font-size:.72rem;transition:all .2s;}
.cp-view-btn:hover{background:rgba(0,245,196,.12);}
.cp-logout{display:flex;align-items:center;gap:.6rem;background:rgba(248,113,113,.05);border:1px solid rgba(248,113,113,.14);color:var(--red);padding:.65rem 1rem;border-radius:8px;font-family:var(--mono);font-size:.72rem;transition:all .2s;}
.cp-logout:hover{background:rgba(248,113,113,.14);}
.cp-main{flex:1;padding:2.5rem;overflow-y:auto;min-height:100vh;}
.cp-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:2.5rem;padding-bottom:1.5rem;border-bottom:1px solid rgba(0,245,196,.06);}
.cp-page-title{font-family:var(--disp);font-size:1.8rem;font-weight:800;color:var(--head);}
.cp-page-sub{font-family:var(--mono);font-size:.65rem;color:var(--txt);letter-spacing:1.5px;margin-top:.25rem;}
.cp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:2rem;}
.cp-stat{padding:1.25rem;text-align:center;background:#06101f;border:1px solid rgba(0,245,196,.07);border-radius:12px;transition:all .3s;}
.cp-stat:hover{border-color:rgba(0,245,196,.2);transform:translateY(-3px);}
.cp-stat-ic{font-size:1.5rem;margin-bottom:.4rem;}
.cp-stat-n{font-family:var(--disp);font-size:2rem;font-weight:800;background:linear-gradient(135deg,var(--accent),var(--a2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.cp-stat-l{font-family:var(--mono);font-size:.6rem;color:var(--txt);letter-spacing:2px;margin-top:.35rem;text-transform:uppercase;}
.cp-card{background:#06101f;border:1px solid rgba(0,245,196,.07);border-radius:14px;padding:1.75rem;margin-bottom:1.5rem;}
.cp-card-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;}
.cp-card-title{font-family:var(--disp);font-size:1.05rem;font-weight:700;color:var(--head);}
.cp-list{display:flex;flex-direction:column;gap:.65rem;}
.cp-item{background:rgba(2,10,24,.7);border:1px solid rgba(0,245,196,.06);border-radius:10px;padding:.9rem 1.1rem;display:flex;align-items:center;gap:1rem;transition:border-color .2s;}
.cp-item:hover{border-color:rgba(0,245,196,.14);}
.cp-thumb{width:56px;height:40px;border-radius:6px;background:rgba(0,245,196,.04);display:flex;align-items:center;justify-content:center;font-size:1.2rem;overflow:hidden;flex-shrink:0;}
.cp-thumb img{width:100%;height:100%;object-fit:cover;}
.cp-item-info{flex:1;min-width:0;}
.cp-item-title{color:var(--head);font-size:.9rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cp-item-sub{color:#64748b;font-size:.74rem;margin-top:.1rem;font-family:var(--mono);}
.cp-item-acts{display:flex;gap:.5rem;flex-shrink:0;}
.edit-btn{background:rgba(129,140,248,.07);border:1px solid rgba(129,140,248,.2);color:var(--a2);padding:.33rem .8rem;border-radius:6px;font-size:.7rem;font-family:var(--mono);transition:all .2s;}
.edit-btn:hover{background:rgba(129,140,248,.18);}
.del-btn{background:rgba(248,113,113,.06);border:1px solid rgba(248,113,113,.18);color:var(--red);padding:.33rem .8rem;border-radius:6px;font-size:.7rem;font-family:var(--mono);transition:all .2s;}
.del-btn:hover{background:rgba(248,113,113,.18);}
.cp-2col{display:grid;grid-template-columns:auto 1fr;gap:2rem;align-items:start;}
.photo-area{display:flex;flex-direction:column;align-items:center;gap:1rem;padding:1.5rem;background:rgba(2,10,24,.6);border:1px solid rgba(0,245,196,.06);border-radius:12px;min-width:180px;}
.photo-img{width:120px;height:120px;border-radius:50%;object-fit:cover;border:2px solid rgba(0,245,196,.25);}
.photo-ph{width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg,#0d1f3c,#060e1f);border:2px solid rgba(0,245,196,.25);display:flex;align-items:center;justify-content:center;font-size:3rem;font-family:var(--disp);color:var(--accent);}
.chg-btn{font-family:var(--mono);font-size:.7rem;color:var(--accent);padding:.4rem 1rem;border:1px solid rgba(0,245,196,.25);border-radius:6px;background:none;position:relative;overflow:hidden;}
.chg-btn:hover{background:rgba(0,245,196,.07);}
.chg-btn input{position:absolute;inset:0;opacity:0;cursor:pointer!important;}
.resume-row{display:flex;align-items:center;gap:1rem;padding:1rem 1.25rem;background:rgba(2,10,24,.7);border:1px solid rgba(0,245,196,.1);border-radius:10px;margin-bottom:1rem;}
.res-ic{width:44px;height:44px;background:rgba(0,245,196,.07);border:1px solid rgba(0,245,196,.15);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;}
.info-box{background:rgba(0,245,196,.03);border:1px solid rgba(0,245,196,.08);border-radius:10px;padding:1rem 1.2rem;margin-top:1rem;}
.info-box-lbl{font-family:var(--mono);font-size:.6rem;color:var(--accent);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:.5rem;}
.qa-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:1rem;}
.qa-btn{background:rgba(0,245,196,.04);border:1px solid rgba(0,245,196,.1);border-radius:10px;padding:1rem;text-align:left;transition:all .25s;font-family:var(--body);}
.qa-btn:hover{border-color:rgba(0,245,196,.25);background:rgba(0,245,196,.08);transform:translateY(-3px);}
.qa-ic{font-size:1.5rem;margin-bottom:.5rem;}
.qa-lbl{color:var(--head);font-size:.88rem;font-weight:500;}

/* RESPONSIVE */
@media(max-width:1024px){
  .hero-in{grid-template-columns:1fr;}.av-section{display:none;}
  .about-grid{grid-template-columns:1fr;}.contact-grid{grid-template-columns:1fr;}
  .cp-side{width:220px;}.cp-stats{grid-template-columns:repeat(2,1fr);}
}
@media(max-width:768px){
  .nav-links,.nav-resume-btn{display:none;}.burger{display:flex;}
  .hero-name{font-size:3rem;letter-spacing:-2px;}.hero-stats{gap:1.5rem;}
  .section{padding:90px 0;}
  .cp-shell{flex-direction:column;}.cp-side{width:100%;height:auto;position:static;}
  .cp-nav{display:flex;padding:.5rem;flex-wrap:wrap;gap:.25rem;}
  .cp-btn{padding:.5rem .75rem;border-radius:7px;font-size:.66rem;}
  .cp-btn.act::before{display:none;}
  .cp-footer{flex-direction:row;border-top:none;padding:.5rem;}
  .cp-sec-lbl{display:none;}.f2{grid-template-columns:1fr;}
  .cp-2col{grid-template-columns:1fr;}.cp-stats{grid-template-columns:repeat(2,1fr);}
  .resume-modal{width:100%;height:100vh;border-radius:0;}
}
@media(max-width:600px){
  body{cursor:auto!important;}*{cursor:auto!important;}
  .cur-ring,.cur-dot{display:none!important;}
}
`;
  document.head.appendChild(s);
};

/* ═══════════════════════════════════════════════════
   PARTICLES
═══════════════════════════════════════════════════ */
function Particles() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const cx = cv.getContext("2d");
    let W, H, pts = [], raf;
    const resize = () => { W = cv.width = cv.offsetWidth; H = cv.height = cv.offsetHeight; };
    resize(); window.addEventListener("resize", resize);
    class P {
      reset() { this.x=Math.random()*W;this.y=Math.random()*H;this.vx=(Math.random()-.5)*.3;this.vy=(Math.random()-.5)*.3;this.r=Math.random()*1.4+.3;this.a=Math.random()*.5+.1;this.da=(Math.random()-.5)*.003; }
      constructor() { this.reset(); }
      step() { this.x+=this.vx;this.y+=this.vy;this.a+=this.da;if(this.a<.05||this.a>.65)this.da*=-1;if(this.x<0||this.x>W||this.y<0||this.y>H)this.reset(); }
      draw() { cx.beginPath();cx.arc(this.x,this.y,this.r,0,Math.PI*2);cx.fillStyle=`rgba(0,245,196,${this.a})`;cx.fill(); }
    }
    for (let i = 0; i < 100; i++) pts.push(new P());
    const loop = () => {
      cx.clearRect(0, 0, W, H);
      pts.forEach(p => { p.step(); p.draw(); });
      pts.forEach((a, i) => { for (let j=i+1;j<pts.length;j++) { const b=pts[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d<115){cx.beginPath();cx.moveTo(a.x,a.y);cx.lineTo(b.x,b.y);cx.strokeStyle=`rgba(0,245,196,${.1*(1-d/115)})`;cx.lineWidth=.5;cx.stroke();}}}); 
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}/>;
}

function Cursor() {
  const ring = useRef(null), dot = useRef(null);
  useEffect(() => {
    let mx=0,my=0,cx=0,cy=0,raf;
    const mv = e => { mx=e.clientX;my=e.clientY;if(dot.current)dot.current.style.transform=`translate(${mx}px,${my}px) translate(-50%,-50%)`; };
    const loop = () => { cx+=(mx-cx)*.12;cy+=(my-cy)*.12;if(ring.current)ring.current.style.transform=`translate(${cx}px,${cy}px) translate(-50%,-50%)`;raf=requestAnimationFrame(loop); };
    const over = e => { const t=e.target.closest("a,button,.cert-card,.proj-card,.sk-card,.clink,.edu-card,.cp-btn,.qa-btn");ring.current?.classList[t?"add":"remove"]("hov"); };
    loop(); window.addEventListener("mousemove",mv); document.addEventListener("mouseover",over);
    return () => { cancelAnimationFrame(raf);window.removeEventListener("mousemove",mv);document.removeEventListener("mouseover",over); };
  }, []);
  return <><div ref={ring} className="cur-ring"/><div ref={dot} className="cur-dot"/></>;
}

function useTyping(words) {
  const [text,setText]=useState("");const [wi,setWi]=useState(0);const [ci,setCi]=useState(0);const [del,setDel]=useState(false);
  useEffect(()=>{
    const w=words[wi];const spd=del?65:130;
    const t=setTimeout(()=>{if(!del){if(ci<w.length){setText(w.slice(0,ci+1));setCi(ci+1);}else setTimeout(()=>setDel(true),1800);}else{if(ci>0){setText(w.slice(0,ci-1));setCi(ci-1);}else{setDel(false);setWi((wi+1)%words.length);}}},spd);
    return()=>clearTimeout(t);
  },[text,ci,del,wi,words]);
  return text;
}

function useFade() {
  const ref=useRef(null);const [v,setV]=useState(false);
  useEffect(()=>{
    const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting){setV(true);obs.disconnect();}},{threshold:.08});
    if(ref.current)obs.observe(ref.current);
    return()=>obs.disconnect();
  },[]);
  return [ref, v];
}

/* ═══════════════════════════════════════════════════
   SECTIONS
═══════════════════════════════════════════════════ */
function Navbar({sc,active,mob,setMob,resumeURL,onViewResume}) {
  const go = id => { document.getElementById(id)?.scrollIntoView({behavior:"smooth"}); setMob(false); };
  return (
    <nav className={`pf-nav${sc?" sc":""}`}>
      <div className="wrap nav-in">
        <a href="#home" className="nav-logo" onClick={e=>{e.preventDefault();go("home")}}>Anurag Shukla<span style={{color:"#e2e8f0"}}>.</span></a>
        <ul className="nav-links">{NAV.map(n=><li key={n}><a href={`#${n.toLowerCase()}`} className={active===n.toLowerCase()?"act":""} onClick={e=>{e.preventDefault();go(n.toLowerCase())}}>{n}</a></li>)}</ul>
        <div className="nav-right">
          {resumeURL && <button onClick={onViewResume} className="nav-resume-btn">📄 Resume</button>}
          <button className="burger" onClick={()=>setMob(!mob)}><span/><span/><span/></button>
        </div>
      </div>
      {mob && <div className="mob-menu">
        {NAV.map(n=><a key={n} href={`#${n.toLowerCase()}`} onClick={e=>{e.preventDefault();go(n.toLowerCase())}}>{n}</a>)}
        {resumeURL && <a href="#" onClick={e=>{e.preventDefault();onViewResume();}}>📄 View Resume</a>}
      </div>}
    </nav>
  );
}

function Hero({photo,socials,resumeURL,onViewResume}) {
  const typed = useTyping(ROLES);
  const go = id => document.getElementById(id)?.scrollIntoView({behavior:"smooth"});
  const waNum = (socials.whatsapp||"9559096783").replace(/\D/g,"");
  return (
    <section id="home" className="hero">
      <Particles/>
      <div className="hbg-grid"/><div className="hbg-radial"/>
      <div className="hbg-orb1"/><div className="hbg-orb2"/><div className="hbg-orb3"/>
      <div className="hscan"/>
      <div className="wrap hero-in">
        <div>
          <div className="hero-eyebrow"><span className="hero-dot"/>Available for Internship</div>
          <h1 className="hero-name">Hi, I'm<br/><span className="grad">Anurag</span><br/>Shukla</h1>
          <p className="hero-role">I'm a <span className="typed">{typed}</span><span className="caret"/></p>
          <p className="hero-bio">Enthusiastic B.Tech CSE student at GNIOT, Greater Noida — passionate about building beautiful, functional web experiences and solving real-world challenges through clean, elegant code.</p>
          <div className="hero-btns">
            <button className="btn-solid" onClick={()=>go("projects")}>View My Work →</button>
            <button className="btn-outline" onClick={()=>go("contact")}>Get In Touch</button>
            {resumeURL && <button className="btn-outline" onClick={onViewResume}>📄 View Resume</button>}
            {/* <a href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer" className="btn-outline">💬 WhatsApp</a> */}
          </div>
          <div className="hero-stats">
            {[["10+","Certificates"],["3+","Projects"],["7/104","Hackathon"]].map(([n,l])=>(
              <div key={l}><div className="hstat-n">{n}</div><div className="hstat-l">{l}</div></div>
            ))}
          </div>
        </div>
        <div className="av-section">
          <div className="av-r1"/><div className="av-r2"/><div className="av-r3"/>
          <div className="av-dot1"/><div className="av-dot2"/><div className="av-dot3"/>
          {photo ? <img src={photo} alt="Anurag" className="hero-av"/> : <div className="hero-av-ph">AS</div>}
        </div>
      </div>
      <div className="scroll-cue"><div className="scroll-ln"/><span className="scroll-txt">SCROLL</span></div>
    </section>
  );
}

function About({about,socials}) {
  const [r,v] = useFade();
  return (
    <section id="about" className="section" ref={r}>
      <div className={`wrap fade-sect${v?" vis":""}`}>
        <div className="eyebrow">01 — About Me</div>
        <h2 className="sec-title">Who I <em>Am</em></h2>
        <div className="about-grid">
          <div>
            {about.split("\n").filter(Boolean).map((p,i)=><p key={i} className="about-p">{p}</p>)}
            <div className="chips">{["📸 Photography","🏆 Hackathons","🧩 Problem Solving","🚀 Side Projects","💡 Open Source"].map(t=><span key={t} className="chip">{t}</span>)}</div>
            <div className="stat-grid">
              {[["10+","Certificates"],["3+","Projects"],["7/104","Hackathon"],["CSE","Student"]].map(([n,l])=>(
                <div key={l} className="glass stat-box"><div className="stat-n">{n}</div><div className="stat-l">{l}</div></div>
              ))}
            </div>
          </div>
          <div>
            <div className="glass info-card">
              <div className="eyebrow" style={{marginBottom:"1.1rem"}}>Quick Info</div>
              {[["📍","Location","Greater Noida, UP, India"],["🎓","Collegecd","GNIOT, Knowledge Park 2"],["📧","Email",socials.email],["📱","Github",socials.github],["🌐","Languages","English & Hindi"]].map(([ic,k,vl])=>(
                <div key={k} className="irow"><div className="iic">{ic}</div><div><div className="ikey">{k}</div><div className="ival">{vl}</div></div></div>
              ))}
            </div>
            <a href={socials.linkedin} target="_blank" rel="noreferrer" className="btn-solid" style={{display:"flex",justifyContent:"center",marginTop:".5rem"}}>Connect on LinkedIn →</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Skills() {
  const [r,v] = useFade();
  const [cat,setCat] = useState("All");
  const cats = ["All",...[...new Set(SKILLS.map(s=>s.cat))]];
  const filtered = cat==="All" ? SKILLS : SKILLS.filter(s=>s.cat===cat);
  return (
    <section id="skills" className="section skills-section" ref={r}>
      <div className={`wrap fade-sect${v?" vis":""}`}>
        <div className="eyebrow">02 — Skills</div>
        <h2 className="sec-title">What I <em>Work With</em></h2>
        <div className="skill-tabs">{cats.map(c=><button key={c} className={`stab${cat===c?" on":""}`} onClick={()=>setCat(c)}>{c}</button>)}</div>
        <div className="skills-grid">
          {filtered.map((sk,i)=>(
            <div key={sk.name} className="glass sk-card" style={{"--c":sk.color,"--pct":`${sk.level}%`,animationDelay:`${i*.05}s`}}>
              <img src={sk.logo} alt={sk.name} className="sk-logo" loading="lazy" onError={e=>{e.target.style.display="none";}}/>
              <div className="sk-info">
                <div className="sk-name">{sk.name}</div>
                <div className="sk-bar-bg"><div className={`sk-bar${v?" go":""}`} style={{"--pct":`${sk.level}%`,"transitionDelay":`${i*.06}s`}}/></div>
                <div className="sk-pct">{sk.level}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Education() {
  const [r,v] = useFade();
  const items = [
    {icon:"🎓",badge:"2023 — Present",deg:"B.Tech — Computer Science & Engineering",school:"Greater Noida Institute of Technology (GNIOT), Knowledge Park 2, Greater Noida, UP",desc:"Focused on web development, data structures & algorithms, and software engineering. Active member of CSE-Tech Club. Participated in peer training programs, national hackathons, and IIT Kanpur certified programs.",score:null,tags:["B.Tech","CSE","GNIOT"]},
    {icon:"📘",badge:"2023",deg:"Class 12th — Science (PCM)",school:"Siddharth Public School, Siddharthnagar, Uttar Pradesh",desc:"Completed Higher Secondary Education with Physics, Chemistry and Mathematics.",score:"89.6%",scoreLabel:"Percentage",tags:["CBSE","Class XII"]},
    {icon:"📗",badge:"2021",deg:"Class 10th — Secondary Education",school:"Siddharth Public School, Siddharthnagar, Uttar Pradesh",desc:"Completed Secondary School Examination with strong foundation in Mathematics, Science, and English.",score:"94.8%",scoreLabel:"Percentage",tags:["CBSE","Class X"]},
  ];
  return (
    <section id="education" className="section" style={{background:"linear-gradient(180deg,transparent,rgba(129,140,248,.018),transparent)"}} ref={r}>
      <div className={`wrap fade-sect${v?" vis":""}`}>
        <div className="eyebrow">03 — Education</div>
        <h2 className="sec-title">My <em>Academic</em> Journey</h2>
        <div className="edu-grid">
          {items.map((it,i)=>(
            <div key={i} className="glass edu-card">
              <div className="edu-icon-wrap">{it.icon}</div>
              <div>
                <div className="edu-year-badge">{it.badge}</div>
                <div className="edu-deg">{it.deg}</div>
                <div className="edu-school">🏫 {it.school}</div>
                <p className="edu-desc">{it.desc}</p>
                <div className="edu-marks-row">
                  {it.score && <div className="edu-score"><div className="edu-score-n">{it.score}</div><div className="edu-score-l">{it.scoreLabel}</div></div>}
                  {it.tags.map(t=><span key={t} className="edu-tag">{t}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Projects({projects}) {
  const [r,v] = useFade();
  return (
    <section id="projects" className="section" style={{background:"linear-gradient(180deg,transparent,rgba(0,245,196,.018),transparent)"}} ref={r}>
      <div className={`wrap fade-sect${v?" vis":""}`}>
        <div className="eyebrow">04 — Projects</div>
        <h2 className="sec-title">Things I've <em>Built</em></h2>
        <div className="proj-grid">
          {projects.map(p=>(
            <div key={p.id} className="glass proj-card">
              <div className="proj-topbar"/>
              <div className="proj-body">
                <div className="proj-ic">{p.icon}</div>
                <div className="proj-title">{p.title}</div>
                <p className="proj-desc">{p.desc}</p>
                <div className="proj-tech">{(p.tech||[]).map(t=><span key={t} className="tch">{t}</span>)}</div>
                <div className="proj-links">
                  {p.github && <a href={p.github} target="_blank" rel="noreferrer" className="btn-xs btn-xs-ghost">⌥ Code</a>}
                  {p.demo   && <a href={p.demo}   target="_blank" rel="noreferrer" className="btn-xs btn-xs-accent">↗ Live Demo</a>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Certifications({certs,onView}) {
  const [r,v] = useFade();
  return (
    <section id="certifications" className="section" ref={r}>
      <div className={`wrap fade-sect${v?" vis":""}`}>
        <div className="eyebrow">05 — Certifications</div>
        <h2 className="sec-title">My <em>Achievements</em></h2>
        <div className="certs-grid">
          {certs.map(c=>(
            <div key={c.id} className="glass cert-card" onClick={()=>onView(c)}>
              <div className="cert-thumb">{c.imageURL ? <img src={c.imageURL} alt={c.title}/> : <span className="cert-ph">🎓</span>}<div className="cert-ov">VIEW CERTIFICATE</div></div>
              <div className="cert-body"><div className="cert-title">{c.title}</div><div className="cert-issuer">{c.issuer}</div><div className="cert-date">{c.date}</div></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact({socials}) {
  const [r,v] = useFade();
  const waNum = (socials.whatsapp||"9559096783").replace(/\D/g,"");
  const links = [
    {ic:"📧", lbl:"Email",    val:socials.email,                                           href:`mailto:${socials.email}`},
    {ic:"💼", lbl:"LinkedIn", val:"anurag-shukla-48a05832b",                               href:socials.linkedin},
    {ic:"⌥",  lbl:"GitHub",   val:"Theshuklanurag",                                        href:socials.github},
    {ic:"𝕏",  lbl:"Twitter",  val:socials.twitter?.split("/").pop()||"theshuklanurag",     href:socials.twitter||"https://twitter.com/theshuklanurag"},
    {ic:"📸", lbl:"Instagram",val:"@theshuklanurag",                                       href:socials.instagram},
  ];
  return (
    <section id="contact" className="section" style={{background:"linear-gradient(180deg,transparent,rgba(129,140,248,.018),transparent)"}} ref={r}>
      <div className={`wrap fade-sect${v?" vis":""}`}>
        <div className="eyebrow">06 — Contact</div>
        <h2 className="sec-title">Let's <em>Connect</em></h2>
        <div className="contact-grid">
          <div>
            <p className="contact-p">I'm currently open to internship opportunities in software development and web engineering. Whether you have a project, a question, or just want to say hello — my inbox is always open!</p>
            <p className="contact-p">Quick learner, team player — I love tackling real-world challenges with clean, efficient code.</p>
            <div style={{marginTop:"2rem",display:"flex",gap:"1rem",flexWrap:"wrap"}}>
              <a href={`mailto:${socials.email}`} className="btn-solid">Say Hello →</a>
              <a href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer" className="btn-outline">💬 WhatsApp</a>
            </div>
          </div>
          <div>
            {links.map(l=>(
              <a key={l.lbl} href={l.href} target="_blank" rel="noreferrer" className="glass clink">
                <div className="clic">{l.ic}</div>
                <div><div className="clbl">{l.lbl}</div><div className="cval">{l.val}</div></div>
                <span className="carr">↗</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer({onAdmin,socials}) {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="fsocs">
          {[[socials.instagram,"📸"],[socials.linkedin,"💼"],[socials.github,"⌥"],[socials.twitter||"#","𝕏"]].map(([h,i])=>(
            <a key={i} href={h} target="_blank" rel="noreferrer" className="fsoc">{i}</a>
          ))}
        </div>
        <div className="footer-copy">Designed & Built by Anurag Shukla © {new Date().getFullYear()}</div>
        <button className="settings-fab" onClick={onAdmin} title="Admin · Ctrl+Shift+A">⚙</button>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════
   MODALS
═══════════════════════════════════════════════════ */
function ResumeModal({resumeURL,onClose}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="resume-modal" onClick={e=>e.stopPropagation()}>
        <div className="resume-modal-hd">
          <div className="resume-modal-title">📄 Anurag Shukla — Resume</div>
          <div className="resume-modal-acts">
            <a href={resumeURL} download="Anurag_Shukla_Resume.pdf" className="btn-xs btn-xs-accent">↓ Download</a>
            <button className="f-cancel" onClick={onClose}>✕ Close</button>
          </div>
        </div>
        <iframe src={resumeURL} className="resume-iframe" title="Resume"/>
      </div>
    </div>
  );
}

function CertModal({cert,onClose}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="img-modal" onClick={e=>e.stopPropagation()}>
        {cert.imageURL
          ? <img src={cert.imageURL} alt={cert.title}/>
          : <div style={{padding:"2.5rem",textAlign:"center"}}>
              <div style={{fontSize:"4rem",marginBottom:"1rem"}}>🎓</div>
              <div style={{fontFamily:"var(--disp)",fontSize:"1.2rem",color:"var(--head)",marginBottom:".5rem"}}>{cert.title}</div>
              <div style={{color:"var(--accent)",fontSize:".9rem",marginBottom:".35rem"}}>{cert.issuer}</div>
              <div style={{fontFamily:"var(--mono)",fontSize:".7rem",color:"#475569"}}>{cert.date}</div>
              <p style={{marginTop:"1.5rem",color:"#64748b",fontSize:".8rem",fontFamily:"var(--mono)"}}>Upload image via Admin Panel to display here</p>
            </div>
        }
        <div style={{textAlign:"center",marginTop:"1rem"}}><button className="f-cancel" onClick={onClose}>✕ Close</button></div>
      </div>
    </div>
  );
}

function LoginModal({onLogin,onClose}) {
  const [pass,setPass]=useState("");const [err,setErr]=useState("");
  const sub = () => { if(!onLogin(pass)) setErr("Incorrect password."); };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:"2.5rem",marginBottom:".5rem",textAlign:"center"}}>⚙</div>
        <div className="modal-title" style={{textAlign:"center"}}>Admin Login</div>
        <div className="modal-sub" style={{textAlign:"center"}}>Enter password to access the control panel.</div>
        {err && <div style={{color:"var(--red)",fontFamily:"var(--mono)",fontSize:".76rem",marginBottom:".75rem"}}>⚠ {err}</div>}
        <input className="fi" type="password" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sub()} autoFocus/>
        <p style={{fontFamily:"var(--mono)",fontSize:".6rem",color:"#475569",marginBottom:"1rem",textAlign:"center"}}>💡 Shortcut: Ctrl + Shift + A</p>
        <button className="f-save" onClick={sub}>Access Control Panel →</button>
        <div style={{textAlign:"center",marginTop:".75rem"}}><button className="f-cancel" onClick={onClose}>Cancel</button></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ADMIN FORMS
═══════════════════════════════════════════════════ */
function CertForm({init,onSave,onCancel}) {
  const [title,setTitle]=useState(init?.title||"");
  const [issuer,setIssuer]=useState(init?.issuer||"");
  const [date,setDate]=useState(init?.date||"");
  const [preview,setPreview]=useState(init?.imageURL||null);
  const [saving,setSaving]=useState(false);

  const handleImg = async e => {
    const f = e.target.files[0]; if(!f) return;
    const b64 = await compress(f, 900, 0.78);
    setPreview(b64);
  };

  const save = async () => {
    if(!title||!issuer) return;
    setSaving(true);
    onSave({id:init?.id||uid(), title, issuer, date, imageURL:preview});
    setSaving(false);
  };

  return (
    <div>
      <div className="f2">
        <div className="fg"><label className="flbl">Title *</label><input className="fi" style={{marginBottom:0}} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Python for Data Science"/></div>
        <div className="fg"><label className="flbl">Organization *</label><input className="fi" style={{marginBottom:0}} value={issuer} onChange={e=>setIssuer(e.target.value)} placeholder="Coursera"/></div>
      </div>
      <div className="fg"><label className="flbl">Date</label><input className="fi" style={{marginBottom:0}} value={date} onChange={e=>setDate(e.target.value)} placeholder="Dec 2025"/></div>
      <div className="fg">
        <label className="flbl">Certificate Image (optional)</label>
        <div className="upbox">📁 Click to upload image (auto-compressed){<input type="file" accept="image/*" onChange={handleImg}/>}{preview && <img src={preview} alt="prev" className="upbox-prev"/>}</div>
      </div>
      <div style={{display:"flex",gap:".75rem"}}>
        <button className="f-save" style={{flex:1,marginTop:0}} onClick={save} disabled={saving}>{saving?"Saving...":init?"Save Changes →":"Add Certificate →"}</button>
        <button className="f-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function ProjForm({init,onSave,onCancel}) {
  const [title,setTitle]=useState(init?.title||"");const [icon,setIcon]=useState(init?.icon||"🚀");
  const [desc,setDesc]=useState(init?.desc||"");const [tech,setTech]=useState((init?.tech||[]).join(", ")||"");
  const [gh,setGh]=useState(init?.github||"");const [demo,setDemo]=useState(init?.demo||"");
  const save = () => { if(!title||!desc) return; onSave({id:init?.id||uid(),title,icon,desc,tech:tech.split(",").map(t=>t.trim()).filter(Boolean),github:gh,demo}); };
  return (
    <div>
      <div className="f2">
        <div className="fg"><label className="flbl">Title *</label><input className="fi" style={{marginBottom:0}} value={title} onChange={e=>setTitle(e.target.value)} placeholder="My App"/></div>
        <div className="fg"><label className="flbl">Emoji Icon</label><input className="fi" style={{marginBottom:0}} value={icon} onChange={e=>setIcon(e.target.value)} placeholder="🚀"/></div>
      </div>
      <div className="fg"><label className="flbl">Description *</label><textarea className="fi fta" style={{marginBottom:0}} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What does this project do?"/></div>
      <div className="fg"><label className="flbl">Tech Stack (comma separated)</label><input className="fi" style={{marginBottom:0}} value={tech} onChange={e=>setTech(e.target.value)} placeholder="React, Node.js, MongoDB"/></div>
      <div className="f2">
        <div className="fg"><label className="flbl">GitHub URL</label><input className="fi" style={{marginBottom:0}} value={gh} onChange={e=>setGh(e.target.value)} placeholder="https://github.com/..."/></div>
        <div className="fg"><label className="flbl">Live Demo URL</label><input className="fi" style={{marginBottom:0}} value={demo} onChange={e=>setDemo(e.target.value)} placeholder="https://..."/></div>
      </div>
      <div style={{display:"flex",gap:".75rem"}}><button className="f-save" style={{flex:1,marginTop:0}} onClick={save}>{init?"Save Changes →":"Add Project →"}</button><button className="f-cancel" onClick={onCancel}>Cancel</button></div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ADMIN CONTROL PANEL
═══════════════════════════════════════════════════ */
const CP_TABS = [
  {id:"dashboard",lbl:"Dashboard",    ic:"🖥️", sec:"OVERVIEW"},
  {id:"profile",  lbl:"Profile Photo",ic:"👤",  sec:"CONTENT"},
  {id:"resume",   lbl:"Resume / CV",  ic:"📄",  sec:"CONTENT"},
  {id:"about",    lbl:"About Text",   ic:"✏️",  sec:"CONTENT"},
  {id:"certs",    lbl:"Certificates", ic:"🎓",  sec:"CONTENT"},
  {id:"projects", lbl:"Projects",     ic:"💼",  sec:"CONTENT"},
  {id:"socials",  lbl:"Social Links", ic:"🔗",  sec:"SETTINGS"},
];

function AdminPanel({certs,projects,photo,about,socials,resumeURL,onDataChange,onExit,onLogout}) {
  const [tab,setTab]   = useState("dashboard");
  const [toast,setToast]= useState(null);
  const [editCert,setEC]= useState(null);
  const [editProj,setEP]= useState(null);
  const [aboutD,setAbD] = useState(about);
  const [socD,setSocD]  = useState(socials);

  const t_ = (msg, err=false) => { setToast({msg,err}); setTimeout(()=>setToast(null),3200); };
  const secs = [...new Set(CP_TABS.map(t=>t.sec))];

  /* save helpers — all write to Supabase DB */
  const saveCert = async c => {
    const idx = certs.findIndex(x=>x.id===c.id);
    const next = idx>=0 ? certs.map(x=>x.id===c.id?c:x) : [...certs,c];
    await dbSet("certs", {list:next});
    onDataChange("certs",next); setEC(null);
    t_(idx>=0 ? "Certificate updated!" : "Certificate added!");
  };
  const delCert = async id => {
    if(!confirm("Delete this certificate?")) return;
    const next = certs.filter(c=>c.id!==id);
    await dbSet("certs",{list:next}); onDataChange("certs",next); t_("Deleted.");
  };
  const saveProj = async p => {
    const idx = projects.findIndex(x=>x.id===p.id);
    const next = idx>=0 ? projects.map(x=>x.id===p.id?p:x) : [...projects,p];
    await dbSet("projects",{list:next});
    onDataChange("projects",next); setEP(null);
    t_(idx>=0 ? "Project updated!" : "Project added!");
  };
  const delProj = async id => {
    if(!confirm("Delete this project?")) return;
    const next = projects.filter(p=>p.id!==id);
    await dbSet("projects",{list:next}); onDataChange("projects",next); t_("Deleted.");
  };

  const handlePhoto = async e => {
    const f = e.target.files[0]; if(!f) return;
    t_("Compressing & saving photo...");
    const b64 = await compress(f, 900, 0.8);
    const cfg = {photo:b64, about, socials, resumeURL:resumeURL||null};
    await dbSet("config", cfg);
    onDataChange("photo", b64); t_("Profile photo updated! ✓");
  };

  const handleResume = async e => {
    const f = e.target.files[0]; if(!f) return;
    if(f.size > 10*1024*1024) { t_("PDF too large. Max 10MB.",true); return; }
    t_("Uploading resume... please wait");
    try {
      const { error: upErr } = await supabase.storage
        .from("resumes")
        .upload("resume.pdf", f, { upsert: true, contentType: "application/pdf" });
      if (upErr) throw new Error(upErr.message);
      const { data } = supabase.storage.from("resumes").getPublicUrl("resume.pdf");
      const url = data.publicUrl + "?t=" + Date.now();
      const cfg = { photo:photo||null, about, socials, resumeURL: url };
      await dbSet("config", cfg);
      onDataChange("resumeURL", url);
      t_("Resume uploaded! ✓");
    } catch(err) {
      console.error(err);
      t_("Upload failed: " + err.message, true);
    }
  };

  const saveAbout = async () => {
    await dbSet("config",{photo:photo||null,about:aboutD,socials,resumeURL:resumeURL||null});
    onDataChange("about",aboutD); t_("About text updated!");
  };
  const saveSocials = async () => {
    await dbSet("config",{photo:photo||null,about,socials:socD,resumeURL:resumeURL||null});
    onDataChange("socials",socD); t_("Social links updated!");
  };

  return (
    <div className="cp-shell">
      <aside className="cp-side">
        <div className="cp-logo-area">
          <div className="cp-logo">⚙ Control Panel</div>
          <div className="cp-sub">PORTFOLIO ADMIN</div>
          <div className="cp-badge">Supabase Connected</div>
        </div>
        <nav className="cp-nav">
          {secs.map(sec=>(
            <div key={sec}>
              <div className="cp-sec-lbl">{sec}</div>
              {CP_TABS.filter(t=>t.sec===sec).map(t=>(
                <button key={t.id} className={`cp-btn${tab===t.id?" act":""}`} onClick={()=>{setTab(t.id);setEC(null);setEP(null);}}>
                  <span className="cp-ic">{t.ic}</span>{t.lbl}
                  {t.id==="certs"    && <span className="cp-nbadge">{certs.length}</span>}
                  {t.id==="projects" && <span className="cp-nbadge">{projects.length}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="cp-footer">
          <button className="cp-view-btn" onClick={onExit}>← View Portfolio</button>
          <button className="cp-logout" onClick={onLogout}>🔒 Logout</button>
        </div>
      </aside>

      <main className="cp-main">

        {tab==="dashboard" && <>
          <div className="cp-topbar"><div><div className="cp-page-title">Dashboard</div><div className="cp-page-sub">PORTFOLIO CONTROL CENTER · SUPABASE DB</div></div></div>
          <div className="cp-stats">
            {[["🎓",certs.length,"Certificates"],["💼",projects.length,"Projects"],["📄",resumeURL?"✓":"—","Resume"],["📸",photo?"✓":"—","Photo"]].map(([ic,n,l])=>(
              <div key={l} className="cp-stat"><div className="cp-stat-ic">{ic}</div><div className="cp-stat-n">{n}</div><div className="cp-stat-l">{l}</div></div>
            ))}
          </div>
          <div className="cp-card">
            <div className="cp-card-hd"><div className="cp-card-title">⚡ Quick Actions</div></div>
            <div className="qa-grid">
              {[["🎓","Add Certificate","certs"],["💼","Add Project","projects"],["👤","Update Photo","profile"],["📄","Upload Resume","resume"],["✏️","Edit About","about"],["🔗","Update Links","socials"]].map(([ic,lbl,t])=>(
                <button key={t} className="qa-btn" onClick={()=>setTab(t)}><div className="qa-ic">{ic}</div><div className="qa-lbl">{lbl}</div></button>
              ))}
            </div>
          </div>
          <div className="cp-card">
            <div className="cp-card-hd"><div className="cp-card-title">☁️ How It Works</div></div>
            <div className="info-box">
              <div className="info-box-lbl">✅ No file buckets, no CORS, no complexity</div>
              <p style={{fontSize:".85rem",lineHeight:"1.9",color:"var(--txt)"}}>
                Images are compressed automatically to ~100–200KB, then stored as text directly inside Supabase database.<br/>
                No storage bucket setup needed. Just upload and it works — visible to everyone on the live site.<br/>
                <strong style={{color:"var(--accent)"}}>Resume limit: 3MB PDF. Photo/cert images: no practical limit (auto-compressed).</strong>
              </p>
            </div>
          </div>
        </>}

        {tab==="profile" && <>
          <div className="cp-topbar"><div><div className="cp-page-title">Profile Photo</div><div className="cp-page-sub">AUTO-COMPRESSED · SAVED TO DATABASE</div></div></div>
          <div className="cp-card">
            <div className="cp-card-hd"><div className="cp-card-title">👤 Profile Picture</div></div>
            <div className="cp-2col">
              <div className="photo-area">
                {photo ? <img src={photo} alt="Profile" className="photo-img"/> : <div className="photo-ph">AS</div>}
                <button className="chg-btn">📷 Upload Photo<input type="file" accept="image/*" onChange={handlePhoto}/></button>
                {photo && <button className="del-btn" onClick={async()=>{await dbSet("config",{photo:null,about,socials,resumeURL:resumeURL||null});onDataChange("photo",null);t_("Photo removed.");}}>Remove</button>}
              </div>
              <div>
                <div className="info-box">
                  <div className="info-box-lbl">💡 Photo Tips</div>
                  <ul style={{paddingLeft:"1.2rem",fontSize:".85rem",lineHeight:"2",color:"var(--txt)"}}>
                    <li>Square or portrait works best (shown as circle)</li>
                    <li>Auto-compressed to ~150KB — any size input is fine</li>
                    <li>Formats: JPG, PNG, WebP</li>
                    <li>Saves directly to cloud — visible everywhere instantly</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </>}

        {tab==="resume" && <>
          <div className="cp-topbar"><div><div className="cp-page-title">Resume / CV</div><div className="cp-page-sub">UPLOAD PDF (MAX 3MB)</div></div></div>
          <div className="cp-card">
            <div className="cp-card-hd"><div className="cp-card-title">📄 Resume File</div></div>
            {resumeURL && <div className="resume-row">
              <div className="res-ic">📄</div>
              <div><div style={{color:"var(--head)",fontWeight:500,marginBottom:".2rem"}}>Resume uploaded ✓</div><div style={{fontFamily:"var(--mono)",fontSize:".7rem",color:"#64748b"}}>Stored in Supabase DB · Shows on live site</div></div>
              <a href={resumeURL} target="_blank" rel="noreferrer" className="btn-xs btn-xs-accent" style={{marginLeft:"auto"}}>👁 View</a>
              <a href={resumeURL} download="Anurag_Shukla_Resume.pdf" className="btn-xs btn-xs-ghost">↓ Download</a>
            </div>}
            <div className="upbox" style={{marginBottom:"1rem"}}>
              {resumeURL ? "🔄 Click to replace PDF (max 3MB)" : "📁 Upload your resume PDF (max 3MB)"}
              <input type="file" accept=".pdf,application/pdf" onChange={handleResume}/>
            </div>
            {resumeURL && <button className="del-btn" onClick={async()=>{await dbSet("config",{photo:photo||null,about,socials,resumeURL:null});onDataChange("resumeURL",null);t_("Resume removed.");}}>🗑 Remove Resume</button>}
            <div className="info-box" style={{marginTop:"1rem"}}>
              <div className="info-box-lbl">📌 Where It Appears</div>
              <ul style={{paddingLeft:"1.2rem",fontSize:".85rem",lineHeight:"2",color:"var(--txt)"}}>
                <li>Navbar "📄 Resume" button → opens in a modal viewer</li>
                <li>"View Resume" button in Hero section → modal with viewer</li>
                <li>Download button is inside the modal</li>
              </ul>
            </div>
          </div>
        </>}

        {tab==="about" && <>
          <div className="cp-topbar"><div><div className="cp-page-title">About Text</div><div className="cp-page-sub">EDIT YOUR BIO</div></div></div>
          <div className="cp-card">
            <div className="cp-card-hd"><div className="cp-card-title">✏️ Edit About Section</div></div>
            <textarea className="fi fta" style={{minHeight:"200px",marginBottom:".5rem"}} value={aboutD} onChange={e=>setAbD(e.target.value)}/>
            <p style={{fontFamily:"var(--mono)",fontSize:".68rem",color:"#64748b",marginBottom:"1rem"}}>💡 Blank line = new paragraph on page.</p>
            <button className="f-save" onClick={saveAbout}>Save Changes →</button>
          </div>
        </>}

        {tab==="certs" && <>
          <div className="cp-topbar"><div><div className="cp-page-title">Certificates</div><div className="cp-page-sub">ADD · EDIT · DELETE</div></div></div>
          {editCert
            ? <div className="cp-card"><div className="cp-card-hd"><div className="cp-card-title">{editCert==="new"?"➕ Add Certificate":"✏️ Edit Certificate"}</div></div><CertForm init={editCert==="new"?null:editCert} onSave={saveCert} onCancel={()=>setEC(null)}/></div>
            : <div className="cp-card">
                <div className="cp-card-hd"><div className="cp-card-title">🎓 All Certificates <span style={{fontFamily:"var(--mono)",fontSize:".7rem",color:"var(--accent)",background:"rgba(0,245,196,.08)",padding:".15rem .6rem",borderRadius:"5px",marginLeft:".5rem"}}>{certs.length}</span></div><button className="f-save" style={{width:"auto",marginTop:0,padding:".5rem 1.4rem",fontSize:".75rem"}} onClick={()=>setEC("new")}>+ Add New</button></div>
                <div className="cp-list">
                  {certs.map(c=>(
                    <div key={c.id} className="cp-item">
                      <div className="cp-thumb">{c.imageURL?<img src={c.imageURL} alt=""/>:"🎓"}</div>
                      <div className="cp-item-info"><div className="cp-item-title">{c.title}</div><div className="cp-item-sub">{c.issuer} · {c.date}</div></div>
                      <div className="cp-item-acts"><button className="edit-btn" onClick={()=>setEC(c)}>Edit</button><button className="del-btn" onClick={()=>delCert(c.id)}>Delete</button></div>
                    </div>
                  ))}
                </div>
              </div>
          }
        </>}

        {tab==="projects" && <>
          <div className="cp-topbar"><div><div className="cp-page-title">Projects</div><div className="cp-page-sub">ADD · EDIT · DELETE</div></div></div>
          {editProj
            ? <div className="cp-card"><div className="cp-card-hd"><div className="cp-card-title">{editProj==="new"?"➕ Add Project":"✏️ Edit Project"}</div></div><ProjForm init={editProj==="new"?null:editProj} onSave={saveProj} onCancel={()=>setEP(null)}/></div>
            : <div className="cp-card">
                <div className="cp-card-hd"><div className="cp-card-title">💼 All Projects <span style={{fontFamily:"var(--mono)",fontSize:".7rem",color:"var(--accent)",background:"rgba(0,245,196,.08)",padding:".15rem .6rem",borderRadius:"5px",marginLeft:".5rem"}}>{projects.length}</span></div><button className="f-save" style={{width:"auto",marginTop:0,padding:".5rem 1.4rem",fontSize:".75rem"}} onClick={()=>setEP("new")}>+ Add New</button></div>
                <div className="cp-list">
                  {projects.map(p=>(
                    <div key={p.id} className="cp-item">
                      <div className="cp-thumb" style={{fontSize:"1.6rem"}}>{p.icon}</div>
                      <div className="cp-item-info"><div className="cp-item-title">{p.title}</div><div className="cp-item-sub">{(p.tech||[]).join(", ")}</div></div>
                      <div className="cp-item-acts"><button className="edit-btn" onClick={()=>setEP(p)}>Edit</button><button className="del-btn" onClick={()=>delProj(p.id)}>Delete</button></div>
                    </div>
                  ))}
                </div>
              </div>
          }
        </>}

        {tab==="socials" && <>
          <div className="cp-topbar"><div><div className="cp-page-title">Social Links</div><div className="cp-page-sub">UPDATE ALL CONTACTS</div></div></div>
          <div className="cp-card">
            <div className="cp-card-hd"><div className="cp-card-title">🔗 Social & Contact Links</div></div>
            {[["Email","email","📧"],["WhatsApp (with country code)","whatsapp","💬"],["LinkedIn URL","linkedin","💼"],["GitHub URL","github","⌥"],["Twitter / X URL","twitter","𝕏"],["Instagram URL","instagram","📸"]].map(([lbl,key,ic])=>(
              <div key={key} className="fg"><label className="flbl">{ic} {lbl}</label><input className="fi" style={{marginBottom:0}} value={socD[key]||""} onChange={e=>setSocD({...socD,[key]:e.target.value})} placeholder={`Enter ${lbl}`}/></div>
            ))}
            <button className="f-save" onClick={saveSocials}>Save All Links →</button>
          </div>
        </>}

      </main>
      {toast && <div className={`toast${toast.err?" toast-err":""}`}>{toast.err?"⚠":"✓"} {toast.msg}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════ */
export default function App() {
  const [loading,   setLoading]   = useState(true);
  const [certs,     setCerts]     = useState(DEFAULT_CERTS);
  const [projects,  setProjects]  = useState(DEFAULT_PROJS);
  const [photo,     setPhoto]     = useState(null);
  const [about,     setAbout]     = useState(DEFAULT_ABOUT);
  const [socials,   setSocials]   = useState(DEFAULT_SOCIALS);
  const [resumeURL, setResumeURL] = useState(null);

  const [isAdmin,    setIsAdmin]    = useState(false);
  const [showLogin,  setShowLogin]  = useState(false);
  const [adminView,  setAdminView]  = useState(false);
  const [viewCert,   setViewCert]   = useState(null);
  const [showResume, setShowResume] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const [mob,        setMob]        = useState(false);
  const [active,     setActive]     = useState("home");

  useEffect(() => { injectCSS(); }, []);

  /* Load data from Supabase on mount */
  useEffect(() => {
    const load = async () => {
      try {
        const [cfg, certsData, projsData] = await Promise.all([
          dbGet("config"),
          dbGet("certs"),
          dbGet("projects"),
        ]);
        if (cfg) {
          if (cfg.photo)     setPhoto(cfg.photo);
          if (cfg.about)     setAbout(cfg.about);
          if (cfg.socials)   setSocials({...DEFAULT_SOCIALS,...cfg.socials});
          if (cfg.resumeURL) setResumeURL(cfg.resumeURL);
        }
        if (certsData?.list?.length)  setCerts(certsData.list);
        if (projsData?.list?.length)  setProjects(projsData.list);
      } catch (e) { console.warn("Supabase load:", e); }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn); return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const els = NAV.map(n=>document.getElementById(n.toLowerCase())).filter(Boolean);
    const obs = new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)setActive(e.target.id);}),{threshold:.25});
    els.forEach(e=>obs.observe(e)); return()=>obs.disconnect();
  }, [adminView]);

  useEffect(() => {
    const fn = e => { if(e.ctrlKey&&e.shiftKey&&e.key==="A"){e.preventDefault();isAdmin?setAdminView(true):setShowLogin(true);} };
    window.addEventListener("keydown",fn); return()=>window.removeEventListener("keydown",fn);
  }, [isAdmin]);

  const handleDataChange = useCallback((key,val) => {
    if(key==="certs")     setCerts(val);
    if(key==="projects")  setProjects(val);
    if(key==="photo")     setPhoto(val);
    if(key==="about")     setAbout(val);
    if(key==="socials")   setSocials(val);
    if(key==="resumeURL") setResumeURL(val);
  }, []);

  const handleLogin = pass => {
    if(pass===ADMIN_PASS){setIsAdmin(true);setShowLogin(false);setAdminView(true);return true;}
    return false;
  };

  if (loading) return (
    <div className="loader-screen">
      <div className="loader-ring"/>
      <div className="loader-txt">LOADING PORTFOLIO</div>
      <div className="loader-sub">CONNECTING TO SUPABASE...</div>
    </div>
  );

  if (adminView) return (
    <>
      <Cursor/>
      <AdminPanel
        certs={certs} projects={projects} photo={photo}
        about={about} socials={socials} resumeURL={resumeURL}
        onDataChange={handleDataChange}
        onExit={()=>setAdminView(false)}
        onLogout={()=>{setIsAdmin(false);setAdminView(false);}}
      />
    </>
  );

  return (
    <>
      <Cursor/>
      <Navbar sc={scrolled} active={active} mob={mob} setMob={setMob} resumeURL={resumeURL} onViewResume={()=>setShowResume(true)}/>
      <main>
        <Hero    photo={photo}    socials={socials} resumeURL={resumeURL} onViewResume={()=>setShowResume(true)}/>
        <About   about={about}   socials={socials}/>
        <Skills/>
        <Education/>
        <Projects  projects={projects}/>
        <Certifications certs={certs} onView={setViewCert}/>
        <Contact   socials={socials}/>
      </main>
      <Footer onAdmin={()=>isAdmin?setAdminView(true):setShowLogin(true)} socials={socials}/>

      {showResume && resumeURL && <ResumeModal resumeURL={resumeURL} onClose={()=>setShowResume(false)}/>}
      {viewCert   && <CertModal cert={viewCert} onClose={()=>setViewCert(null)}/>}
      {showLogin  && <LoginModal onLogin={handleLogin} onClose={()=>setShowLogin(false)}/>}
    </>
  );
}
