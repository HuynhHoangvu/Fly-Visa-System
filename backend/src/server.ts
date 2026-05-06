// ─── STEP 0: Proof-of-life — logged before any import side-effects ───────────
console.log("[server] process started — Node", process.version, "pid", process.pid);
console.log("[server] cwd:", process.cwd());
console.log("[server] NODE_ENV:", process.env.NODE_ENV ?? "(not set)");
console.log("[server] PORT env:", process.env.PORT ?? "(not set)");
console.log("[server] DATABASE_URL set:", Boolean(process.env.DATABASE_URL));

// ─── Catch unhandled rejections & exceptions so they always surface ──────────
process.on("uncaughtException", (err) => {
  console.error("[server] UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("[server] UNHANDLED REJECTION:", reason);
  process.exit(1);
});

async function bootstrap() {
  try {
    // ── STEP 1: imports ────────────────────────────────────────────────────
    console.log("[server] step 1 — importing modules...");
    const http = (await import("http")).default;
    console.log("[server] step 1a — http imported");

    const { default: app } = await import("./app.js");
    console.log("[server] step 1b — app imported");

    const { initSocket } = await import("./socket.js");
    console.log("[server] step 1c — socket imported");

    const { scheduleAttendanceJobs } = await import("./jobs/attendance.job.js");
    console.log("[server] step 1d — attendance job imported");

    const { PORT } = await import("../config/env.js");
    console.log("[server] step 1e — env imported, PORT =", PORT);

    // ── STEP 2: create HTTP server ─────────────────────────────────────────
    console.log("[server] step 2 — creating HTTP server...");
    const server = http.createServer(app);
    /** Allow long multipart uploads (Node default request timeout can drop large/slow requests). */
    server.requestTimeout = 0;
    server.headersTimeout = 120_000;
    console.log("[server] step 2 — HTTP server created");

    // ── STEP 3: init Socket.IO ─────────────────────────────────────────────
    console.log("[server] step 3 — initialising Socket.IO...");
    const io = initSocket(server);
    console.log("[server] step 3 — Socket.IO initialised");

    // ── STEP 4: schedule cron jobs ─────────────────────────────────────────
    console.log("[server] step 4 — scheduling attendance jobs...");
    scheduleAttendanceJobs();
    console.log("[server] step 4 — attendance jobs scheduled");

    // ── STEP 5: wire socket connection handler ─────────────────────────────
    io.on("connection", (socket) => {
      console.log("⚡ Một client vừa kết nối:", socket.id);
    });

    // ── STEP 6: start listening ────────────────────────────────────────────
    const port = Number(PORT);
    console.log(`[server] step 6 — calling server.listen on port ${port}...`);
    server.listen(port, "0.0.0.0", () => {
      console.log(`🚀 Backend CRM Real-time đang chạy tại port: ${PORT}`);
      console.log("[server] ready — listening on 0.0.0.0:" + port);
    });

    server.on("error", (err) => {
      console.error("[server] server 'error' event:", err);
      process.exit(1);
    });

  } catch (err) {
    console.error("[server] BOOTSTRAP FAILED:", err);
    process.exit(1);
  }
}

bootstrap();
