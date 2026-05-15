import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Default services to import for new organizations
const DEFAULT_SERVICES = [
  // Infrastructure
  { name: "kubernetes-cluster", displayName: "Kubernetes Cluster", description: "Production Kubernetes cluster", category: "infrastructure", criticality: "mission-critical" },
  { name: "load-balancer", displayName: "Load Balancer", description: "Application load balancer (ALB/NLB)", category: "infrastructure", criticality: "mission-critical" },
  { name: "cdn", displayName: "CDN", description: "Content delivery network", category: "infrastructure", criticality: "business-critical" },
  { name: "dns", displayName: "DNS", description: "Domain name system", category: "infrastructure", criticality: "mission-critical" },
  { name: "vpn", displayName: "VPN", description: "Virtual private network", category: "infrastructure", criticality: "business-critical" },
  
  // Databases
  { name: "postgres-primary", displayName: "PostgreSQL Primary", description: "Primary PostgreSQL database", category: "database", criticality: "mission-critical" },
  { name: "postgres-replica", displayName: "PostgreSQL Replica", description: "Read replica database", category: "database", criticality: "business-critical" },
  { name: "redis-cache", displayName: "Redis Cache", description: "Redis caching layer", category: "database", criticality: "business-critical" },
  { name: "elasticsearch", displayName: "Elasticsearch", description: "Search and analytics engine", category: "database", criticality: "business-critical" },
  
  // Applications
  { name: "api-gateway", displayName: "API Gateway", description: "Main API gateway service", category: "application", criticality: "mission-critical" },
  { name: "auth-service", displayName: "Auth Service", description: "Authentication and authorization service", category: "application", criticality: "mission-critical" },
  { name: "user-service", displayName: "User Service", description: "User management service", category: "application", criticality: "business-critical" },
  { name: "payment-service", displayName: "Payment Service", description: "Payment processing service", category: "application", criticality: "mission-critical" },
  { name: "notification-service", displayName: "Notification Service", description: "Email, SMS, and push notifications", category: "application", criticality: "standard" },
  { name: "web-app", displayName: "Web Application", description: "Main web application frontend", category: "application", criticality: "business-critical" },
  { name: "mobile-api", displayName: "Mobile API", description: "Mobile application backend", category: "application", criticality: "business-critical" },
  
  // Network
  { name: "firewall", displayName: "Firewall", description: "Network firewall rules", category: "network", criticality: "mission-critical" },
  { name: "nat-gateway", displayName: "NAT Gateway", description: "Network address translation", category: "network", criticality: "business-critical" },
  
  // Security
  { name: "secrets-manager", displayName: "Secrets Manager", description: "Secrets and credentials management", category: "security", criticality: "mission-critical" },
  { name: "waf", displayName: "WAF", description: "Web application firewall", category: "security", criticality: "mission-critical" },
  { name: "siem", displayName: "SIEM", description: "Security information and event management", category: "security", criticality: "business-critical" },
  
  // Monitoring
  { name: "prometheus", displayName: "Prometheus", description: "Metrics collection and alerting", category: "other", criticality: "business-critical" },
  { name: "grafana", displayName: "Grafana", description: "Metrics visualization dashboards", category: "other", criticality: "standard" },
  { name: "logging", displayName: "Logging Service", description: "Centralized logging (ELK/Loki)", category: "other", criticality: "business-critical" },
];

// POST /api/admin/services/import-defaults — Import default services for the org
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const roles = session.user?.roles as string[] | undefined;
  const isAdmin = roles?.some(r => r === "admin" || r.startsWith("admin_")) || session.user?.isSuperAdmin;
  
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
  }

  const orgId = session.user?.orgId || "demo";

  try {
    // Check which services already exist for this org
    const existingServices = await prisma.service.findMany({
      where: { orgId },
      select: { name: true },
    });
    const existingNames = new Set(existingServices.map((s: { name: string }) => s.name.toLowerCase()));

    // Filter out services that already exist
    const servicesToCreate = DEFAULT_SERVICES.filter(
      (s) => !existingNames.has(s.name.toLowerCase())
    );

    if (servicesToCreate.length === 0) {
      return NextResponse.json({
        message: "All default services already exist",
        created: 0,
        skipped: DEFAULT_SERVICES.length,
      });
    }

    // Create the services
    const created = await prisma.service.createMany({
      data: servicesToCreate.map((s) => ({
        name: s.name,
        displayName: s.displayName,
        description: s.description,
        category: s.category,
        criticality: s.criticality,
        orgId,
        isActive: true,
        createdBy: session.user?.email || "system",
      })),
    });

    return NextResponse.json({
      message: `Successfully imported ${created.count} default services`,
      created: created.count,
      skipped: DEFAULT_SERVICES.length - servicesToCreate.length,
      services: servicesToCreate.map(s => s.displayName),
    });
  } catch (error) {
    console.error("Error importing default services:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
