"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

type CreateTagPayload = {
  name: string;
  color: string;
};

const schema = Yup.object({
  name: Yup.string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(40, "El nombre no puede superar los 40 caracteres")
    .required("El nombre es obligatorio"),

  color: Yup.string()
    .required("El color es obligatorio")
    .matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color inválido"),
});

export default function CreateTagPage() {
  const router = useRouter();

  const initialValues = useMemo(
    () => ({
      name: "",
      color: "#22C55E",
    }),
    []
  );

  const [serverMsg, setServerMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function submit(values: typeof initialValues) {
    setServerMsg(null);

    const payload: CreateTagPayload = {
      name: values.name.trim(),
      color: values.color,
    };

    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || json?.ok === false) {
      throw new Error(json?.error?.message ?? "Error creando la etiqueta");
    }

    return json.data;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black text-gray-100 flex items-center justify-center px-6 py-14">
      <div className="w-full max-w-3xl">
        <header className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--brand-title-from)] to-[var(--brand-title-to)]">
            Nueva etiqueta
          </h1>
          <p className="mt-3 text-gray-300">Crea una etiqueta con nombre y color.</p>
        </header>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl shadow-lg p-6 md:p-8">
          <Formik
            initialValues={initialValues}
            validationSchema={schema}
            onSubmit={async (values, helpers) => {
              try {
                await submit(values);
                helpers.setSubmitting(false);

                router.replace("/app/tags");
                router.refresh();
              } catch (e: any) {
                setServerMsg({
                  type: "err",
                  text: e?.message ?? "Error creando la etiqueta.",
                });
                helpers.setSubmitting(false);
              }
            }}
          >
            {({ isSubmitting, isValid, values }) => (
              <Form className="space-y-8">
                <section>
                  <h2 className="text-xl font-semibold mb-4">Datos de la etiqueta</h2>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Labeled name="name" label="Nombre" hint={`${values.name.trim().length}/40`}>
                      <Field
                        name="name"
                        className={inputClass}
                        placeholder="Ej. Supermercado"
                        autoComplete="off"
                      />
                    </Labeled>

                    <Labeled name="color" label="Color">
                      <div className="flex items-center gap-3">
                        <Field
                          name="color"
                          type="color"
                          className={inputClass + " !p-2 h-[52px]"}
                          style={{ padding: 6 }}
                        />
                        <div className="flex-1">
                          <div className="text-xs text-gray-400">Hex</div>
                          <div className="font-semibold text-gray-200">{values.color}</div>
                        </div>
                      </div>
                    </Labeled>
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
                  <button
                    type="button"
                    onClick={() => router.push("/app/tags")}
                    className="px-6 py-3 rounded-full font-semibold text-lg transition
                               border border-white/10 bg-black/20 text-gray-200 hover:bg-black/30"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={!isValid || isSubmitting}
                    className="px-6 py-3 rounded-full font-semibold text-lg transition shadow-lg
                               bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white
                               disabled:opacity-50 disabled:cursor-not-allowed
                               [--tw-shadow-color:rgb(var(--brand-primary-rgb)/0.30)]"
                  >
                    {isSubmitting ? "Guardando…" : "Crear etiqueta"}
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
