"use client";

import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

type ViewMode = "monthly" | "yearly" | "historic";

type MovementType =
  | "beneficio"
  | "gasto_necesario"
  | "gasto_innecesario"
  | "inversion";

type Movement = {
  id: string;
  weekday: string;
  date: string; // YYYY-MM-DD
  description: string;
  tag: string;
  type: MovementType;
  amount: number; // + ingreso, - gasto, o como lo manejes; aquí lo mostramos tal cual
};

const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const typeLabel: Record<MovementType, string> = {
  beneficio: "Beneficio",
  gasto_necesario: "Gasto necesario",
  gasto_innecesario: "Gasto innecesario",
  inversion: "Inversión",
};

const metricOptions = [
  { key: "beneficios", label: "Beneficios" },
  { key: "gastos_necesarios", label: "Gastos necesarios" },
  { key: "gastos_innecesarios", label: "Gastos innecesarios" },
  { key: "gastos_totales", label: "Gastos totales" },
  { key: "inversion", label: "Inversión" },
  { key: "ahorros", label: "Ahorros" },
] as const;

type MetricKey = (typeof metricOptions)[number]["key"];

const inputClass =
  "w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-[var(--brand-title-from)]";
const cardClass =
  "bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl shadow-lg";

function formatEUR(n: number) {
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} €`;
  }
}

function chipType(type: MovementType) {
  const base =
    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold";
  switch (type) {
    case "beneficio":
      return `${base} border-emerald-400/30 bg-emerald-500/10 text-emerald-200`;
    case "gasto_necesario":
      return `${base} border-sky-400/30 bg-sky-500/10 text-sky-200`;
    case "gasto_innecesario":
      return `${base} border-amber-400/30 bg-amber-500/10 text-amber-100`;
    case "inversion":
      return `${base} border-violet-400/30 bg-violet-500/10 text-violet-200`;
  }
}

function IconButton({
  children,
  onClick,
  title,
  variant = "ghost",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  variant?: "ghost" | "danger";
}) {
  const cls =
    variant === "danger"
      ? "rounded-xl border border-red-400/30 bg-red-500/10 text-red-200 px-3 py-2 text-sm hover:bg-red-500/20 transition"
      : "rounded-xl border border-white/10 bg-black/20 text-gray-200 px-3 py-2 text-sm hover:bg-black/30 transition";
  return (
    <button type="button" className={cls} onClick={onClick} title={title}>
      {children}
    </button>
  );
}

export default function AppDashboardPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11

  const [mode, setMode] = useState<ViewMode>("monthly");

  // Mensual
  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<number>(currentMonth);
  const [showMonthlyChart, setShowMonthlyChart] = useState<boolean>(false);

  // Anual
  const [annualYear, setAnnualYear] = useState<number>(currentYear);
  const [annualMetric, setAnnualMetric] = useState<MetricKey>("beneficios");

  // Histórico
  const [historicMetric, setHistoricMetric] = useState<MetricKey>("beneficios");
  const [historicFromYear, setHistoricFromYear] = useState<number>(currentYear - 4);
  const [historicToYear, setHistoricToYear] = useState<number>(currentYear);

  // Años disponibles (mock)
  const availableYears = useMemo(() => {
    const start = currentYear - 6;
    return Array.from({ length: 8 }, (_, i) => start + i);
  }, [currentYear]);

  // Movimientos (mock: reemplaza por fetch real a tu BFF cuando toque)
  const movements: Movement[] = useMemo(() => {
    const y = year;
    const m = month + 1;
    const pad = (n: number) => String(n).padStart(2, "0");

    return [
      {
        id: "m1",
        weekday: "Lunes",
        date: `${y}-${pad(m)}-03`,
        description: "Nómina",
        tag: "Trabajo",
        type: "beneficio",
        amount: 2400,
      },
      {
        id: "m2",
        weekday: "Martes",
        date: `${y}-${pad(m)}-05`,
        description: "Alquiler",
        tag: "Hogar",
        type: "gasto_necesario",
        amount: -950,
      },
      {
        id: "m3",
        weekday: "Jueves",
        date: `${y}-${pad(m)}-12`,
        description: "Supermercado",
        tag: "Comida",
        type: "gasto_necesario",
        amount: -210.35,
      },
      {
        id: "m4",
        weekday: "Sábado",
        date: `${y}-${pad(m)}-16`,
        description: "Cena",
        tag: "Ocio",
        type: "gasto_innecesario",
        amount: -42.5,
      },
      {
        id: "m5",
        weekday: "Domingo",
        date: `${y}-${pad(m)}-20`,
        description: "ETF / Fondo indexado",
        tag: "Inversión",
        type: "inversion",
        amount: -150,
      },
    ];
  }, [year, month]);

  // Totales reales por tipo (mensual)
  const monthlyRealByType = useMemo(() => {
    const sum: Record<MovementType, number> = {
      beneficio: 0,
      gasto_necesario: 0,
      gasto_innecesario: 0,
      inversion: 0,
    };
    for (const mv of movements) {
      sum[mv.type] += mv.amount;
    }
    // “Reales” para comparar: interpretamos gasto/inversión como magnitud positiva
    return {
      beneficio: Math.max(0, sum.beneficio),
      gasto_necesario: Math.abs(sum.gasto_necesario),
      gasto_innecesario: Math.abs(sum.gasto_innecesario),
      inversion: Math.abs(sum.inversion),
    };
  }, [movements]);

  // Ideal (mock): normalmente vendría del backend (onboarding)
  const monthlyIdealPercent = useMemo(() => {
    return {
      ahorro: 20,
      gasto_necesario: 50,
      gasto_innecesario: 20,
      inversion: 10,
    };
  }, []);

  const monthlyIncome = monthlyRealByType.beneficio || 1;

  // Transformación para gráfica mensual (ideal vs real por tipo)
  const monthlyChartData = useMemo(() => {
    // Ideal en € (sobre ingresos). Aquí incluimos “ahorro” aunque no sea tipo de movimiento.
    const ideal = {
      gasto_necesario: (monthlyIncome * monthlyIdealPercent.gasto_necesario) / 100,
      gasto_innecesario: (monthlyIncome * monthlyIdealPercent.gasto_innecesario) / 100,
      inversion: (monthlyIncome * monthlyIdealPercent.inversion) / 100,
      ahorro: (monthlyIncome * monthlyIdealPercent.ahorro) / 100,
    };

    // Real en €: de movimientos (no tenemos “ahorro” como movimientos)
    const real = {
      gasto_necesario: monthlyRealByType.gasto_necesario,
      gasto_innecesario: monthlyRealByType.gasto_innecesario,
      inversion: monthlyRealByType.inversion,
      ahorro: Math.max(
        0,
        monthlyIncome -
          (monthlyRealByType.gasto_necesario +
            monthlyRealByType.gasto_innecesario +
            monthlyRealByType.inversion)
      ),
    };

    return [
      { tipo: "Gasto necesario", ideal: ideal.gasto_necesario, real: real.gasto_necesario },
      { tipo: "Gasto innecesario", ideal: ideal.gasto_innecesario, real: real.gasto_innecesario },
      { tipo: "Inversión", ideal: ideal.inversion, real: real.inversion },
      { tipo: "Ahorro", ideal: ideal.ahorro, real: real.ahorro },
    ];
  }, [monthlyIncome, monthlyIdealPercent, monthlyRealByType]);

  // Datos anual (mock): real vs ideal por mes
  const annualChartData = useMemo(() => {
    const months = monthNames.map((name, idx) => {
      const base = 1200 + idx * 30; // mock
      const real = Math.max(0, base + (idx % 3 === 0 ? 180 : -90));
      const ideal = Math.max(0, base);
      return {
        mes: name.slice(0, 3),
        ideal,
        real,
      };
    });

    // Si el usuario elige “gastos_totales/ahorros” etc, seguimos mostrando real vs ideal,
    // pero en tu integración real mapearás a endpoint/serie adecuada.
    return months;
  }, [annualYear, annualMetric]);

  // Datos histórico (mock): serie por año (real vs ideal)
  const historicChartData = useMemo(() => {
    const from = Math.min(historicFromYear, historicToYear);
    const to = Math.max(historicFromYear, historicToYear);

    const years = [];
    for (let y = from; y <= to; y++) {
      const drift = (y - from) * 120;
      const ideal = 15000 + drift;
      const real = ideal + (y % 2 === 0 ? 600 : -800);
      years.push({ year: String(y), ideal, real });
    }
    return years;
  }, [historicFromYear, historicToYear, historicMetric]);

  function onEditMovement(id: string) {
    // TODO: abrir modal / navegar a edición / llamar a tu BFF
    alert(`Editar movimiento ${id} (TODO)`);
  }

  function onDeleteMovement(id: string) {
    // TODO: confirm + llamar a tu BFF
    const ok = confirm("¿Eliminar este movimiento?");
    if (!ok) return;
    alert(`Eliminar movimiento ${id} (TODO)`);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black text-gray-100 px-6 py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--brand-title-from)] to-[var(--brand-title-to)]">
              Dashboard
            </h1>
            <p className="mt-2 text-gray-300">
              Visualiza tus movimientos y compara <span className="font-semibold">ideal vs real</span>.
            </p>
          </div>

          {/* Tabs */}
          <div className={`${cardClass} p-2 flex gap-2`}>
            <TabButton active={mode === "monthly"} onClick={() => setMode("monthly")}>
              Mensual
            </TabButton>
            <TabButton active={mode === "yearly"} onClick={() => setMode("yearly")}>
              Anual
            </TabButton>
            <TabButton active={mode === "historic"} onClick={() => setMode("historic")}>
              Histórico
            </TabButton>
          </div>
        </header>

        {/* Content */}
        {mode === "monthly" ? (
          <section className={`${cardClass} p-6 md:p-8 space-y-6`}>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Vista mensual</h2>
                <p className="text-sm text-gray-300 mt-1">
                  Selecciona mes y año. Revisa movimientos y compara distribución.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                <Select
                  label="Mes"
                  value={String(month)}
                  onChange={(v) => setMonth(Number(v))}
                  options={monthNames.map((mName, idx) => ({
                    value: String(idx),
                    label: mName,
                  }))}
                />
                <Select
                  label="Año"
                  value={String(year)}
                  onChange={(v) => setYear(Number(v))}
                  options={availableYears.map((y) => ({
                    value: String(y),
                    label: String(y),
                  }))}
                />
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => setShowMonthlyChart((s) => !s)}
                    className="w-full px-4 py-3 rounded-full font-semibold transition shadow-lg
                               bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white
                               [--tw-shadow-color:rgb(var(--brand-primary-rgb)/0.30)]"
                  >
                    {showMonthlyChart ? "Ocultar gráfica" : "Ver gráfica ideal vs real"}
                  </button>
                </div>
              </div>
            </div>

            {/* Movements table */}
            <div className="overflow-hidden rounded-3xl border border-white/10">
              <div className="bg-black/20 px-5 py-4 flex items-center justify-between">
                <p className="font-semibold">Movimientos</p>
                <p className="text-xs text-gray-400">
                  {monthNames[month]} {year} • {movements.length} items
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-black/30 text-gray-300">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold">Día</th>
                      <th className="text-left px-5 py-3 font-semibold">Fecha</th>
                      <th className="text-left px-5 py-3 font-semibold">Descripción</th>
                      <th className="text-left px-5 py-3 font-semibold">Etiqueta</th>
                      <th className="text-left px-5 py-3 font-semibold">Tipo</th>
                      <th className="text-right px-5 py-3 font-semibold">Cantidad</th>
                      <th className="text-right px-5 py-3 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {movements.map((mv) => (
                      <tr key={mv.id} className="hover:bg-white/5 transition">
                        <td className="px-5 py-3 text-gray-200">{mv.weekday}</td>
                        <td className="px-5 py-3 text-gray-200">{mv.date}</td>
                        <td className="px-5 py-3 text-gray-100 font-medium">{mv.description}</td>
                        <td className="px-5 py-3 text-gray-200">{mv.tag}</td>
                        <td className="px-5 py-3">
                          <span className={chipType(mv.type)}>{typeLabel[mv.type]}</span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold">
                          {formatEUR(mv.amount)}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            <IconButton onClick={() => onEditMovement(mv.id)} title="Editar">
                              Editar
                            </IconButton>
                            <IconButton
                              onClick={() => onDeleteMovement(mv.id)}
                              title="Eliminar"
                              variant="danger"
                            >
                              Eliminar
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                          No hay movimientos para este mes.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Monthly Chart */}
            {showMonthlyChart ? (
              <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">Distribución mensual: ideal vs real</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Ideal se calcula sobre ingresos del mes (mock). Real se agrega desde movimientos.
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 text-right">
                    <div>Ingresos: <span className="font-semibold text-gray-200">{formatEUR(monthlyIncome)}</span></div>
                  </div>
                </div>

                <div className="h-80 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="tipo" />
                      <YAxis />
                      <Tooltip formatter={(v: any) => formatEUR(Number(v))} />
                      <Legend />
                      <Bar dataKey="ideal" />
                      <Bar dataKey="real" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {mode === "yearly" ? (
          <section className={`${cardClass} p-6 md:p-8 space-y-6`}>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Vista anual</h2>
                <p className="text-sm text-gray-300 mt-1">
                  Compara por mes <span className="font-semibold">real vs ideal</span>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto">
                <Select
                  label="Año"
                  value={String(annualYear)}
                  onChange={(v) => setAnnualYear(Number(v))}
                  options={availableYears.map((y) => ({ value: String(y), label: String(y) }))}
                />
                <Select
                  label="Qué ver"
                  value={annualMetric}
                  onChange={(v) => setAnnualMetric(v as MetricKey)}
                  options={metricOptions.map((m) => ({ value: m.key, label: m.label }))}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="font-semibold">
                {metricOptions.find((m) => m.key === annualMetric)?.label} — {annualYear}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Gráfica de barras por mes: ideal vs real (mock).
              </p>

              <div className="h-96 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={annualChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip formatter={(v: any) => formatEUR(Number(v))} />
                    <Legend />
                    <Bar dataKey="ideal" />
                    <Bar dataKey="real" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        ) : null}

        {mode === "historic" ? (
          <section className={`${cardClass} p-6 md:p-8 space-y-6`}>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Vista histórica</h2>
                <p className="text-sm text-gray-300 mt-1">
                  Evolución anual con <span className="font-semibold">puntos</span> unidos por línea.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                <Select
                  label="Desde"
                  value={String(historicFromYear)}
                  onChange={(v) => setHistoricFromYear(Number(v))}
                  options={availableYears.map((y) => ({ value: String(y), label: String(y) }))}
                />
                <Select
                  label="Hasta"
                  value={String(historicToYear)}
                  onChange={(v) => setHistoricToYear(Number(v))}
                  options={availableYears.map((y) => ({ value: String(y), label: String(y) }))}
                />
                <Select
                  label="Qué ver"
                  value={historicMetric}
                  onChange={(v) => setHistoricMetric(v as MetricKey)}
                  options={metricOptions.map((m) => ({ value: m.key, label: m.label }))}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="font-semibold">
                {metricOptions.find((m) => m.key === historicMetric)?.label} — Histórico
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Línea con puntos por año: ideal vs real (mock).
              </p>

              <div className="h-96 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip formatter={(v: any) => formatEUR(Number(v))} />
                    <Legend />
                    <Line type="monotone" dataKey="ideal" dot />
                    <Line type="monotone" dataKey="real" dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        ) : null}

        {/* Footer tip */}
        <p className="text-center text-xs text-gray-500">
          Nota: Los datos de ejemplo están mockeados. Cuando conectes el BFF, sustituye los `useMemo` por fetch a tus endpoints.
        </p>
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-4 py-2 rounded-2xl text-sm font-semibold transition border",
        active
          ? "bg-white/10 border-white/20 text-white"
          : "bg-black/10 border-white/10 text-gray-300 hover:bg-black/20",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium text-gray-200">{label}</span>
      </div>
      <select
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-slate-900">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
