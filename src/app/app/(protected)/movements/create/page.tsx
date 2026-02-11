"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

type MovementType =
  | "BENEFIT"
  | "ESSENTIAL_EXPENSE"
  | "NOT_ESSENTIAL_EXPENSE"
  | "INVESTMENT";

type CreateMovementPayload = {
  movementType: MovementType;
  amount: number;
  date: string; // YYYY-MM-DD
  tagId?: number; // optional
  description?: string; // optional
};

type Tag = {
  id: number;
  name: string;
  color: string;
};

function toNumber(v: unknown) {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return 0;
  const n = Number(v.replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

function toOptionalPositiveInt(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? Math.trunc(v) : undefined;
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s) return undefined;
  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;
  const i = Math.trunc(n);
  return i > 0 ? i : undefined;
}

function todayISO() {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const movementTypes: { value: MovementType; label: string }[] = [
  { value: "BENEFIT", label: "Ingreso" },
  { value: "ESSENTIAL_EXPENSE", label: "Gasto esencial" },
  { value: "NOT_ESSENTIAL_EXPENSE", label: "Gasto no esencial" },
  { value: "INVESTMENT", label: "Inversión" },
];

const schema = Yup.object({
  movementType: Yup.mixed<MovementType>()
    .oneOf(["BENEFIT", "ESSENTIAL_EXPENSE", "NOT_ESSENTIAL_EXPENSE", "INVESTMENT"], "Tipo inválido")
    .required("El tipo de movimiento es obligatorio"),

  amount: Yup.number()
    .typeError("Debe ser un número")
    .positive("El importe debe ser mayor que 0")
    .required("El importe es obligatorio"),

  date: Yup.string()
    .required("La fecha es obligatoria")
    .test("past-or-present", "La fecha no puede ser futura", (value) => {
      if (!value) return false;
      return value <= todayISO();
    }),

  // tagId llega como string (por el select). Lo transformamos a number|undefined
  tagId: Yup.number()
    .transform((val, originalVal) => {
      if (originalVal === "" || originalVal === null || originalVal === undefined) return undefined;
      return val;
    })
    .typeError("La etiqueta es inválida")
    .positive("La etiqueta debe ser válida")
    .nullable()
    .notRequired(),

  description: Yup.string()
    .max(255, "La descripción no puede superar los 255 caracteres")
    .required("La descripción es obligatoria"),
});

export default function CreateMovementPage() {
  const router = useRouter();

  const initialValues = useMemo(
    () => ({
      movementType: "ESSENTIAL_EXPENSE" as MovementType,
      amount: "", // string para input
      date: todayISO(),
      tagId: "", // string (select)
      description: "",
    }),
    []
  );

  const [serverMsg, setServerMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // ✅ tags desde backend
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTags() {
      try {
        setTagsLoading(true);
        setTagsError(null);

        const res = await fetch("/api/tags", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error?.message ?? "Error cargando etiquetas");
        }

        if (!cancelled) setTags((json.data ?? []) as Tag[]);
      } catch (e: any) {
        if (!cancelled) setTagsError(e?.message ?? "Error cargando etiquetas");
      } finally {
        if (!cancelled) setTagsLoading(false);
      }
    }

    loadTags();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(values: typeof initialValues) {
    setServerMsg(null);

    const tagIdParsed = toOptionalPositiveInt(values.tagId);

    const payload: CreateMovementPayload = {
      movementType: values.movementType,
      amount: toNumber(values.amount),
      date: values.date,
      ...(tagIdParsed ? { tagId: tagIdParsed } : {}),
      ...(values.description.trim() ? { description: values.description.trim() } : {}),
    };

    const res = await fetch("/api/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || json?.ok === false) {
      throw new Error(json?.error?.message ?? "Error creando el movimiento");
    }

    return json.data;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black text-gray-100 flex items-center justify-center px-6 py-14">
      <div className="w-full max-w-3xl">
        <header className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--brand-title-from)] to-[var(--brand-title-to)]">
            Nuevo movimiento
          </h1>
          <p className="mt-3 text-gray-300">Registra un ingreso, gasto o inversión.</p>
        </header>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl shadow-lg p-6 md:p-8">
          <Formik
            initialValues={initialValues}
            validationSchema={schema}
            onSubmit={async (values, helpers) => {
              try {
                await submit(values);
                helpers.setSubmitting(false);
                router.replace("/app");
                router.refresh();
              } catch (e: any) {
                setServerMsg({
                  type: "err",
                  text: e?.message ?? "Error creando el movimiento.",
                });
                helpers.setSubmitting(false);
              }
            }}
          >
            {({ isSubmitting, isValid, values }) => (
              <Form className="space-y-8">
                <section>
                  <h2 className="text-xl font-semibold mb-4">Datos del movimiento</h2>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Labeled name="movementType" label="Tipo de movimiento">
                      <Field as="select" name="movementType" className={inputClass}>
                        {movementTypes.map((t) => (
                          <option key={t.value} value={t.value} className="bg-slate-900">
                            {t.label}
                          </option>
                        ))}
                      </Field>
                    </Labeled>

                    <Labeled name="date" label="Fecha">
                      <Field name="date" type="date" max={todayISO()} className={inputClass} />
                    </Labeled>

                    <Labeled name="amount" label="Importe (€)" hint="Debe ser > 0">
                      <Field
                        name="amount"
                        inputMode="decimal"
                        className={inputClass}
                        placeholder="0"
                      />
                    </Labeled>

                    {/* ✅ SELECT de etiquetas */}
                    <Labeled
                      name="tagId"
                      label="Etiqueta (opcional)"
                      hint={tagsLoading ? "Cargando..." : tagsError ? "Error" : `${tags.length} disponibles`}
                    >
                      <Field as="select" name="tagId" className={inputClass} disabled={tagsLoading}>
                        <option value="" className="bg-slate-900">
                          Sin etiqueta
                        </option>

                        {tags.map((t) => (
                          <option key={t.id} value={String(t.id)} className="bg-slate-900">
                            {t.name} ({t.color})
                          </option>
                        ))}
                      </Field>

                      {tagsError ? (
                        <div className="mt-2 text-xs text-amber-200">{tagsError}</div>
                      ) : null}

                      {/* preview color si hay selección */}
                      {toOptionalPositiveInt(values.tagId) ? (
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-300">
                          <span
                            className="h-3 w-3 rounded-full border border-white/20"
                            style={{
                              backgroundColor:
                                tags.find((t) => t.id === toOptionalPositiveInt(values.tagId))?.color ??
                                "transparent",
                            }}
                          />
                          <span>
                            {
                              tags.find((t) => t.id === toOptionalPositiveInt(values.tagId))?.name
                            }
                          </span>
                        </div>
                      ) : null}
                    </Labeled>

                    <div className="md:col-span-2">
                      <Labeled
                        name="description"
                        label="Descripción"
                        hint={`${values.description.length}/255`}
                      >
                        <Field
                          as="textarea"
                          name="description"
                          rows={4}
                          className={inputClass + " resize-none"}
                          placeholder="Añade una nota (máx 255 caracteres)"
                        />
                      </Labeled>
                    </div>
                  </div>
                </section>

                {serverMsg && (
                  <div
                    className={[
                      "rounded-2xl border px-4 py-3 text-sm",
                      serverMsg.type === "ok"
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                        : "border-amber-400/30 bg-amber-500/10 text-amber-100",
                    ].join(" ")}
                  >
                    {serverMsg.text}
                  </div>
                )}

                <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                  <p className="text-xs text-gray-400">El importe debe ser mayor que 0.</p>

                  <button
                    type="submit"
                    disabled={!isValid || isSubmitting}
                    className="px-6 py-3 rounded-full font-semibold text-lg transition shadow-lg
                               bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white
                               disabled:opacity-50 disabled:cursor-not-allowed
                               [--tw-shadow-color:rgb(var(--brand-primary-rgb)/0.30)]"
                  >
                    {isSubmitting ? "Guardando…" : "Crear movimiento"}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-[var(--brand-title-from)]";

function Labeled({
  name,
  label,
  hint,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-medium text-gray-200">{label}</span>
        {hint ? <span className="text-xs text-gray-400">{hint}</span> : null}
      </div>
      {children}
      <ErrorMessage name={name}>
        {(msg) => <div className="mt-2 text-sm text-amber-200">{msg}</div>}
      </ErrorMessage>
    </label>
  );
}
