// app/tags/[id]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

type MovementType = "beneficio" | "gasto_necesario" | "gasto_innecesario" | "inversion";

type Movement = {
  id: string;
  weekday: string;
  date: string; // YYYY-MM-DD
  description: string;

  tagId: string;
  tagName: string;
  tagColor?: string;

  type: MovementType;
  amount: number;
};

type TagDto = {
  id: number;
  name: string;
  color: string;
};

const monthNames = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
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

function normalizeHexColor(c?: string | null) {
  if (!c) return null;
  const v = c.trim();
  if (!v) return null;
  return v.startsWith("#") ? v : `#${v}`;
}

function TagChip({ name, color }: { name?: string; color?: string }) {
  if (!name) return <span className="text-gray-500">—</span>;
  const hex = normalizeHexColor(color) ?? "#64748B";
  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
      style={{
        borderColor: hex,
        backgroundColor: `${hex}22`,
        color: hex,
      }}
      title={name}
    >
      {name}
    </span>
  );
}

function weekdayEs(date: string) {
  const d = new Date(`${date}T00:00:00`);
  const w = d.toLocaleDateString("es-ES", { weekday: "long" });
  return w.charAt(0).toUpperCase() + w.slice(1);
}

function getMonthRange(year: number, month0: number) {
  const yyyy = String(year);
  const mm = String(month0 + 1).padStart(2, "0");
  const lastDay = new Date(year, month0 + 1, 0).getDate();
  const ddTo = String(lastDay).padStart(2, "0");
  return {
    from: `${yyyy}-${mm}-01`,
    to: `${yyyy}-${mm}-${ddTo}`,
  };
}

function mapBackendType(t: string): MovementType {
  switch (t) {
    case "BENEFIT":
      return "beneficio";
    case "ESSENTIAL_EXPENSE":
      return "gasto_necesario";
    case "DISCRETIONARY_EXPENSE":
    case "NOT_ESSENTIAL_EXPENSE":
      return "gasto_innecesario";
    case "INVESTMENT":
      return "inversion";
    default:
      return "gasto_necesario";
  }
}

function metricKeyToBackend(metric: MetricKey): string {
  switch (metric) {
    case "beneficios":
      return "BENEFIT";
    case "gastos_necesarios":
      return "NECESSARY_EXPENSES";
    case "gastos_innecesarios":
      return "DISCRETIONARY_EXPENSES";
    case "gastos_totales":
      return "TOTAL_EXPENSES";
    case "inversion":
      return "INVESTMENTS";
    case "ahorros":
      return "SAVINGS";
  }
}

/** Tipos que devuelve /api/movements/[tagId] **/
type MovementFromApi = {
  id: number;
  movementType: string;
  amount: number;
  date: string; // YYYY-MM-DD
  tagId?: number | null;
  tagName?: string | null;
  tagColor?: string | null;
  description?: string | null;
};

type AnnualResponse = {
  movementType: string | null;
  year: number;
  series: Array<{
    month: number;
    monthName: string;
    idealAmount: number;
    realAmount: number;
  }>;
};

type HistoricalResponse = {
  metric: string;
  series: Array<{
    year: number;
    idealAmount: number;
    realAmount: number;
  }>;
};

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
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-slate-900">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function TagDashboardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const tagId = String(params?.id ?? "");

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [mode, setMode] = useState<ViewMode>("monthly");

  // Tag real
  const [tag, setTag] = useState<{ id: string; name: string; color?: string }>({
    id: tagId,
    name: `Etiqueta #${tagId}`,
    color: "#64748B",
  });
  const [loadingTag, setLoadingTag] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);

  // Mensual
  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<number>(currentMonth);
  const [showMonthlyChart, setShowMonthlyChart] = useState<boolean>(true);

  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [movementsError, setMovementsError] = useState<string | null>(null);

  // Anual
  const [annualYear, setAnnualYear] = useState<number>(currentYear);
  const [annualMetric, setAnnualMetric] = useState<MetricKey>("beneficios");
  const [annualData, setAnnualData] = useState<Array<{ mes: string; real: number }>>([])

  const [loadingAnnual, setLoadingAnnual] = useState(false);
  const [annualError, setAnnualError] = useState<string | null>(null);

  // Histórico
  const [historicMetric, setHistoricMetric] = useState<MetricKey>("beneficios");
  const [historicFromYear, setHistoricFromYear] = useState<number>(currentYear - 4);
  const [historicToYear, setHistoricToYear] = useState<number>(currentYear);
  const [historicalRaw, setHistoricalRaw] = useState<Array<{ year: number; ideal: number; real: number }>>(
    []
  );
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [historicalError, setHistoricalError] = useState<string | null>(null);

  // Ideal fijo (si quieres, lo sustituimos luego por /api/ideal-percentage)
  const monthlyIdealPercent = useMemo(
    () => ({ ahorro: 20, gasto_necesario: 50, gasto_innecesario: 20, inversion: 10 }),
    []
  );

  // --------------------------
  // Cargar TAG real
  // --------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadTag() {
      try {
        if (!tagId) return;
        setLoadingTag(true);
        setTagError(null);

        const res = await fetch(`/api/tags/${tagId}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error?.message ?? `Error cargando etiqueta (${res.status})`);
        }

        const data = json.data as TagDto;

        if (!cancelled) {
          setTag({
            id: String(data.id),
            name: data.name ?? `Etiqueta #${tagId}`,
            color: data.color ?? "#64748B",
          });
        }
      } catch (e: any) {
        if (!cancelled) {
          setTagError(e?.message ?? "Error");
          setTag({
            id: tagId,
            name: `Etiqueta #${tagId}`,
            color: "#64748B",
          });
        }
      } finally {
        if (!cancelled) setLoadingTag(false);
      }
    }

    loadTag();

    return () => {
      cancelled = true;
    };
  }, [tagId]);

  // --------------------------
// Carga movimientos mensuales
// --------------------------
useEffect(() => {
  let cancelled = false;

  async function loadMonthly() {
    try {
      if (!tagId) return;

      setLoadingMovements(true);
      setMovementsError(null);

      const { from, to } = getMonthRange(year, month);

      // Llamamos a la ruta que tienes: /api/movements/tag/{tagId}
      const res = await fetch(
        `/api/movements/tag/${tagId}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { cache: "no-store" }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error?.message ?? `Error cargando movimientos (${res.status})`);
      }

      const backendItems = (json.data ?? []) as MovementFromApi[];

      const mapped: Movement[] = backendItems.map((m) => ({
        id: String(m.id),
        weekday: weekdayEs(m.date),
        date: m.date,
        description: m.description ?? "",
        tagId: m.tagId != null ? String(m.tagId) : tagId,
        tagName: m.tagName ?? tag.name ?? "",
        tagColor: m.tagColor ?? tag.color ?? undefined,
        type: mapBackendType(m.movementType),
        amount: Number(m.amount ?? 0),
      }));

      if (!cancelled) setMovements(mapped);
    } catch (e: any) {
      if (!cancelled) {
        setMovementsError(e?.message ?? "Error");
        setMovements([]);
      }
    } finally {
      if (!cancelled) setLoadingMovements(false);
    }
  }

  loadMonthly();

  return () => {
    cancelled = true;
  };
}, [tagId, year, month, tag.name, tag.color]);


  // --------------------------
  // Carga anual
  // --------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadAnnual() {
      try {
        if (!tagId) return;

        setLoadingAnnual(true);
        setAnnualError(null);

        const backendMetric = metricKeyToBackend(annualMetric);
        const from = `${annualYear}-01-01`;
        const to = `${annualYear}-12-31`;

        const url =
          `/api/movements/tag/${tagId}?annual=1` +
          `&from=${encodeURIComponent(from)}` +
          `&to=${encodeURIComponent(to)}` +
          `&metric=${encodeURIComponent(backendMetric)}`;

        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error?.message ?? `Error anual (${res.status})`);
        }

        const data = json.data as AnnualResponse;

        const mapped =
          (data.series ?? [])
            .slice()
            .sort((a, b) => a.month - b.month)
            .map((it) => ({
              mes: monthNames[it.month - 1]?.slice(0, 3) ?? String(it.month),
              ideal: Number(it.idealAmount ?? 0),
              real: Number(it.realAmount ?? 0),
            })) ?? [];

        if (!cancelled) setAnnualData(mapped);
      } catch (e: any) {
        if (!cancelled) {
          setAnnualError(e?.message ?? "Error");
          setAnnualData([]);
        }
      } finally {
        if (!cancelled) setLoadingAnnual(false);
      }
    }

    loadAnnual();

    return () => {
      cancelled = true;
    };
  }, [tagId, annualYear, annualMetric]);

  // --------------------------
  // Carga histórico
  // --------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadHistorical() {
      try {
        if (!tagId) return;

        setLoadingHistorical(true);
        setHistoricalError(null);

        const backendMetric = metricKeyToBackend(historicMetric);

        const url =
          `/api/movements/tag/${tagId}?historical=1` +
          `&metric=${encodeURIComponent(backendMetric)}`;

        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error?.message ?? `Error histórico (${res.status})`);
        }

        const data = json.data as HistoricalResponse;

        const mapped =
          (data.series ?? [])
            .slice()
            .sort((a, b) => a.year - b.year)
            .map((it) => ({
              year: Number(it.year),
              ideal: Number(it.idealAmount ?? 0),
              real: Number(it.realAmount ?? 0),
            })) ?? [];

        if (!cancelled) setHistoricalRaw(mapped);
      } catch (e: any) {
        if (!cancelled) {
          setHistoricalError(e?.message ?? "Error");
          setHistoricalRaw([]);
        }
      } finally {
        if (!cancelled) setLoadingHistorical(false);
      }
    }

    loadHistorical();

    return () => {
      cancelled = true;
    };
  }, [tagId, historicMetric]);

  // Años disponibles (a partir del histórico)
  const yearsForSelect = useMemo(() => {
    const years = Array.from(new Set(historicalRaw.map((p) => p.year))).sort((a, b) => a - b);
    return years.length ? years : [currentYear];
  }, [historicalRaw, currentYear]);

  // Ajustar rango histórico cuando llegan datos
  useEffect(() => {
    if (!historicalRaw.length) return;
    const years = historicalRaw.map((p) => p.year);
    const min = Math.min(...years);
    const max = Math.max(...years);
    setHistoricFromYear(min);
    setHistoricToYear(max);
  }, [historicalRaw]);

  const monthlyMovements = movements;

  const monthlyTotals = useMemo(() => {
    let benefit = 0;
    let essential = 0;
    let discretionary = 0;
    let investment = 0;

    for (const mv of monthlyMovements) {
      if (mv.type === "beneficio") benefit += mv.amount;
      if (mv.type === "gasto_necesario") essential += mv.amount;
      if (mv.type === "gasto_innecesario") discretionary += mv.amount;
      if (mv.type === "inversion") investment += mv.amount;
    }

    const gastosTotales = essential + discretionary;
    const ahorros = Math.max(0, benefit - gastosTotales - investment);

    return {
      beneficio: benefit,
      gastos_necesarios: essential,
      gastos_innecesarios: discretionary,
      gastos_totales: gastosTotales,
      inversion: investment,
      ahorros,
    };
  }, [monthlyMovements]);

  const monthlyIncome = monthlyTotals.beneficio || 0;

  const monthlyChartData = useMemo(() => {
    const income = monthlyIncome;

    const idealNecesarios = (income * monthlyIdealPercent.gasto_necesario) / 100;
    const idealInnecesarios = (income * monthlyIdealPercent.gasto_innecesario) / 100;
    const idealInversion = (income * monthlyIdealPercent.inversion) / 100;
    const idealAhorro = (income * monthlyIdealPercent.ahorro) / 100;
    const idealGastosTotales = idealNecesarios + idealInnecesarios;

    return [
      { tipo: "Beneficio", real: monthlyTotals.beneficio },
      { tipo: "Gastos necesarios", real: monthlyTotals.gastos_necesarios },
      { tipo: "Gastos innecesarios", real: monthlyTotals.gastos_innecesarios },
      { tipo: "Gastos totales", real: monthlyTotals.gastos_totales },
      { tipo: "Inversión", real: monthlyTotals.inversion },
      { tipo: "Ahorros", real: monthlyTotals.ahorros },
    ];

  }, [monthlyIncome, monthlyIdealPercent, monthlyTotals]);

  const historicChartData = useMemo(() => {
    const from = Math.min(historicFromYear, historicToYear);
    const to = Math.max(historicFromYear, historicToYear);

    return historicalRaw
      .filter((p) => p.year >= from && p.year <= to)
      .map((p) => ({
        year: String(p.year),
        ideal: p.ideal,
        real: p.real,
      }));
  }, [historicalRaw, historicFromYear, historicToYear]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black text-gray-100 px-6 py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-xl border border-white/10 bg-black/20 text-gray-200 px-3 py-2 text-sm hover:bg-black/30 transition"
              >
                Volver
              </button>

              <TagChip name={tag.name} color={tag.color} />
            </div>

            <h1 className="mt-4 text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--brand-title-from)] to-[var(--brand-title-to)]">
              Dashboard de etiqueta
            </h1>

            <p className="mt-2 text-gray-300">
              Vista filtrada por la etiqueta <span className="font-semibold">{tag.name}</span>.
            </p>

            {loadingTag ? (
              <p className="text-xs text-gray-400 mt-2">Cargando etiqueta...</p>
            ) : tagError ? (
              <p className="text-xs text-amber-200 mt-2">Etiqueta: {tagError}</p>
            ) : null}
          </div>

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

        {/* MONTHLY */}
        {mode === "monthly" ? (
          <section className={`${cardClass} p-6 md:p-8 space-y-6`}>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Vista mensual</h2>
                <p className="text-sm text-gray-300 mt-1">
                  Selecciona mes y año. Verás solo movimientos con esta etiqueta.
                </p>

                {loadingMovements ? (
                  <p className="text-xs text-gray-400 mt-2">Cargando movimientos...</p>
                ) : movementsError ? (
                  <p className="text-xs text-red-300 mt-2">Movimientos: {movementsError}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 w-full lg:w-auto">
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
                    options={yearsForSelect.map((y) => ({
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
                      {showMonthlyChart ? "Ocultar gráfica" : "Ver gráfica"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {showMonthlyChart ? (
              <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">Distribución mensual (real)</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Importes reales del mes calculados a partir de tus movimientos.
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 text-right">
                    <div>
                      Beneficios:{" "}
                      <span className="font-semibold text-gray-200">
                        {formatEUR(monthlyIncome)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-96 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                      <XAxis dataKey="tipo" tick={{ fill: "#E5E7EB" }} />
                      <YAxis tick={{ fill: "#E5E7EB" }} />
                      <Tooltip
                        formatter={(v: any) => formatEUR(Number(v))}
                        contentStyle={{
                          background: "rgba(15, 23, 42, 0.95)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 12,
                          color: "#E5E7EB",
                        }}
                        labelStyle={{ color: "#E5E7EB" }}
                      />
                      <Bar dataKey="real" name="Real" fill="#34D399" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>

                </div>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-3xl border border-white/10">
              <div className="bg-black/20 px-5 py-4 flex items-center justify-between">
                <p className="font-semibold">Movimientos (etiqueta: {tag.name})</p>
                <p className="text-xs text-gray-400">
                  {monthNames[month]} {year} • {monthlyMovements.length} movimientos
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
                    {monthlyMovements.map((mv) => (
                      <tr key={mv.id} className="hover:bg-white/5 transition">
                        <td className="px-5 py-3 text-gray-200">{mv.weekday}</td>
                        <td className="px-5 py-3 text-gray-200">{mv.date}</td>
                        <td className="px-5 py-3 text-gray-100 font-medium">{mv.description}</td>
                        <td className="px-5 py-3">
                          <TagChip name={mv.tagName} color={mv.tagColor} />
                        </td>
                        <td className="px-5 py-3">
                          <span className={chipType(mv.type)}>{typeLabel[mv.type]}</span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold">{formatEUR(mv.amount)}</td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="rounded-xl border border-white/10 bg-black/20 text-gray-200 px-3 py-2 text-sm hover:bg-black/30 transition"
                              onClick={() => router.push(`/app/movements/update/${mv.id}`)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="rounded-xl border border-red-400/30 bg-red-500/10 text-red-200 px-3 py-2 text-sm hover:bg-red-500/20 transition"
                              onClick={() => alert("TODO: implementa delete aquí si quieres")}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {monthlyMovements.length === 0 && !loadingMovements ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                          No hay movimientos para este mes con esta etiqueta.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        {/* YEARLY */}
        {mode === "yearly" ? (
          <section className={`${cardClass} p-6 md:p-8 space-y-6`}>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Vista anual</h2>
                <p className="text-sm text-gray-300 mt-1">
  Evolución mensual del valor <span className="font-semibold">real</span>.
</p>

                {loadingAnnual ? (
                  <p className="text-xs text-gray-400 mt-2">Cargando anual...</p>
                ) : annualError ? (
                  <p className="text-xs text-red-300 mt-2">Anual: {annualError}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto">
                <Select
                  label="Año"
                  value={String(annualYear)}
                  onChange={(v) => setAnnualYear(Number(v))}
                  options={yearsForSelect.map((y) => ({ value: String(y), label: String(y) }))}
                />
                <Select
                  label="Qué ver"
                  value={annualMetric}
                  onChange={(v) => setAnnualMetric(v as any)}
                  options={metricOptions.map((m) => ({ value: m.key, label: m.label }))}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="font-semibold">
                {metricOptions.find((m) => m.key === annualMetric)?.label} — {annualYear}
              </p>

              <div className="h-96 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={annualData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fill: "#E5E7EB" }} />
                    <YAxis tick={{ fill: "#E5E7EB" }} />
                    <Tooltip
                      formatter={(v: any) => formatEUR(Number(v))}
                      contentStyle={{
                        background: "rgba(15, 23, 42, 0.95)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        color: "#E5E7EB",
                      }}
                      labelStyle={{ color: "#E5E7EB" }}
                    />
                    <Legend wrapperStyle={{ color: "#E5E7EB" }} />
                    <Bar dataKey="real" name="Real" fill="#34D399" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        ) : null}

        {/* HISTORIC */}
        {mode === "historic" ? (
          <section className={`${cardClass} p-6 md:p-8 space-y-6`}>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Vista histórica</h2>
                <p className="text-sm text-gray-300 mt-1">
                  Línea por año real.
                </p>
                {loadingHistorical ? (
                  <p className="text-xs text-gray-400 mt-2">Cargando histórico...</p>
                ) : historicalError ? (
                  <p className="text-xs text-red-300 mt-2">Histórico: {historicalError}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                <Select
                  label="Desde"
                  value={String(historicFromYear)}
                  onChange={(v) => setHistoricFromYear(Number(v))}
                  options={yearsForSelect.map((y) => ({ value: String(y), label: String(y) }))}
                />
                <Select
                  label="Hasta"
                  value={String(historicToYear)}
                  onChange={(v) => setHistoricToYear(Number(v))}
                  options={yearsForSelect.map((y) => ({ value: String(y), label: String(y) }))}
                />
                <Select
                  label="Qué ver"
                  value={historicMetric}
                  onChange={(v) => setHistoricMetric(v as any)}
                  options={metricOptions.map((m) => ({ value: m.key, label: m.label }))}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="font-semibold">
                {metricOptions.find((m) => m.key === historicMetric)?.label} — Histórico
              </p>

              <div className="h-96 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historicChartData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fill: "#E5E7EB" }} />
                    <YAxis tick={{ fill: "#E5E7EB" }} />
                    <Tooltip
                      formatter={(v: any) => formatEUR(Number(v))}
                      contentStyle={{
                        background: "rgba(15, 23, 42, 0.95)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        color: "#E5E7EB",
                      }}
                      labelStyle={{ color: "#E5E7EB" }}
                    />
                    <Bar dataKey="real" name="Real" fill="#34D399" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

              </div>
            </div>
          </section>
        ) : null}

        <p className="text-center text-xs text-gray-500">
          Datos basados en tus movimientos (etiquetados). No constituyen asesoramiento financiero.
        </p>
      </div>
    </main>
  );
}
