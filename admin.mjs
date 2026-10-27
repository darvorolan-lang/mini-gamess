import { getStore } from "@netlify/blobs";
import { timingSafeEqual } from "node:crypto";

export const config = { path: "/api/admin" };

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status,
  headers: { "content-type": "application/json", "cache-control": "no-store" }
});

// bandingkan dua teks tanpa membocorkan panjang atau isinya lewat waktu respons
const sama = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Gunakan POST." }, 405);

  // username & password admin diatur di Netlify (Environment variables), bukan di kode
  const ADMIN_USER = process.env.ADMIN_USER, ADMIN_PASS = process.env.ADMIN_PASS;
  if (!ADMIN_USER || !ADMIN_PASS) return json({ error: "Admin belum diatur di Netlify." }, 500);

  let d;
  try { d = await req.json(); } catch (e) { return json({ error: "Data tidak valid." }, 400); }

  const userOk = sama(String(d.user ?? "").trim().toLowerCase(), ADMIN_USER.trim().toLowerCase());
  const passOk = sama(String(d.pw ?? ""), ADMIN_PASS);
  if (!(userOk && passOk)) {
    await new Promise(r => setTimeout(r, 700));   // jeda singkat setiap salah
    return json({ error: "Username atau password salah." }, 401);
  }

  const store = getStore("arcana");
  if (d.aksi === "cek") return json({ ok: true });

  if (d.aksi === "hapus") {
    const id = String(d.id ?? "");
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return json({ error: "ID tidak valid." }, 400);
    await store.delete("pemain/" + id);
    return json({ ok: true });
  }

  if (d.aksi === "reset") {
    // hapus semua skor pemain, lalu naikkan nomor musim: progres pemain ikut dimulai ulang
    const { blobs } = await store.list({ prefix: "pemain/" });
    for (const b of blobs) await store.delete(b.key);
    const m = await store.get("meta/musim", { type: "json" });
    const n = (m ? Number(m.n) || 0 : 0) + 1;
    await store.setJSON("meta/musim", { n, t: Date.now() });
    return json({ ok: true, musim: n, dihapus: blobs.length });
  }

  return json({ error: "Aksi tidak dikenal." }, 400);
};
