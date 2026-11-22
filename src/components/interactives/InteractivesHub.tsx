import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Eye,
  Grid3X3,
  Layers,
  Lock,
  Play,
  RotateCcw,
  Shield,
  Swords,
} from 'lucide-react';
import {
  ACRONYMS_TABLE,
  CYBERATTACK_14_CONCEPTS,
  RED_BLUE_CARDS,
  WORD_SEARCH_28_TERMS,
} from '../../shared/curriculum.ts';
import type { InteractiveAcronym, UserRole } from '../../shared/types.ts';

export type InteractiveToolId =
  | 'acronyms'
  | 'wordsearch'
  | 'attacksearch'
  | 'cyberopolis'
  | 'crisisroom'
  | 'redblue';

interface InteractivesHubProps {
  userRole: UserRole;
  initialTool?: InteractiveToolId;
  savedProgress?: {
    acronymsChallengeBest?: number;
    wordSearchFoundCount?: number;
    wordSearchRiskTerms?: string;
    attackSearchFoundCount?: number;
    cyberopolisScore?: number;
    crisisDecisions?: string[];
    redBlueRoundsCompleted?: number;
  };
  onSaveProgress?: (payload: Record<string, unknown>) => Promise<void>;
}

const TOOL_TABS: { id: InteractiveToolId; label: string; blockTag: string }[] = [
  { id: 'acronyms', label: 'Tabla de Acrónimos', blockTag: 'B01–B02' },
  { id: 'wordsearch', label: 'Sopa Vocabulario (28)', blockTag: 'B02' },
  { id: 'attacksearch', label: 'Sopa Ciberataques (14)', blockTag: 'B03' },
  { id: 'cyberopolis', label: 'Cyberópolis', blockTag: 'B04' },
  { id: 'crisisroom', label: 'Sala de Crisis TTX', blockTag: 'B10' },
  { id: 'redblue', label: 'Mesa Red vs. Blue', blockTag: 'B11–B12' },
];

// Deterministic 18x18 word search matrix placing all 28 terms horizontally or vertically
function buildWordSearchGrid(terms: string[]) {
  const size = 18;
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));
  const placements: { term: string; cells: string[] }[] = [];

  // Place first 16 terms horizontally across rows 0..15, and remaining 12 vertically or on open segments
  const sorted = [...terms].sort((a, b) => b.length - a.length);
  let rowCursor = 0;
  let colCursor = 0;

  for (let idx = 0; idx < sorted.length; idx++) {
    const word = sorted[idx];
    let placed = false;

    // Try horizontal
    for (let attempt = 0; attempt < size * size && !placed; attempt++) {
      const r = (rowCursor + Math.floor(attempt / 3)) % size;
      const c = (colCursor + (attempt % 5)) % Math.max(1, size - word.length + 1);
      let fits = true;
      for (let k = 0; k < word.length; k++) {
        const cur = grid[r][c + k];
        if (cur !== '' && cur !== word[k]) {
          fits = false;
          break;
        }
      }
      if (fits) {
        const cells: string[] = [];
        for (let k = 0; k < word.length; k++) {
          grid[r][c + k] = word[k];
          cells.push(`${r}-${c + k}`);
        }
        placements.push({ term: word, cells });
        placed = true;
        rowCursor = (r + 1) % size;
      }
    }

    // Try vertical fallback
    for (let r = 0; r <= size - word.length && !placed; r++) {
      for (let c = 0; c < size && !placed; c++) {
        let fits = true;
        for (let k = 0; k < word.length; k++) {
          const cur = grid[r + k][c];
          if (cur !== '' && cur !== word[k]) {
            fits = false;
            break;
          }
        }
        if (fits) {
          const cells: string[] = [];
          for (let k = 0; k < word.length; k++) {
            grid[r + k][c] = word[k];
            cells.push(`${r + k}-${c}`);
          }
          placements.push({ term: word, cells });
          placed = true;
        }
      }
    }

    if (!placed) {
      placements.push({ term: word, cells: [] });
    }
    colCursor = (colCursor + 3) % size;
  }

  const alphabet = 'ABCDEFGHILMNOPRSTUVZ';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = alphabet[(r * 7 + c * 13) % alphabet.length];
      }
    }
  }

  return { size, grid, placements };
}

const CYBEROPOLIS_SCENARIOS = [
  {
    id: 'cyb-1',
    area: 'Portal de Clientes y Correos',
    prompt: 'Los coordinadores de Andina Logística S.A.S. usan la misma contraseña corporativa en servicios externos. ¿Qué control priorizas?',
    options: [
      { label: 'Implementar gestor de contraseñas + MFA FIDO2/Passkeys sin recopilar claves personales', points: 25, feedback: 'Correcto: elimina reutilización de credenciales y mitiga phishing en tiempo real.' },
      { label: 'Pedir a cada empleado que envíe su contraseña actual por correo a TI para revisarla', points: 0, feedback: 'Inseguro: nunca se deben recolectar ni transmitir contraseñas en texto claro.' },
      { label: 'Cambiar contraseñas cada semana agregando solo un número al final', points: 10, feedback: 'Insuficiente: la rotación predecible no frena el relleno de credenciales.' },
    ],
  },
  {
    id: 'cyb-2',
    area: 'Sistema WMS y Bodega OT',
    prompt: 'Los sensores de temperatura y bandas transportadoras (OT) comparten la misma subred plana que los portátiles de ventas.',
    options: [
      { label: 'Segmentar la red OT del entorno corporativo/WMS aplicando principio Zero Trust y mínimo privilegio', points: 25, feedback: 'Correcto: contiene incidentes administrativos evitando detener la operación física.' },
      { label: 'Publicar el panel OT directo en internet para facilitar acceso desde casa', points: 0, feedback: 'Crítico: expone infraestructura operativa sin control de acceso.' },
      { label: 'Dejar la red plana y confiar únicamente en el antivirus del portátil', points: 5, feedback: 'Riesgoso: un único control de endpoint no reemplaza segmentación.' },
    ],
  },
  {
    id: 'cyb-3',
    area: 'Respaldos y Resiliencia',
    prompt: 'Los respaldos nocturnos del WMS se guardan únicamente en una carpeta compartida accesible desde el mismo servidor principal.',
    options: [
      { label: 'Aplicar regla 3-2-1 con copia inmutable / fuera de línea y prueba periódica de restauración', points: 25, feedback: 'Correcto: protege la recuperación frente a ransomware o borrado accidental.' },
      { label: 'Duplicar la carpeta dentro del mismo disco C:', points: 5, feedback: 'Insuficiente: un cifrado o falla física destruye original y copia.' },
    ],
  },
  {
    id: 'cyb-4',
    area: 'Cultura y Sesgos Humanos',
    prompt: 'Un analista recibe una llamada apremiante fingiendo ser la gerencia solicitando aprobar un pago sin seguir el flujo normal.',
    options: [
      { label: 'Detener la solicitud, verificar por directorio interno independiente y reportar el intento', points: 25, feedback: 'Excelente: rompe el sesgo de autoridad/urgencia propio de BEC.' },
      { label: 'Ejecutar el pago de inmediato para evitar un llamado de atención', points: 0, feedback: 'Riesgo alto: la presión jerárquica es el vector central de ingeniería social.' },
    ],
  },
];

const CRISIS_INJECTIONS = [
  {
    id: 'inj-1',
    time: 'T+00 min',
    title: 'Inyección 1 · Alerta temprana en WMS (06:15 a. m.)',
    detail: 'El monitoreo detecta cifrado anómalo en 3 estaciones de despacho de la sede Bogotá. El turno de camiones inicia en 45 minutos.',
    options: [
      'Aislar las 3 estaciones y la subred afectada preservando memoria/registros, y activar comité CSIRT.',
      'Apagar abruptamente todos los servidores centrales sin registro ni aviso al comité.',
      'Ignorar la alerta hasta que termine el despacho de la mañana.',
    ],
  },
  {
    id: 'inj-2',
    time: 'T+10 min',
    title: 'Inyección 2 · Nota de extorsión y presión de datos',
    detail: 'Aparece nota exigiendo pago y afirmando haber extraído datos de clientes (Ley 1581). Prensa local solicita confirmación.',
    options: [
      'Mantener vocería unificada con hechos verificados, no pagar sin evaluación legal/directiva y evaluar alcance de exfiltración.',
      'Publicar un comunicado culpando a un proveedor sin evidencia confirmada.',
      'Negociar de manera informal desde el correo personal de un coordinador.',
    ],
  },
  {
    id: 'inj-3',
    time: 'T+20 min',
    title: 'Inyección 3 · Continuidad operativa en bodega',
    detail: 'El WMS principal entra en mantenimiento de contención. Hay 18 camiones esperando guía de despacho.',
    options: [
      'Activar procedimiento de contingencia manual (BCP) mientras se valida integridad del respaldo inmutable para RTO de 4 horas.',
      'Reconectar equipos sin verificar limpieza para acelerar el despacho.',
      'Suspender operaciones indefinidamente sin activar plan de contingencia.',
    ],
  },
  {
    id: 'inj-4',
    time: 'T+30 min',
    title: 'Inyección 4 · Preservación jurídica y cierre Hot Wash',
    detail: 'Se estabiliza la contención. El área jurídica solicita insumos para eventual denuncia bajo Ley 1273 de 2009 y reporte.',
    options: [
      'Consolidar cadena de custodia, bitácora horaria firmada, lecciones aprendidas y ruta de notificación institucional.',
      'Formatear los equipos afectados para borrar todo rastro del incidente.',
      'Cerrar el caso verbalmente sin documentar hallazgos ni responsabilidades.',
    ],
  },
];

export function InteractivesHub({
  userRole,
  initialTool = 'acronyms',
  savedProgress,
  onSaveProgress,
}: InteractivesHubProps) {
  const [activeTool, setActiveTool] = useState<InteractiveToolId>(initialTool);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const isReadOnly = userRole === 'solo_lectura';

  const persist = async (payload: Record<string, unknown>, message: string) => {
    if (isReadOnly || !onSaveProgress) {
      setSaveFeedback('Vista de solo lectura: los resultados interactivos no se guardan en servidor.');
      return;
    }
    try {
      await onSaveProgress(payload);
      setSaveFeedback(message);
    } catch {
      setSaveFeedback('No se pudo guardar el progreso en este momento.');
    }
  };

  // --- 1. Periodic Table of Acronyms state ---
  const [acrCategory, setAcrCategory] = useState<string>('Todos');
  const [selectedAcronym, setSelectedAcronym] = useState<InteractiveAcronym>(ACRONYMS_TABLE[0]);
  const [challengeActive, setChallengeActive] = useState(false);
  const [challengeQuestions, setChallengeQuestions] = useState<InteractiveAcronym[]>([]);
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [challengeScore, setChallengeScore] = useState(0);
  const [challengeAnswerStatus, setChallengeAnswerStatus] = useState<string | null>(null);
  const [challengeDone, setChallengeDone] = useState(false);

  const filteredAcronyms = useMemo(
    () =>
      acrCategory === 'Todos'
        ? ACRONYMS_TABLE
        : ACRONYMS_TABLE.filter((a) => a.category === acrCategory),
    [acrCategory]
  );

  const startAcronymChallenge = () => {
    const sample = [...ACRONYMS_TABLE].slice(0, 10);
    setChallengeQuestions(sample);
    setChallengeIdx(0);
    setChallengeScore(0);
    setChallengeAnswerStatus(null);
    setChallengeDone(false);
    setChallengeActive(true);
  };

  const handleChallengePick = (pickedSymbol: string) => {
    if (challengeDone || challengeAnswerStatus) return;
    const current = challengeQuestions[challengeIdx];
    const correct = pickedSymbol === current.symbol;
    const nextScore = correct ? challengeScore + 1 : challengeScore;
    if (correct) setChallengeScore(nextScore);
    setChallengeAnswerStatus(
      correct
        ? `Correcto (${current.symbol}: ${current.fullName}).`
        : `Incorrecto. Correspondía a ${current.symbol} (${current.fullName}).`
    );
    setTimeout(() => {
      if (challengeIdx + 1 >= challengeQuestions.length) {
        setChallengeDone(true);
        setChallengeAnswerStatus(null);
        persist(
          { acronymsChallengeBest: nextScore },
          `Reto de 10 acrónimos guardado (${nextScore}/10).`
        );
      } else {
        setChallengeIdx((i) => i + 1);
        setChallengeAnswerStatus(null);
      }
    }, 650);
  };

  // --- 2. Word Search 28 Terms state ---
  const wordSearch = useMemo(() => buildWordSearchGrid(WORD_SEARCH_28_TERMS), []);
  const [foundTerms, setFoundTerms] = useState<string[]>([]);
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [showTeacherKey, setShowTeacherKey] = useState(false);
  const [riskExplanation, setRiskExplanation] = useState(savedProgress?.wordSearchRiskTerms ?? '');

  const toggleGridCell = (cellKey: string) => {
    const next = selectedCells.includes(cellKey)
      ? selectedCells.filter((c) => c !== cellKey)
      : [...selectedCells, cellKey];
    setSelectedCells(next);

    // Check if any unfound term's cells are fully contained in selection
    for (const p of wordSearch.placements) {
      if (p.cells.length > 0 && !foundTerms.includes(p.term)) {
        if (p.cells.every((c) => next.includes(c))) {
          const updated = [...foundTerms, p.term];
          setFoundTerms(updated);
          setSelectedCells([]);
          break;
        }
      }
    }
  };

  const markAccessibleTerm = (term: string) => {
    if (!foundTerms.includes(term)) {
      setFoundTerms([...foundTerms, term]);
    }
  };

  // --- 3. Sopa de Ciberataques (14) state ---
  const [attackIdx, setAttackIdx] = useState(0);
  const [attackMatches, setAttackMatches] = useState<string[]>([]);
  const [attackFeedback, setAttackFeedback] = useState<string | null>(null);

  const currentAttack = CYBERATTACK_14_CONCEPTS[attackIdx];
  const attackChoices = useMemo(() => {
    const others = CYBERATTACK_14_CONCEPTS.filter((c) => c.id !== currentAttack.id).slice(0, 3);
    return [currentAttack, ...others].sort((a, b) => a.name.localeCompare(b.name));
  }, [currentAttack]);

  // --- 4. Cyberópolis state ---
  const [cybStep, setCybStep] = useState(0);
  const [cybScore, setCybScore] = useState(savedProgress?.cyberopolisScore ?? 0);
  const [cybHistory, setCybHistory] = useState<{ area: string; choice: string; feedback: string; points: number }[]>([]);

  // --- 5. Sala de Crisis TTX state ---
  const [crisisIdx, setCrisisIdx] = useState(0);
  const [crisisImpact, setCrisisImpact] = useState({
    wmsOperacion: 80,
    confidencialidad: 85,
    confianza: 80,
    cumplimiento: 90,
  });
  const [crisisLog, setCrisisLog] = useState<string[]>(savedProgress?.crisisDecisions ?? []);

  // --- 6. Simulación Red vs. Blue (Rondas 1–6) state ---
  const [rbRound, setRbRound] = useState(1);
  const [selectedRedCardId, setSelectedRedCardId] = useState('rb-r1');
  const [selectedBlueCardId, setSelectedBlueCardId] = useState('rb-b1');
  const [roeAccepted, setRoeAccepted] = useState(false);
  const [rbLogs, setRbLogs] = useState<string[]>([]);

  const redCards = RED_BLUE_CARDS.filter((c) => c.team === 'Red');
  const blueCards = RED_BLUE_CARDS.filter((c) => c.team === 'Blue');
  const whiteInjections = RED_BLUE_CARDS.filter((c) => c.team === 'White');

  return (
    <section aria-labelledby="interactives-heading" className="mx-auto max-w-6xl px-6 py-8 min-w-0 break-words">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-medium text-blue-700">
          Laboratorios didácticos defensivos · Entorno seguro sin ejecución ofensiva
        </p>
        <h1 id="interactives-heading" className="mt-1 font-display text-2xl font-bold text-slate-900">
          Interactivos del Diplomado en Ciberseguridad
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Herramientas prácticas para vocabulario, higiene digital, gestión de crisis TTX y simulación de mesa Red vs. Blue sobre Andina Logística S.A.S.
        </p>
      </div>

      {/* Tool selector */}
      <div
        role="tablist"
        aria-label="Selector de laboratorio interactivo"
        className="mt-5 flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5"
      >
        {TOOL_TABS.map((t) => {
          const active = activeTool === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => {
                setActiveTool(t.id);
                setSaveFeedback(null);
              }}
              className={`px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{t.label}</span>
              <span className="ml-1.5 font-mono text-[11px] text-slate-400">{t.blockTag}</span>
            </button>
          );
        })}
      </div>

      {saveFeedback && (
        <p role="status" className="mt-4 border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-900">
          {saveFeedback}
        </p>
      )}

      {/* 1. TABLA PERIÓDICA DE ACRÓNIMOS */}
      {activeTool === 'acronyms' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 border border-slate-200 bg-white p-6 lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Tabla Periódica de Acrónimos ({ACRONYMS_TABLE.length} elementos)
                </h2>
                <p className="text-xs text-slate-500">
                  Filtra por categoría y selecciona un acrónimo para revisar su enfoque defensivo.
                </p>
              </div>
              <button
                type="button"
                onClick={startAcronymChallenge}
                className="inline-flex items-center gap-1.5 bg-blue-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reto de 10 acrónimos</span>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {['Todos', 'Fundamentos', 'Amenazas', 'Defensa y SOC', 'Marcos y Leyes', 'Operaciones'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setAcrCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                    acrCategory === cat
                      ? 'border-blue-700 bg-blue-700 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {challengeActive ? (
              <div className="mt-5 border border-slate-200 bg-slate-50 p-5">
                {challengeDone ? (
                  <div>
                    <p className="font-display text-lg font-bold text-slate-900 tabular-nums">
                      Resultado del reto: {challengeScore} / {challengeQuestions.length} aciertos
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Verificación cruzada completada. Revisa los acrónimos con menor dominio en la tabla.
                    </p>
                    <button
                      type="button"
                      onClick={() => setChallengeActive(false)}
                      className="mt-4 bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      Volver a la tabla
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-slate-500 tabular-nums">
                      <span>Pregunta {challengeIdx + 1} de {challengeQuestions.length}</span>
                      <span>Aciertos: {challengeScore}</span>
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-900">
                      ¿Qué acrónimo corresponde a: “{challengeQuestions[challengeIdx].definition}”?
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        challengeQuestions[challengeIdx],
                        ...ACRONYMS_TABLE.filter((a) => a.symbol !== challengeQuestions[challengeIdx].symbol).slice(0, 3),
                      ]
                        .sort((a, b) => a.symbol.localeCompare(b.symbol))
                        .map((opt) => (
                          <button
                            key={opt.symbol}
                            type="button"
                            onClick={() => handleChallengePick(opt.symbol)}
                            className="border border-slate-300 bg-white p-3 text-center font-mono text-sm font-semibold text-slate-900 hover:border-blue-700 hover:bg-blue-50"
                          >
                            {opt.symbol}
                          </button>
                        ))}
                    </div>
                    {challengeAnswerStatus && (
                      <p role="status" className="mt-3 text-xs font-medium text-blue-800">
                        {challengeAnswerStatus}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
                {filteredAcronyms.map((item) => {
                  const selected = selectedAcronym.symbol === item.symbol;
                  return (
                    <button
                      key={item.symbol}
                      type="button"
                      onClick={() => setSelectedAcronym(item)}
                      className={`min-w-0 overflow-hidden flex flex-col justify-between border p-2.5 text-left transition-colors ${
                        selected
                          ? 'border-blue-700 bg-blue-50 text-blue-950'
                          : 'border-slate-200 bg-white hover:border-slate-400'
                      }`}
                    >
                      <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                        {String(item.number).padStart(2, '0')}
                      </span>
                      <span className="mt-1 font-mono text-sm font-bold text-slate-900 break-words">
                        {item.symbol}
                      </span>
                      <span className="mt-1 truncate text-[10px] text-slate-500">
                        {item.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="min-w-0 border border-slate-200 bg-white p-6 lg:col-span-4 break-words">
            <p className="font-mono text-xs text-blue-700">
              #{selectedAcronym.number} · {selectedAcronym.category}
            </p>
            <h3 className="mt-1 font-display text-xl font-bold text-slate-900">
              {selectedAcronym.symbol} — {selectedAcronym.fullName}
            </h3>
            <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-500">Definición clara</p>
                <p className="mt-1 text-slate-700">{selectedAcronym.definition}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Ejemplo defensivo (Andina Logística)</p>
                <p className="mt-1 text-slate-700">{selectedAcronym.defensiveExample}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Conexión con riesgo / triada CIA</p>
                <p className="mt-1 text-slate-700">{selectedAcronym.ciaConnection}</p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* 2. SOPA DE LETRAS DE 28 TÉRMINOS */}
      {activeTool === 'wordsearch' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 border border-slate-200 bg-white p-6 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Sopa de letras de vocabulario (28 términos)
                </h2>
                <p className="text-xs text-slate-600">
                  Selecciona las letras de una palabra en la cuadrícula o usa la lista accesible por teclado en el panel derecho.
                </p>
              </div>
              <span className="font-mono text-xs font-semibold text-blue-700 tabular-nums">
                {foundTerms.length} / {WORD_SEARCH_28_TERMS.length} encontrados
              </span>
            </div>

            {userRole === 'profesor' && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <span className="font-medium text-slate-700">
                  Solucionario docente (oculto para estudiantes y solo lectura)
                </span>
                <button
                  type="button"
                  onClick={() => setShowTeacherKey(!showTeacherKey)}
                  className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline shrink-0"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{showTeacherKey ? 'Ocultar solucionario' : 'Mostrar solucionario'}</span>
                </button>
              </div>
            )}

            <div className="mt-4 overflow-x-auto">
              <div
                role="grid"
                aria-label="Cuadrícula de sopa de letras de 28 términos"
                className="inline-grid gap-0.5 bg-slate-200 p-1"
                style={{ gridTemplateColumns: `repeat(${wordSearch.size}, minmax(1.6rem, 1fr))` }}
              >
                {wordSearch.grid.map((row, rIdx) =>
                  row.map((letter, cIdx) => {
                    const key = `${rIdx}-${cIdx}`;
                    const isSelected = selectedCells.includes(key);
                    const isFound = wordSearch.placements.some(
                      (p) => foundTerms.includes(p.term) && p.cells.includes(key)
                    );
                    const isKeyHighlighted =
                      userRole === 'profesor' &&
                      showTeacherKey &&
                      wordSearch.placements.some((p) => p.cells.includes(key));

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleGridCell(key)}
                        aria-label={`Fila ${rIdx + 1} Columna ${cIdx + 1}, letra ${letter}`}
                        aria-pressed={isSelected || isFound}
                        className={`flex h-7 w-7 items-center justify-center font-mono text-xs font-semibold transition-colors ${
                          isFound
                            ? 'bg-emerald-600 text-white'
                            : isSelected
                              ? 'bg-blue-700 text-white'
                              : isKeyHighlighted
                                ? 'bg-amber-200 text-slate-900'
                                : 'bg-white text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {letter}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-5 lg:col-span-5">
            <div className="border border-slate-200 bg-white p-5">
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Alternativa accesible por lista y teclado (28 términos)
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Puedes marcar cada término revisado directamente con Enter o Espacio.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto pr-1">
                {WORD_SEARCH_28_TERMS.map((term) => {
                  const found = foundTerms.includes(term);
                  return (
                    <button
                      key={term}
                      type="button"
                      onClick={() => markAccessibleTerm(term)}
                      className={`flex items-center justify-between border px-2.5 py-1.5 text-left font-mono text-[11px] transition-colors ${
                        found
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{term}</span>
                      {found && <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-700" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border border-slate-200 bg-white p-5">
              <label htmlFor="risk-terms-explain" className="block font-display text-sm font-semibold text-slate-900">
                Cierre obligatorio: explica dos conceptos en lenguaje de riesgo
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Conecta dos términos de la sopa con impacto operativo en Andina Logística S.A.S.
              </p>
              <textarea
                id="risk-terms-explain"
                rows={4}
                disabled={isReadOnly}
                value={riskExplanation}
                onChange={(e) => setRiskExplanation(e.target.value)}
                placeholder="Ej.: 1) Segmentación reduce el impacto de movimiento lateral sobre el WMS... 2) Custodia asegura validez probatoria..."
                className="mt-2 w-full border border-slate-300 p-2.5 text-xs text-slate-900 disabled:bg-slate-100"
              />
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() =>
                  persist(
                    {
                      wordSearchFoundCount: foundTerms.length,
                      wordSearchRiskTerms: riskExplanation,
                    },
                    'Avance de sopa de vocabulario y explicación guardados.'
                  )
                }
                className="mt-3 bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isReadOnly ? 'Deshabilitado en solo lectura' : 'Guardar explicación y avance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SOPA DE CIBERATAQUES (14 CONCEPTOS DEFENSIVOS) */}
      {activeTool === 'attacksearch' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 border border-slate-200 bg-white p-6 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Sopa de Ciberataques: reconocimiento educativo (14 conceptos)
                </h2>
                <p className="text-xs text-slate-500">
                  Descripción conceptual y defensiva sin instrucciones técnicas de ejecución.
                </p>
              </div>
              <span className="font-mono text-xs font-semibold text-blue-700 tabular-nums shrink-0">
                {attackMatches.length} / {CYBERATTACK_14_CONCEPTS.length} reconocidos
              </span>
            </div>

            <div className="mt-5 border border-slate-200 bg-slate-50 p-5">
              <p className="font-mono text-xs text-slate-500">
                Concepto {attackIdx + 1} de {CYBERATTACK_14_CONCEPTS.length} · Categoría: {currentAttack.category}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {currentAttack.defensiveSummary}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {attackChoices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => {
                      if (choice.id === currentAttack.id) {
                        const updated = attackMatches.includes(choice.id)
                          ? attackMatches
                          : [...attackMatches, choice.id];
                        setAttackMatches(updated);
                        setAttackFeedback(`Correcto: ${choice.name}.`);
                        persist(
                          { attackSearchFoundCount: updated.length },
                          `Reconocimiento guardado (${updated.length}/14).`
                        );
                      } else {
                        setAttackFeedback(`No corresponde a ${choice.name}. Revisa la descripción defensiva e intenta de nuevo.`);
                      }
                    }}
                    className="border border-slate-300 bg-white px-4 py-2.5 text-left text-sm font-medium text-slate-900 hover:border-blue-700 hover:bg-blue-50"
                  >
                    {choice.name}
                  </button>
                ))}
              </div>
              {attackFeedback && (
                <p role="status" className="mt-3 text-xs font-medium text-blue-800">
                  {attackFeedback}
                </p>
              )}
              <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setAttackIdx((i) => (i - 1 + CYBERATTACK_14_CONCEPTS.length) % CYBERATTACK_14_CONCEPTS.length);
                    setAttackFeedback(null);
                  }}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Concepto anterior
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAttackIdx((i) => (i + 1) % CYBERATTACK_14_CONCEPTS.length);
                    setAttackFeedback(null);
                  }}
                  className="bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Siguiente concepto
                </button>
              </div>
            </div>
          </div>

          <aside className="min-w-0 border border-slate-200 bg-white p-6 lg:col-span-5">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Catálogo de 14 amenazas educativas
            </h3>
            <ul className="mt-3 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
              {CYBERATTACK_14_CONCEPTS.map((c, idx) => {
                const done = attackMatches.includes(c.id);
                return (
                  <li key={c.id} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        setAttackIdx(idx);
                        setAttackFeedback(null);
                      }}
                      className={`w-full border px-2.5 py-1.5 text-left transition-colors break-words ${
                        done
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                          : idx === attackIdx
                            ? 'border-blue-600 bg-blue-50 text-blue-900'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {c.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      )}

      {/* 4. CYBERÓPOLIS */}
      {activeTool === 'cyberopolis' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 border border-slate-200 bg-white p-6 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Cyberópolis · Gestión de activos en Andina Logística S.A.S.
                </h2>
                <p className="text-xs text-slate-500">
                  Evalúa consecuencias pedagógicas de cada decisión organizacional (sin recopilar secretos reales).
                </p>
              </div>
              <span className="font-mono text-sm font-bold text-blue-700 tabular-nums shrink-0">
                {cybScore} / 100 pts
              </span>
            </div>

            {cybStep < CYBEROPOLIS_SCENARIOS.length ? (
              <div className="mt-5">
                <p className="font-mono text-xs text-slate-500">
                  Escenario {cybStep + 1} de {CYBEROPOLIS_SCENARIOS.length} · Zona: {CYBEROPOLIS_SCENARIOS[cybStep].area}
                </p>
                <p className="mt-2 text-base font-medium text-slate-900">
                  {CYBEROPOLIS_SCENARIOS[cybStep].prompt}
                </p>
                <div className="mt-4 space-y-2.5">
                  {CYBEROPOLIS_SCENARIOS[cybStep].options.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        const newScore = Math.min(100, cybScore + opt.points);
                        setCybScore(newScore);
                        setCybHistory([
                          ...cybHistory,
                          {
                            area: CYBEROPOLIS_SCENARIOS[cybStep].area,
                            choice: opt.label,
                            feedback: opt.feedback,
                            points: opt.points,
                          },
                        ]);
                        const nextStep = cybStep + 1;
                        setCybStep(nextStep);
                        if (nextStep >= CYBEROPOLIS_SCENARIOS.length) {
                          persist(
                            { cyberopolisScore: newScore },
                            `Cyberópolis completado con ${newScore}/100 puntos.`
                          );
                        }
                      }}
                      className="block w-full border border-slate-200 bg-slate-50/70 p-3.5 text-left text-sm text-slate-900 transition-colors hover:border-blue-700 hover:bg-blue-50"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <p className="font-display text-lg font-bold text-slate-900">
                  Recorrido de Cyberópolis completado ({cybScore} / 100 puntos)
                </p>
                {cybHistory.map((h, i) => (
                  <div key={i} className="border border-slate-200 p-3 text-xs">
                    <div className="flex justify-between font-medium text-slate-900">
                      <span>{h.area}</span>
                      <span className="font-mono tabular-nums">+{h.points} pts</span>
                    </div>
                    <p className="mt-1 text-slate-600">{h.feedback}</p>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setCybStep(0);
                    setCybScore(0);
                    setCybHistory([]);
                  }}
                  className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Reiniciar recorrido</span>
                </button>
              </div>
            )}
          </div>

          <aside className="min-w-0 border border-slate-200 bg-white p-5 lg:col-span-5 break-words">
            <img
              src="/src/assets/images/andina_logistica_campus_1795369237182.jpg"
              alt="Ilustración del centro de distribución ficticio de Andina Logística S.A.S. con bodega automatizada y oficinas."
              referrerPolicy="no-referrer"
              className="h-48 w-full object-cover border border-slate-200"
            />
            <h3 className="mt-4 font-display text-sm font-semibold text-slate-900">
              Mapa de activos ficticios · Andina Logística S.A.S.
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
              <li>· Sistema WMS central de despachos</li>
              <li>· Portal web de clientes y seguimiento</li>
              <li>· Red OT de bandas, escáneres y temperatura</li>
              <li>· Identidades administrativas y respaldos 3-2-1</li>
            </ul>
          </aside>
        </div>
      )}

      {/* 5. SALA DE CRISIS TTX (B10) */}
      {activeTool === 'crisisroom' && (
        <div className="mt-6 space-y-5">
          <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <strong>Simulación educativa de mesa (TTX):</strong> Sala de Crisis modela decisiones de comité cada 10 minutos sobre Andina Logística S.A.S.; no es una consola real de operación.
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            {[
              ['Operación WMS', crisisImpact.wmsOperacion],
              ['Confidencialidad', crisisImpact.confidencialidad],
              ['Confianza clientes', crisisImpact.confianza],
              ['Cumplimiento Ley 1581', crisisImpact.cumplimiento],
            ].map(([label, val]) => (
              <div key={String(label)} className="border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
                  {val} %
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="min-w-0 border border-slate-200 bg-white p-6 lg:col-span-7 break-words">
              {crisisIdx < CRISIS_INJECTIONS.length ? (
                <div>
                  <p className="font-mono text-xs text-blue-700">
                    {CRISIS_INJECTIONS[crisisIdx].time} · {CRISIS_INJECTIONS[crisisIdx].title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-800">
                    {CRISIS_INJECTIONS[crisisIdx].detail}
                  </p>
                  <div className="mt-4 space-y-2.5">
                    {CRISIS_INJECTIONS[crisisIdx].options.map((opt, idx) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const entry = `${CRISIS_INJECTIONS[crisisIdx].time}: ${opt}`;
                          const updatedLog = [...crisisLog, entry];
                          setCrisisLog(updatedLog);
                          if (idx === 0) {
                            setCrisisImpact((prev) => ({
                              wmsOperacion: Math.min(100, prev.wmsOperacion + 4),
                              confidencialidad: Math.min(100, prev.confidencialidad + 3),
                              confianza: Math.min(100, prev.confianza + 4),
                              cumplimiento: Math.min(100, prev.cumplimiento + 3),
                            }));
                          } else {
                            setCrisisImpact((prev) => ({
                              wmsOperacion: Math.max(20, prev.wmsOperacion - 15),
                              confidencialidad: Math.max(20, prev.confidencialidad - 12),
                              confianza: Math.max(20, prev.confianza - 15),
                              cumplimiento: Math.max(20, prev.cumplimiento - 18),
                            }));
                          }
                          const next = crisisIdx + 1;
                          setCrisisIdx(next);
                          if (next >= CRISIS_INJECTIONS.length) {
                            persist(
                              { crisisDecisions: updatedLog },
                              'Bitácora de Sala de Crisis TTX guardada.'
                            );
                          }
                        }}
                        className="block w-full border border-slate-200 bg-slate-50 p-3.5 text-left text-sm text-slate-900 hover:border-blue-700 hover:bg-blue-50"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    Inyecciones TTX completadas · Listo para Hot Wash y formato de resolución
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Usa el registro de decisiones adjunto para completar el formato de resolución oficial en la pestaña Actividades del bloque B10.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCrisisIdx(0);
                      setCrisisLog([]);
                      setCrisisImpact({ wmsOperacion: 80, confidencialidad: 85, confianza: 80, cumplimiento: 90 });
                    }}
                    className="mt-4 border border-slate-300 px-4 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50"
                  >
                    Reiniciar simulación TTX
                  </button>
                </div>
              )}
            </div>

            <aside className="min-w-0 border border-slate-200 bg-white p-6 lg:col-span-5 break-words">
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Bitácora del comité de crisis
              </h3>
              {crisisLog.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">
                  Aún no hay decisiones registradas. Selecciona una respuesta ante la primera inyección.
                </p>
              ) : (
                <ol className="mt-3 space-y-2 text-xs text-slate-700">
                  {crisisLog.map((item, i) => (
                    <li key={i} className="border-b border-slate-100 pb-2">
                      {item}
                    </li>
                  ))}
                </ol>
              )}
            </aside>
          </div>
        </div>
      )}

      {/* 6. SIMULACIÓN RED VS BLUE (B11-B12) */}
      {activeTool === 'redblue' && (
        <div className="mt-6 space-y-5">
          <div className="border border-slate-300 bg-slate-900 p-5 text-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs text-sky-300">
                  Simulación de mesa por turnos y cartas · Células de 8 (4 Red vs. 4 Blue) + White Cell
                </p>
                <h2 className="mt-1 font-display text-lg font-bold text-white">
                  Reglas de Enfrentamiento (ROE) y Marco Legal (Ley 1273 de 2009)
                </h2>
                <p className="mt-1 text-xs text-slate-300">
                  No se ejecutan ataques, escaneos ni recolección de credenciales. La calificación depende de la rúbrica R2, no de quién “gana” la partida.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={roeAccepted}
                  onChange={(e) => setRoeAccepted(e.target.checked)}
                />
                <span>Acepto ROE educativas y límites legales</span>
              </label>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="min-w-0 border border-slate-200 bg-white p-6 lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                  Ronda {rbRound} de 6 ({rbRound <= 3 ? 'Bloque B11' : 'Bloque B12'})
                </span>
                <span className="text-xs text-slate-500">
                  Entorno: Andina Logística S.A.S. (WMS, Portal, OT)
                </span>
              </div>

              {(rbRound === 3 || rbRound === 5) && (
                <div className="border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-950">
                  <p className="font-semibold">
                    {rbRound === 3 ? whiteInjections[0].title : whiteInjections[1].title}
                  </p>
                  <p className="mt-1">
                    {rbRound === 3 ? whiteInjections[0].description : whiteInjections[1].description}
                  </p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="min-w-0">
                  <label htmlFor="red-card-select" className="flex items-center gap-1.5 text-xs font-semibold text-red-700">
                    <Swords className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Carta conceptual Red (MITRE ATT&CK)</span>
                  </label>
                  <select
                    id="red-card-select"
                    value={selectedRedCardId}
                    onChange={(e) => setSelectedRedCardId(e.target.value)}
                    className="mt-1.5 w-full max-w-full border border-slate-300 bg-white p-2 text-xs text-slate-900"
                  >
                    {redCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} · {c.title}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-600 break-words">
                    {redCards.find((c) => c.id === selectedRedCardId)?.description}
                  </p>
                </div>

                <div className="min-w-0">
                  <label htmlFor="blue-card-select" className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                    <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Control defensivo Blue (NIST CSF 2.0)</span>
                  </label>
                  <select
                    id="blue-card-select"
                    value={selectedBlueCardId}
                    onChange={(e) => setSelectedBlueCardId(e.target.value)}
                    className="mt-1.5 w-full max-w-full border border-slate-300 bg-white p-2 text-xs text-slate-900"
                  >
                    {blueCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} · {c.title}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-600 break-words">
                    {blueCards.find((c) => c.id === selectedBlueCardId)?.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={!roeAccepted || rbRound > 6}
                onClick={() => {
                  const rCard = redCards.find((c) => c.id === selectedRedCardId)!;
                  const bCard = blueCards.find((c) => c.id === selectedBlueCardId)!;
                  const mitigated = rCard.counteredBy?.some((tag) => bCard.code.includes(tag.split(' ')[1] ?? tag));
                  const line = `Ronda ${rbRound}: Red [${rCard.code}] vs. Blue [${bCard.code}] → White Cell: ${
                    mitigated
                      ? 'Control efectivo; vector contenido y documentado.'
                      : 'Cobertura parcial; exige ajuste defensivo en siguiente ronda.'
                  }`;
                  setRbLogs([...rbLogs, line]);
                  persist(
                    { redBlueRoundsCompleted: rbRound },
                    `Ronda ${rbRound} registrada en bitácora Red vs. Blue.`
                  );
                  if (rbRound < 6) setRbRound((r) => r + 1);
                }}
                className="inline-flex items-center gap-2 bg-slate-900 px-4 py-2.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {!roeAccepted
                    ? 'Acepta las ROE para registrar ronda'
                    : `Resolver Ronda ${rbRound} (White Cell)`}
                </span>
              </button>
            </div>

            <aside className="min-w-0 border border-slate-200 bg-white p-6 lg:col-span-5 break-words">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  Bitácora de mesa (Rondas 1–6)
                </h3>
                <Award className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
              </div>
              {rbLogs.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">
                  Acepta las ROE educativas y resuelve la Ronda 1 para generar la bitácora trazable para el AAR de B12.
                </p>
              ) : (
                <ul className="mt-3 space-y-2 text-xs text-slate-700">
                  {rbLogs.map((l, i) => (
                    <li key={i} className="border-b border-slate-100 pb-2">
                      {l}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                <Lock className="inline h-3 w-3 mr-1" aria-hidden="true" />
                <span>Variante Cyber Range desactivada por defecto salvo autorización escrita institucional.</span>
              </div>
            </aside>
          </div>
        </div>
      )}
    </section>
  );
}
