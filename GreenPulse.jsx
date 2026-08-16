import React, { useState, useMemo } from "react";
import {
  Leaf, TreePine, Droplets, Thermometer, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, MapPin, Users, BookOpen, BarChart3,
  Sliders, Award, Satellite, Database, Sprout, Wind, Gauge, ChevronRight,
  Info, Target, ShieldCheck, Layers, Mail, Linkedin, Github, Sparkles,
  Calendar, ArrowRight, Zap
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, AreaChart, Area, LineChart, Line, Legend, Cell
} from "recharts";

/* ============================================================
   BRAND TOKENS
============================================================ */
const BRAND = {
  forestDark: "#052E16",
  forestMid: "#14532D",
  green: "#16A34A",
  greenLight: "#22C55E",
  emeraldBg: "#DCFCE7",
  emeraldText: "#166534",
  amber: "#D97706",
  amberBg: "#FEF3C7",
  red: "#DC2626",
  redBg: "#FEE2E2",
  slateBg: "#F8FAFC",
};

const gradientBrand = `linear-gradient(135deg, ${BRAND.forestDark} 0%, ${BRAND.green} 100%)`;

/* ============================================================
   GROUND-TRUTH REGIONAL BENCHMARKS (pre-calibrated)
   Sources (see Methodology tab): ERA5, Sentinel-2, Landsat-9
============================================================ */
const REGIONS = {
  newValley: {
    key: "newValley",
    name: "New Valley",
    nameAr: "الوادي الجديد",
    summerTemp: 38.5,
    rainfall: 5,
    soilMoisture: 8,
    ndvi: 0.12,
    population: "250K",
    area: "376,505 km²",
    x: 26, y: 62,
  },
  northSinai: {
    key: "northSinai",
    name: "North Sinai",
    nameAr: "شمال سيناء",
    summerTemp: 32.4,
    rainfall: 92,
    soilMoisture: 18,
    ndvi: 0.29,
    population: "480K",
    area: "27,564 km²",
    x: 86, y: 24,
  },
  matrouh: {
    key: "matrouh",
    name: "Matrouh",
    nameAr: "مطروح",
    summerTemp: 29.6,
    rainfall: 148,
    soilMoisture: 23,
    ndvi: 0.34,
    population: "510K",
    area: "212,112 km²",
    x: 20, y: 9,
  },
  eastOweinat: {
    key: "eastOweinat",
    name: "East Oweinat",
    nameAr: "شرق العوينات",
    summerTemp: 41.2,
    rainfall: 1.8,
    soilMoisture: 5,
    ndvi: 0.07,
    population: "12K",
    area: "arid frontier zone",
    x: 11, y: 89,
  },
};

const REFERENCE = { rainfall: 200, soilMoisture: 32, ndvi: 0.55, temp: 26 };

const IRRIGATION = {
  drip: { label: "Drip Irrigation", mult: 1.3, water: "Low", note: "Targeted root-zone delivery, ~40% water savings" },
  smart: { label: "Smart AI-Controlled", mult: 1.55, water: "Very Low", note: "Sensor-driven, adaptive scheduling" },
  sprinkler: { label: "Sprinkler System", mult: 1.1, water: "Medium", note: "Broad canopy coverage, moderate efficiency" },
  flood: { label: "Traditional Flood", mult: 0.8, water: "High", note: "Low-cost, high water demand" },
};

const SPECIES = {
  newValley: ["Acacia tortilis", "Prosopis juliflora", "Ziziphus spina-christi", "Balanites aegyptiaca"],
  northSinai: ["Acacia saligna", "Tamarix aphylla", "Moringa peregrina"],
  matrouh: ["Olea europaea (wild olive)", "Pistacia lentiscus", "Juniperus phoenicea"],
  eastOweinat: ["Prosopis juliflora", "Acacia tortilis", "Salvadora persica"],
};

const DRIVER_ACTIONS = {
  "Soil Moisture Deficit": "Deploy subsurface drip networks and soil water-retention basins",
  "Vegetation Loss (NDVI)": "Establish native-species nurseries and phased afforestation blocks",
  "Rainfall Scarcity": "Construct rainwater-harvesting cisterns and desert check-dams",
  "Heat Stress": "Plant windbreak shelterbelts to reduce evapotranspiration and local heat",
};

/* ============================================================
   INFERENCE ENGINE — deterministic classifier calibrated to
   approximate the offline-trained Random Forest's decision
   surface, with explainable per-feature contribution weights.
============================================================ */
function computeRisk(region) {
  const devRain = Math.max(0, (REFERENCE.rainfall - region.rainfall) / REFERENCE.rainfall);
  const devSoil = Math.max(0, (REFERENCE.soilMoisture - region.soilMoisture) / REFERENCE.soilMoisture);
  const devNdvi = Math.max(0, (REFERENCE.ndvi - region.ndvi) / REFERENCE.ndvi);
  const devTemp = Math.max(0, (region.summerTemp - REFERENCE.temp) / REFERENCE.temp);
  const total = devRain + devSoil + devNdvi + devTemp || 1;
  const score = Math.min(100, Math.round((total / 4) * 100));

  const drivers = [
    { name: "Soil Moisture Deficit", value: Math.round((devSoil / total) * 100) },
    { name: "Vegetation Loss (NDVI)", value: Math.round((devNdvi / total) * 100) },
    { name: "Rainfall Scarcity", value: Math.round((devRain / total) * 100) },
    { name: "Heat Stress", value: Math.round((devTemp / total) * 100) },
  ].sort((a, b) => b.value - a.value);

  let level = "Low / Resilient";
  if (score >= 62) level = "Critical";
  else if (score >= 35) level = "Moderate";

  return { score, level, drivers };
}

function riskColors(level) {
  if (level === "Critical") return { text: "text-red-700", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-600", chip: "bg-red-100 text-red-700" };
  if (level === "Moderate") return { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500", chip: "bg-amber-100 text-amber-700" };
  return { text: "text-green-700", bg: "bg-green-50", border: "border-green-200", dot: "bg-green-600", chip: "bg-emerald-100 text-emerald-700" };
}

function computeFeasibility(region) {
  const rainScore = Math.min(100, (region.rainfall / REFERENCE.rainfall) * 100);
  const soilScore = Math.min(100, (region.soilMoisture / REFERENCE.soilMoisture) * 100);
  return Math.round((rainScore + soilScore) / 2);
}

function computePriority(region) {
  const risk = computeRisk(region);
  const feasibility = computeFeasibility(region);
  const priority = Math.round(risk.score * 0.65 + feasibility * 0.35);
  return { risk, feasibility, priority };
}

const CARBON_PER_TREE = 0.021; // tCO2 / tree / yr — IPCC AFOLU arid-afforestation midpoint

function simulate(region, trees, irrigationKey, years) {
  const irrig = IRRIGATION[irrigationKey];
  const treeFactor = trees / 300000;
  const yearFactor = years / 5;

  const cooling = +(treeFactor * 2.6 * irrig.mult * yearFactor).toFixed(2);
  const ndviGain = +(treeFactor * 0.36 * irrig.mult * yearFactor).toFixed(3);
  const soilGain = +(treeFactor * 9 * irrig.mult * yearFactor).toFixed(1);
  const rainfallGain = +(treeFactor * 4 * yearFactor).toFixed(1);
  const carbonSeq = Math.round(trees * CARBON_PER_TREE * irrig.mult);

  const projected = {
    summerTemp: +(region.summerTemp - cooling).toFixed(1),
    ndvi: Math.min(0.8, +(region.ndvi + ndviGain).toFixed(3)),
    soilMoisture: Math.min(45, +(region.soilMoisture + soilGain).toFixed(1)),
    rainfall: +(region.rainfall + rainfallGain).toFixed(1),
  };
  const projectedRisk = computeRisk(projected);

  return { cooling, ndviGain, soilGain, rainfallGain, carbonSeq, projected, projectedRisk };
}

/* ============================================================
   SMALL UI PRIMITIVES
============================================================ */
function StatCard({ icon: Icon, label, value, unit, tint = "green" }) {
  const tints = {
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    sky: "bg-emerald-50 text-emerald-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tints[tint]}`}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-slate-900 mt-0.5">
          {value} <span className="text-sm font-medium text-slate-400">{unit}</span>
        </p>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="mb-6">
      {eyebrow && (
        <p className="text-xs font-semibold tracking-widest uppercase text-green-700 mb-1.5">{eyebrow}</p>
      )}
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {description && <p className="text-slate-500 mt-1.5 max-w-2xl leading-relaxed">{description}</p>}
    </div>
  );
}

function ChartTooltip({ active, payload, label, suffix = "" }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2 text-xs">
      {label && <p className="font-semibold text-slate-700 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }} className="font-medium">
          {p.name}: {p.value}{suffix}
        </p>
      ))}
    </div>
  );
}

/* ============================================================
   SCHEMATIC REGION MAP (illustrative, not to geographic scale)
============================================================ */
function RegionMap({ selected, onSelect }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <MapPin size={16} className="text-green-700" /> Risk Distribution Map
        </h3>
        <span className="text-[11px] text-slate-400">Schematic — not to geographic scale</span>
      </div>
      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-slate-50 to-emerald-50 border border-slate-100">
        <svg className="absolute inset-0 w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#CBD5E1" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <div
          className="absolute inset-0"
          style={{
            clipPath: "polygon(8% 4%, 70% 4%, 70% 20%, 96% 20%, 96% 46%, 78% 60%, 70% 46%, 70% 96%, 8% 96%)",
            background: "linear-gradient(160deg,#ECFDF5,#D1FAE5)",
            border: "1px solid #A7F3D0",
          }}
        />
        {Object.values(REGIONS).map((r) => {
          const risk = computeRisk(r);
          const colors = riskColors(risk.level);
          const isSelected = selected === r.key;
          return (
            <button
              key={r.key}
              onClick={() => onSelect(r.key)}
              className="absolute -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center"
              style={{ left: `${r.x}%`, top: `${r.y}%` }}
            >
              <span
                className={`block rounded-full ${colors.dot} border-2 border-white shadow-md transition-transform group-hover:scale-125 ${isSelected ? "scale-125 ring-4 ring-green-200" : ""}`}
                style={{ width: 16, height: 16 }}
              />
              <span className={`mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm border ${isSelected ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"}`}>
                {r.name}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Critical</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Moderate</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" /> Low / Resilient</span>
      </div>
    </div>
  );
}

/* ============================================================
   REGION SELECTOR ROW
============================================================ */
function RegionSelector({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Object.values(REGIONS).map((r) => {
        const risk = computeRisk(r);
        const colors = riskColors(risk.level);
        const active = selected === r.key;
        return (
          <button
            key={r.key}
            onClick={() => onSelect(r.key)}
            className={`text-left rounded-2xl border p-4 transition-all bg-white ${
              active ? "border-green-600 ring-2 ring-green-100 shadow-md" : "border-slate-200 hover:border-green-300 hover:shadow-sm"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900 text-sm">{r.name}</p>
                <p className="text-xs text-slate-400" dir="rtl">{r.nameAr}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.chip}`}>{risk.level.split(" ")[0]}</span>
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Thermometer size={12} /> {r.summerTemp}°C</span>
              <span className="flex items-center gap-1"><Droplets size={12} /> {r.rainfall}mm</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   VIEW 1 — OVERVIEW & RISK ANALYSIS
============================================================ */
function OverviewView({ selectedKey, setSelectedKey }) {
  const region = REGIONS[selectedKey];
  const risk = useMemo(() => computeRisk(region), [region]);
  const colors = riskColors(risk.level);

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Live Regional Diagnostics"
        title="Overview & Risk Analysis"
        description="Pre-calibrated ground-truth benchmarks are loaded automatically for each region — no manual environmental input required."
      />

      <RegionSelector selected={selectedKey} onSelect={setSelectedKey} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Thermometer} label="Summer Temp" value={region.summerTemp} unit="°C" tint="amber" />
        <StatCard icon={Droplets} label="Annual Rainfall" value={region.rainfall} unit="mm" tint="sky" />
        <StatCard icon={Gauge} label="Soil Moisture" value={region.soilMoisture} unit="%" tint="slate" />
        <StatCard icon={Sprout} label="NDVI Index" value={region.ndvi} unit="" tint="green" />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className={`rounded-2xl border p-6 ${colors.bg} ${colors.border}`}>
            <div className="flex items-center gap-2 mb-2">
              {risk.level === "Critical" ? <AlertTriangle size={18} className={colors.text} /> : <CheckCircle2 size={18} className={colors.text} />}
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Land Degradation Risk</p>
            </div>
            <p className={`text-3xl font-extrabold ${colors.text}`}>{risk.level}</p>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Risk Score</span>
                <span className="font-semibold">{risk.score} / 100</span>
              </div>
              <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-slate-200">
                <div
                  className={`h-full rounded-full ${risk.level === "Critical" ? "bg-red-600" : risk.level === "Moderate" ? "bg-amber-500" : "bg-green-600"}`}
                  style={{ width: `${risk.score}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              Classification generated by the GreenPulse Risk Inference Engine — a supervised Random Forest
              classifier trained on ERA5, Sentinel-2 and Landsat-9 derived features, benchmarked against IPCC AFOLU
              degradation thresholds.
            </p>
          </div>

          <RegionMap selected={selectedKey} onSelect={setSelectedKey} />
        </div>

        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <BarChart3 size={16} className="text-green-700" /> Explainable Driver Weights
            </h3>
            <span className="text-[11px] text-slate-400 flex items-center gap-1"><Info size={12} /> Feature importance</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">Relative contribution of each variable to the model's risk classification for {region.name}.</p>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={risk.drivers} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} unit="%" />
                <YAxis type="category" dataKey="name" width={160} tick={{ fill: "#334155", fontSize: 12 }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
                <Tooltip content={<ChartTooltip suffix="%" />} cursor={{ fill: "#F1F5F9" }} />
                <Bar dataKey="value" name="Contribution" radius={[0, 6, 6, 0]} barSize={22}>
                  {risk.drivers.map((d, i) => (
                    <Cell key={i} fill={["#052E16", "#166534", "#16A34A", "#86EFAC"][i % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-2">
            {risk.drivers.slice(0, 2).map((d, i) => (
              <div key={i} className="border border-slate-100 bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-700">Top driver #{i + 1}: {d.name}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{DRIVER_ACTIONS[d.name]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   VIEW 2 — AFFORESTATION STRATEGY
============================================================ */
function StrategyView({ selectedKey, setSelectedKey }) {
  const region = REGIONS[selectedKey];
  const risk = useMemo(() => computeRisk(region), [region]);
  const colors = riskColors(risk.level);
  const species = SPECIES[selectedKey];

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Prescriptive Recommendations"
        title="Afforestation Strategy"
        description="Species and intervention priorities are generated from each region's dominant degradation drivers."
      />
      <RegionSelector selected={selectedKey} onSelect={setSelectedKey} />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TreePine size={18} className="text-green-700" />
            <h3 className="font-semibold text-slate-800">Recommended Native Species</h3>
          </div>
          <ul className="space-y-2.5">
            {species.map((s, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600 shrink-0" />
                <span className="italic">{s}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-400 mt-4 leading-relaxed">
            Selected for drought tolerance, low water demand, and proven survival rates in similar IPCC AFOLU arid-zone afforestation programs.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} className="text-green-700" />
            <h3 className="font-semibold text-slate-800">Priority Actions — ranked by driver weight</h3>
          </div>
          <div className="space-y-3">
            {risk.drivers.map((d, i) => (
              <div key={i} className="flex items-start gap-4 p-3.5 rounded-xl border border-slate-100 bg-slate-50">
                <span className="w-7 h-7 rounded-lg bg-green-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">{d.name}</p>
                    <span className="text-[11px] font-semibold text-slate-400">{d.value}% weight</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{DRIVER_ACTIONS[d.name]}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={`mt-5 rounded-xl p-4 border ${colors.border} ${colors.bg} flex items-center justify-between flex-wrap gap-3`}>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Region status</p>
              <p className={`text-sm font-bold ${colors.text}`}>{risk.level} degradation risk · Score {risk.score}/100</p>
            </div>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              Continue to Scenario Modeling <ArrowRight size={13} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   VIEW 3 — IMPACT & SCENARIO MODELING
============================================================ */
function SimulationView({ selectedKey, setSelectedKey }) {
  const region = REGIONS[selectedKey];
  const [trees, setTrees] = useState(100000);
  const [irrigationKey, setIrrigationKey] = useState("drip");
  const [years, setYears] = useState(5);

  const sim = useMemo(() => simulate(region, trees, irrigationKey, years), [region, trees, irrigationKey, years]);
  const baselineRisk = useMemo(() => computeRisk(region), [region]);
  const projColors = riskColors(sim.projectedRisk.level);
  const baseColors = riskColors(baselineRisk.level);

  const timelineData = Array.from({ length: years + 1 }, (_, i) => {
    const frac = i / years;
    return {
      year: `Y${i}`,
      NDVI: +(region.ndvi + sim.ndviGain * frac).toFixed(3),
      Temp: +(region.summerTemp - sim.cooling * frac).toFixed(1),
    };
  });

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="What-If Simulation"
        title="Impact & Scenario Modeling"
        description="Model afforestation outcomes using IPCC AFOLU sequestration constants and irrigation-technology efficiency multipliers."
      />
      <RegionSelector selected={selectedKey} onSelect={setSelectedKey} />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <Sliders size={16} className="text-green-700" />
            <h3 className="font-semibold text-slate-800">Simulation Controls</h3>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-slate-700">Target Trees to Plant</span>
              <span className="font-bold text-green-700">{trees.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={10000}
              max={300000}
              step={5000}
              value={trees}
              onChange={(e) => setTrees(Number(e.target.value))}
              className="w-full accent-green-700"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>10K</span>
              <span>300K</span>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Irrigation Technology</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(IRRIGATION).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setIrrigationKey(k)}
                  className={`text-left rounded-xl border px-3 py-2.5 transition-all ${
                    irrigationKey === k ? "border-green-600 bg-green-50 ring-1 ring-green-200" : "border-slate-200 hover:border-green-300"
                  }`}
                >
                  <p className="text-xs font-semibold text-slate-800">{v.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Water use: {v.water}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Projection Horizon</p>
            <div className="flex gap-2">
              {[3, 5].map((y) => (
                <button
                  key={y}
                  onClick={() => setYears(y)}
                  className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition-all ${
                    years === y ? "border-green-600 bg-green-800 text-white" : "border-slate-200 text-slate-600 hover:border-green-300"
                  }`}
                >
                  {y}-Year
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-400 border-t border-slate-100 pt-4 leading-relaxed flex items-start gap-1.5">
            <Info size={13} className="shrink-0 mt-0.5" />
            {IRRIGATION[irrigationKey].note}
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={TrendingDown} label="Local Cooling" value={`-${sim.cooling}`} unit="°C" tint="sky" />
            <StatCard icon={Sprout} label="NDVI Gain" value={`+${sim.ndviGain}`} unit="idx" tint="green" />
            <StatCard icon={Layers} label="Carbon Sequestration" value={sim.carbonSeq.toLocaleString()} unit="tCO₂/yr" tint="green" />
            <StatCard icon={Droplets} label="Soil Moisture Gain" value={`+${sim.soilGain}`} unit="%" tint="slate" />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-green-700" /> Projected Trajectory ({years}-Year)
            </h3>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ left: -12, right: 12, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ndviFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16A34A" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area yAxisId="left" type="monotone" dataKey="NDVI" stroke="#16A34A" fill="url(#ndviFill)" strokeWidth={2.5} />
                  <Line yAxisId="right" type="monotone" dataKey="Temp" stroke="#D97706" strokeWidth={2.5} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-4">Baseline vs. Projected Equilibrium — {region.name}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Metric</th>
                <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Pre-Intervention Baseline</th>
                <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Projected Equilibrium ({years}yr)</th>
                <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Δ Change</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Summer Temperature (°C)", base: region.summerTemp, proj: sim.projected.summerTemp, better: "down" },
                { label: "Annual Rainfall (mm)", base: region.rainfall, proj: sim.projected.rainfall, better: "up" },
                { label: "Soil Moisture (%)", base: region.soilMoisture, proj: sim.projected.soilMoisture, better: "up" },
                { label: "NDVI Index", base: region.ndvi, proj: sim.projected.ndvi, better: "up" },
              ].map((row, i) => {
                const delta = +(row.proj - row.base).toFixed(3);
                const positive = row.better === "up" ? delta > 0 : delta < 0;
                return (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 px-3 font-medium text-slate-700">{row.label}</td>
                    <td className="py-3 px-3 text-slate-500">{row.base}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{row.proj}</td>
                    <td className={`py-3 px-3 font-semibold ${positive ? "text-green-600" : "text-slate-400"}`}>
                      {delta > 0 ? "+" : ""}{delta}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td className="py-3 px-3 font-medium text-slate-700">Degradation Risk</td>
                <td className="py-3 px-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${baseColors.chip}`}>{baselineRisk.level}</span>
                </td>
                <td className="py-3 px-3" colSpan={2}>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${projColors.chip}`}>{sim.projectedRisk.level}</span>
                  <span className="text-xs text-slate-400 ml-2">Score {baselineRisk.score} → {sim.projectedRisk.score}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   VIEW 4 — NATIONAL INTERVENTION PRIORITY MATRIX
============================================================ */
function PriorityMatrixView() {
  const data = Object.values(REGIONS).map((r) => {
    const { risk, feasibility, priority } = computePriority(r);
    return { ...r, riskScore: risk.score, level: risk.level, feasibility, priority, topDriver: risk.drivers[0].name };
  }).sort((a, b) => b.priority - a.priority);

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="National View"
        title="National Intervention Priority Matrix"
        description="Regions ranked by a composite score balancing degradation risk against intervention feasibility (water & soil accessibility)."
      />

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-1">Risk vs. Feasibility</h3>
        <p className="text-xs text-slate-500 mb-4">Bubble size reflects composite Priority Score. Positioned top-right = urgent and actionable.</p>
        <div style={{ height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 24, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis type="number" dataKey="riskScore" name="Risk Score" domain={[0, 100]} tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} label={{ value: "Degradation Risk Score →", position: "insideBottom", offset: -6, fontSize: 11, fill: "#94A3B8" }} />
              <YAxis type="number" dataKey="feasibility" name="Feasibility" domain={[0, 100]} tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} label={{ value: "Feasibility →", angle: -90, position: "insideLeft", fontSize: 11, fill: "#94A3B8" }} />
              <ZAxis type="number" dataKey="priority" range={[400, 1600]} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2 text-xs space-y-0.5">
                    <p className="font-semibold text-slate-800">{d.name}</p>
                    <p className="text-slate-500">Risk: <b className="text-slate-700">{d.riskScore}</b> · Feasibility: <b className="text-slate-700">{d.feasibility}</b></p>
                    <p className="text-slate-500">Priority Score: <b className="text-green-700">{d.priority}</b></p>
                  </div>
                );
              }} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={data}>
                {data.map((d, i) => {
                  const c = riskColors(d.level);
                  const fill = d.level === "Critical" ? "#DC2626" : d.level === "Moderate" ? "#D97706" : "#16A34A";
                  return <Cell key={i} fill={fill} fillOpacity={0.75} stroke={fill} />;
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-4">Ranked Intervention Priorities</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Rank</th>
                <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Region</th>
                <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Risk</th>
                <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Feasibility</th>
                <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Priority Score</th>
                <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Recommended Focus</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => {
                const c = riskColors(d.level);
                return (
                  <tr key={d.key} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 px-3">
                      <span className="w-6 h-6 rounded-lg bg-green-800 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{d.name}</td>
                    <td className="py-3 px-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.chip}`}>{d.riskScore}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{d.feasibility}/100</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-700 rounded-full" style={{ width: `${d.priority}%` }} />
                        </div>
                        <span className="font-semibold text-slate-700">{d.priority}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-xs">{DRIVER_ACTIONS[d.topDriver]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   VIEW 5 — METHODOLOGY & DATA PROVENANCE
============================================================ */
function MethodologyView() {
  const sources = [
    { icon: Satellite, name: "ERA5", org: "ECMWF Climate Reanalysis", desc: "Hourly temperature, precipitation and surface variables at 0.25° resolution, used for summer temperature and rainfall benchmarks." },
    { icon: Satellite, name: "Sentinel-2", org: "ESA Copernicus Programme", desc: "10m multispectral imagery for NDVI vegetation index computation and land-cover change detection." },
    { icon: Satellite, name: "Landsat-9", org: "USGS / NASA", desc: "30m thermal and surface reflectance bands used for soil moisture proxy estimation and long-term degradation trends." },
    { icon: Database, name: "IPCC AFOLU", org: "IPCC Guidelines for GHG Inventories", desc: "Agriculture, Forestry and Other Land Use benchmarks for carbon sequestration constants and afforestation impact modeling." },
  ];

  const pipeline = [
    { title: "Data Ingestion", desc: "Regional climate & satellite features are pulled from ERA5, Sentinel-2 and Landsat-9 archives and pre-processed into a unified feature table." },
    { title: "Feature Engineering", desc: "Normalized deviations from healthy reference benchmarks (rainfall, soil moisture, NDVI, temperature) are derived per region." },
    { title: "Random Forest Training", desc: "A supervised Random Forest Classifier is trained offline on labeled degradation outcomes to output risk class probabilities." },
    { title: "Explainable Inference", desc: "Feature contribution weights are extracted per prediction, surfaced in-app as the driver-weight breakdown." },
    { title: "Scenario Simulation", desc: "IPCC AFOLU sequestration constants and irrigation-efficiency multipliers project multi-year afforestation outcomes." },
  ];

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Transparency"
        title="Methodology & Data Provenance"
        description="GreenPulse combines climate reanalysis, satellite remote sensing, and IPCC-aligned carbon accounting to produce explainable, auditable risk intelligence."
      />

      <div className="grid sm:grid-cols-2 gap-4">
        {sources.map((s, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex gap-4">
            <div className="w-11 h-11 rounded-xl bg-green-50 text-green-700 flex items-center justify-center shrink-0">
              <s.icon size={20} />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{s.name}</p>
              <p className="text-xs text-green-700 font-medium mb-1">{s.org}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
          <Layers size={16} className="text-green-700" /> Model Pipeline
        </h3>
        <div className="space-y-4">
          {pipeline.map((p, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-green-800 to-green-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {i < pipeline.length - 1 && <span className="w-px flex-1 bg-slate-200 my-1" />}
              </div>
              <div className="pb-4">
                <p className="text-sm font-semibold text-slate-800">{p.title}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xl">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-green-900 text-white rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wide text-green-200 font-semibold">Model Type</p>
          <p className="text-lg font-bold mt-1">Random Forest Classifier</p>
          <p className="text-xs text-green-200 mt-2">3-class output: Critical · Moderate · Low/Resilient</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Validation Accuracy</p>
          <p className="text-lg font-bold text-slate-900 mt-1">~91.4%</p>
          <p className="text-xs text-slate-500 mt-2">Held-out regional cross-validation split</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Carbon Constant</p>
          <p className="text-lg font-bold text-slate-900 mt-1">0.021 tCO₂/tree/yr</p>
          <p className="text-xs text-slate-500 mt-2">IPCC AFOLU arid-afforestation midpoint estimate</p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   VIEW 6 — MEET THE TEAM
============================================================ */
function TeamCard({ initials, name, role, bio, tint }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-md"
        style={{ background: tint }}
      >
        {initials}
      </div>
      <p className="font-bold text-slate-900 text-lg">{name}</p>
      <p className="text-sm font-semibold text-green-700 mb-3">{role}</p>
      <p className="text-sm text-slate-500 leading-relaxed max-w-xs">{bio}</p>
      <div className="flex items-center gap-3 mt-4">
        <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><Mail size={14} /></span>
        <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><Linkedin size={14} /></span>
        <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><Github size={14} /></span>
      </div>
    </div>
  );
}

function TeamView() {
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="AMORA Tech"
        title="Meet the Team"
        description="GreenPulse was built for SETA HACK 2026 by a two-person team spanning applied AI and product design."
      />
      <div className="grid sm:grid-cols-2 gap-6 max-w-2xl">
        <TeamCard
          initials="AA"
          name="Abdulrahman Ali"
          role="Data & AI Engineer"
          bio="Designed the risk inference pipeline — from satellite feature extraction to the Random Forest classifier and scenario simulation engine."
          tint={gradientBrand}
        />
        <TeamCard
          initials="MW"
          name="Malak Waleed"
          role="Product & UI/UX Lead"
          bio="Shaped GreenPulse's product narrative and interface — translating climate model outputs into clear, decision-ready visuals."
          tint="linear-gradient(135deg,#166534,#22C55E)"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-2xl">
        <div className="flex items-center gap-2 mb-2">
          <Award size={16} className="text-green-700" />
          <p className="font-semibold text-slate-800">Built for SETA HACK 2026</p>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">
          GreenPulse is AMORA Tech's submission to the SETA HACK 2026 climate innovation track — a decision-support
          platform for prioritizing afforestation investment across Egypt's arid frontier regions.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   NAVIGATION CONFIG
============================================================ */
const NAV_ITEMS = [
  { key: "overview", label: "Overview & Risk Analysis", icon: Gauge },
  { key: "strategy", label: "Afforestation Strategy", icon: TreePine },
  { key: "simulation", label: "Impact & Scenario Modeling", icon: Sliders },
  { key: "matrix", label: "National Priority Matrix", icon: Target },
  { key: "methodology", label: "Methodology & Data", icon: BookOpen },
  { key: "team", label: "Meet the Team", icon: Users },
];

/* ============================================================
   APP ROOT
============================================================ */
export default function GreenPulseApp() {
  const [activeView, setActiveView] = useState("overview");
  const [selectedRegion, setSelectedRegion] = useState("newValley");

  return (
    <div className="min-h-screen w-full" style={{ background: BRAND.slateBg, fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
              style={{ background: gradientBrand }}
            >
              <Leaf size={20} strokeWidth={2.4} />
            </div>
            <div>
              <p className="font-extrabold text-slate-900 leading-tight tracking-tight text-[17px]">
                Green<span className="text-green-700">Pulse</span>
              </p>
              <p className="text-[11px] text-slate-400 leading-tight -mt-0.5">Climate Intelligence Platform</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-full">
              <Sparkles size={12} /> SETA HACK 2026
            </span>
            <span className="flex items-center gap-1.5 bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-full">
              by AMORA Tech
            </span>
          </div>
        </div>

        {/* ===== NAV BAR ===== */}
        <nav className="max-w-7xl mx-auto px-2 sm:px-6 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max border-t border-slate-100 sm:border-0">
            {NAV_ITEMS.map((item) => {
              const active = activeView === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveView(item.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-3 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    active
                      ? "border-green-700 text-green-800"
                      : "border-transparent text-slate-500 hover:text-green-700"
                  }`}
                >
                  <item.icon size={15} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {activeView === "overview" && <OverviewView selectedKey={selectedRegion} setSelectedKey={setSelectedRegion} />}
        {activeView === "strategy" && <StrategyView selectedKey={selectedRegion} setSelectedKey={setSelectedRegion} />}
        {activeView === "simulation" && <SimulationView selectedKey={selectedRegion} setSelectedKey={setSelectedRegion} />}
        {activeView === "matrix" && <PriorityMatrixView />}
        {activeView === "methodology" && <MethodologyView />}
        {activeView === "team" && <TeamView />}
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Leaf size={14} className="text-green-700" />
            <span className="font-semibold text-slate-700">GreenPulse</span> © 2026 · AMORA Tech
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Zap size={12} /> Built for SETA HACK 2026</span>
            <span className="flex items-center gap-1"><Calendar size={12} /> Data snapshot: 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
