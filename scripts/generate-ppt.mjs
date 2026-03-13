#!/usr/bin/env node
/**
 * Generate a PowerPoint presentation for the GCS Change & Release Management Dashboard.
 * Run: node scripts/generate-ppt.mjs
 * Output: docs/GCS_Change_Release_Dashboard.pptx
 */
import PptxGenJSModule from "pptxgenjs";

const PptxGenJS = PptxGenJSModule.default || PptxGenJSModule;
const pptx = new PptxGenJS();
pptx.author = "GCS Engineering";
pptx.company = "GCS";
pptx.title = "GCS Change & Release Management Dashboard";
pptx.subject = "Framework Architecture & Demo";
pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5

/* ── Color Palette ── */
const C = {
  dark: "1e293b",    // slate-800
  mid: "334155",     // slate-700
  light: "f8fafc",   // slate-50
  accent: "059669",  // emerald-600
  accent2: "0d9488", // teal-600
  blue: "2563eb",
  purple: "7c3aed",
  red: "dc2626",
  orange: "ea580c",
  amber: "d97706",
  green: "16a34a",
  white: "ffffff",
  gray: "94a3b8",
  grayLight: "e2e8f0",
};

/* ── Reusable Helpers ── */
function addFooter(slide, num, total) {
  slide.addText(`GCS Change & Release Management Dashboard  |  Confidential`, { x: 0.5, y: 7.0, w: 10, h: 0.3, fontSize: 8, color: C.gray, fontFace: "Arial" });
  slide.addText(`${num} / ${total}`, { x: 11.5, y: 7.0, w: 1.5, h: 0.3, fontSize: 8, color: C.gray, fontFace: "Arial", align: "right" });
}

function sectionDivider(title, subtitle, slideNum, total) {
  const slide = pptx.addSlide();
  slide.background = { color: C.dark };
  slide.addText(title, { x: 1, y: 2.2, w: 11, h: 1.2, fontSize: 40, fontFace: "Arial", color: C.white, bold: true });
  slide.addShape(pptx.ShapeType.rect, { x: 1, y: 3.5, w: 2, h: 0.06, fill: { color: C.accent } });
  slide.addText(subtitle, { x: 1, y: 3.8, w: 11, h: 0.8, fontSize: 20, fontFace: "Arial", color: C.gray });
  addFooter(slide, slideNum, total);
  return slide;
}

const TOTAL = 20;
let sn = 0;

/* ════════════════════════════════════════════════════════════════════
   SLIDE 1 — Title
   ════════════════════════════════════════════════════════════════════ */
{
  sn++;
  const s = pptx.addSlide();
  s.background = { color: C.dark };
  // Accent bar
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.15, h: 7.5, fill: { color: C.accent } });
  s.addText("GCS Change & Release\nManagement Dashboard", { x: 1.0, y: 1.5, w: 11, h: 2.5, fontSize: 44, fontFace: "Arial", color: C.white, bold: true, lineSpacingMultiple: 1.1 });
  s.addShape(pptx.ShapeType.rect, { x: 1.0, y: 4.2, w: 3, h: 0.06, fill: { color: C.accent } });
  s.addText("Framework Architecture, Scoring Methodology & Live Demo", { x: 1.0, y: 4.5, w: 11, h: 0.6, fontSize: 20, fontFace: "Arial", color: C.gray });
  s.addText("March 2026  |  GCS Engineering", { x: 1.0, y: 5.5, w: 11, h: 0.5, fontSize: 14, fontFace: "Arial", color: C.gray });
  addFooter(s, sn, TOTAL);
}

/* ════════════════════════════════════════════════════════════════════
   SLIDE 2 — Agenda
   ════════════════════════════════════════════════════════════════════ */
{
  sn++;
  const s = pptx.addSlide();
  s.background = { color: C.light };
  s.addText("Agenda", { x: 0.8, y: 0.4, w: 11, h: 0.8, fontSize: 32, fontFace: "Arial", color: C.dark, bold: true });
  s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 1.1, w: 1.5, h: 0.05, fill: { color: C.accent } });

  const items = [
    ["1", "Problem Statement & Goals"],
    ["2", "System Architecture Overview"],
    ["3", "Technology Stack"],
    ["4", "Data Flow — ServiceNow to Dashboard"],
    ["5", "Impact Analysis — 4-Layer Scoring Framework"],
    ["6", "Plan Readiness & Dimension Scoring"],
    ["7", "ML Content Analysis Engine"],
    ["8", "Code Change Analysis & ML Feature Impact"],
    ["9", "Production Outage & Performance Detection"],
    ["10", "Analytics & Advanced Pages"],
    ["11", "Authentication & Role-Based Access"],
    ["12", "Live Demo"],
    ["13", "Roadmap & Next Steps"],
  ];
  items.forEach(([num, text], i) => {
    const y = 1.5 + i * 0.4;
    s.addText(num, { x: 0.8, y, w: 0.6, h: 0.35, fontSize: 13, fontFace: "Arial", color: C.white, bold: true, fill: { color: C.accent }, align: "center", valign: "middle", rectRadius: 0.05 });
    s.addText(text, { x: 1.6, y, w: 10, h: 0.35, fontSize: 14, fontFace: "Arial", color: C.dark });
  });
  addFooter(s, sn, TOTAL);
}

/* ════════════════════════════════════════════════════════════════════
   SLIDE 3 — Problem Statement
   ════════════════════════════════════════════════════════════════════ */
{
  sn++;
  const s = pptx.addSlide();
  s.background = { color: C.light };
  s.addText("Problem Statement", { x: 0.8, y: 0.4, w: 11, h: 0.8, fontSize: 32, fontFace: "Arial", color: C.dark, bold: true });
  s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 1.1, w: 1.5, h: 0.05, fill: { color: C.accent } });

  const challenges = [
    ["📋", "Manual Change Review", "Change requests in ServiceNow lack automated risk scoring — teams rely on subjective assessment"],
    ["📊", "No Plan Quality Metrics", "Implementation, backout, and test plans are not quantitatively measured for completeness"],
    ["🔍", "Blind Spot on Code Risk", "Git-level code changes aren't correlated with change request risk classification"],
    ["⏱️", "Slow Release Decisions", "Go/no-go decisions for releases lack data-driven confidence scoring"],
    ["🔒", "No Unified Dashboard", "Risk, impact, velocity, and health data scattered across multiple tools"],
  ];
  challenges.forEach(([icon, title, desc], i) => {
    const y = 1.6 + i * 1.05;
    s.addShape(pptx.ShapeType.rect, { x: 0.8, y, w: 11.5, h: 0.9, fill: { color: C.white }, shadow: { type: "outer", blur: 4, offset: 2, color: "d0d0d0", opacity: 0.3 }, rectRadius: 0.1 });
    s.addText(icon, { x: 1.0, y: y + 0.1, w: 0.6, h: 0.6, fontSize: 24, align: "center", valign: "middle" });
    s.addText(title, { x: 1.8, y: y + 0.05, w: 10, h: 0.35, fontSize: 14, fontFace: "Arial", color: C.dark, bold: true });
    s.addText(desc, { x: 1.8, y: y + 0.4, w: 10, h: 0.4, fontSize: 11, fontFace: "Arial", color: C.gray });
  });
  addFooter(s, sn, TOTAL);
}

/* ════════════════════════════════════════════════════════════════════
   SLIDE 4 — Solution Overview
   ════════════════════════════════════════════════════════════════════ */
{
  sn++;
  const s = pptx.addSlide();
  s.background = { color: C.light };
  s.addText("Solution: GCS Change & Release Management Dashboard", { x: 0.8, y: 0.4, w: 12, h: 0.8, fontSize: 28, fontFace: "Arial", color: C.dark, bold: true });
  s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 1.05, w: 1.5, h: 0.05, fill: { color: C.accent } });

  const features = [
    { title: "Real-Time Dashboard", desc: "KPIs, risk gauges, deployment frequency — auto-refreshes every 30s via SWR", color: C.blue },
    { title: "Impact Analysis (4 Tabs)", desc: "Overview · Plan Analysis · ML Analysis · Code Change Analysis", color: C.purple },
    { title: "ServiceNow Integration", desc: "Pull all 90+ change_request fields, paginated sync, upsert to local DB", color: C.accent },
    { title: "ML Scoring Engines", desc: "Dimension scoring, plan readiness, NLP content analysis, code risk", color: C.red },
    { title: "Analytics Suite", desc: "Failure Analysis · Velocity · DORA Metrics · Change Health", color: C.orange },
    { title: "RBAC + Auth", desc: "Admin / Manager / Viewer roles, JWT sessions, role-gated UI", color: C.accent2 },
  ];
  features.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.8 + col * 4.0;
    const y = 1.5 + row * 2.8;
    s.addShape(pptx.ShapeType.rect, { x, y, w: 3.7, h: 2.4, fill: { color: C.white }, shadow: { type: "outer", blur: 6, offset: 2, color: "d0d0d0", opacity: 0.3 }, rectRadius: 0.1 });
    s.addShape(pptx.ShapeType.rect, { x, y, w: 3.7, h: 0.06, fill: { color: f.color }, rectRadius: 0.05 });
    s.addText(f.title, { x: x + 0.3, y: y + 0.3, w: 3.2, h: 0.5, fontSize: 15, fontFace: "Arial", color: C.dark, bold: true });
    s.addText(f.desc, { x: x + 0.3, y: y + 0.9, w: 3.2, h: 1.2, fontSize: 11, fontFace: "Arial", color: C.gray, valign: "top" });
  });
  addFooter(s, sn, TOTAL);
}

/* ════════════════════════════════════════════════════════════════════
   SLIDE 5 — High-Level Architecture
   ════════════════════════════════════════════════════════════════════ */
{
  sn++;
  sectionDivider("System Architecture", "High-level architecture of the full-stack application", sn, TOTAL);
}

{
  sn++;
  const s = pptx.addSlide();
  s.background = { color: C.light };
  s.addText("High-Level Architecture", { x: 0.8, y: 0.3, w: 11, h: 0.7, fontSize: 28, fontFace: "Arial", color: C.dark, bold: true });
  s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 0.9, w: 1.5, h: 0.05, fill: { color: C.accent } });

  // Browser Layer
  s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.3, w: 5.5, h: 2.5, fill: { color: "eff6ff" }, line: { color: C.blue, width: 1.5 }, rectRadius: 0.15 });
  s.addText("Browser — Client", { x: 0.7, y: 1.35, w: 5, h: 0.4, fontSize: 13, fontFace: "Arial", color: C.blue, bold: true });
  [["React Pages (App Router)", 1.85], ["SWR Cache (30s refresh)", 2.25], ["Recharts Visualizations", 2.65], ["NextAuth.js Client Session", 3.05]].forEach(([t, y]) => {
    s.addShape(pptx.ShapeType.rect, { x: 0.9, y, w: 4.8, h: 0.32, fill: { color: C.white }, line: { color: C.grayLight, width: 0.5 }, rectRadius: 0.05 });
    s.addText(t, { x: 1.0, y, w: 4.6, h: 0.32, fontSize: 10, fontFace: "Arial", color: C.mid });
  });

  // Server Layer
  s.addShape(pptx.ShapeType.rect, { x: 7, y: 1.3, w: 5.5, h: 2.5, fill: { color: "f0fdf4" }, line: { color: C.green, width: 1.5 }, rectRadius: 0.15 });
  s.addText("Next.js Server", { x: 7.2, y: 1.35, w: 5, h: 0.4, fontSize: 13, fontFace: "Arial", color: C.green, bold: true });
  [["API Routes (/api/*)", 1.85], ["Auth Middleware (JWT)", 2.25], ["Prisma ORM", 2.65], ["ML Analysis Engines", 3.05]].forEach(([t, y]) => {
    s.addShape(pptx.ShapeType.rect, { x: 7.4, y, w: 4.8, h: 0.32, fill: { color: C.white }, line: { color: C.grayLight, width: 0.5 }, rectRadius: 0.05 });
    s.addText(t, { x: 7.5, y, w: 4.6, h: 0.32, fontSize: 10, fontFace: "Arial", color: C.mid });
  });

  // Arrow between
  s.addShape(pptx.ShapeType.rect, { x: 6.1, y: 2.3, w: 0.8, h: 0.04, fill: { color: C.gray } });
  s.addText("HTTP / JWT", { x: 5.8, y: 2.0, w: 1.4, h: 0.3, fontSize: 8, fontFace: "Arial", color: C.gray, align: "center" });

  // Data Layer
  s.addShape(pptx.ShapeType.rect, { x: 2, y: 4.3, w: 9, h: 2.2, fill: { color: "fefce8" }, line: { color: C.amber, width: 1.5 }, rectRadius: 0.15 });
  s.addText("Data Layer", { x: 2.2, y: 4.35, w: 8.5, h: 0.4, fontSize: 13, fontFace: "Arial", color: C.amber, bold: true });

  // DB box
  s.addShape(pptx.ShapeType.rect, { x: 2.5, y: 4.9, w: 2.5, h: 1.2, fill: { color: C.white }, line: { color: C.grayLight, width: 0.5 }, rectRadius: 0.1 });
  s.addText("SQLite / PostgreSQL\n(Prisma ORM)\n5 Models", { x: 2.5, y: 4.9, w: 2.5, h: 1.2, fontSize: 10, fontFace: "Arial", color: C.mid, align: "center", valign: "middle" });

  // ServiceNow box
  s.addShape(pptx.ShapeType.rect, { x: 5.8, y: 4.9, w: 2.5, h: 1.2, fill: { color: C.white }, line: { color: C.grayLight, width: 0.5 }, rectRadius: 0.1 });
  s.addText("ServiceNow\nchange_request\n90+ fields", { x: 5.8, y: 4.9, w: 2.5, h: 1.2, fontSize: 10, fontFace: "Arial", color: C.mid, align: "center", valign: "middle" });

  // GitHub box
  s.addShape(pptx.ShapeType.rect, { x: 9.1, y: 4.9, w: 2.5, h: 1.2, fill: { color: C.white }, line: { color: C.grayLight, width: 0.5 }, rectRadius: 0.1 });
  s.addText("GitHub / GitLab\nCommit History\nFile Diffs", { x: 9.1, y: 4.9, w: 2.5, h: 1.2, fontSize: 10, fontFace: "Arial", color: C.mid, align: "center", valign: "middle" });

  // Vertical arrows
  s.addShape(pptx.ShapeType.rect, { x: 3.6, y: 3.85, w: 0.04, h: 0.45, fill: { color: C.gray } });
  s.addShape(pptx.ShapeType.rect, { x: 9.6, y: 3.85, w: 0.04, h: 0.45, fill: { color: C.gray } });

  addFooter(s, sn, TOTAL);
}

/* ════════════════════════════════════════════════════════════════════
   SLIDE 7 — Technology Stack
   ════════════════════════════════════════════════════════════════════ */
{
  sn++;
  const s = pptx.addSlide();
  s.background = { color: C.light };
  s.addText("Technology Stack", { x: 0.8, y: 0.3, w: 11, h: 0.7, fontSize: 28, fontFace: "Arial", color: C.dark, bold: true });
  s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 0.9, w: 1.5, h: 0.05, fill: { color: C.accent } });

  const stack = [
    ["Frontend", [["Next.js 14", "App Router, SSR + CSR"], ["React 18", "Functional components + hooks"], ["Tailwind CSS 3.4", "Utility-first styling"], ["Recharts 3.x", "Interactive charts & radars"], ["Lucide React", "Icon library"], ["SWR 2.x", "Data fetching + caching"]], C.blue],
    ["Backend", [["Next.js API Routes", "RESTful endpoints"], ["NextAuth.js 4", "JWT + Credentials provider"], ["Prisma ORM 6.x", "Type-safe DB access"], ["bcryptjs", "Password hashing"], ["ML Analysis Engine", "NLP pattern matching"]], C.green],
    ["Data & Infra", [["SQLite", "Dev (swappable to PG/MySQL)"], ["ServiceNow REST", "change_request sync"], ["GitHub Enterprise", "Commit analysis"], ["Jest + RTL", "24 unit tests"], ["ESLint + Prettier", "Code quality"]], C.purple],
  ];

  stack.forEach(([group, items, color], gi) => {
    const x = 0.5 + gi * 4.2;
    s.addShape(pptx.ShapeType.rect, { x, y: 1.2, w: 3.9, h: 5.8, fill: { color: C.white }, shadow: { type: "outer", blur: 4, offset: 2, color: "d0d0d0", opacity: 0.3 }, rectRadius: 0.1 });
    s.addShape(pptx.ShapeType.rect, { x, y: 1.2, w: 3.9, h: 0.55, fill: { color }, rectRadius: 0.1 });
    s.addShape(pptx.ShapeType.rect, { x, y: 1.65, w: 3.9, h: 0.1, fill: { color: C.white } }); // cover bottom corners
    s.addText(group, { x, y: 1.2, w: 3.9, h: 0.55, fontSize: 15, fontFace: "Arial", color: C.white, bold: true, align: "center", valign: "middle" });
    items.forEach(([name, desc], i) => {
      const iy = 1.95 + i * 0.85;
      s.addText(name, { x: x + 0.3, y: iy, w: 3.3, h: 0.35, fontSize: 12, fontFace: "Arial", color: C.dark, bold: true });
      s.addText(desc, { x: x + 0.3, y: iy + 0.32, w: 3.3, h: 0.3, fontSize: 9, fontFace: "Arial", color: C.gray });
    });
  });
  addFooter(s, sn, TOTAL);
}

/* ════════════════════════════════════════════════════════════════════
   SLIDE 8 — Data Flow
   ════════════════════════════════════════════════════════════════════ */
{
  sn++;
  const s = pptx.addSlide();
  s.background = { color: C.light };
  s.addText("Data Flow — ServiceNow to Dashboard", { x: 0.8, y: 0.3, w: 11, h: 0.7, fontSize: 28, fontFace: "Arial", color: C.dark, bold: true });
  s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 0.9, w: 1.5, h: 0.05, fill: { color: C.accent } });

  const steps = [
    { x: 0.5, label: "ServiceNow", sub: "change_request\n90+ fields", color: C.amber },
    { x: 3.0, label: "Sync API", sub: "POST /api/sync\nPaginated fetch\nBasic Auth", color: C.blue },
    { x: 5.5, label: "Prisma ORM", sub: "Upsert loop\nWHERE: number\nUPDATE or CREATE", color: C.green },
    { x: 8.0, label: "SQLite DB", sub: "5 tables\nChangeRequest\nValidation\nRelease\nUser\nMetric", color: C.purple },
    { x: 10.5, label: "Dashboard", sub: "SWR cache\n30s refresh\nReal-time UI", color: C.accent },
  ];

  steps.forEach((st, i) => {
    const y = 2.2;
    s.addShape(pptx.ShapeType.rect, { x: st.x, y, w: 2.2, h: 3.5, fill: { color: C.white }, shadow: { type: "outer", blur: 4, offset: 2, color: "d0d0d0", opacity: 0.3 }, rectRadius: 0.1 });
    s.addShape(pptx.ShapeType.rect, { x: st.x, y, w: 2.2, h: 0.5, fill: { color: st.color }, rectRadius: 0.1 });
    s.addShape(pptx.ShapeType.rect, { x: st.x, y: y + 0.4, w: 2.2, h: 0.15, fill: { color: C.white } });
    s.addText(st.label, { x: st.x, y, w: 2.2, h: 0.5, fontSize: 12, fontFace: "Arial", color: C.white, bold: true, align: "center", valign: "middle" });
    s.addText(st.sub, { x: st.x + 0.15, y: y + 0.7, w: 1.9, h: 2.5, fontSize: 10, fontFace: "Arial", color: C.mid, valign: "top" });
    // Arrow between steps
    if (i < steps.length - 1) {
      s.addShape(pptx.ShapeType.rect, { x: st.x + 2.25, y: y + 1.5, w: 0.7, h: 0.04, fill: { color: C.gray } });
      s.addText("→", { x: st.x + 2.3, y: y + 1.15, w: 0.6, h: 0.35, fontSize: 16, fontFace: "Arial", color: C.accent, align: "center" });
    }
  });
  addFooter(s, sn, TOTAL);
}

/* ════════════════════════════════════════════════════════════════════
   SLIDE 9 — Impact Analysis Framework (Section)
   ════════════════════════════════════════════════════════════════════ */
{
  sn++;
  sectionDivider("Impact Analysis Framework", "4-layer scoring methodology for comprehensive change risk assessment", sn, TOTAL);
}

/* ════════════════════════════════════════════════════════════════════
   SLIDE 10 — 4-Layer Scoring Overview
   ════════════════════════════════════════════════════════════════════ */
{
  sn++;
  const s = pptx.addSlide();
  s.background = { color: C.light };
  s.addText("Impact Analysis — 4-Layer Scoring Framework", { x: 0.8, y: 0.3, w: 12, h: 0.7, fontSize: 26, fontFace: "Arial", color: C.dark, bold: true });
  s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 0.9, w: 1.5, h: 0.05, fill: { color: C.accent } });

  const layers = [
    { title: "Dimension Scoring", formula: "Σ (SN_field × weight)", desc: "Risk, Impact, Urgency, Priority,\nType, Scope — weighted 0–100", color: C.blue, output: "Dimension Score" },
    { title: "Plan Readiness", formula: "Σ (plan_quality × weight)", desc: "Implementation, Backout, Test,\nRisk Analysis, Change, Justification", color: C.green, output: "Readiness Score" },
    { title: "ML Content Analysis", formula: "Struct×25% + Comp×30%\n+ Clarity×25% + Risk×20%", desc: "NLP structure, completeness,\nclarity, risk awareness scoring", color: C.purple, output: "ML Quality Score" },
    { title: "Code Change Analysis", formula: "File risk + Churn + Patterns", desc: "Git commit analysis, file type risk,\nauthor heatmap, feature impact", color: C.orange, output: "Code Risk Score" },
  ];

  layers.forEach((l, i) => {
    const x = 0.4 + i * 3.15;
    const y = 1.3;
    // Card
    s.addShape(pptx.ShapeType.rect, { x, y, w: 3.0, h: 4.5, fill: { color: C.white }, shadow: { type: "outer", blur: 6, offset: 2, color: "d0d0d0", opacity: 0.3 }, rectRadius: 0.1 });
    // Header
    s.addShape(pptx.ShapeType.rect, { x, y, w: 3.0, h: 0.6, fill: { color: l.color }, rectRadius: 0.1 });
    s.addShape(pptx.ShapeType.rect, { x, y: y + 0.5, w: 3.0, h: 0.15, fill: { color: C.white } });
    s.addText(l.title, { x, y, w: 3.0, h: 0.6, fontSize: 13, fontFace: "Arial", color: C.white, bold: true, align: "center", valign: "middle" });
    // Formula
    s.addShape(pptx.ShapeType.rect, { x: x + 0.15, y: y + 0.8, w: 2.7, h: 0.8, fill: { color: "f8fafc" }, line: { color: C.grayLight, width: 0.5 }, rectRadius: 0.05 });
    s.addText(l.formula, { x: x + 0.2, y: y + 0.85, w: 2.6, h: 0.7, fontSize: 9, fontFace: "Courier New", color: C.mid, align: "center", valign: "middle" });
    // Description
    s.addText(l.desc, { x: x + 0.2, y: y + 1.8, w: 2.6, h: 1.3, fontSize: 10, fontFace: "Arial", color: C.gray, valign: "top" });
    // Output badge
    s.addShape(pptx.ShapeType.rect, { x: x + 0.3, y: y + 3.5, w: 2.4, h: 0.55, fill: { color: l.color }, rectRadius: 0.08 });
    s.addText(`→ ${l.output} (0–100)`, { x: x + 0.3, y: y + 3.5, w: 2.4, h: 0.55, fontSize: 10, fontFace: "Arial", color: C.white, bold: true, align: "center", valign: "middle" });
  });

  // Bottom: convergence arrow
  s.addShape(pptx.ShapeType.rect, { x: 2, y: 6.2, w: 9, h: 0.5, fill: { color: C.dark }, rectRadius: 0.08 });
  s.addText("→  Composite Risk Assessment  →  Go / No-Go Decision", { x: 2, y: 6.2, w: 9, h: 0.5, fontSize: 14, fontFace: "Arial", color: C.white, bold: true, align: "center", valign: "middle" });

  addFooter(s, sn, TOTAL);
}

/* ════════════════════════════════════════════════════════════════════
   SLIDE 11 — Plan Readiness & Dimension Scoring
   ════════════════════════════════════════════════════════════════════ */
{
  sn++;
  const s = pptx.addSlide();
  s.background = { color: C.light };
  s.addText("Plan Readiness & Dimension Scoring", { x: 0.8, y: 0.3, w: 11, h: 0.7, fontSize: 28, fontFace: "Arial", color: C.dark, bold: true });
  s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 0.9, w: 1.5, h: 0.05, fill: { color: C.accent } });

  // Left: Plan Readiness
  s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.2, w: 6.0, h: 5.5, fill: { color: C.white }, shadow: { type: "outer", blur: 4, offset: 2, color: "d0d0d0", opacity: 0.2 }, rectRadius: 0.1 });
  s.addText("Plan Readiness Score", { x: 0.7, y: 1.3, w: 5.5, h: 0.5, fontSize: 16, fontFace: "Arial", color: C.green, bold: true });
  s.addText("Readiness = Σ (plan_quality × weight)", { x: 0.7, y: 1.8, w: 5.5, h: 0.35, fontSize: 10, fontFace: "Courier New", color: C.mid });

  const plans = [
    ["Implementation Plan", "25%", "deploy, configure, verify, pre/post-check"],
    ["Backout Plan", "25%", "revert, rollback, restore, snapshot, recovery"],
    ["Test Plan", "20%", "smoke, regression, integration, coverage"],
    ["Risk/Impact Analysis", "15%", "risk, mitigation, contingency, severity"],
    ["Change Plan", "10%", "execution strategy, approval, schedule"],
    ["Justification", "5%", "business value, compliance, improvement"],
  ];
  plans.forEach(([name, weight, keywords], i) => {
    const y = 2.35 + i * 0.7;
    s.addText(weight, { x: 0.8, y, w: 0.6, h: 0.28, fontSize: 9, fontFace: "Arial", color: C.white, bold: true, fill: { color: C.green }, align: "center", valign: "middle", rectRadius: 0.04 });
    s.addText(name, { x: 1.55, y, w: 2.0, h: 0.28, fontSize: 11, fontFace: "Arial", color: C.dark, bold: true });
    s.addText(keywords, { x: 1.55, y: y + 0.28, w: 4.5, h: 0.25, fontSize: 8, fontFace: "Arial", color: C.gray, italic: true });
  });

  // Right: Dimension Scoring
  s.addShape(pptx.ShapeType.rect, { x: 6.8, y: 1.2, w: 6.0, h: 5.5, fill: { color: C.white }, shadow: { type: "outer", blur: 4, offset: 2, color: "d0d0d0", opacity: 0.2 }, rectRadius: 0.1 });
  s.addText("Dimension Score (Impact)", { x: 7.0, y: 1.3, w: 5.5, h: 0.5, fontSize: 16, fontFace: "Arial", color: C.blue, bold: true });
  s.addText("Dimension = Σ (SN_field_score × weight)", { x: 7.0, y: 1.8, w: 5.5, h: 0.35, fontSize: 10, fontFace: "Courier New", color: C.mid });

  const dims = [
    ["Risk", "25%", "Very High→95, High→75, Moderate→50, Low→25"],
    ["Impact", "25%", "1-High→85, 2-Medium→55, 3-Low→25"],
    ["Urgency", "15%", "1-High→85, 2-Medium→55, 3-Low→25"],
    ["Priority", "15%", "1-Critical→95, 2-High→75, 3-Moderate→50"],
    ["Type", "10%", "Emergency→90, Normal→50, Standard→25"],
    ["Scope", "10%", "Large→80, Medium→50, Small→25"],
  ];
  dims.forEach(([name, weight, mapping], i) => {
    const y = 2.35 + i * 0.7;
    s.addText(weight, { x: 7.1, y, w: 0.6, h: 0.28, fontSize: 9, fontFace: "Arial", color: C.white, bold: true, fill: { color: C.blue }, align: "center", valign: "middle", rectRadius: 0.04 });
    s.addText(name, { x: 7.85, y, w: 1.5, h: 0.28, fontSize: 11, fontFace: "Arial", color: C.dark, bold: true });
    s.addText(mapping, { x: 7.85, y: y + 0.28, w: 4.8, h: 0.25, fontSize: 8, fontFace: "Arial", color: C.gray, italic: true });
  });

  addFooter(s, sn, TOTAL);
}

/* ════════════════════════════════════════════════════════════════════
   SLIDE 12 — ML Content Analysis Engine
   ════════════════════════════════════════════════════════════════════ */
{
  sn++;
  const s = pptx.addSlide();
  s.background = { color: C.light };
  s.addText("ML Content Analysis Engine", { x: 0.8, y: 0.3, w: 11, h: 0.7, fontSize: 28, fontFace: "Arial", color: C.dark, bold: true });
  s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 0.9, w: 1.5, h: 0.05, fill: { color: C.accent } });

  s.addText("ML Quality = Structure × 25%  +  Completeness × 30%  +  Clarity × 25%  +  Risk Awareness × 20%", { x: 0.8, y: 1.2, w: 11.5, h: 0.5, fontSize: 12, fontFace: "Courier New", color: C.purple, bold: true });

  const qdims = [
    { title: "Structure (25%)", items: "Numbered steps (+25)\nBullet points (+15)\n5+ lines (+10)\n10+ lines (+10)\nPre/post checks (+15)", color: C.blue },
    { title: "Completeness (30%)", items: "11 element checklist (+8 ea)\nPre-impl checks\nPost-impl validation\nTimeline/schedule\nEscalation contacts\nMonitoring steps", color: C.green },
    { title: "Clarity (25%)", items: "Avg words/line < 25 (+15)\nSequence words (+15)\nNumbered steps (+20)\nConditional handling (+10)\n50+ total words (+10)", color: C.orange },
    { title: "Risk Awareness (20%)", items: "Rollback/revert refs (+20)\nRisk keywords (+15)\nFailure acknowledgment (+10)\nMonitoring steps (+15)\nBackup mentions (+15)", color: C.red },
  ];

  qdims.forEach((d, i) => {
    const x = 0.4 + i * 3.15;
    s.addShape(pptx.ShapeType.rect, { x, y: 1.9, w: 3.0, h: 4.0, fill: { color: C.white }, shadow: { type: "outer", blur: 4, offset: 2, color: "d0d0d0", opacity: 0.2 }, rectRadius: 0.1 });
    s.addShape(pptx.ShapeType.rect, { x, y: 1.9, w: 3.0, h: 0.5, fill: { color: d.color }, rectRadius: 0.1 });
    s.addShape(pptx.ShapeType.rect, { x, y: 2.3, w: 3.0, h: 0.15, fill: { color: C.white } });
    s.addText(d.title, { x, y: 1.9, w: 3.0, h: 0.5, fontSize: 12, fontFace: "Arial", color: C.white, bold: true, align: "center", valign: "middle" });
    s.addText(d.items, { x: x + 0.2, y: 2.55, w: 2.6, h: 3.0, fontSize: 9, fontFace: "Arial", color: C.mid, valign: "top" });
  });

  // Assessment row
  const verdicts = [
    ["≥65: Approve ✅", C.green], ["45–64: Conditions ⚠️", C.amber], ["25–44: Rework 🔶", C.orange], ["<25: Reject 🛑", C.red],
  ];
  verdicts.forEach(([text, color], i) => {
    s.addShape(pptx.ShapeType.rect, { x: 0.4 + i * 3.15, y: 6.2, w: 3.0, h: 0.45, fill: { color }, rectRadius: 0.06 });
    s.addText(text, { x: 0.4 + i * 3.15, y: 6.2, w: 3.0, h: 0.45, fontSize: 11, fontFace: "Arial", color: C.white, bold: true, align: "center", valign: "middle" });
  });

  addFooter(s, sn, TOTAL);
}

/* ════════════════════════════════════════════════════════════════════
   SLIDE 13 — Code Change Analysis + ML Feature Impact
   ════════════════════════════════════════════════════════════════════ */
{
  sn++;
  const s = pptx.addSlide();
  s.background = { color: C.light };
  s.addText("Code Change Analysis & ML Feature Impact", { x: 0.8, y: 0.3, w: 12, h: 0.7, fontSize: 26, fontFace: "Arial", color: C.dark, bold: true });
  s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 0.9, w: 1.5, h: 0.05, fill: { color: C.accent } });

  // Left: Git Analysis
  s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.2, w: 6.0, h: 5.5, fill: { color: C.white }, shadow: { type: "outer", blur: 4, offset: 2, color: "d0d0d0", opacity: 0.2 }, rectRadius: 0.1 });
  s.addText("Git Commit Analysis", { x: 0.7, y: 1.3, w: 5.5, h: 0.45, fontSize: 15, fontFace: "Arial", color: C.purple, bold: true });

  const gitFeatures = [
    "Commit risk scoring (file count, churn, patterns)",
    "File type risk breakdown (bar chart)",
    "Commit message pattern classification (12 categories)",
    "Cumulative risk trend (area chart)",
    "Directory risk heatmap",
    "Author activity heatmap (day-of-week grid)",
    "Repository risk profile radar",
    "File hotspot map (visual treemap)",
    "AI Code Change Insights (automated synthesis)",
  ];
  gitFeatures.forEach((f, i) => {
    s.addText(`•  ${f}`, { x: 0.9, y: 1.9 + i * 0.48, w: 5.3, h: 0.4, fontSize: 10, fontFace: "Arial", color: C.mid });
  });

  // Right: ML Feature Impact (NEW)
  s.addShape(pptx.ShapeType.rect, { x: 6.8, y: 1.2, w: 6.0, h: 5.5, fill: { color: C.white }, shadow: { type: "outer", blur: 4, offset: 2, color: "d0d0d0", opacity: 0.2 }, rectRadius: 0.1 });
  s.addText("ML Feature Impact  (NEW)", { x: 7.0, y: 1.3, w: 5.5, h: 0.45, fontSize: 15, fontFace: "Arial", color: C.red, bold: true });

  const mlFeatures = [
    "14 application feature categories auto-detected",
    "Feature impact bar chart + radar chart",
    "Per-feature detail cards (files, churn, commits)",
    "Impact scoring: risk × 30% + churn × 30%\n  + commits × 20% + file spread × 20%",
    "Severity classification: Critical / High / Medium / Low",
    "",
    "Feature categories include:",
    "Auth · API · Database · UI · Pages · Config/Infra",
    "Testing · Middleware · Styling · Utils · Security",
    "Monitoring · Caching · Notifications",
  ];
  mlFeatures.forEach((f, i) => {
    if (!f) return;
    const isBold = f.startsWith("Feature categories") || f.startsWith("14 ");
    s.addText(f.startsWith("Auth") || f.startsWith("Testing") || f.startsWith("Monitoring") ? `     ${f}` : `•  ${f}`, { x: 7.2, y: 1.9 + i * 0.45, w: 5.3, h: 0.4, fontSize: 10, fontFace: "Arial", color: C.mid, bold: isBold });
  });

  addFooter(s, sn, TOTAL);
}

/* ════════════════════════════════════════════════════════════════════
   SLIDE 14 — Production Outage & Performance Detection
   ════════════════════════════════════════════════════════════════════ */
{
  sn++;
  const s = pptx.addSlide();
  s.background = { color: C.light };
  s.addText("Production Outage & Performance Detection", { x: 0.8, y: 0.3, w: 12, h: 0.7, fontSize: 26, fontFace: "Arial", color: C.dark, bold: true });
  s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 0.9, w: 1.5, h: 0.05, fill: { color: C.accent } });

  // Left: Outage concerns
  s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.2, w: 6.0, h: 5.5, fill: { color: C.white }, shadow: { type: "outer", blur: 4, offset: 2, color: "d0d0d0", opacity: 0.2 }, rectRadius: 0.1 });
  s.addText("Production Outage Concerns", { x: 0.7, y: 1.3, w: 5.5, h: 0.45, fontSize: 15, fontFace: "Arial", color: C.red, bold: true });

  const outagePatterns = [
    ["🔴", "Database schema migration", "Critical"],
    ["🔒", "Secrets/env config change", "Critical"],
    ["💥", "Breaking change / deprecation", "Critical"],
    ["🗄️", "Destructive DB operation", "Critical"],
    ["🌐", "Network/routing/LB change", "Critical"],
    ["🔐", "DNS/TLS/certificate change", "Critical"],
    ["🐳", "Infrastructure/deployment", "High"],
    ["↩️", "Rollback/revert detected", "High"],
    ["⚙️", "Background job/worker mod", "High"],
    ["🔄", "Concurrency control change", "High"],
    ["📊", "Massive code volume (>2k lines)", "High"],
    ["👤", "Single-author concentration", "Medium"],
  ];
  outagePatterns.forEach(([icon, name, sev], i) => {
    const y = 1.9 + i * 0.37;
    s.addText(icon, { x: 0.7, y, w: 0.4, h: 0.32, fontSize: 10, align: "center", valign: "middle" });
    s.addText(name, { x: 1.15, y, w: 3.5, h: 0.32, fontSize: 9, fontFace: "Arial", color: C.mid });
    const sevColor = sev === "Critical" ? C.red : sev === "High" ? C.orange : C.amber;
    s.addText(sev, { x: 4.9, y: y + 0.02, w: 0.9, h: 0.25, fontSize: 8, fontFace: "Arial", color: C.white, bold: true, fill: { color: sevColor }, align: "center", valign: "middle", rectRadius: 0.04 });
  });

  // Right: Performance insights
  s.addShape(pptx.ShapeType.rect, { x: 6.8, y: 1.2, w: 6.0, h: 5.5, fill: { color: C.white }, shadow: { type: "outer", blur: 4, offset: 2, color: "d0d0d0", opacity: 0.2 }, rectRadius: 0.1 });
  s.addText("Performance Impact Analysis", { x: 7.0, y: 1.3, w: 5.5, h: 0.45, fontSize: 15, fontFace: "Arial", color: C.amber, bold: true });

  const perfPatterns = [
    "Query Optimization (N+1, loading strategy)",
    "Caching Strategy (TTL, invalidation)",
    "Database Indexing (compound, unique)",
    "Data Pagination (batch, cursor, offset)",
    "Async Processing (Promise chains, concurrency)",
    "Media/Asset Handling (upload, stream, blob)",
    "Real-time Communication (WebSocket, SSE)",
    "Memory Management (heap, buffer, GC)",
    "Algorithmic Complexity (loops, recursion)",
    "Bundle Size (code splitting, lazy imports)",
    "Rate Limiting (throttle, debounce)",
    "Connection Pooling (pool size, max conn)",
  ];
  perfPatterns.forEach((p, i) => {
    const y = 1.9 + i * 0.37;
    s.addText(`•  ${p}`, { x: 7.2, y, w: 5.3, h: 0.32, fontSize: 9, fontFace: "Arial", color: C.mid });
  });

  // Bottom: AI Intelligence badge
  s.addShape(pptx.ShapeType.rect, { x: 7.0, y: 6.3, w: 5.5, h: 0.35, fill: { color: C.amber }, rectRadius: 0.05 });
  s.addText("✨ AI Performance Intelligence — automated risk synthesis", { x: 7.0, y: 6.3, w: 5.5, h: 0.35, fontSize: 10, fontFace: "Arial", color: C.white, bold: true, align: "center", valign: "middle" });

  addFooter(s, sn, TOTAL);
}

/* ════════════════════════════════════════════════════════════════════
   SLIDE 15 — Analytics Suite
   ════════════════════════════════════════════════════════════════════ */
{
  sn++;
  const s = pptx.addSlide();
  s.background = { color: C.light };
  s.addText("Analytics & Advanced Pages", { x: 0.8, y: 0.3, w: 11, h: 0.7, fontSize: 28, fontFace: "Arial", color: C.dark, bold: true });
  s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 0.9, w: 1.5, h: 0.05, fill: { color: C.accent } });

  const tabs = [
    { title: "Failure Analysis", desc: "• DORA change failure rate KPIs\n• Failure by team bar chart\n• Service risk ranking\n• Rollback intelligence\n• Root cause analysis\n• AI Failure Intelligence", color: C.red },
    { title: "Velocity", desc: "• Team velocity table\n• Category breakdown\n• Approval efficiency\n• Team efficiency radar\n• Weekly throughput trend\n• Change window analysis\n• Velocity Intelligence", color: C.blue },
    { title: "Metrics & Trends", desc: "• DORA metrics KPIs\n• Risk score trend\n• Validation pass rate\n• Lead time breakdown\n• MTTR trend chart\n• SLA compliance dashboard\n• DORA Performance tiers", color: C.green },
    { title: "Change Health", desc: "• Health score formula\n• Team performance radar\n• Team risk ranking\n• Weekly health trend\n• Risk-velocity quadrant\n• Improvement actions (P1-P3)\n• AI Health Intelligence", color: C.purple },
  ];

  tabs.forEach((t, i) => {
    const x = 0.4 + i * 3.15;
    s.addShape(pptx.ShapeType.rect, { x, y: 1.3, w: 3.0, h: 5.2, fill: { color: C.white }, shadow: { type: "outer", blur: 4, offset: 2, color: "d0d0d0", opacity: 0.2 }, rectRadius: 0.1 });
    s.addShape(pptx.ShapeType.rect, { x, y: 1.3, w: 3.0, h: 0.5, fill: { color: t.color }, rectRadius: 0.1 });
    s.addShape(pptx.ShapeType.rect, { x, y: 1.7, w: 3.0, h: 0.15, fill: { color: C.white } });
    s.addText(t.title, { x, y: 1.3, w: 3.0, h: 0.5, fontSize: 13, fontFace: "Arial", color: C.white, bold: true, align: "center", valign: "middle" });
    s.addText(t.desc, { x: x + 0.2, y: 2.0, w: 2.6, h: 4.2, fontSize: 9, fontFace: "Arial", color: C.mid, valign: "top" });
  });

  addFooter(s, sn, TOTAL);
}

/* ════════════════════════════════════════════════════════════════════
   SLIDE 16 — Auth & RBAC
   ════════════════════════════════════════════════════════════════════ */
{
  sn++;
  const s = pptx.addSlide();
  s.background = { color: C.light };
  s.addText("Authentication & Role-Based Access Control", { x: 0.8, y: 0.3, w: 12, h: 0.7, fontSize: 26, fontFace: "Arial", color: C.dark, bold: true });
  s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 0.9, w: 1.5, h: 0.05, fill: { color: C.accent } });

  // Auth flow
  const flow = [
    { x: 0.5, label: "Login Page", sub: "Email + Password\nForm validation", color: C.blue },
    { x: 3.0, label: "NextAuth.js", sub: "Credentials Provider\nbcrypt.compare()", color: C.green },
    { x: 5.5, label: "JWT Token", sub: "24h TTL\nid, email, name, role", color: C.amber },
    { x: 8.5, label: "Middleware", sub: "Protected routes\nRedirect to /login", color: C.red },
    { x: 11.0, label: "Session", sub: "useSession() hook\nClient-side role", color: C.purple },
  ];

  flow.forEach((f, i) => {
    s.addShape(pptx.ShapeType.rect, { x: f.x, y: 1.3, w: 2.2, h: 1.8, fill: { color: C.white }, shadow: { type: "outer", blur: 3, offset: 1, color: "d0d0d0", opacity: 0.2 }, rectRadius: 0.1 });
    s.addShape(pptx.ShapeType.rect, { x: f.x, y: 1.3, w: 2.2, h: 0.45, fill: { color: f.color }, rectRadius: 0.1 });
    s.addShape(pptx.ShapeType.rect, { x: f.x, y: 1.65, w: 2.2, h: 0.12, fill: { color: C.white } });
    s.addText(f.label, { x: f.x, y: 1.3, w: 2.2, h: 0.45, fontSize: 11, fontFace: "Arial", color: C.white, bold: true, align: "center", valign: "middle" });
    s.addText(f.sub, { x: f.x + 0.15, y: 1.85, w: 1.9, h: 1.0, fontSize: 9, fontFace: "Arial", color: C.mid, valign: "top" });
    if (i < flow.length - 1) {
      s.addText("→", { x: f.x + 2.2, y: 1.85, w: 0.5, h: 0.4, fontSize: 16, fontFace: "Arial", color: C.accent, align: "center" });
    }
  });

  // RBAC Table
  s.addText("Role Permissions Matrix", { x: 0.8, y: 3.6, w: 11, h: 0.5, fontSize: 16, fontFace: "Arial", color: C.dark, bold: true });

  const headers = ["Permission", "Admin", "Manager", "Viewer"];
  const rows = [
    ["View dashboard & analytics", "✅", "✅", "✅"],
    ["View change requests", "✅", "✅", "✅"],
    ["Create/edit change requests", "✅", "✅", "❌"],
    ["Delete change requests", "✅", "❌", "❌"],
    ["Trigger ServiceNow sync", "✅", "✅", "❌"],
    ["Manage dashboard settings", "✅", "✅", "❌"],
    ["Manage users", "✅", "❌", "❌"],
  ];

  const tw = [4.5, 1.5, 1.5, 1.5];
  const tx = [0.8, 5.3, 6.8, 8.3];
  // Header
  headers.forEach((h, i) => {
    s.addShape(pptx.ShapeType.rect, { x: tx[i], y: 4.15, w: tw[i], h: 0.4, fill: { color: C.dark } });
    s.addText(h, { x: tx[i], y: 4.15, w: tw[i], h: 0.4, fontSize: 10, fontFace: "Arial", color: C.white, bold: true, align: "center", valign: "middle" });
  });
  // Rows
  rows.forEach((row, ri) => {
    const ry = 4.55 + ri * 0.35;
    const bg = ri % 2 === 0 ? "f8fafc" : C.white;
    row.forEach((cell, ci) => {
      s.addShape(pptx.ShapeType.rect, { x: tx[ci], y: ry, w: tw[ci], h: 0.35, fill: { color: bg }, line: { color: C.grayLight, width: 0.3 } });
      s.addText(cell, { x: tx[ci], y: ry, w: tw[ci], h: 0.35, fontSize: 9, fontFace: "Arial", color: ci === 0 ? C.mid : C.dark, align: "center", valign: "middle" });
    });
  });

  addFooter(s, sn, TOTAL);
}

/* ════════════════════════════════════════════════════════════════════
   SLIDE 17 — Demo Section Divider
   ════════════════════════════════════════════════════════════════════ */
{
  sn++;
  sectionDivider("Live Demo", "Walkthrough of key dashboard features and analysis capabilities", sn, TOTAL);
}

/* ════════════════════════════════════════════════════════════════════
   SLIDE 18 — Demo Walkthrough
   ════════════════════════════════════════════════════════════════════ */
{
  sn++;
  const s = pptx.addSlide();
  s.background = { color: C.light };
  s.addText("Demo Walkthrough", { x: 0.8, y: 0.3, w: 11, h: 0.7, fontSize: 28, fontFace: "Arial", color: C.dark, bold: true });
  s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 0.9, w: 1.5, h: 0.05, fill: { color: C.accent } });

  const demos = [
    { num: "1", title: "Overview Dashboard", desc: "KPI cards, risk gauges, deployment frequency chart,\nrecent change requests, status/risk/category distributions", time: "2 min" },
    { num: "2", title: "Change Requests + ServiceNow Sync", desc: "Pull Data from ServiceNow, search/filter CRs,\nview 90+ fields per CR, CRUD operations", time: "2 min" },
    { num: "3", title: "Impact Analysis — Plan Analysis", desc: "Select a CR → Plan readiness scoring, dimension weights,\nradar chart, plan content viewer with risk highlighting", time: "3 min" },
    { num: "4", title: "Impact Analysis — ML Analysis", desc: "Run ML analysis on a CR → Structure/Completeness/\nClarity/Risk Awareness scores, recommendations", time: "2 min" },
    { num: "5", title: "Code Change Analysis + ML Feature Impact", desc: "Enter repo URL → Git risk analysis, feature impact radar,\nproduction outage concerns, performance insights", time: "3 min" },
    { num: "6", title: "Analytics — Failure + Velocity + Health", desc: "Failure root cause, team velocity radar, DORA metrics,\nchange health quadrant, AI intelligence summaries", time: "2 min" },
    { num: "7", title: "Role-Based Access + User Management", desc: "Login as Admin vs Viewer, role-gated sidebar,\nuser management page, dark mode toggle", time: "1 min" },
  ];

  demos.forEach((d, i) => {
    const y = 1.3 + i * 0.82;
    s.addText(d.num, { x: 0.8, y, w: 0.5, h: 0.5, fontSize: 16, fontFace: "Arial", color: C.white, bold: true, fill: { color: C.accent }, align: "center", valign: "middle", rectRadius: 0.08 });
    s.addText(d.title, { x: 1.5, y, w: 5, h: 0.35, fontSize: 13, fontFace: "Arial", color: C.dark, bold: true });
    s.addText(d.desc, { x: 1.5, y: y + 0.32, w: 8, h: 0.4, fontSize: 9, fontFace: "Arial", color: C.gray });
    s.addText(d.time, { x: 11, y, w: 1.5, h: 0.5, fontSize: 11, fontFace: "Arial", color: C.accent, bold: true, align: "center", valign: "middle" });
  });

  s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 7.0 - 0.6, w: 11.5, h: 0.04, fill: { color: C.grayLight } });
  s.addText("Total demo time: ~15 minutes  |  URL: http://localhost:3600  |  Admin: admin@company.com", { x: 0.8, y: 6.55, w: 11.5, h: 0.35, fontSize: 10, fontFace: "Arial", color: C.gray, align: "center" });

  addFooter(s, sn, TOTAL);
}

/* ════════════════════════════════════════════════════════════════════
   SLIDE 19 — Roadmap
   ════════════════════════════════════════════════════════════════════ */
{
  sn++;
  const s = pptx.addSlide();
  s.background = { color: C.light };
  s.addText("Roadmap & Next Steps", { x: 0.8, y: 0.3, w: 11, h: 0.7, fontSize: 28, fontFace: "Arial", color: C.dark, bold: true });
  s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 0.9, w: 1.5, h: 0.05, fill: { color: C.accent } });

  const phases = [
    { phase: "Phase 1 — Current", items: ["✅ ServiceNow integration (90+ fields)", "✅ 4-layer impact scoring framework", "✅ ML content analysis engine", "✅ Code change analysis + feature impact", "✅ Production outage & performance detection", "✅ Analytics suite (4 tabs)", "✅ RBAC with 3 roles"], color: C.green },
    { phase: "Phase 2 — Q2 2026", items: ["🔲 PostgreSQL production database", "🔲 Automated SN sync (webhook/cron)", "🔲 Email notifications for high-risk CRs", "🔲 Custom scoring weight presets", "🔲 Exportable reports (PDF/Excel)", "🔲 E2E tests with Playwright"], color: C.blue },
    { phase: "Phase 3 — Q3 2026", items: ["🔲 LLM-powered plan quality analysis", "🔲 Predictive risk modeling (ML)", "🔲 Multi-instance SN support", "🔲 Release approval workflow", "🔲 Slack/Teams integration", "🔲 Audit trail & compliance reports"], color: C.purple },
  ];

  phases.forEach((p, i) => {
    const x = 0.4 + i * 4.15;
    s.addShape(pptx.ShapeType.rect, { x, y: 1.3, w: 3.9, h: 5.4, fill: { color: C.white }, shadow: { type: "outer", blur: 4, offset: 2, color: "d0d0d0", opacity: 0.2 }, rectRadius: 0.1 });
    s.addShape(pptx.ShapeType.rect, { x, y: 1.3, w: 3.9, h: 0.55, fill: { color: p.color }, rectRadius: 0.1 });
    s.addShape(pptx.ShapeType.rect, { x, y: 1.75, w: 3.9, h: 0.12, fill: { color: C.white } });
    s.addText(p.phase, { x, y: 1.3, w: 3.9, h: 0.55, fontSize: 13, fontFace: "Arial", color: C.white, bold: true, align: "center", valign: "middle" });
    p.items.forEach((item, j) => {
      s.addText(item, { x: x + 0.25, y: 2.1 + j * 0.55, w: 3.4, h: 0.4, fontSize: 10, fontFace: "Arial", color: C.mid });
    });
  });

  addFooter(s, sn, TOTAL);
}

/* ════════════════════════════════════════════════════════════════════
   SLIDE 20 — Thank You / Q&A
   ════════════════════════════════════════════════════════════════════ */
{
  sn++;
  const s = pptx.addSlide();
  s.background = { color: C.dark };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.15, h: 7.5, fill: { color: C.accent } });
  s.addText("Thank You", { x: 1.0, y: 2.0, w: 11, h: 1.5, fontSize: 52, fontFace: "Arial", color: C.white, bold: true });
  s.addShape(pptx.ShapeType.rect, { x: 1.0, y: 3.6, w: 2.5, h: 0.06, fill: { color: C.accent } });
  s.addText("Questions & Discussion", { x: 1.0, y: 3.9, w: 11, h: 0.8, fontSize: 24, fontFace: "Arial", color: C.gray });
  s.addText("GCS Change & Release Management Dashboard\nhttp://localhost:3600  |  admin@company.com", { x: 1.0, y: 5.2, w: 11, h: 0.8, fontSize: 14, fontFace: "Arial", color: C.gray });
  addFooter(s, sn, TOTAL);
}

/* ── Write file ── */
const outPath = "docs/GCS_Change_Release_Dashboard.pptx";
await pptx.writeFile({ fileName: outPath });
console.log(`✅ Presentation generated: ${outPath} (${sn} slides)`);
