/**
 * Database configuration tests.
 *
 * Verify the DATABASE_PROVIDER auto-detection and helpers without
 * actually instantiating a Prisma client (which would attempt
 * connection).
 */

const ORIGINAL = { ...process.env };

beforeEach(() => {
  // Reset env between tests; we re-import the module each time
  // so the auto-detection runs against the current env.
  jest.resetModules();
  process.env = { ...ORIGINAL };
});

afterAll(() => {
  process.env = ORIGINAL;
});

function loadModule() {
  // Mock @prisma/client so importing the file does not connect.
  jest.doMock("@prisma/client", () => ({ PrismaClient: class { } }));
  // crypto module pulls only env vars — fine to use real one.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("../prisma");
}

describe("getDatabaseProvider", () => {
  it("defaults to sqlite when DATABASE_URL starts with file:", () => {
    delete process.env.DATABASE_PROVIDER;
    process.env.DATABASE_URL = "file:./dev.db";
    const m = loadModule();
    expect(m.getDatabaseProvider()).toBe("sqlite");
  });

  it("auto-detects postgresql:// URL", () => {
    delete process.env.DATABASE_PROVIDER;
    process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";
    const m = loadModule();
    expect(m.getDatabaseProvider()).toBe("postgresql");
  });

  it("auto-detects postgres:// URL (short form)", () => {
    delete process.env.DATABASE_PROVIDER;
    process.env.DATABASE_URL = "postgres://user:pass@host/db";
    const m = loadModule();
    expect(m.getDatabaseProvider()).toBe("postgresql");
  });

  it("respects explicit DATABASE_PROVIDER override", () => {
    process.env.DATABASE_PROVIDER = "postgresql";
    process.env.DATABASE_URL = "file:./dev.db"; // mismatched, but explicit wins
    const m = loadModule();
    expect(m.getDatabaseProvider()).toBe("postgresql");
  });
});

describe("isProductionDatabase", () => {
  it("true only for postgresql provider", () => {
    process.env.DATABASE_PROVIDER = "postgresql";
    process.env.DATABASE_URL = "postgresql://x";
    let m = loadModule();
    expect(m.isProductionDatabase()).toBe(true);

    jest.resetModules();
    process.env.DATABASE_PROVIDER = "sqlite";
    process.env.DATABASE_URL = "file:./dev.db";
    m = loadModule();
    expect(m.isProductionDatabase()).toBe(false);
  });
});
