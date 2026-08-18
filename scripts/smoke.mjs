const BASE = process.env.SMOKE_BASE ?? "http://127.0.0.1:3000";
const CAMPAIGN = "fundo-amparo-casa-da-mulher";
const INSTITUTION = "casa-da-mulher";
const origin = BASE;
const results = [];
let cookie = "";

function saveCookies(res) {
  const raw =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [];
  const lumen = raw.find((item) => item.startsWith("lumen_session="));
  if (lumen) {
    cookie = lumen.split(";")[0] ?? "";
  }
}

async function req(path, init = {}) {
  const headers = { ...(init.headers ?? {}) };
  if (cookie) {
    headers.cookie = cookie;
  }
  return fetch(BASE + path, { ...init, headers, redirect: "manual" });
}

async function check(name, fn) {
  try {
    const result = await fn();
    results.push({
      name,
      pass: Boolean(result.pass),
      status: result.status ?? null,
      detail: result.detail ?? "",
    });
  } catch (error) {
    results.push({ name, pass: false, status: null, detail: String(error) });
  }
}

await check("GET / home 200 + CSP", async () => {
  const res = await req("/");
  const csp = res.headers.get("content-security-policy") ?? "";
  const html = await res.text();
  return {
    status: res.status,
    pass:
      res.status === 200 &&
      html.includes("Lúmen") &&
      csp.includes("script-src 'self'") &&
      !csp.includes("unsafe-inline") &&
      res.headers.get("x-frame-options") === "DENY",
    detail: `cspNonce=${csp.includes("nonce-")} nosniff=${res.headers.get("x-content-type-options")}`,
  };
});

await check("GET /transparencia 200", async () => {
  const res = await req("/transparencia");
  const html = await res.text();
  return {
    status: res.status,
    pass: res.status === 200 && html.includes("Trilha"),
    detail: html.includes("Trilha") ? "trilha ok" : "html",
  };
});

await check("GET /instituicao redirects unauthenticated", async () => {
  const res = await req("/instituicao");
  const loc = res.headers.get("location") ?? "";
  return {
    status: res.status,
    pass:
      (res.status === 307 || res.status === 308 || res.status === 302) &&
      loc.includes("acesso=instituicao"),
    detail: loc,
  };
});

await check("GET /api/auth/session is null", async () => {
  const res = await req("/api/auth/session");
  const body = await res.json();
  return {
    status: res.status,
    pass: res.status === 200 && body.ok === true && body.value === null,
    detail: JSON.stringify(body),
  };
});

await check("GET transparency paginated", async () => {
  const res = await req(
    `/api/ledger/transparency?campaignId=${CAMPAIGN}&page=1&pageSize=3`,
  );
  const body = await res.json();
  const value = body.value ?? {};
  return {
    status: res.status,
    pass:
      res.status === 200 &&
      body.ok &&
      Array.isArray(value.movements) &&
      value.movements.length === 3 &&
      value.page?.hasMore === true &&
      typeof value.metrics?.raisedCents === "number" &&
      value.metrics.raisedCents >= 1_845_000,
    detail: `movements=${value.movements?.length} total=${value.page?.total} raised=${value.metrics?.raisedCents}`,
  };
});

await check("GET transparency missing campaignId", async () => {
  const res = await req("/api/ledger/transparency");
  const body = await res.json();
  return {
    status: res.status,
    pass:
      res.status === 400 &&
      body.ok === false &&
      body.error?.code === "INVALID_INPUT",
    detail: body.error?.code,
  };
});

await check("POST login without Origin is 403", async () => {
  const res = await req("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method: "email", role: "donor" }),
  });
  const body = await res.json().catch(() => ({}));
  return {
    status: res.status,
    pass: res.status === 403 && body.error?.code === "AUTH_FORBIDDEN",
    detail: body.error?.code,
  };
});

await check("POST donations without Origin is 403", async () => {
  const res = await req("/api/ledger/donations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  const body = await res.json().catch(() => ({}));
  return {
    status: res.status,
    pass: res.status === 403,
    detail: body.error?.code,
  };
});

await check("GET dashboard without cookie is 401", async () => {
  const res = await req(`/api/ledger/dashboard?institutionId=${INSTITUTION}`);
  const body = await res.json();
  return {
    status: res.status,
    pass: res.status === 401 && body.error?.code === "AUTH_UNAUTHENTICATED",
    detail: body.error?.code,
  };
});

await check("GET recibo without sig is invalid", async () => {
  const res = await req(
    "/comprovantes/recibo?numero=NF-1&emitente=Teste&valor=1000&data=2026-08-18",
  );
  const html = await res.text();
  return {
    status: res.status,
    pass: res.status === 200 && html.includes("Recibo inválido"),
    detail: "unsigned rejected",
  };
});

await check("POST login donor with Origin", async () => {
  const res = await req("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ method: "email", role: "donor" }),
  });
  saveCookies(res);
  const body = await res.json();
  return {
    status: res.status,
    pass:
      res.status === 200 &&
      body.ok &&
      body.value?.role === "donor" &&
      cookie.startsWith("lumen_session="),
    detail: `role=${body.value?.role} cookie=${Boolean(cookie)}`,
  };
});

await check("POST donation as donor", async () => {
  const sessionRes = await req("/api/auth/session");
  const sessionBody = await sessionRes.json();
  const res = await req("/api/ledger/donations", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({
      campaignId: CAMPAIGN,
      amountCents: 1000,
      session: sessionBody.value,
    }),
  });
  const body = await res.json();
  return {
    status: res.status,
    pass:
      res.status === 200 &&
      body.ok &&
      body.value?.donation?.amount?.amountCents === 1000,
    detail: body.ok
      ? `sig=${Boolean(body.value.donation.txSignature)}`
      : body.error?.code,
  };
});

await check("donor cannot read dashboard", async () => {
  const res = await req(`/api/ledger/dashboard?institutionId=${INSTITUTION}`);
  const body = await res.json();
  return {
    status: res.status,
    pass: res.status === 403 && body.error?.code === "AUTH_FORBIDDEN",
    detail: body.error?.code,
  };
});

await check("POST login institution", async () => {
  cookie = "";
  const res = await req("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ method: "email", role: "institution" }),
  });
  saveCookies(res);
  const body = await res.json();
  return {
    status: res.status,
    pass:
      res.status === 200 &&
      body.value?.role === "institution" &&
      cookie.startsWith("lumen_session="),
    detail: body.value?.userId,
  };
});

await check("GET /instituicao as institution 200", async () => {
  const res = await req("/instituicao");
  const html = await res.text();
  return {
    status: res.status,
    pass:
      res.status === 200 &&
      (html.includes("Institui") ||
        html.includes("Casa da Mulher") ||
        html.includes("Lúmen")),
    detail: `len=${html.length}`,
  };
});

await check("GET dashboard as institution", async () => {
  const res = await req(`/api/ledger/dashboard?institutionId=${INSTITUTION}`);
  const body = await res.json();
  const value = body.value ?? {};
  return {
    status: res.status,
    pass:
      res.status === 200 &&
      body.ok &&
      typeof value.balance?.availableBrlCents === "number" &&
      Array.isArray(value.pendingOutflows),
    detail: `available=${value.balance?.availableBrlCents} pending=${value.pendingOutflows?.length}`,
  };
});

await check("POST logout", async () => {
  const res = await req("/api/auth/logout", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: "{}",
  });
  const body = await res.json();
  return {
    status: res.status,
    pass: res.status === 200 && body.ok === true,
    detail: JSON.stringify(body.value),
  };
});

const failed = results.filter((item) => !item.pass);
console.log(
  JSON.stringify(
    {
      base: BASE,
      total: results.length,
      passed: results.filter((item) => item.pass).length,
      failed: failed.length,
      results,
    },
    null,
    2,
  ),
);

if (failed.length) {
  console.error(`Smoke failed: ${failed.length}/${results.length}`);
  process.exit(1);
}

console.error(`Smoke passed: ${results.length}/${results.length} against ${BASE}`);
