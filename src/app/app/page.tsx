// app/(tu-ruta)/dashboard/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

  // ✅ etiqueta enriquecida
  tagName?: string;
  tagColor?: string;

  type: MovementType;
  amount: number;
};

type BackendMovement = {
  id: number;
  userEmail: string;
  movementType: string;
  amount: number;
  date: string;

  tagId?: number | null;
  tagName?: string | null;
  tagColor?: string | null;

  description: string;
};

type IdealPercentageResponse = {
  monthlySavingPercentage: number;
  monthlyNecessaryExpensesPercentage: number;
  monthlyDiscretionaryExpensesPercentage: number;
  monthlyInvestmentPercentage: number;
};

type AnnualMetricBackend =
  | "BENEFIT"
  | "TOTAL_EXPENSES"
  | "NECESSARY_EXPENSES"
  | "DISCRETIONARY_EXPENSES"
  | "INVESTMENTS"
  | "SAVINGS";

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
  metric: AnnualMetricBackend;
  series: Array<{
    year: number;
    idealAmount: number;
    realAmount: number;
  }>;
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

function IconButton({
  children,
  onClick,
  title,
  variant = "ghost",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  variant?: "ghost" | "danger";
  disabled?: boolean;
}) {
  const cls =
    variant === "danger"
      ? "rounded-xl border border-red-400/30 bg-red-500/10 text-red-200 px-3 py-2 text-sm hover:bg-red-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
      : "rounded-xl border border-white/10 bg-black/20 text-gray-200 px-3 py-2 text-sm hover:bg-black/30 transition disabled:opacity-50 disabled:cursor-not-allowed";
  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  );
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

function weekdayEs(date: string) {
  const d = new Date(`${date}T00:00:00`);
  const w = d.toLocaleDateString("es-ES", { weekday: "long" });
  return w.charAt(0).toUpperCase() + w.slice(1);
}

function normalizeIdeal(d: IdealPercentageResponse) {
  return {
    ahorro: d.monthlySavingPercentage,
    gasto_necesario: d.monthlyNecessaryExpensesPercentage,
    gasto_innecesario: d.monthlyDiscretionaryExpensesPercentage,
    inversion: d.monthlyInvestmentPercentage,
  };
}

function metricKeyToBackend(metric: MetricKey): AnnualMetricBackend {
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

function normalizeHexColor(c?: string | null) {
  if (!c) return null;
  const v = c.trim();
  if (!v) return null;
  return v.startsWith("#") ? v : `#${v}`;
}

function TagChip({ name, color }: { name?: string; color?: string }) {
  if (!name) return <span className="text-gray-500">—</span>;

  const hex = normalizeHexColor(color) ?? "#64748B"; // fallback gris

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

export default function AppDashboardPage() {
  const router = useRouter();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

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

  // Años disponibles
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loadingYears, setLoadingYears] = useState(false);
  const [yearsError, setYearsError] = useState<string | null>(null);

  // Feedback global (acciones: delete)
  const [actionMsg, setActionMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadYears() {
      try {
        setLoadingYears(true);
        setYearsError(null);

        const res = await fetch("/api/movements?years=1", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error?.message ?? `Error cargando años (${res.status})`);
        }

        const years = (json.data ?? []) as number[];
        years.sort((a: number, b: number) => a - b);

        if (!cancelled) {
          setAvailableYears(years);

          if (years.length > 0) {
            const first = years[0];
            const last = years[years.length - 1];

            if (!years.includes(year)) setYear(last);
            if (!years.includes(annualYear)) setAnnualYear(last);

            setHistoricFromYear(first);
            setHistoricToYear(last);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setYearsError(e?.message ?? "Error");
          setAvailableYears([]);
        }
      } finally {
        if (!cancelled) setLoadingYears(false);
      }
    }

    loadYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ideal percentages
  const [monthlyIdealPercent, setMonthlyIdealPercent] = useState({
    ahorro: 20,
    gasto_necesario: 50,
    gasto_innecesario: 20,
    inversion: 10,
  });
  const [loadingIdeal, setLoadingIdeal] = useState(false);
  const [idealError, setIdealError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadIdeal() {
      try {
        setLoadingIdeal(true);
        setIdealError(null);

        const res = await fetch("/api/ideal-percentage", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          throw new Error(
            json?.error?.message ?? `No se pudo cargar idealPercentage (${res.status})`
          );
        }

        const d = json.data as IdealPercentageResponse;
        if (!cancelled) setMonthlyIdealPercent(normalizeIdeal(d));
      } catch (e: any) {
        if (!cancelled) setIdealError(e?.message ?? "Error");
      } finally {
        if (!cancelled) setLoadingIdeal(false);
      }
    }

    loadIdeal();
  }, []);

  // Movimientos mensual
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [movementsError, setMovementsError] = useState<string | null>(null);

  async function loadMovements() {
    const res = await fetch(`/api/movements?year=${year}&month=${month}`, {
      method: "GET",
      cache: "no-store",
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.ok) {
      throw new Error(json?.error?.message ?? `Error cargando movimientos (${res.status})`);
    }

    const backendItems = (json.data ?? []) as BackendMovement[];

    const mapped: Movement[] = backendItems.map((m) => ({
      id: String(m.id),
      weekday: weekdayEs(m.date),
      date: m.date,
      description: m.description,
      tagName: m.tagName ?? undefined,
      tagColor: m.tagColor ?? undefined,
      type: mapBackendType(m.movementType),
      amount: m.amount,
    }));

    setMovements(mapped);
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoadingMovements(true);
        setMovementsError(null);

        const res = await fetch(`/api/movements?year=${year}&month=${month}`, {
          method: "GET",
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error?.message ?? `Error cargando movimientos (${res.status})`);
        }

        const backendItems = (json.data ?? []) as BackendMovement[];

        const mapped: Movement[] = backendItems.map((m) => ({
          id: String(m.id),
          weekday: weekdayEs(m.date),
          date: m.date,
          description: m.description,
          tagName: m.tagName ?? undefined,
          tagColor: m.tagColor ?? undefined,
          type: mapBackendType(m.movementType),
          amount: m.amount,
        }));

        if (!cancelled) setMovements(mapped);
      } catch (e: any) {
        if (!cancelled) setMovementsError(e?.message ?? "Error");
        if (!cancelled) setMovements([]);
      } finally {
        if (!cancelled) setLoadingMovements(false);
      }
    }

    run();
  }, [year, month]);

  async function onEditMovement(id: string) {
    setActionMsg(null);
    router.push(`/app/movements/update/${id}`);
  }

  async function onDeleteMovement(id: string) {
    setActionMsg(null);

    const ok = window.confirm("¿Eliminar este movimiento? Esta acción no se puede deshacer.");
    if (!ok) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/movements/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);

      if (!res.ok || json?.ok === false) {
        throw new Error(
          json?.error?.backend?.message ??
            json?.error?.message ??
            `Error eliminando movimiento (${res.status})`
        );
      }

      try {
        await loadMovements();
      } catch {
        setMovements((prev) => prev.filter((m) => m.id !== id));
      }

      setActionMsg({ type: "ok", text: "Movimiento eliminado correctamente." });
    } catch (e: any) {
      setActionMsg({ type: "err", text: e?.message ?? "Error eliminando movimiento." });
    } finally {
      setDeletingId(null);
    }
  }

  // Totales mensual
  const monthlyTotals = useMemo(() => {
    let benefit = 0;
    let essential = 0;
    let discretionary = 0;
    let investment = 0;

    for (const mv of movements) {
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
  }, [movements]);

  const monthlyIncome = monthlyTotals.beneficio || 0;

  const monthlyChartData = useMemo(() => {
    const income = monthlyIncome;

    const idealNecesarios = (income * monthlyIdealPercent.gasto_necesario) / 100;
    const idealInnecesarios = (income * monthlyIdealPercent.gasto_innecesario) / 100;
    const idealInversion = (income * monthlyIdealPercent.inversion) / 100;
    const idealAhorro = (income * monthlyIdealPercent.ahorro) / 100;
    const idealGastosTotales = idealNecesarios + idealInnecesarios;

    return [
      { tipo: "Beneficio", ideal: income, real: monthlyTotals.beneficio },
      { tipo: "Gastos necesarios", ideal: idealNecesarios, real: monthlyTotals.gastos_necesarios },
      { tipo: "Gastos innecesarios", ideal: idealInnecesarios, real: monthlyTotals.gastos_innecesarios },
      { tipo: "Gastos totales", ideal: idealGastosTotales, real: monthlyTotals.gastos_totales },
      { tipo: "Inversión", ideal: idealInversion, real: monthlyTotals.inversion },
      { tipo: "Ahorros", ideal: idealAhorro, real: monthlyTotals.ahorros },
    ];
  }, [monthlyIncome, monthlyIdealPercent, monthlyTotals]);

  // ANUAL real
  const [annualData, setAnnualData] = useState<Array<{ mes: string; ideal: number; real: number }>>(
    []
  );
  const [loadingAnnual, setLoadingAnnual] = useState(false);
  const [annualError, setAnnualError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAnnual() {
      try {
        setLoadingAnnual(true);
        setAnnualError(null);

        const backendMetric = metricKeyToBackend(annualMetric);

        const res = await fetch(
          `/api/movements?annual=1&year=${annualYear}&metric=${backendMetric}`,
          { cache: "no-store" }
        );

        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error?.message ?? `Error anual (${res.status})`);
        }

        const data = json.data as AnnualResponse;

        const mapped = (data.series ?? [])
          .slice()
          .sort((a, b) => a.month - b.month)
          .map((it) => ({
            mes: monthNames[it.month - 1]?.slice(0, 3) ?? String(it.month),
            ideal: Number(it.idealAmount ?? 0),
            real: Number(it.realAmount ?? 0),
          }));

        if (!cancelled) setAnnualData(mapped);
      } catch (e: any) {
        if (!cancelled) setAnnualError(e?.message ?? "Error");
        if (!cancelled) setAnnualData([]);
      } finally {
        if (!cancelled) setLoadingAnnual(false);
      }
    }

    loadAnnual();
  }, [annualYear, annualMetric]);

  // HISTÓRICO real
  const [historicalRaw, setHistoricalRaw] = useState<
    Array<{ year: number; ideal: number; real: number }>
  >([]);
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [historicalError, setHistoricalError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHistorical() {
      try {
        setLoadingHistorical(true);
        setHistoricalError(null);

        const backendMetric = metricKeyToBackend(historicMetric);

        const res = await fetch(`/api/movements?historical=1&metric=${backendMetric}`, {
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error?.message ?? `Error histórico (${res.status})`);
        }

        const data = json.data as HistoricalResponse;

        const mapped = (data.series ?? [])
          .slice()
          .sort((a, b) => a.year - b.year)
          .map((it) => ({
            year: Number(it.year),
            ideal: Number(it.idealAmount ?? 0),
            real: Number(it.realAmount ?? 0),
          }));

        if (!cancelled) setHistoricalRaw(mapped);
      } catch (e: any) {
        if (!cancelled) setHistoricalError(e?.message ?? "Error");
        if (!cancelled) setHistoricalRaw([]);
      } finally {
        if (!cancelled) setLoadingHistorical(false);
      }
    }

    loadHistorical();
  }, [historicMetric]);

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

  const yearsForSelect = availableYears.length > 0 ? availableYears : [currentYear];

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black text-gray-100 px-6 py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--brand-title-from)] to-[var(--brand-title-to)]">
              Dashboard
            </h1>
            <p className="mt-2 text-gray-300">
              Visualiza tus movimientos y compara <span className="font-semibold">ideal vs real</span>.
            </p>

            {loadingYears ? (
              <p className="text-xs text-gray-400 mt-2">Cargando años...</p>
            ) : yearsError ? (
              <p className="text-xs text-red-300 mt-2">Años: {yearsError}</p>
            ) : null}

            {loadingIdeal ? (
              <p className="text-xs text-gray-400 mt-1">Cargando porcentajes ideales...</p>
            ) : idealError ? (
              <p className="text-xs text-amber-200 mt-1">
                IdealPercentage: {idealError} (usando fallback)
              </p>
            ) : null}

            {actionMsg ? (
              <div
                className={[
                  "mt-3 inline-block rounded-2xl border px-4 py-2 text-xs",
                  actionMsg.type === "ok"
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                    : "border-amber-400/30 bg-amber-500/10 text-amber-100",
                ].join(" ")}
              >
                {actionMsg.text}
              </div>
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
                  Selecciona mes y año. Revisa movimientos y compara distribución.
                </p>

                {loadingMovements ? (
                  <p className="text-xs text-gray-400 mt-2">Cargando movimientos...</p>
                ) : movementsError ? (
                  <p className="text-xs text-red-300 mt-2">Movimientos: {movementsError}</p>
                ) : null}
              </div>

              {/* ✅ CTA Crear movimiento + filtros */}
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
                    <p className="font-semibold">Distribución mensual: ideal vs real</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Ideal se calcula sobre los beneficios del mes. Real se agrega desde movimientos.
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 text-right">
                    <div>
                      Beneficios:{" "}
                      <span className="font-semibold text-gray-200">{formatEUR(monthlyIncome)}</span>
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
                      <Legend wrapperStyle={{ color: "#E5E7EB" }} />
                      <Bar dataKey="ideal" name="Ideal" fill="#60A5FA" radius={[10, 10, 0, 0]} />
                      <Bar dataKey="real" name="Real" fill="#34D399" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-3xl border border-white/10">
              <div className="bg-black/20 px-5 py-4 flex items-center justify-between">
                <p className="font-semibold">Movimientos</p>
                <p className="text-xs text-gray-400">
                  {monthNames[month]} {year} • {movements.length} movimientos
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

                        {/* ✅ etiqueta con color */}
                        <td className="px-5 py-3">
                          <TagChip name={mv.tagName} color={mv.tagColor} />
                        </td>

                        <td className="px-5 py-3">
                          <span className={chipType(mv.type)}>{typeLabel[mv.type]}</span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold">{formatEUR(mv.amount)}</td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            <IconButton
                              onClick={() => onEditMovement(mv.id)}
                              title="Editar"
                              disabled={!!deletingId}
                            >
                              Editar
                            </IconButton>
                            <IconButton
                              onClick={() => onDeleteMovement(mv.id)}
                              title="Eliminar"
                              variant="danger"
                              disabled={deletingId === mv.id}
                            >
                              {deletingId === mv.id ? "Eliminando…" : "Eliminar"}
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {movements.length === 0 && !loadingMovements ? (
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
          </section>
        ) : null}

        {/* YEARLY */}
        {mode === "yearly" ? (
          <section className={`${cardClass} p-6 md:p-8 space-y-6`}>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Vista anual</h2>
                <p className="text-sm text-gray-300 mt-1">
                  Compara por mes <span className="font-semibold">real vs ideal</span>.
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
                    <Bar dataKey="ideal" name="Ideal" fill="#60A5FA" radius={[10, 10, 0, 0]} />
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
                  Línea con puntos por año: ideal vs real (backend).
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
                  <LineChart data={historicChartData}>
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
                    <Legend wrapperStyle={{ color: "#E5E7EB" }} />
                    <Line type="monotone" dataKey="ideal" name="Ideal" stroke="#60A5FA" dot />
                    <Line type="monotone" dataKey="real" name="Real" stroke="#34D399" dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        ) : null}

        <p className="text-center text-xs text-gray-500">
          Nota: estas gráficas son solo para fines informativos y no constituyen asesoramiento financiero. Todos los datos cumplen con la GDPR y se manejan de forma segura.
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
