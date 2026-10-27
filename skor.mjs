import { getStore } from "@netlify/blobs";

export const config = { path: "/api/skor" };

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status,
  headers: { "content-type": "application/json", "cache-control": "no-store" }
});
// buang karakter berbahaya dan batasi panjang teks
const teksAman = (s, maks) => String(s ?? "").replace(/[<>&"'`\u0000-\u001f]/g, "").trim().slice(0, maks);
// paksa angka berada dalam rentang yang wajar
const angka = (v, min, maks) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(maks, Math.max(min, n)) : min;
};

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Gunakan POST." }, 405);
  let data;
  try { data = await req.json(); } catch (e) { return json({ error: "Data tidak valid." }, 400); }

  const id = teksAman(data.id, 64);
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return json({ error: "ID pemain tidak valid." }, 400);

  const store = getStore("arcana");
  await store.setJSON("pemain/" + id, {
    nama: teksAman(data.nama, 16) || "Pahlawan",
    power: angka(data.power, 0, 10000000),
    lv: angka(data.lv, 1, 9999),
    kill: angka(data.kill, 0, 1000000),
    t: Date.now()
  });
  const m = await store.get("meta/musim", { type: "json" });
  return json({ ok: true, musim: m ? Number(m.n) || 0 : 0 });
};
