"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

type UserProfile = {
  id: number;
  email: string;
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

// ✅ Para cuadrar con @Past (no vale hoy)
function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatEUR(v: number | null | undefined) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(v);
}

const schema = Yup.object({
  // email NO se actualiza en tu PUT (UpdateUserRequestDto no lo incluye)
  email: Yup.string().email("Email inválido").required("El email es obligatorio"),

  name: Yup.string().max(80, "Máx 80 caracteres").required("El nombre es obligatorio"),
  lastname: Yup.string().max(120, "Máx 120 caracteres").required("Los apellidos son obligatorios"),

  birthdate: Yup.string()
    .required("La fecha de nacimiento es obligatoria")
    .test("past-only", "La fecha debe ser anterior a hoy", (value) => {
      if (!value) return false;
      return value <= yesterdayISO(); // ✅ @Past
    }),

  initialWealth: Yup.number()
    .typeError("Debe ser un número")
    .min(0, "No puede ser negativo")
    .required("El patrimonio inicial es obligatorio"),

  monthlySavingPercentage: Yup.number()
    .typeError("Debe ser un número")
    .min(0, "Mín 0")
    .max(100, "Máx 100")
    .required("Obligatorio"),
  monthlyNecessaryExpensesPercentage: Yup.number()
    .typeError("Debe ser un número")
    .min(0, "Mín 0")
    .max(100, "Máx 100")
    .required("Obligatorio"),
  monthlyDiscretionaryExpensesPercentage: Yup.number()
    .typeError("Debe ser un número")
    .min(0, "Mín 0")
    .max(100, "Máx 100")
    .required("Obligatorio"),
  monthlyInvestmentPercentage: Yup.number()
    .typeError("Debe ser un número")
    .min(0, "Mín 0")
    .max(100, "Máx 100")
    .required("Obligatorio"),
}).test("percentages-sum-100", "La suma de los porcentajes mensuales debe ser 100", (values) => {
  if (!values) return false;

  const s =
    toNumber((values as any).monthlySavingPercentage) +
    toNumber((values as any).monthlyNecessaryExpensesPercentage) +
    toNumber((values as any).monthlyDiscretionaryExpensesPercentage) +
    toNumber((values as any).monthlyInvestmentPercentage);

  return Math.abs(s - 100) < 0.0001;
});

export default function UserProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serverMsg, setServerMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const initialValues = useMemo(
    () => ({
      email: "",
      name: "",
      lastname: "",
      birthdate: "",
      initialWealth: "0",

      monthlySavingPercentage: "0",
      monthlyNecessaryExpensesPercentage: "0",
      monthlyDiscretionaryExpensesPercentage: "0",
      monthlyInvestmentPercentage: "0",
    }),
    []
  );

  const [profile, setProfile] = useState<UserProfile | null>(null);

  // ✅ NUEVO: Patrimonio líquido actual (fuera del form)
  const [liquidWealth, setLiquidWealth] = useState<number | null>(null);
  const [liquidLoading, setLiquidLoading] = useState(false);
  const [liquidError, setLiquidError] = useState<string | null>(null);

  async function fetchLiquidWealth() {
    try {
      setLiquidLoading(true);
      setLiquidError(null);

      const res = await fetch("/api/movements?savings=1", { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error?.message ?? "Error cargando patrimonio líquido");
      }

      const val = json?.data;
      const num = typeof val === "number" ? val : Number(val);
      setLiquidWealth(Number.isFinite(num) ? num : 0);
    } catch (e: any) {
      setLiquidError(e?.message ?? "Error cargando patrimonio líquido");
      setLiquidWealth(null);
    } finally {
      setLiquidLoading(false);
    }
  }

  // ✅ cargar perfil
  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        setLoading(true);
        setLoadError(null);

        const res = await fetch("/api/user", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error?.message ?? "Error cargando el perfil");
        }

        const u = json.data as UserProfile;
        if (!cancelled) setProfile(u);
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message ?? "Error cargando el perfil");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ cargar patrimonio líquido actual (al entrar a la página)
  useEffect(() => {
    fetchLiquidWealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formInitialValues = useMemo(() => {
    if (!profile) return initialValues;

    return {
      email: profile.email ?? "",
      name: profile.name ?? "",
      lastname: profile.lastname ?? "",
      birthdate: profile.birthdate ?? "",
      initialWealth: String(profile.initialWealth ?? 0),

      monthlySavingPercentage: String(profile.monthlySavingPercentage ?? 0),
      monthlyNecessaryExpensesPercentage: String(profile.monthlyNecessaryExpensesPercentage ?? 0),
      monthlyDiscretionaryExpensesPercentage: String(profile.monthlyDiscretionaryExpensesPercentage ?? 0),
      monthlyInvestmentPercentage: String(profile.monthlyInvestmentPercentage ?? 0),
    };
  }, [profile, initialValues]);

  async function submit(values: typeof formInitialValues) {
    setServerMsg(null);

    const payload = {
      name: values.name.trim(),
      lastname: values.lastname.trim(),
      birthdate: values.birthdate, // "yyyy-MM-dd"
      monthlySavingPercentage: toNumber(values.monthlySavingPercentage),
      monthlyNecessaryExpensesPercentage: toNumber(values.monthlyNecessaryExpensesPercentage),
      monthlyDiscretionaryExpensesPercentage: toNumber(values.monthlyDiscretionaryExpensesPercentage),
      monthlyInvestmentPercentage: toNumber(values.monthlyInvestmentPercentage),
    };

    const res = await fetch("/api/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || json?.ok === false) {
      throw new Error(json?.error?.message ?? "Error actualizando el perfil");
    }

    const res2 = await fetch("/api/user", { cache: "no-store" });
    const json2 = await res2.json().catch(() => null);
    if (res2.ok && json2?.ok) setProfile(json2.data as UserProfile);

    return json2?.data as UserProfile;
  }

  const sumPercentages = (v: any) => {
    const s =
      toNumber(v.monthlySavingPercentage) +
      toNumber(v.monthlyNecessaryExpensesPercentage) +
      toNumber(v.monthlyDiscretionaryExpensesPercentage) +
      toNumber(v.monthlyInvestmentPercentage);
    return s;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black text-gray-100 flex items-center justify-center px-6 py-14">
      <div className="w-full max-w-3xl">
        <header className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--brand-title-from)] to-[var(--brand-title-to)]">
            Perfil de usuario
          </h1>
          <p className="mt-3 text-gray-300">Actualiza tus datos personales y tus porcentajes mensuales.</p>
        </header>

        {/* ✅ NUEVO: apartado fuera del form */}
        <div className="mb-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl shadow-lg p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Patrimonio líquido actual</h2>
              <p className="text-sm text-gray-300 mt-1">
                Calculado a partir de tus movimientos (ingresos − gastos).
              </p>
            </div>

            <div className="text-right">
              <div className="text-2xl md:text-3xl font-extrabold">
                {liquidLoading ? "Cargando…" : liquidError ? "—" : formatEUR(liquidWealth)}
              </div>

              <button
                type="button"
                onClick={fetchLiquidWealth}
                disabled={liquidLoading}
                className="mt-2 px-4 py-2 rounded-full text-sm font-semibold transition
                           bg-white/10 hover:bg-white/15 text-gray-100
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {liquidLoading ? "Actualizando…" : "Actualizar"}
              </button>
            </div>
          </div>

          {liquidError && (
            <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {liquidError}
            </div>
          )}
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl shadow-lg p-6 md:p-8">
          {loading ? (
            <div className="text-sm text-gray-300">Cargando perfil…</div>
          ) : loadError ? (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {loadError}
            </div>
          ) : (
            <Formik
              enableReinitialize
              initialValues={formInitialValues}
              validationSchema={schema}
              onSubmit={async (values, helpers) => {
                try {
                  await submit(values);
                  setServerMsg({ type: "ok", text: "Perfil actualizado correctamente." });
                  helpers.setSubmitting(false);
                  router.refresh();
                } catch (e: any) {
                  setServerMsg({ type: "err", text: e?.message ?? "Error actualizando el perfil." });
                  helpers.setSubmitting(false);
                }
              }}
            >
              {({ isSubmitting, isValid, values }) => {
                const s = sumPercentages(values);
                const sumOk = Math.abs(s - 100) < 0.0001;

                return (
                  <Form className="space-y-8">
                    <section>
                      <h2 className="text-xl font-semibold mb-4">Datos personales</h2>

                      <div className="grid md:grid-cols-2 gap-4">
                        <Labeled name="email" label="Email (usuario)" hint="No se actualiza aquí">
                          <Field name="email" type="email" className={inputClass + " opacity-70"} disabled />
                        </Labeled>

                        <Labeled name="birthdate" label="Fecha de nacimiento">
                          <Field name="birthdate" type="date" max={yesterdayISO()} className={inputClass} />
                        </Labeled>

                        <Labeled name="name" label="Nombre">
                          <Field name="name" className={inputClass} placeholder="Nombre" />
                        </Labeled>

                        <Labeled name="lastname" label="Apellidos">
                          <Field name="lastname" className={inputClass} placeholder="Apellidos" />
                        </Labeled>

                        <div className="md:col-span-2">
                          <Labeled name="initialWealth" label="Patrimonio inicial (€)" hint="No editable">
                            <Field
                              name="initialWealth"
                              inputMode="decimal"
                              className={inputClass + " opacity-70"}
                              disabled
                            />
                          </Labeled>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h2 className="text-xl font-semibold mb-2">Distribución mensual</h2>
                      <p className="text-sm text-gray-300 mb-4">
                        Define el reparto de tu ahorro/gastos/inversión (suma total 100%).
                      </p>

                      <div className="grid md:grid-cols-2 gap-4">
                        <Labeled name="monthlySavingPercentage" label="Ahorro (%)">
                          <Field name="monthlySavingPercentage" inputMode="decimal" className={inputClass} placeholder="0" />
                        </Labeled>

                        <Labeled name="monthlyNecessaryExpensesPercentage" label="Gastos necesarios (%)">
                          <Field
                            name="monthlyNecessaryExpensesPercentage"
                            inputMode="decimal"
                            className={inputClass}
                            placeholder="0"
                          />
                        </Labeled>

                        <Labeled name="monthlyDiscretionaryExpensesPercentage" label="Gastos discrecionales (%)">
                          <Field
                            name="monthlyDiscretionaryExpensesPercentage"
                            inputMode="decimal"
                            className={inputClass}
                            placeholder="0"
                          />
                        </Labeled>

                        <Labeled name="monthlyInvestmentPercentage" label="Inversión (%)">
                          <Field name="monthlyInvestmentPercentage" inputMode="decimal" className={inputClass} placeholder="0" />
                        </Labeled>
                      </div>

                      <div className="mt-4 text-xs text-gray-400">
                        Suma actual:{" "}
                        <span className="font-semibold text-gray-200">
                          {Number.isFinite(s) ? s : 0}%
                        </span>
                      </div>

                      {!sumOk && (
                        <div className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                          La suma debe ser exactamente 100% para poder actualizar.
                        </div>
                      )}
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
                      <p className="text-xs text-gray-400">
                        Revisa que los porcentajes sumen 100% antes de actualizar.
                      </p>

                      <button
                        type="submit"
                        disabled={!isValid || !sumOk || isSubmitting}
                        className="px-6 py-3 rounded-full font-semibold text-lg transition shadow-lg
                                   bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white
                                   disabled:opacity-50 disabled:cursor-not-allowed
                                   [--tw-shadow-color:rgb(var(--brand-primary-rgb)/0.30)]"
                      >
                        {isSubmitting ? "Actualizando…" : "Actualizar perfil"}
                      </button>
                    </div>
                  </Form>
                );
              }}
            </Formik>
          )}
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
