"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/app/lib/api/errors";
import { normalizeHexColor } from "@/app/lib/color";
import { InlineLoading } from "@/app/components/LoadingUI";
import { ConfirmDialog, Toast } from "@/app/components/FeedbackUI";

type Tag = {
  id: number;
  name: string;
  color: string;
};

const cardClass =
  "surface rounded-[1.75rem]";

export default function TagsPage() {
  const router = useRouter();

  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmTag, setConfirmTag] = useState<{ id: number; name: string } | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  async function loadTags() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/tags", { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error?.message ?? "Error cargando etiquetas");
      }

      setTags((json.data ?? []) as Tag[]);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // La petición externa actualiza el estado cuando termina.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTags();
  }, []);

  async function onDeleteTag(id: number) {
    setMsg(null);
    setDeletingId(id);

    try {
      const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error?.message ?? "Error eliminando etiqueta");
      }

      setTags((prev) => prev.filter((t) => t.id !== id));
      setMsg({ type: "ok", text: "Etiqueta eliminada correctamente." });
    } catch (e: unknown) {
      setMsg({ type: "err", text: getErrorMessage(e, "Error eliminando etiqueta.") });
    } finally {
      setDeletingId(null);
      setConfirmTag(null);
    }
  }

  return (
    <main className="app-shell px-4 py-8 text-gray-100 sm:px-6 lg:px-8 lg:py-12">
      <div className="fade-up mx-auto max-w-6xl space-y-8">
        <header>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--brand-title-from)] to-[var(--brand-title-to)]">
            Etiquetas
          </h1>
          <p className="mt-2 text-gray-300">Lista de etiquetas creadas por el usuario.</p>

          {loading && <p className="mt-2 text-xs"><InlineLoading label="Cargando etiquetas" /></p>}
          {error && <p className="text-xs text-red-300 mt-2">{error}</p>}
          {msg && <Toast message={msg.text} tone={msg.type === "ok" ? "success" : "error"} onClose={() => setMsg(null)} />}
        </header>

        <section className={`${cardClass} overflow-hidden`}>
          <div className="bg-black/20 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-semibold">Listado</p>
              <p className="text-xs text-gray-400">{tags.length} etiquetas</p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/app/tags/create")}
              className="
                px-4 py-2 rounded-full font-semibold text-sm transition shadow-lg
                bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white
                [--tw-shadow-color:rgb(var(--brand-primary-rgb)/0.30)]
              "
            >
              + Nueva etiqueta
            </button>
          </div>

          <table className="min-w-full text-sm">
            <thead className="bg-black/30 text-gray-300">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Nombre</th>
                <th className="text-left px-5 py-3 font-semibold">Color</th>
                <th className="text-right px-5 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {tags.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-white/5 transition cursor-pointer"
                  title="Abrir dashboard de la etiqueta"
                  onClick={() => router.push(`/app/tags/${t.id}`)}
                >
                  <td className="px-5 py-3 font-medium">{t.name}</td>

                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full border border-white/20"
                        style={{ backgroundColor: normalizeHexColor(t.color) ?? "transparent" }}
                      />
                      <span className="text-xs">{t.color}</span>
                    </span>
                  </td>

                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // ✅ evita que navegue al hacer click en Eliminar
                        setConfirmTag({ id: t.id, name: t.name });
                      }}
                      disabled={deletingId === t.id}
                      className="
                        rounded-xl border border-red-400/30 bg-red-500/10 text-red-200
                        px-3 py-2 text-sm hover:bg-red-500/20 transition
                        disabled:opacity-50 disabled:cursor-not-allowed
                      "
                    >
                      {deletingId === t.id ? "Eliminando…" : "Eliminar"}
                    </button>
                  </td>
                </tr>
              ))}

              {!loading && tags.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-gray-400">
                    No hay etiquetas creadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <ConfirmDialog
          open={confirmTag !== null}
          title="¿Eliminar esta etiqueta?"
          description={confirmTag ? `Se eliminará «${confirmTag.name}». Esta acción no se puede deshacer.` : ""}
          loading={confirmTag !== null && deletingId === confirmTag.id}
          onCancel={() => setConfirmTag(null)}
          onConfirm={() => {
            if (confirmTag) void onDeleteTag(confirmTag.id);
          }}
        />
      </div>
    </main>
  );
}
