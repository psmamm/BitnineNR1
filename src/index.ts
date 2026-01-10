import { Hono } from "hono";
import { cors } from "hono/cors";

interface Bindings {
  DB: {
    prepare: (statement: string) => {
      bind: (...args: unknown[]) => {
        run: () => Promise<{ success: boolean; meta?: { last_row_id?: number } }>;
        first: <T = unknown>() => Promise<T | null>;
        all: <T = unknown>() => Promise<{ results: T[] }>;
      };
    };
  };
  HUME_API_KEY: string;
  HUME_SECRET_KEY: string;
}


const app = new Hono<{ Bindings: Bindings }>();

// Middleware: CORS für alle Routen aktivieren
app.use("*", cors());

// Route 1: User Sync (POST /api/auth/sync)
// Erwartet Body: { uid: string; email: string }
app.post("/api/auth/sync", async (c) => {
  try {
    const { uid, email } = await c.req.json<{ uid: string; email: string }>();

    if (!uid || !email) {
      return c.json({ error: "Missing uid or email" }, 400);
    }

    const createdAt = Math.floor(Date.now() / 1000); // UNIX-Timestamp
    const settings = JSON.stringify({}); // default leeres Settings-Objekt

    await c.env.DB.prepare(
      `
        INSERT OR IGNORE INTO users (id, email, created_at, settings)
        VALUES (?, ?, ?, ?)
      `,
    )
      .bind(uid, email, createdAt, settings)
      .run();

    return c.json({ success: true, message: "User synced successfully" });
  } catch (error) {
    console.error("Error in /api/auth/sync:", error);
    return c.json({ error: "Database or parsing error" }, 500);
  }
});

// Route 2: Jarvis Token (GET /api/hume/token)
// Holt ein Access-Token von der Hume API
app.get("/api/hume/token", async (c) => {
  const { HUME_API_KEY, HUME_SECRET_KEY } = c.env;

  if (!HUME_API_KEY || !HUME_SECRET_KEY) {
    return c.json(
      { error: "Missing Hume API credentials in environment bindings" },
      500,
    );
  }

  // Hinweis: Prüfe in der aktuellen Hume-Dokumentation, ob dies der korrekte Endpoint ist.
  // Für jetzt nutzen wir einen Platzhalter-Endpoint.
  const HUME_AUTH_URL = "https://api.hume.ai/v0/evi/configs";

  try {
    const basicAuth = btoa(`${HUME_API_KEY}:${HUME_SECRET_KEY}`);

    const response = await fetch(HUME_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(
        "Hume API error response:",
        response.status,
        text.slice(0, 200),
      );
      return c.json(
        {
          error: "Hume API error",
          status: response.status,
        },
        502,
      );
    }

    const data: { accessToken?: string; token?: string; jwt?: string; access_token?: string } = await response.json() as { accessToken?: string; token?: string; jwt?: string; access_token?: string };
    const accessToken =
      data.accessToken ?? data.token ?? data.jwt ?? data.access_token ?? null;

    if (!accessToken) {
      console.error("Hume response missing access token field", data);
      return c.json(
        {
          error: "Hume response did not contain an access token",
        },
        502,
      );
    }

    return c.json({ accessToken });
  } catch (error) {
    console.error("Error calling Hume API:", error);
    return c.json(
      {
        error: "Failed to fetch token from Hume API",
      },
      502,
    );
  }
});

export default app;

