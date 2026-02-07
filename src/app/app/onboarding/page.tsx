"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

type OnboardingPayload = {
  email: string; // username en back
  name: string;
  lastname: string;
  birthdate: string; // YYYY-MM-DD
  initialWealth: number;
  monthlySavingPercentage: number;
  monthlyNecessaryExpensesPercentage: number;
  monthlyDiscretionaryExpensesPercentage: number;
  monthlyInvestmentPercentage: number;
};

function toNumber(v: unknown) {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return 0;
  const n = Number(v.replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

const schema = Yup.object({
  email: Yup.string().email("Email inválido").required("Obligatorio"),
  name: Yup.string().min(2, "Muy corto").required("Obligatorio"),
  lastname: Yup.string().min(2, "Muy corto").required("Obligatorio"),
  birthdate: Yup.string().required("Obligatorio"),
  initialWealth: Yup.number()
    .typeError("Debe ser un número")
    .min(0, "No puede ser negativo")
    .required("Obligatorio"),

  monthlySavingPercentage: Yup.number().typeError("Debe ser un número").min(0).max(100).required(),
  monthlyNecessaryExpensesPercentage: Yup.number().typeError("Debe ser un número").min(0).max(100).required(),
  monthlyDiscretionaryExpensesPercentage: Yup.number().typeError("Debe ser un número").min(0).max(100).required(),
  monthlyInvestmentPercentage: Yup.number().typeError("Debe ser un número").min(0).max(100).required(),
}).test("sum-100", "La suma de porcentajes debe ser 100%", (values) => {
  if (!values) return false;
  const sum =
    toNumber((values as any).monthlySavingPercentage) +
    toNumber((values as any).monthlyNecessaryExpensesPercentage) +
    toNumber((values as any).monthlyDiscretionaryExpensesPercentage) +
    toNumber((values as any).monthlyInvestmentPercentage);
  return Math.round(sum * 100) / 100 === 100;
});

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // si quieres forzar que usuarios ya onboarded no entren aquí, lo harás con una llamada al back
    // o una flag en sesión; de momento no redirigimos.
  }, []);

  const sessionEmail = (session as any)?.user?.email ?? "";

  const initialValues = useMemo(
    () => ({
      email: sessionEmail || "",
      name: "",
      lastname: "",
      birthdate: "",
      initialWealth: 0,

      monthlySavingPercentage: 20,
      monthlyNecessaryExpensesPercentage: 50,
      monthlyDiscretionaryExpensesPercentage: 20,
      monthlyInvestmentPercentage: 10,
    }),
    [sessionEmail]
  );

  const [serverMsg, setServerMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function submit(values: typeof initialValues) {
  setServerMsg(null);

  const payload: OnboardingPayload = {
    email: values.email.trim(),
    name: values.name.trim(),
    lastname: values.lastname.trim(),
    birthdate: values.birthdate,
    initialWealth: Number(values.initialWealth),
    monthlySavingPercentage: Number(values.monthlySavingPercentage),
    monthlyNecessaryExpensesPercentage: Number(values.monthlyNecessaryExpensesPercentage),
    monthlyDiscretionaryExpensesPercentage: Number(values.monthlyDiscretionaryExpensesPercentage),
    monthlyInvestmentPercentage: Number(values.monthlyInvestmentPercentage),
  };

  const res = await fetch("/api/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // 👇 AQUÍ está la clave
  const json = await res.json();

  // ❌ Error controlado desde el BFF
  if (!res.ok || json.ok === false) {
    throw new Error(json?.error?.message ?? "Error enviando el onboarding");
  }

  // ✅ Todo OK
  return json.data;
}

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black text-gray-100 flex items-center justify-center px-6 py-14">
      <div className="w-full max-w-3xl">
        <header className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--brand-title-from)] to-[var(--brand-title-to)]">
            Onboarding
          </h1>
          <p className="mt-3 text-gray-300">
            Completa tu perfil y define tu distribución mensual.
          </p>
        </header>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl shadow-lg p-6 md:p-8">
          <Formik
            enableReinitialize
            initialValues={initialValues}
            validationSchema={schema}
            onSubmit={async (values, helpers) => {
              try {
                await submit(values);

                helpers.setSubmitting(false);

                // ✅ Redirect cuando TODO ha ido bien
                router.replace("/app");
              } catch (e: any) {
                setServerMsg({
                  type: "err",
                  text: e?.message ?? "Error enviando el onboarding.",
                });
                helpers.setSubmitting(false);
              }
            }}
          >

            {({ isSubmitting, values, isValid, submitCount }) => {
              const sum =
                Number(values.monthlySavingPercentage) +
                Number(values.monthlyNecessaryExpensesPercentage) +
                Number(values.monthlyDiscretionaryExpensesPercentage) +
                Number(values.monthlyInvestmentPercentage);

              const showSumWarning = (submitCount > 0 || sum !== 100) && sum !== 100;

              return (
                <Form className="space-y-8">
                  {/* Datos personales */}
                  <section>
                    <h2 className="text-xl font-semibold mb-4">Datos personales</h2>

                    <div className="grid md:grid-cols-2 gap-4">
                      <Labeled name="email" label="Email (username)" hint="Debe ser único">
                        <Field
                          name="email"
                          type="email"
                          autoComplete="email"
                          disabled={status === "authenticated" && !!sessionEmail}
                          className={inputClass}
                          placeholder="tu@email.com"
                        />
                      </Labeled>

                      <Labeled name="birthdate" label="Fecha de nacimiento">
                        <Field name="birthdate" type="date" className={inputClass} />
                      </Labeled>

                      <Labeled name="name" label="Nombre">
                        <Field name="name" className={inputClass} placeholder="Pepito" />
                      </Labeled>

                      <Labeled name="lastname" label="Apellidos">
                        <Field name="lastname" className={inputClass} placeholder="Gómez Ruiz" />
                      </Labeled>
                    </div>
                  </section>

                  {/* Finanzas */}
                  <section>
                    <h2 className="text-xl font-semibold mb-4">Finanzas</h2>

                    <div className="grid md:grid-cols-2 gap-4">
                      <Labeled name="initialWealth" label="Patrimonio inicial (€)" hint="Ej. 12000">
                        <Field
                          name="initialWealth"
                          inputMode="decimal"
                          className={inputClass}
                          placeholder="0"
                        />
                      </Labeled>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">Distribución mensual</p>
                          <p className={`text-sm ${sum === 100 ? "text-emerald-300" : "text-amber-300"}`}>
                            Total: {sum}%
                          </p>
                        </div>
                        <p className="text-sm text-gray-300 mt-1">
                          Debe sumar <span className="font-semibold">100%</span>.
                        </p>
                        {showSumWarning ? (
                          <p className="text-sm text-amber-200 mt-2">
                            Ajusta los valores hasta llegar a 100%.
                          </p>
                        ) : null}
                      </div>

                      <Percent name="monthlySavingPercentage" label="Ahorro (%)" />
                      <Percent name="monthlyNecessaryExpensesPercentage" label="Gastos necesarios (%)" />
                      <Percent
                        name="monthlyDiscretionaryExpensesPercentage"
                        label="Gastos discrecionales (%)"
                      />
                      <Percent name="monthlyInvestmentPercentage" label="Inversión (%)" />
                    </div>

                    {/* error global de suma */}
                    <div className="mt-3">
                      <ErrorMessage
                        name="__sum__"
                        render={() => null}
                      />
                      {/* El test de Yup no está atado a un campo, así que mostramos el error de forma global */}
                      <ErrorMessage
                        name="sum-100"
                        render={() => null}
                      />
                    </div>
                  </section>

                  {/* Feedback servidor */}
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

                  {/* Acciones */}
                  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    <p className="text-xs text-gray-400">
                      Podrás cambiar estos porcentajes más adelante desde Configuración.
                    </p>

                    <button
                      type="submit"
                      disabled={!isValid || isSubmitting}
                      className="px-6 py-3 rounded-full font-semibold text-lg transition shadow-lg
                                 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white
                                 disabled:opacity-50 disabled:cursor-not-allowed
                                 [--tw-shadow-color:rgb(var(--brand-primary-rgb)/0.30)]"
                    >
                      {isSubmitting ? "Guardando…" : "Continuar"}
                    </button>
                  </div>

                  {/* Errores globales (si intentan enviar) */}
                  <GlobalErrors show={submitCount > 0} />
                </Form>
              );
            }}
          </Formik>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Tip: si no sabes qué poner, empieza con 50/20/20/10 y ajusta después.
        </p>
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

function Percent({ name, label }: { name: string; label: string }) {
  return (
    <Labeled name={name} label={label}>
      <div className="flex items-center gap-3">
        <Field name={name} inputMode="decimal" className={inputClass} placeholder="0" />
        <span className="text-sm text-gray-300 w-10 text-right">%</span>
      </div>
    </Labeled>
  );
}

function GlobalErrors({ show }: { show: boolean }) {
  if (!show) return null;
  // Con Formik/Yup, los errores ya salen debajo de cada input.
  // Este bloque puede usarse si quieres mostrar un resumen general (opcional).
  return null;
}
