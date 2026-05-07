import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helper functions for risk colors
function riskColor(score: number): string {
  if (score >= 75) return "#dc2626"; // red-600
  if (score >= 50) return "#ea580c"; // orange-600
  if (score >= 25) return "#d97706"; // amber-600
  return "#16a34a"; // green-600
}

function riskBg(score: number): string {
  if (score >= 75) return "background-color: #fee2e2; color: #b91c1c;";
  if (score >= 50) return "background-color: #ffedd5; color: #c2410c;";
  if (score >= 25) return "background-color: #fef3c7; color: #b45309;";
  return "background-color: #dcfce7; color: #15803d;";
}

function riskLabel(score: number): string {
  if (score >= 75) return "Critical";
  if (score >= 50) return "High";
  if (score >= 25) return "Medium";
  return "Low";
}

function planLabel(score: number): string {
  if (score >= 75) return "Well Prepared";
  if (score >= 50) return "Adequate";
  if (score >= 25) return "Gaps Found";
  return "Critical Gaps";
}

function planBg(score: number): string {
  if (score >= 75) return "background-color: #dcfce7; color: #15803d;";
  if (score >= 50) return "background-color: #fef3c7; color: #b45309;";
  if (score >= 25) return "background-color: #ffedd5; color: #c2410c;";
  return "background-color: #fee2e2; color: #b91c1c;";
}

// Generate SVG bar chart
function generateBarChart(data: { label: string; value: number; color: string }[], title: string, width = 400, height = 200): string {
  if (!data || data.length === 0) return "";
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.floor((width - 60) / data.length) - 10;
  const chartHeight = height - 50;
  
  let bars = "";
  data.forEach((d, i) => {
    const barHeight = (d.value / maxValue) * (chartHeight - 20);
    const x = 50 + i * (barWidth + 10);
    const y = chartHeight - barHeight;
    bars += `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${d.color}" rx="4"/>
      <text x="${x + barWidth/2}" y="${chartHeight + 15}" text-anchor="middle" font-size="10" fill="#6b7280">${d.label}</text>
      <text x="${x + barWidth/2}" y="${y - 5}" text-anchor="middle" font-size="11" font-weight="bold" fill="#374151">${d.value}</text>
    `;
  });
  
  return `
    <div style="margin: 20px 0;">
      <h4 style="margin-bottom: 10px; color: #374151;">${title}</h4>
      <svg width="${width}" height="${height}" style="background: #f9fafb; border-radius: 8px;">
        ${bars}
      </svg>
    </div>
  `;
}

// Generate SVG pie chart
function generatePieChart(data: { label: string; value: number; color: string }[], title: string, size = 200): string {
  if (!data || data.length === 0) return "";
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return "";
  
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 20;
  
  let paths = "";
  let legendItems = "";
  let startAngle = -90;
  
  data.forEach((d) => {
    const angle = (d.value / total) * 360;
    const endAngle = startAngle + angle;
    const largeArc = angle > 180 ? 1 : 0;
    
    const x1 = cx + radius * Math.cos((startAngle * Math.PI) / 180);
    const y1 = cy + radius * Math.sin((startAngle * Math.PI) / 180);
    const x2 = cx + radius * Math.cos((endAngle * Math.PI) / 180);
    const y2 = cy + radius * Math.sin((endAngle * Math.PI) / 180);
    
    if (angle > 0) {
      paths += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${d.color}"/>`;
    }
    
    legendItems += `
      <div style="display: flex; align-items: center; gap: 6px; margin: 4px 0;">
        <span style="width: 12px; height: 12px; background: ${d.color}; border-radius: 2px;"></span>
        <span style="font-size: 12px; color: #374151;">${d.label}: ${d.value} (${Math.round(d.value/total*100)}%)</span>
      </div>
    `;
    
    startAngle = endAngle;
  });
  
  return `
    <div style="margin: 20px 0;">
      <h4 style="margin-bottom: 10px; color: #374151;">${title}</h4>
      <div style="display: flex; align-items: center; gap: 20px;">
        <svg width="${size}" height="${size}">${paths}</svg>
        <div>${legendItems}</div>
      </div>
    </div>
  `;
}

// Generate HTML report for Code Analysis
function generateCodeAnalysisReport(analysis: { name: string; description?: string; createdAt: Date; analysisData: Record<string, unknown> }): string {
  // The analysisData structure is { gitData, gitDays, gitRepo }
  // But gitData might be stored as a JSON string or directly as an object
  let data = analysis.analysisData as { gitData?: Record<string, unknown>; gitRepo?: string; gitDays?: number };
  
  // Handle case where analysisData might be the gitData itself (if structure varies)
  let gitData = data?.gitData as {
    summary?: { totalCommits: number; avgRisk: number; overallRiskFactor: number; totalAdditions: number; totalDeletions: number; totalFilesChanged: number; criticalCount: number; highCount: number; mediumCount: number; lowCount: number };
    commits?: { sha: string; shortSha: string; message: string; author: string; date: string; riskScore: number; riskLevel: string; filesChanged: number; additions: number; deletions: number; files?: { filename: string; additions: number; deletions: number; fileRisk?: number }[] }[];
    authorBreakdown?: { author: string; commits: number; avgRisk: number; additions: number; deletions: number }[];
    repoUrl?: string;
    owner?: string;
    repo?: string;
  };
  
  // If gitData is not found, check if analysisData itself has the summary (direct structure)
  if (!gitData?.summary && (analysis.analysisData as { summary?: unknown })?.summary) {
    gitData = analysis.analysisData as typeof gitData;
    data = { gitData: analysis.analysisData, gitRepo: gitData?.repoUrl, gitDays: 7 };
  }
  
  // If still no data, try parsing if it's a string
  if (!gitData?.summary && typeof data?.gitData === "string") {
    try {
      gitData = JSON.parse(data.gitData as unknown as string);
    } catch { /* ignore */ }
  }
  
  if (!gitData?.summary) {
    // Debug: show what we actually have
    return `<p>No code analysis data available.</p><pre style="font-size: 10px; color: #999; margin-top: 20px;">Debug: ${JSON.stringify(Object.keys(analysis.analysisData || {}))}</pre>`;
  }
  
  const summary = gitData.summary;
  const commits = gitData.commits || [];
  const authors = gitData.authorBreakdown || [];
  
  // Risk distribution chart data
  const riskDistribution = [
    { label: "Critical", value: summary.criticalCount, color: "#dc2626" },
    { label: "High", value: summary.highCount, color: "#ea580c" },
    { label: "Medium", value: summary.mediumCount, color: "#eab308" },
    { label: "Low", value: summary.lowCount, color: "#22c55e" },
  ];
  
  // Author risk chart
  const authorData = authors.slice(0, 6).map(a => ({
    label: a.author.split(" ")[0].substring(0, 8),
    value: a.avgRisk,
    color: riskColor(a.avgRisk),
  }));
  
  // Commits table
  let commitsTable = "";
  if (commits.length > 0) {
    commitsTable = `
      <h3 style="margin-top: 30px; color: #1f2937;">Commit Risk Assessment (${commits.length} commits)</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Commit</th>
            <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">Risk</th>
            <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">Files</th>
            <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">+/−</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Author</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Date</th>
          </tr>
        </thead>
        <tbody>
          ${commits.slice(0, 20).map(c => `
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px;">
                <code style="font-size: 10px; color: #7c3aed;">${c.shortSha}</code>
                <div style="font-size: 11px; color: #374151; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${c.message}</div>
              </td>
              <td style="padding: 8px; text-align: center;">
                <span style="padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; ${riskBg(c.riskScore)}">${c.riskScore}</span>
              </td>
              <td style="padding: 8px; text-align: center;">${c.filesChanged}</td>
              <td style="padding: 8px; text-align: center;">
                <span style="color: #16a34a;">+${c.additions}</span> / <span style="color: #dc2626;">−${c.deletions}</span>
              </td>
              <td style="padding: 8px; font-size: 11px; color: #6b7280;">${c.author}</td>
              <td style="padding: 8px; font-size: 11px; color: #9ca3af;">${new Date(c.date).toLocaleDateString()}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      ${commits.length > 20 ? `<p style="color: #6b7280; font-size: 12px; margin-top: 10px;">... and ${commits.length - 20} more commits</p>` : ""}
    `;
  }
  
  // Generate daily trend data
  const dayMap: Record<string, { count: number; riskSum: number }> = {};
  commits.forEach(c => {
    const day = new Date(c.date).toISOString().slice(0, 10);
    if (!dayMap[day]) dayMap[day] = { count: 0, riskSum: 0 };
    dayMap[day].count++;
    dayMap[day].riskSum += c.riskScore;
  });
  const trendData = Object.entries(dayMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, d]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      avgRisk: Math.round(d.riskSum / d.count),
      commits: d.count,
    }));

  // Generate daily trend line chart
  let trendChart = "";
  if (trendData.length > 1) {
    const maxCommits = Math.max(...trendData.map(d => d.commits), 1);
    const width = 500;
    const height = 180;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const points = trendData.map((d, i) => {
      const x = padding + (i / (trendData.length - 1)) * chartWidth;
      const y = padding + chartHeight - (d.avgRisk / 100) * chartHeight;
      return `${x},${y}`;
    }).join(" ");
    
    const commitPoints = trendData.map((d, i) => {
      const x = padding + (i / (trendData.length - 1)) * chartWidth;
      const y = padding + chartHeight - (d.commits / maxCommits) * chartHeight;
      return `${x},${y}`;
    }).join(" ");
    
    trendChart = `
      <div style="margin: 30px 0;">
        <h4 style="margin-bottom: 10px; color: #374151;">Daily Commit Risk Trend</h4>
        <svg width="${width}" height="${height}" style="background: #f9fafb; border-radius: 8px;">
          <polyline points="${points}" fill="none" stroke="#8b5cf6" stroke-width="2"/>
          <polyline points="${commitPoints}" fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 4"/>
          ${trendData.map((d, i) => {
            const x = padding + (i / (trendData.length - 1)) * chartWidth;
            const y = padding + chartHeight - (d.avgRisk / 100) * chartHeight;
            return `<circle cx="${x}" cy="${y}" r="4" fill="#8b5cf6"/>`;
          }).join("")}
          <text x="${width - 10}" y="${padding + 10}" text-anchor="end" font-size="10" fill="#8b5cf6">● Avg Risk</text>
          <text x="${width - 10}" y="${padding + 22}" text-anchor="end" font-size="10" fill="#94a3b8">-- Commits</text>
        </svg>
      </div>
    `;
  }

  // Generate file hotspot map
  const fileMap: Record<string, { risk: number; churn: number; commits: number }> = {};
  commits.forEach(c => {
    if (c.files) {
      c.files.forEach((f: { filename: string; additions: number; deletions: number; fileRisk?: number }) => {
        const name = f.filename;
        if (!fileMap[name]) fileMap[name] = { risk: 0, churn: 0, commits: 0 };
        fileMap[name].risk = Math.max(fileMap[name].risk, f.fileRisk || 0);
        fileMap[name].churn += f.additions + f.deletions;
        fileMap[name].commits++;
      });
    }
  });
  const hotspots = Object.entries(fileMap)
    .map(([file, d]) => ({ file, shortName: file.split("/").pop() || file, ...d }))
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 10);
  
  let hotspotMap = "";
  if (hotspots.length > 0) {
    const maxChurn = Math.max(...hotspots.map(h => h.churn), 1);
    hotspotMap = `
      <div style="margin: 30px 0;">
        <h4 style="margin-bottom: 10px; color: #374151;">File Hotspot Map — Top 10 Riskiest Files</h4>
        <p style="font-size: 11px; color: #6b7280; margin-bottom: 10px;">Size = code churn. Color = max risk score.</p>
        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
          ${hotspots.map(h => {
            const minSize = 48;
            const maxSize = 120;
            const size = Math.round(minSize + (h.churn / maxChurn) * (maxSize - minSize));
            const bg = h.risk >= 75 ? "#ef4444" : h.risk >= 50 ? "#fb923c" : h.risk >= 25 ? "#fcd34d" : "#4ade80";
            const textColor = h.risk >= 50 ? "#ffffff" : "#1f2937";
            return `
              <div style="width: ${size}px; height: ${size}px; background: ${bg}; color: ${textColor}; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4px; overflow: hidden;" title="${h.file}&#10;Risk: ${h.risk} | Churn: ${h.churn} | Commits: ${h.commits}">
                <span style="font-size: 9px; font-weight: bold; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%;">${h.shortName}</span>
                <span style="font-size: 11px; font-weight: bold;">${h.risk}</span>
                <span style="font-size: 8px; opacity: 0.8;">±${h.churn}</span>
              </div>
            `;
          }).join("")}
        </div>
        <div style="display: flex; gap: 16px; margin-top: 10px; font-size: 10px; color: #6b7280;">
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; background: #ef4444; border-radius: 2px;"></span> Critical (≥75)</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; background: #fb923c; border-radius: 2px;"></span> High (50-74)</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; background: #fcd34d; border-radius: 2px;"></span> Medium (25-49)</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; background: #4ade80; border-radius: 2px;"></span> Low (<25)</span>
        </div>
      </div>
    `;
  }

  // Generate risk profile radar
  const totalCommits = summary.totalCommits;
  const highRiskPct = totalCommits > 0 ? Math.round((summary.criticalCount + summary.highCount) / totalCommits * 100) : 0;
  const avgChurnPerCommit = totalCommits > 0 ? Math.round((summary.totalAdditions + summary.totalDeletions) / totalCommits) : 0;
  const uniqueAuthors = authors.length;
  const avgFilesPerCommit = totalCommits > 0 ? Math.round(summary.totalFilesChanged / totalCommits) : 0;
  
  const radarMetrics = `
    <div style="margin: 30px 0;">
      <h4 style="margin-bottom: 10px; color: #374151;">Repository Risk Profile</h4>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #6b7280;">Avg Risk Score</div>
          <div style="font-size: 24px; font-weight: bold; color: ${riskColor(summary.avgRisk)};">${summary.avgRisk}</div>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #6b7280;">High Risk %</div>
          <div style="font-size: 24px; font-weight: bold; color: ${highRiskPct > 30 ? '#dc2626' : '#16a34a'};">${highRiskPct}%</div>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #6b7280;">Avg Churn/Commit</div>
          <div style="font-size: 24px; font-weight: bold; color: #374151;">${avgChurnPerCommit}</div>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #6b7280;">Unique Authors</div>
          <div style="font-size: 24px; font-weight: bold; color: #374151;">${uniqueAuthors}</div>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #6b7280;">Avg Files/Commit</div>
          <div style="font-size: 24px; font-weight: bold; color: #374151;">${avgFilesPerCommit}</div>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #6b7280;">Add/Delete Ratio</div>
          <div style="font-size: 24px; font-weight: bold; color: #374151;">${summary.totalDeletions > 0 ? (summary.totalAdditions / summary.totalDeletions).toFixed(1) : "∞"}:1</div>
        </div>
      </div>
    </div>
  `;

  // Generate AI insights
  const hrc = summary.criticalCount + summary.highCount;
  const avgChurn = totalCommits > 0 ? Math.round((summary.totalAdditions + summary.totalDeletions) / totalCommits) : 0;
  const insights: { icon: string; text: string; severity: string }[] = [];
  if (hrc > totalCommits * 0.3) insights.push({ icon: "🔴", text: `${Math.round(hrc / totalCommits * 100)}% of commits are high/critical risk`, severity: "critical" });
  if (avgChurn > 200) insights.push({ icon: "📊", text: `High average churn (${avgChurn} lines/commit)`, severity: "high" });
  if (summary.avgRisk < 25) insights.push({ icon: "✅", text: `Low average risk score (${summary.avgRisk}/100)`, severity: "info" });
  if (summary.avgRisk >= 50) insights.push({ icon: "🔥", text: `Elevated average risk (${summary.avgRisk}/100)`, severity: "high" });
  const addDeleteRatio = summary.totalDeletions > 0 ? (summary.totalAdditions / summary.totalDeletions).toFixed(1) : "∞";
  insights.push({ icon: "📈", text: `Add/Delete ratio: ${addDeleteRatio}:1`, severity: "info" });
  if (insights.length === 0) insights.push({ icon: "✅", text: "No significant concerns detected", severity: "info" });

  const insightsHtml = `
    <div style="margin: 30px 0;">
      <h4 style="margin-bottom: 10px; color: #374151;">AI Code Change Insights</h4>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${insights.map(ins => {
          const bgColor = ins.severity === "critical" ? "#fef2f2" : ins.severity === "high" ? "#fff7ed" : "#eff6ff";
          const borderColor = ins.severity === "critical" ? "#fecaca" : ins.severity === "high" ? "#fed7aa" : "#bfdbfe";
          return `
            <div style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 8px; padding: 10px; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 14px;">${ins.icon}</span>
              <span style="font-size: 12px; color: #374151;">${ins.text}</span>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;

  // Author breakdown table
  let authorTable = "";
  if (authors.length > 0) {
    authorTable = `
      <div style="margin: 30px 0;">
        <h4 style="margin-bottom: 10px; color: #374151;">Risk by Author</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Author</th>
              <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">Commits</th>
              <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">Avg Risk</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Churn</th>
            </tr>
          </thead>
          <tbody>
            ${authors.map(a => `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px; font-weight: 500;">${a.author}</td>
                <td style="padding: 8px; text-align: center;">${a.commits}</td>
                <td style="padding: 8px; text-align: center;">
                  <span style="padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; ${riskBg(a.avgRisk)}">${a.avgRisk}</span>
                </td>
                <td style="padding: 8px; text-align: right; color: #6b7280;">+${a.additions} / −${a.deletions}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  return `
    <div class="section">
      <h2 style="color: #7c3aed; border-bottom: 2px solid #7c3aed; padding-bottom: 8px;">Code Change Analysis</h2>
      <p style="color: #6b7280; margin-bottom: 20px;">Repository: <a href="${gitData.repoUrl || data?.gitRepo}" style="color: #7c3aed;">${gitData.owner || ""}/${gitData.repo || ""}</a> | Last ${data?.gitDays || 14} days</p>
      
      <div class="summary-cards">
        <div class="card">
          <div class="card-label">Total Commits</div>
          <div class="card-value">${summary.totalCommits}</div>
        </div>
        <div class="card">
          <div class="card-label">Code Change Risk</div>
          <div class="card-value" style="color: ${riskColor(summary.overallRiskFactor)};">${summary.overallRiskFactor}</div>
          <div class="card-sublabel">${riskLabel(summary.overallRiskFactor)}</div>
        </div>
        <div class="card">
          <div class="card-label">Avg Commit Risk</div>
          <div class="card-value" style="color: ${riskColor(summary.avgRisk)};">${summary.avgRisk}</div>
        </div>
        <div class="card">
          <div class="card-label">Code Churn</div>
          <div class="card-value">${(summary.totalAdditions + summary.totalDeletions).toLocaleString()}</div>
          <div class="card-sublabel">+${summary.totalAdditions.toLocaleString()} / −${summary.totalDeletions.toLocaleString()}</div>
        </div>
        <div class="card">
          <div class="card-label">High Risk Commits</div>
          <div class="card-value" style="color: #dc2626;">${summary.criticalCount + summary.highCount}</div>
        </div>
        <div class="card">
          <div class="card-label">Files Changed</div>
          <div class="card-value">${summary.totalFilesChanged}</div>
        </div>
      </div>
      
      <div class="charts-row">
        ${generatePieChart(riskDistribution, "Commit Risk Distribution")}
        ${generateBarChart(authorData, "Risk by Author (Top 6)")}
      </div>
      
      ${trendChart}
      ${hotspotMap}
      ${radarMetrics}
      ${insightsHtml}
      ${authorTable}
      ${commitsTable}
    </div>
  `;
}

// Generate SVG radar chart for plan dimensions
function generateRadarChart(data: { label: string; value: number }[], title: string, size = 300): string {
  if (!data || data.length < 3) return "";
  
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 50;
  const angleStep = (2 * Math.PI) / data.length;
  
  // Generate grid circles
  let gridCircles = "";
  for (let i = 1; i <= 4; i++) {
    const r = (radius * i) / 4;
    gridCircles += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="1"/>`;
  }
  
  // Generate axis lines and labels
  let axisLines = "";
  let labels = "";
  data.forEach((d, i) => {
    const angle = angleStep * i - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    axisLines += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
    
    const labelX = cx + (radius + 25) * Math.cos(angle);
    const labelY = cy + (radius + 25) * Math.sin(angle);
    labels += `<text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#6b7280">${d.label}</text>`;
  });
  
  // Generate data polygon
  let points = "";
  data.forEach((d, i) => {
    const angle = angleStep * i - Math.PI / 2;
    const r = (d.value / 100) * radius;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points += `${x},${y} `;
  });
  
  return `
    <div style="margin: 20px 0;">
      <h4 style="margin-bottom: 10px; color: #374151;">${title}</h4>
      <svg width="${size}" height="${size}" style="background: #f9fafb; border-radius: 8px;">
        ${gridCircles}
        ${axisLines}
        <polygon points="${points.trim()}" fill="rgba(20, 184, 166, 0.3)" stroke="#14b8a6" stroke-width="2"/>
        ${labels}
      </svg>
    </div>
  `;
}

// Generate HTML report for Plan Analysis
function generatePlanAnalysisReport(analysis: { name: string; description?: string; createdAt: Date; analysisData: Record<string, unknown>; changeRequestId?: string }): string {
  const data = analysis.analysisData as { planResult?: Record<string, unknown>; planWeights?: Record<string, number> };
  const planResult = data?.planResult as {
    cr?: { number: string; short_description: string; risk: string; state: string; assignment_group: string; type: string; priority: string; urgency: string; sn_impact: string; scope: string; opened_by: string; assigned_to: string; category: string; description: string; implementation_plan: string; backout_plan: string; test_plan: string; change_plan: string; risk_impact_analysis: string; justification: string };
    overallScore?: number;
    gapCount?: number;
    implementation?: { present: boolean; quality: number; factors: string[]; length: number };
    backout?: { present: boolean; quality: number; factors: string[]; length: number };
    testPlan?: { present: boolean; quality: number; factors: string[]; length: number };
    riskAnalysis?: { present: boolean; quality: number; factors: string[]; length: number };
    changePlan?: { present: boolean; quality: number; factors: string[]; length: number };
    justification?: { present: boolean; quality: number; factors: string[]; length: number };
  };
  const planWeights = data?.planWeights || { implementation: 0.25, backout: 0.25, testPlan: 0.20, riskAnalysis: 0.15, changePlan: 0.10, justification: 0.05 };
  
  if (!planResult?.cr) return "<p>No plan analysis data available.</p>";
  
  const cr = planResult.cr;
  const dimensions = [
    { key: "implementation", label: "Implementation Plan", data: planResult.implementation, field: "implementation_plan" },
    { key: "backout", label: "Backout Plan", data: planResult.backout, field: "backout_plan" },
    { key: "testPlan", label: "Test Plan", data: planResult.testPlan, field: "test_plan" },
    { key: "riskAnalysis", label: "Risk Analysis", data: planResult.riskAnalysis, field: "risk_impact_analysis" },
    { key: "changePlan", label: "Change Plan", data: planResult.changePlan, field: "change_plan" },
    { key: "justification", label: "Justification", data: planResult.justification, field: "justification" },
  ];
  
  const dimensionChartData = dimensions.filter(d => d.data).map(d => ({
    label: d.label.split(" ")[0],
    value: d.data?.quality || 0,
    color: d.data && d.data.quality >= 50 ? "#22c55e" : d.data && d.data.quality >= 25 ? "#eab308" : "#ef4444",
  }));
  
  const radarData = dimensions.filter(d => d.data).map(d => ({
    label: d.label.split(" ")[0],
    value: d.data?.quality || 0,
  }));
  
  // Count gaps (missing or low quality plans)
  const missingPlans = dimensions.filter(d => !d.data?.present).length;
  const lowQualityPlans = dimensions.filter(d => d.data?.present && (d.data?.quality || 0) < 50).length;
  
  // Generate pie chart for plan status
  const statusData = [
    { label: "Well Prepared (≥75)", value: dimensions.filter(d => d.data && d.data.quality >= 75).length, color: "#22c55e" },
    { label: "Adequate (50-74)", value: dimensions.filter(d => d.data && d.data.quality >= 50 && d.data.quality < 75).length, color: "#eab308" },
    { label: "Gaps Found (25-49)", value: dimensions.filter(d => d.data && d.data.quality >= 25 && d.data.quality < 50).length, color: "#f97316" },
    { label: "Critical (<25)", value: dimensions.filter(d => d.data && d.data.quality < 25).length, color: "#ef4444" },
  ].filter(d => d.value > 0);
  
  // Generate weights display
  const weightsHtml = `
    <div style="margin: 20px 0; padding: 16px; background: #f0fdfa; border-radius: 8px; border: 1px solid #99f6e4;">
      <h4 style="margin: 0 0 12px 0; color: #0d9488; font-size: 14px;">Scoring Weights Applied</h4>
      <div style="display: flex; flex-wrap: wrap; gap: 12px;">
        ${Object.entries(planWeights).map(([key, val]) => `
          <span style="background: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; border: 1px solid #99f6e4;">
            <strong>${key.replace(/([A-Z])/g, ' $1').trim()}:</strong> ${Math.round((val as number) * 100)}%
          </span>
        `).join("")}
      </div>
    </div>
  `;
  
  return `
    <div class="section">
      <h2 style="color: #14b8a6; border-bottom: 2px solid #14b8a6; padding-bottom: 8px;">Plan Analysis Report</h2>
      <p style="color: #6b7280; margin-bottom: 20px;">Change Request: <strong>${cr.number}</strong> — ${cr.short_description || ""}</p>
      
      <div class="summary-cards">
        <div class="card">
          <div class="card-label">Overall Readiness</div>
          <div class="card-value" style="color: ${(planResult.overallScore || 0) >= 50 ? '#16a34a' : '#dc2626'};">${planResult.overallScore || 0}/100</div>
          <div class="card-sublabel">${planLabel(planResult.overallScore || 0)}</div>
        </div>
        <div class="card">
          <div class="card-label">Risk Level</div>
          <div class="card-value" style="${riskBg(cr.risk === 'Very High' ? 90 : cr.risk === 'High' ? 70 : cr.risk === 'Moderate' ? 50 : 25)}">${cr.risk || "N/A"}</div>
        </div>
        <div class="card">
          <div class="card-label">Missing Plans</div>
          <div class="card-value" style="color: ${missingPlans > 0 ? '#dc2626' : '#16a34a'};">${missingPlans}</div>
        </div>
        <div class="card">
          <div class="card-label">Low Quality Plans</div>
          <div class="card-value" style="color: ${lowQualityPlans > 0 ? '#f97316' : '#16a34a'};">${lowQualityPlans}</div>
        </div>
      </div>
      
      <div class="summary-cards">
        <div class="card">
          <div class="card-label">State</div>
          <div class="card-value" style="font-size: 16px;">${cr.state || "N/A"}</div>
        </div>
        <div class="card">
          <div class="card-label">Type</div>
          <div class="card-value" style="font-size: 16px;">${cr.type || "N/A"}</div>
        </div>
        <div class="card">
          <div class="card-label">Priority</div>
          <div class="card-value" style="font-size: 16px;">${cr.priority || "N/A"}</div>
        </div>
        <div class="card">
          <div class="card-label">Assignment Group</div>
          <div class="card-value" style="font-size: 12px;">${cr.assignment_group || "N/A"}</div>
        </div>
      </div>
      
      ${weightsHtml}
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
        ${generateBarChart(dimensionChartData, "Plan Dimension Scores", 450, 220)}
        ${generateRadarChart(radarData, "Readiness Radar", 280)}
      </div>
      
      ${generatePieChart(statusData, "Plan Quality Distribution", 180)}
      
      <h3 style="margin-top: 30px; color: #1f2937;">Plan Dimension Details</h3>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 16px;">
        ${dimensions.map(d => `
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; ${!d.data?.present ? 'background: #fef2f2;' : ''}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong style="color: #374151;">${d.label}</strong>
              ${d.data?.present ? `
                <span style="padding: 2px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; ${planBg(d.data?.quality || 0)}">${d.data?.quality || 0}/100</span>
              ` : `
                <span style="padding: 2px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; background: #fee2e2; color: #b91c1c;">Missing</span>
              `}
            </div>
            ${d.data?.present ? `
              <div style="font-size: 11px; color: #9ca3af; margin-bottom: 8px;">${d.data?.length || 0} characters</div>
              <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #6b7280;">
                ${(d.data?.factors || []).map((f: string) => `<li style="margin: 4px 0;">${f}</li>`).join("")}
              </ul>
            ` : `
              <p style="font-size: 12px; color: #dc2626; margin: 8px 0;">⚠️ This plan is missing. Consider requiring it before approval.</p>
            `}
          </div>
        `).join("")}
      </div>
      
      <h3 style="margin-top: 30px; color: #1f2937;">Change Request Details</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px;">
        <tbody>
          ${[
            { label: "Number", value: cr.number },
            { label: "Short Description", value: cr.short_description },
            { label: "State", value: cr.state },
            { label: "Type", value: cr.type },
            { label: "Category", value: cr.category },
            { label: "Priority", value: cr.priority },
            { label: "Risk", value: cr.risk },
            { label: "Impact", value: cr.sn_impact },
            { label: "Urgency", value: cr.urgency },
            { label: "Scope", value: cr.scope },
            { label: "Opened By", value: cr.opened_by },
            { label: "Assigned To", value: cr.assigned_to },
            { label: "Assignment Group", value: cr.assignment_group },
          ].filter(r => r.value).map(r => `
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 150px;">${r.label}</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #374151; font-weight: 500;">${r.value}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      
      ${cr.description ? `
        <h4 style="margin-top: 20px; color: #374151;">Description</h4>
        <div style="background: #f9fafb; padding: 12px; border-radius: 8px; font-size: 13px; color: #374151; white-space: pre-wrap; max-height: 200px; overflow-y: auto;">${cr.description}</div>
      ` : ""}
    </div>
  `;
}

// Generate HTML report for ML Analysis
function generateMLAnalysisReport(analysis: { name: string; description?: string; createdAt: Date; analysisData: Record<string, unknown>; changeRequestId?: string }): string {
  const data = analysis.analysisData as { mlAnalysis?: Record<string, unknown>; mlWeights?: Record<string, number> };
  const mlAnalysis = data?.mlAnalysis as {
    number?: string;
    short_description?: string;
    overallQuality?: number;
    planAnalysis?: {
      overallQuality: number;
      structure: { score: number; findings: string[] };
      completeness: { score: number; findings: string[] };
      clarity: { score: number; findings: string[] };
      riskAwareness: { score: number; findings: string[] };
      recommendations: string[];
    };
    structure?: { score: number; findings: string[] };
    completeness?: { score: number; findings: string[] };
    clarity?: { score: number; findings: string[] };
    riskAwareness?: { score: number; findings: string[] };
    recommendations?: string[];
  };
  const mlWeights = data?.mlWeights || { structure: 0.25, completeness: 0.30, clarity: 0.20, riskAwareness: 0.25 };
  
  if (!mlAnalysis) return "<p>No ML analysis data available.</p>";
  
  // Handle both direct structure and nested planAnalysis structure
  const planData = mlAnalysis.planAnalysis || mlAnalysis;
  const overallQuality = mlAnalysis.overallQuality || (planData as { overallQuality?: number }).overallQuality || 0;
  
  const dimensions = [
    { key: "structure", label: "Structure", desc: "Organization and logical flow", data: (planData as { structure?: { score: number; findings: string[] } }).structure },
    { key: "completeness", label: "Completeness", desc: "Coverage of required elements", data: (planData as { completeness?: { score: number; findings: string[] } }).completeness },
    { key: "clarity", label: "Clarity", desc: "Clear and understandable language", data: (planData as { clarity?: { score: number; findings: string[] } }).clarity },
    { key: "riskAwareness", label: "Risk Awareness", desc: "Identification of risks and mitigations", data: (planData as { riskAwareness?: { score: number; findings: string[] } }).riskAwareness },
  ];
  
  const chartData = dimensions.filter(d => d.data).map(d => ({
    label: d.label,
    value: d.data?.score || 0,
    color: d.data && d.data.score >= 65 ? "#22c55e" : d.data && d.data.score >= 40 ? "#eab308" : "#ef4444",
  }));
  
  const radarData = dimensions.filter(d => d.data).map(d => ({
    label: d.label,
    value: d.data?.score || 0,
  }));
  
  // Quality distribution pie chart
  const qualityDist = [
    { label: "Good (>=65)", value: dimensions.filter(d => d.data && d.data.score >= 65).length, color: "#22c55e" },
    { label: "Fair (40-64)", value: dimensions.filter(d => d.data && d.data.score >= 40 && d.data.score < 65).length, color: "#eab308" },
    { label: "Poor (<40)", value: dimensions.filter(d => d.data && d.data.score < 40).length, color: "#ef4444" },
  ].filter(d => d.value > 0);
  
  // Get recommendations - can be array of strings or array of objects with {severity, category, title, detail}
  const rawRecs = mlAnalysis.recommendations || (planData as { recommendations?: unknown[] }).recommendations || [];
  
  // Quality label helper
  const qualityLabel = (score: number) => score >= 65 ? "Good" : score >= 40 ? "Fair" : "Poor";
  const qualityColor = (score: number) => score >= 65 ? "#16a34a" : score >= 40 ? "#ca8a04" : "#dc2626";
  const severityColor = (sev: string) => sev === "critical" ? "#dc2626" : sev === "high" ? "#ea580c" : sev === "medium" ? "#ca8a04" : "#6b7280";
  const severityBg = (sev: string) => sev === "critical" ? "#fee2e2" : sev === "high" ? "#ffedd5" : sev === "medium" ? "#fef3c7" : "#f3f4f6";
  
  // Generate weights display
  const weightsHtml = Object.keys(mlWeights).length > 0 ? `
    <div style="margin: 20px 0; padding: 16px; background: #eef2ff; border-radius: 8px; border: 1px solid #c7d2fe;">
      <h4 style="margin: 0 0 12px 0; color: #4f46e5; font-size: 14px;">ML Scoring Weights</h4>
      <div style="display: flex; flex-wrap: wrap; gap: 12px;">
        ${Object.entries(mlWeights).map(([key, val]) => `<span style="background: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; border: 1px solid #c7d2fe;"><strong>${key.replace(/([A-Z])/g, ' $1').trim()}:</strong> ${Math.round((val as number) * 100)}%</span>`).join("")}
      </div>
    </div>
  ` : "";
  
  return `
    <div class="section">
      <h2 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 8px;">ML Quality Analysis Report</h2>
      ${mlAnalysis.number ? `<p style="color: #6b7280; margin-bottom: 20px;">Change Request: <strong>${mlAnalysis.number}</strong>${mlAnalysis.short_description ? ` - ${mlAnalysis.short_description}` : ""}</p>` : ""}
      
      <div class="summary-cards">
        <div class="card">
          <div class="card-label">Overall Quality</div>
          <div class="card-value" style="color: ${qualityColor(overallQuality)};">${overallQuality}/100</div>
          <div class="card-sublabel">${qualityLabel(overallQuality)}</div>
        </div>
        ${dimensions.filter(d => d.data).map(d => `
          <div class="card">
            <div class="card-label">${d.label}</div>
            <div class="card-value" style="color: ${qualityColor(d.data?.score || 0)};">${d.data?.score || 0}</div>
            <div class="card-sublabel">${qualityLabel(d.data?.score || 0)}</div>
          </div>
        `).join("")}
      </div>
      
      ${weightsHtml}
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
        ${generateBarChart(chartData, "Quality Dimension Scores", 450, 220)}
        ${generateRadarChart(radarData, "Quality Radar", 280)}
      </div>
      
      ${generatePieChart(qualityDist, "Quality Distribution", 180)}
      
      <h3 style="margin-top: 30px; color: #1f2937;">Dimension Analysis</h3>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 16px;">
        ${dimensions.filter(d => d.data).map(d => `
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong style="color: #374151;">${d.label}</strong>
              <span style="padding: 2px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; background: ${(d.data?.score || 0) >= 65 ? '#dcfce7' : (d.data?.score || 0) >= 40 ? '#fef3c7' : '#fee2e2'}; color: ${qualityColor(d.data?.score || 0)};">${d.data?.score || 0}/100</span>
            </div>
            <p style="font-size: 11px; color: #9ca3af; margin: 0 0 8px 0;">${d.desc}</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #6b7280;">
              ${(d.data?.findings || []).map((f: string) => `<li style="margin: 4px 0;">${f}</li>`).join("")}
            </ul>
          </div>
        `).join("")}
      </div>
      
      ${rawRecs.length > 0 ? `
        <h3 style="margin-top: 30px; color: #1f2937;">AI Recommendations</h3>
        <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 12px;">
          ${rawRecs.map((r: unknown) => {
            // Handle both string and object recommendations
            if (typeof r === "string") {
              return `<div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px; color: #92400e;">${r}</div>`;
            }
            const rec = r as { severity?: string; category?: string; title?: string; detail?: string };
            const sev = rec.severity || "info";
            const bg = severityBg(sev);
            const color = severityColor(sev);
            return `
              <div style="background: ${bg}; border-left: 4px solid ${color}; border-radius: 4px; padding: 12px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: ${color};">${sev}</span>
                  ${rec.category ? `<span style="font-size: 10px; color: #6b7280;">• ${rec.category}</span>` : ""}
                </div>
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">${rec.title || "Recommendation"}</div>
                ${rec.detail ? `<div style="font-size: 13px; color: #4b5563;">${rec.detail}</div>` : ""}
              </div>
            `;
          }).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

// Generate combined/overview report
function generateCombinedReport(analysis: { name: string; description?: string; createdAt: Date; analysisData: Record<string, unknown> }): string {
  const data = analysis.analysisData as {
    weights?: Record<string, number>;
    scored?: { cr: { number: string; short_description?: string; title?: string; risk: string; state?: string; type?: string; assignment_group?: string }; overall: number; dims: Record<string, number> }[];
    planResults?: { cr: { number: string; short_description: string; risk?: string; assignment_group?: string }; overallScore: number; gapCount?: number; implementation?: { present: boolean; quality: number }; backout?: { present: boolean; quality: number }; testPlan?: { present: boolean; quality: number }; riskAnalysis?: { present: boolean; quality: number }; changePlan?: { present: boolean; quality: number }; justification?: { present: boolean; quality: number } }[];
  };
  
  let content = "";
  
  if (data?.scored && data.scored.length > 0) {
    const totalCRs = data.scored.length;
    const avgOverall = Math.round(data.scored.reduce((a, s) => a + s.overall, 0) / totalCRs);
    const criticalCount = data.scored.filter(s => s.overall >= 80).length;
    const highCount = data.scored.filter(s => s.overall >= 60 && s.overall < 80).length;
    const mediumCount = data.scored.filter(s => s.overall >= 40 && s.overall < 60).length;
    const lowCount = data.scored.filter(s => s.overall < 40).length;
    
    const riskDistribution = [
      { label: "Critical (>=80)", value: criticalCount, color: "#dc2626" },
      { label: "High (60-79)", value: highCount, color: "#ea580c" },
      { label: "Medium (40-59)", value: mediumCount, color: "#eab308" },
      { label: "Low (<40)", value: lowCount, color: "#22c55e" },
    ].filter(d => d.value > 0);
    
    // State distribution
    const stateMap: Record<string, number> = {};
    data.scored.forEach(s => { const st = s.cr.state || "Unknown"; stateMap[st] = (stateMap[st] || 0) + 1; });
    const stateData = Object.entries(stateMap).map(([label, value]) => ({ label, value, color: "#6366f1" })).sort((a, b) => b.value - a.value).slice(0, 6);
    
    // Type distribution
    const typeMap: Record<string, number> = {};
    data.scored.forEach(s => { const t = s.cr.type || "Unknown"; typeMap[t] = (typeMap[t] || 0) + 1; });
    const typeData = Object.entries(typeMap).map(([label, value]) => ({ label, value, color: "#3b82f6" })).sort((a, b) => b.value - a.value);
    
    // Risk level distribution from SN
    const snRiskMap: Record<string, number> = {};
    data.scored.forEach(s => { const r = s.cr.risk || "Unknown"; snRiskMap[r] = (snRiskMap[r] || 0) + 1; });
    const snRiskColors: Record<string, string> = { "Very High": "#dc2626", "High": "#ea580c", "Moderate": "#eab308", "Low": "#22c55e", "None": "#94a3b8" };
    const snRiskData = Object.entries(snRiskMap).map(([label, value]) => ({ label, value, color: snRiskColors[label] || "#6b7280" }));
    
    // Weights display
    const weightsHtml = data.weights ? `
      <div style="margin: 20px 0; padding: 16px; background: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe;">
        <h4 style="margin: 0 0 12px 0; color: #2563eb; font-size: 14px;">Impact Scoring Weights</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 12px;">
          ${Object.entries(data.weights).map(([key, val]) => `<span style="background: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; border: 1px solid #bfdbfe;"><strong>${key}:</strong> ${Math.round((val as number) * 100)}%</span>`).join("")}
        </div>
      </div>
    ` : "";
    
    content += `
      <div class="section">
        <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">Impact Analysis Overview</h2>
        
        <div class="summary-cards">
          <div class="card">
            <div class="card-label">Total CRs</div>
            <div class="card-value">${totalCRs}</div>
          </div>
          <div class="card">
            <div class="card-label">Avg Impact Score</div>
            <div class="card-value" style="color: ${avgOverall >= 60 ? '#dc2626' : avgOverall >= 40 ? '#ea580c' : '#16a34a'};">${avgOverall}</div>
            <div class="card-sublabel">${riskLabel(avgOverall)}</div>
          </div>
          <div class="card">
            <div class="card-label">Critical / High</div>
            <div class="card-value" style="color: #dc2626;">${criticalCount + highCount}</div>
            <div class="card-sublabel">${criticalCount} crit, ${highCount} high</div>
          </div>
          <div class="card">
            <div class="card-label">Low Impact</div>
            <div class="card-value" style="color: #16a34a;">${lowCount}</div>
            <div class="card-sublabel">Score < 40</div>
          </div>
        </div>
        
        ${weightsHtml}
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
          ${generatePieChart(riskDistribution, "Impact Score Distribution", 180)}
          ${generatePieChart(snRiskData, "ServiceNow Risk Levels", 180)}
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
          ${generateBarChart(stateData, "CR State Distribution", 400, 200)}
          ${generateBarChart(typeData, "Change Type Distribution", 400, 200)}
        </div>
        
        <h3 style="margin-top: 30px; color: #1f2937;">Top Risk Change Requests</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">CR Number</th>
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Description</th>
              <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">SN Risk</th>
              <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">State</th>
              <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">Impact Score</th>
            </tr>
          </thead>
          <tbody>
            ${data.scored.slice().sort((a, b) => b.overall - a.overall).slice(0, 15).map(s => `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px; font-weight: 500; font-family: monospace; font-size: 11px;">${s.cr.number}</td>
                <td style="padding: 8px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.cr.short_description || s.cr.title || ""}</td>
                <td style="padding: 8px; text-align: center; font-size: 11px;">${s.cr.risk || "—"}</td>
                <td style="padding: 8px; text-align: center; font-size: 11px;">${s.cr.state || "—"}</td>
                <td style="padding: 8px; text-align: center;">
                  <span style="padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; ${riskBg(s.overall)}">${s.overall}</span>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  
  if (data?.planResults && data.planResults.length > 0) {
    const pn = data.planResults.length;
    const pAvg = Math.round(data.planResults.reduce((a, p) => a + p.overallScore, 0) / pn);
    const wellPrepared = data.planResults.filter(p => p.overallScore >= 75).length;
    const adequate = data.planResults.filter(p => p.overallScore >= 50 && p.overallScore < 75).length;
    const gapsFound = data.planResults.filter(p => p.overallScore >= 25 && p.overallScore < 50).length;
    const criticalGaps = data.planResults.filter(p => p.overallScore < 25).length;
    
    // Missing plans counts
    const missingImpl = data.planResults.filter(p => !p.implementation?.present).length;
    const missingBackout = data.planResults.filter(p => !p.backout?.present).length;
    const missingTest = data.planResults.filter(p => !p.testPlan?.present).length;
    
    const readinessDistribution = [
      { label: "Well Prepared (>=75)", value: wellPrepared, color: "#22c55e" },
      { label: "Adequate (50-74)", value: adequate, color: "#eab308" },
      { label: "Gaps Found (25-49)", value: gapsFound, color: "#f97316" },
      { label: "Critical Gaps (<25)", value: criticalGaps, color: "#ef4444" },
    ].filter(d => d.value > 0);
    
    // Plan dimension averages
    const planDims = [
      { key: "implementation", label: "Implementation" },
      { key: "backout", label: "Backout" },
      { key: "testPlan", label: "Test Plan" },
      { key: "riskAnalysis", label: "Risk Analysis" },
      { key: "changePlan", label: "Change Plan" },
      { key: "justification", label: "Justification" },
    ];
    const dimAvgs = planDims.map(d => {
      const present = data.planResults!.filter(p => (p as Record<string, { present?: boolean; quality?: number }>)[d.key]?.present).length;
      const avgQuality = present > 0 ? Math.round(data.planResults!.reduce((a, p) => a + ((p as Record<string, { present?: boolean; quality?: number }>)[d.key]?.quality || 0), 0) / pn) : 0;
      return { label: d.label, value: avgQuality, color: avgQuality >= 50 ? "#22c55e" : avgQuality >= 25 ? "#eab308" : "#ef4444", present };
    });
    
    // Readiness by risk level
    const rrMap: Record<string, { total: number; scoreSum: number }> = {};
    data.planResults.forEach(p => {
      const risk = p.cr.risk || "Unknown";
      if (!rrMap[risk]) rrMap[risk] = { total: 0, scoreSum: 0 };
      rrMap[risk].total++;
      rrMap[risk].scoreSum += p.overallScore;
    });
    const rrData = Object.entries(rrMap).map(([label, d]) => ({
      label: `${label} (${d.total})`,
      value: Math.round(d.scoreSum / d.total),
      color: "#14b8a6",
    })).sort((a, b) => a.value - b.value);
    
    content += `
      <div class="section" style="margin-top: 40px;">
        <h2 style="color: #14b8a6; border-bottom: 2px solid #14b8a6; padding-bottom: 8px;">Plan Readiness Summary</h2>
        
        <div class="summary-cards">
          <div class="card">
            <div class="card-label">Plans Analyzed</div>
            <div class="card-value">${pn}</div>
          </div>
          <div class="card">
            <div class="card-label">Avg Readiness</div>
            <div class="card-value" style="color: ${pAvg >= 75 ? '#16a34a' : pAvg >= 50 ? '#ca8a04' : '#dc2626'};">${pAvg}</div>
            <div class="card-sublabel">${planLabel(pAvg)}</div>
          </div>
          <div class="card">
            <div class="card-label">Well Prepared</div>
            <div class="card-value" style="color: #16a34a;">${wellPrepared}</div>
            <div class="card-sublabel">Score >= 75</div>
          </div>
          <div class="card">
            <div class="card-label">Critical Gaps</div>
            <div class="card-value" style="color: #dc2626;">${criticalGaps}</div>
            <div class="card-sublabel">Score < 25</div>
          </div>
        </div>
        
        <div class="summary-cards">
          <div class="card">
            <div class="card-label">Missing Implementation</div>
            <div class="card-value" style="color: ${missingImpl > 0 ? '#dc2626' : '#16a34a'};">${missingImpl}</div>
          </div>
          <div class="card">
            <div class="card-label">Missing Backout</div>
            <div class="card-value" style="color: ${missingBackout > 0 ? '#dc2626' : '#16a34a'};">${missingBackout}</div>
          </div>
          <div class="card">
            <div class="card-label">Missing Test Plan</div>
            <div class="card-value" style="color: ${missingTest > 0 ? '#dc2626' : '#16a34a'};">${missingTest}</div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
          ${generatePieChart(readinessDistribution, "Plan Readiness Distribution", 180)}
          ${generateBarChart(dimAvgs, "Avg Quality by Plan Dimension", 400, 200)}
        </div>
        
        ${generateBarChart(rrData, "Avg Readiness by SN Risk Level", 500, 200)}
        
        <h3 style="margin-top: 30px; color: #1f2937;">Plan Coverage Details</h3>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px;">
          ${dimAvgs.map(d => `
            <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="font-size: 12px; color: #374151;">${d.label}</strong>
                <span style="padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; ${planBg(d.value)}">${d.value}</span>
              </div>
              <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">${d.present}/${pn} present</div>
              <div style="height: 6px; background: #e5e7eb; border-radius: 3px; margin-top: 8px;">
                <div style="height: 6px; border-radius: 3px; width: ${d.value}%; background: ${d.color};"></div>
              </div>
            </div>
          `).join("")}
        </div>
        
        <h3 style="margin-top: 30px; color: #1f2937;">Lowest Readiness Change Requests</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
          <thead>
            <tr style="background: #f0fdfa;">
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #99f6e4;">CR Number</th>
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #99f6e4;">Description</th>
              <th style="padding: 8px; text-align: center; border-bottom: 2px solid #99f6e4;">SN Risk</th>
              <th style="padding: 8px; text-align: center; border-bottom: 2px solid #99f6e4;">Readiness</th>
            </tr>
          </thead>
          <tbody>
            ${data.planResults.slice().sort((a, b) => a.overallScore - b.overallScore).slice(0, 10).map(p => `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px; font-weight: 500; font-family: monospace; font-size: 11px;">${p.cr.number}</td>
                <td style="padding: 8px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.cr.short_description || ""}</td>
                <td style="padding: 8px; text-align: center; font-size: 11px;">${p.cr.risk || "—"}</td>
                <td style="padding: 8px; text-align: center;">
                  <span style="padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; ${planBg(p.overallScore)}">${p.overallScore}</span>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  
  return content || "<p>No combined analysis data available.</p>";
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Check if this is a download request (vs preview)
  const url = new URL(request.url);
  const isDownload = url.searchParams.get("download") === "true";

  try {
    const analysis = await prisma.savedAnalysis.findUnique({
      where: { id: params.id },
    });

    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }
    
    // Non-admin users can only view their own analyses
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "admin" && analysis.createdBy !== session.user.email) {
      return NextResponse.json({ error: "Not authorized to view this analysis" }, { status: 403 });
    }

    // Generate report content based on analysis type
    let reportContent = "";
    // analysisData is stored as a JSON string in the database
    let analysisData: Record<string, unknown> = {};
    try {
      if (typeof analysis.analysisData === "string") {
        analysisData = JSON.parse(analysis.analysisData);
      } else {
        analysisData = (analysis.analysisData as unknown as Record<string, unknown>) || {};
      }
    } catch {
      analysisData = {};
    }
    
    switch (analysis.analysisType) {
      case "code":
        reportContent = generateCodeAnalysisReport({ 
          name: analysis.name, 
          description: analysis.description || undefined, 
          createdAt: analysis.createdAt,
          analysisData 
        });
        break;
      case "plan":
        reportContent = generatePlanAnalysisReport({ 
          name: analysis.name, 
          description: analysis.description || undefined, 
          createdAt: analysis.createdAt,
          analysisData 
        });
        break;
      case "ml":
        reportContent = generateMLAnalysisReport({ 
          name: analysis.name, 
          description: analysis.description || undefined, 
          createdAt: analysis.createdAt,
          analysisData 
        });
        break;
      case "combined":
      default:
        reportContent = generateCombinedReport({ 
          name: analysis.name, 
          description: analysis.description || undefined, 
          createdAt: analysis.createdAt,
          analysisData 
        });
        break;
    }

    // Build full HTML document
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${analysis.name} - Analysis Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #ffffff;
      padding: 40px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1f2937;
      font-size: 28px;
      margin-bottom: 8px;
    }
    .header .meta {
      color: #6b7280;
      font-size: 14px;
    }
    .header .description {
      margin-top: 12px;
      color: #374151;
      font-style: italic;
    }
    .section {
      margin-bottom: 40px;
    }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin: 20px 0;
    }
    .card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }
    .card-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .card-value {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      margin: 4px 0;
    }
    .card-sublabel {
      font-size: 11px;
      color: #9ca3af;
    }
    .charts-row {
      display: flex;
      flex-wrap: wrap;
      gap: 30px;
      margin: 20px 0;
    }
    table {
      background: #ffffff;
    }
    th {
      font-weight: 600;
      color: #374151;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
    }
    @media print {
      body { padding: 20px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${analysis.name}</h1>
    <div class="meta">
      <span>Analysis Type: <strong>${analysis.analysisType.charAt(0).toUpperCase() + analysis.analysisType.slice(1)}</strong></span>
      &nbsp;|&nbsp;
      <span>Generated: ${new Date(analysis.createdAt).toLocaleString()}</span>
      ${analysis.changeRequestId ? `&nbsp;|&nbsp;<span>CR: <strong>${analysis.changeRequestId}</strong></span>` : ""}
      ${analysis.repoUrl ? `&nbsp;|&nbsp;<span>Repo: <strong>${analysis.repoUrl}</strong></span>` : ""}
    </div>
    ${analysis.description ? `<p class="description">${analysis.description}</p>` : ""}
  </div>
  
  ${reportContent}
  
  <div class="footer">
    <p>Generated by Change Request Management Dashboard</p>
    <p>Report created on ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
    `;

    const headers: Record<string, string> = {
      "Content-Type": "text/html",
    };
    
    // Only add Content-Disposition for downloads, not previews
    if (isDownload) {
      headers["Content-Disposition"] = `attachment; filename="${analysis.name.replace(/[^a-zA-Z0-9]/g, "_")}_report.html"`;
    }
    
    return new NextResponse(html, { headers });
  } catch (error) {
    console.error("Error generating HTML report:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
