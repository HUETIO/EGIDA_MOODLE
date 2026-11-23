import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Lock, ShieldAlert, Users } from 'lucide-react';
import type {
  BlockSpec,
  CourseConfig,
  CourseInstructorPublic,
  CourseResource,
  EvaluationComponent,
  InstitutionalAssumption,
  LearningOutcome,
  ModuleUnit,
  RubricDefinition,
  UserProfile,
} from '../shared/types.ts';
import { CourseCoverImage } from './CourseCoverImage.tsx';

export type OverviewTab =
  | 'resumen'
  | 'programa'
  | 'metodologia'
  | 'evaluacion'
  | 'recursos'
  | 'equipo';

interface DiplomaOverviewProps {
  course: CourseConfig;
  modules: ModuleUnit[];
  blocks: BlockSpec[];
  learningOutcomes: LearningOutcome[];
  evaluationComponents: EvaluationComponent[];
  rubrics: RubricDefinition[];
  resources: CourseResource[];
  instructors: CourseInstructorPublic[];
  assumptions: InstitutionalAssumption[];
  user: UserProfile;
  initialTab?: OverviewTab;
  onBackCatalog: () => void;
  onEnterClassroom: () => void;
  onRequestEnrollment: () => void;
}

const OVERVIEW_TABS: { id: OverviewTab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'programa', label: 'Programa' },
  { id: 'metodologia', label: 'Metodología' },
  { id: 'evaluacion', label: 'Evaluación' },
  { id: 'recursos', label: 'Recursos' },
  { id: 'equipo', label: 'Equipo docente/invitados' },
];

export function DiplomaOverview({
  course,
  modules,
  blocks,
  learningOutcomes,
  evaluationComponents,
  rubrics,
  resources,
  instructors,
  assumptions,
  user,
  initialTab = 'resumen',
  onBackCatalog,
  onEnterClassroom,
  onRequestEnrollment,
}: DiplomaOverviewProps) {
  const [activeTab, setActiveTab] = useState<OverviewTab>(initialTab);
  const [accessNotice, setAccessNotice] = useState<string | null>(null);

  useEffect(() => {
    const onHashOrPop = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('ficha') as OverviewTab | null;
      if (tabParam && OVERVIEW_TABS.some((t) => t.id === tabParam)) {
        setActiveTab(tabParam);
      }
    };
    window.addEventListener('popstate', onHashOrPop);
    return () => window.removeEventListener('popstate', onHashOrPop);
  }, []);

  const handleTabChange = (tab: OverviewTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('ficha', tab);
    window.history.pushState({}, '', url.toString());
  };

  const canEnter =
    user.role === 'profesor' ||
    (user.role === 'estudiante' && user.enrolledCourseIds.includes(course.id));

  return (
    <section aria-labelledby="overview-title" className="mx-auto max-w-6xl px-6 py-8">
      <button
        type="button"
        onClick={onBackCatalog}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>Volver al catálogo</span>
      </button>

      {/* Hero split */}
      <div className="mt-5 grid gap-8 border border-slate-200 bg-white lg:grid-cols-12 items-stretch">
        <div className="min-w-0 flex flex-col justify-between p-6 lg:col-span-7 break-words">
          <div>
            <p className="text-xs font-mono text-slate-500 tabular-nums">
              {course.code} · {course.typeLabel} · {course.totalHours} horas totales
            </p>
            <h1
              id="overview-title"
              className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
              style={{ textWrap: 'balance' }}
            >
              {course.title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {course.subtitle}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs sm:grid-cols-4 tabular-nums">
              <div>
                <p className="text-slate-500">Componente base (B01–B15)</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">{course.formativeHours} h</p>
              </div>
              <div>
                <p className="text-slate-500">Complementario (C01–C05)</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">10 h</p>
              </div>
              <div>
                <p className="text-slate-500">Balance</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">70 % P / 30 % T</p>
              </div>
              <div>
                <p className="text-slate-500">Modalidad</p>
                <p className="mt-0.5 font-medium text-slate-900">{course.modality}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
            {canEnter ? (
              <button
                type="button"
                onClick={onEnterClassroom}
                className="inline-flex items-center gap-2 bg-blue-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800 sm:whitespace-nowrap"
              >
                <span>Entrar al aula</span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="inline-flex items-center gap-2 border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-500 cursor-not-allowed sm:whitespace-nowrap text-left"
                >
                  <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Aula bloqueada (requiere inicio de sesión)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (user.role === 'solo_lectura') {
                      setAccessNotice(
                        `El acceso al aula y las áreas prácticas requiere iniciar sesión. Selecciona un perfil autorizado o contacta a ${course.readOnlyPolicy.contactEmail}.`
                      );
                    }
                    onRequestEnrollment();
                  }}
                  className="inline-flex items-center gap-2 bg-blue-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800 sm:whitespace-nowrap"
                >
                  <span>Iniciar sesión / Solicitar acceso</span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          {accessNotice && (
            <p role="status" className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 break-words">
              {accessNotice}
            </p>
          )}
        </div>

        <div className="min-w-0 lg:col-span-5 min-h-56">
          <CourseCoverImage
            imageKey={course.coverImageKey}
            imageUrl={course.coverImageUrl}
            alt={course.coverImageAlt}
            title={course.title}
            className="h-full w-full min-h-56"
          />
        </div>
      </div>

      {/* Tabs navigation */}
      <div
        role="tablist"
        aria-label="Secciones de la ficha del diplomado"
        className="mt-8 flex items-center gap-1 overflow-x-auto border-b border-slate-200"
      >
        {OVERVIEW_TABS.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                selected
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="mt-6">
        {activeTab === 'resumen' && (
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="min-w-0 space-y-6 lg:col-span-8 break-words">
              <div className="min-w-0 border border-slate-200 bg-white p-6">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Competencia general
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {course.generalCompetence}
                </p>
              </div>
              <div className="border border-slate-200 bg-white p-6">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Público objetivo y requisitos
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  <strong className="font-medium text-slate-900">A quién va dirigido:</strong>{' '}
                  {course.targetAudience}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  <strong className="font-medium text-slate-900">Requisitos de entrada:</strong>{' '}
                  {course.prerequisites}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  <strong className="font-medium text-slate-900">Escenario transversal:</strong>{' '}
                  Andina Logística S.A.S. (empresa ficticia de logística con sistema WMS, portal de clientes y red OT).
                </p>
              </div>
              <div className="border border-slate-200 bg-white p-6">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Resultados de aprendizaje (RA1–RA7) y trazabilidad
                </h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs text-slate-500">
                        <th className="py-2 pr-3 font-medium">Código</th>
                        <th className="py-2 pr-3 font-medium">Resultado de aprendizaje</th>
                        <th className="py-2 pr-3 font-medium">Bloques</th>
                        <th className="py-2 font-medium">Evidencias / Criterio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {learningOutcomes.map((ra) => (
                        <tr key={ra.id} className="align-top">
                          <td className="py-3 pr-3 font-mono text-xs font-semibold text-blue-700">
                            {ra.code}
                          </td>
                          <td className="py-3 pr-3 text-slate-700">{ra.description}</td>
                          <td className="py-3 pr-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                            {ra.linkedBlocks.join(', ')}
                          </td>
                          <td className="py-3 text-xs text-slate-600">
                            {ra.linkedEvidences.join(', ')} · {ra.thresholdText}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <aside className="min-w-0 space-y-6 lg:col-span-4 break-words">
              <div className="min-w-0 border border-slate-200 bg-white p-6">
                <h3 className="font-display text-base font-semibold text-slate-900">
                  Supuestos pendientes de validación institucional
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  La institución debe confirmar estas decisiones antes de certificar el programa.
                </p>
                <ul className="mt-4 space-y-2.5 text-xs">
                  {assumptions.slice(0, 6).map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                      <span className="min-w-0 flex-1 text-slate-700 break-words">
                        <strong className="font-mono text-slate-900">{a.code}</strong> · {a.title}
                      </span>
                      <span
                        className={`shrink-0 font-medium ${
                          a.status === 'validado_institucion' ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {a.status === 'validado_institucion' ? 'Validado' : 'Provisional'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        )}

        {activeTab === 'programa' && (
          <div className="space-y-6">
            <div className="border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-slate-900">
                    Estructura curricular completa: 6 módulos base, evaluación, invitados y 5 bloques complementarios (40 h)
                  </h2>
                  <p className="text-xs text-slate-500 tabular-nums">
                    20 bloques de 2 horas · 30 h base (B01–B15) + 10 h complementarias (C01–C05) · 720 min teoría / 1680 min práctica
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-6">
                {modules.map((mod) => {
                  const modBlocks = blocks.filter((b) => b.moduleId === mod.id);
                  return (
                    <div key={mod.id} className="border-b border-slate-200 pb-5 last:border-b-0 last:pb-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="font-display text-base font-semibold text-slate-900">
                          {mod.code}. {mod.title}
                        </h3>
                        <span className="font-mono text-xs text-slate-600 tabular-nums">
                          {mod.blockIds.join('–')} · {mod.hours} horas
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{mod.description}</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {modBlocks.map((b) => (
                          <div key={b.id} className="border border-slate-200 bg-slate-50/70 p-4">
                            <div className="flex items-center justify-between gap-2 text-xs font-mono text-slate-500 tabular-nums">
                              <span>
                                {b.code} ({b.hourRange}) · {b.learningOutcomeIds.join(', ')}
                              </span>
                              <span>
                                {b.theoryMinutes}m T / {b.practiceMinutes}m P
                              </span>
                            </div>
                            <p className="mt-1 font-medium text-sm text-slate-900">{b.title}</p>
                            <p className="mt-1 text-xs text-slate-600">{b.objective}</p>
                            {user.role === 'solo_lectura' && (
                              <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500">
                                <Lock className="h-3 w-3" aria-hidden="true" />
                                <span>Contenido del aula habilitado al iniciar sesión</span>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'metodologia' && (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="min-w-0 border border-slate-200 bg-white p-6 lg:col-span-7 break-words">
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Ciclo didáctico en cada bloque de 2 horas
              </h2>
              <p className="mt-2 text-sm text-slate-600">{course.methodologySummary}</p>
              <ol className="mt-5 space-y-3">
                {[
                  ['01. Activar', 'Pregunta detonante, reto breve o diagnóstico de conocimientos previos.'],
                  ['02. Modelar', 'Microclase de 25 a 40 minutos máximo con ejemplos claros sin tecnicismos innecesarios.'],
                  ['03. Practicar', 'Taller guiado individual, en parejas o equipos de cuatro sobre escenarios seguros.'],
                  ['04. Transferir', 'Aplicación directa a la organización ficticia Andina Logística S.A.S.'],
                  ['05. Verificar', 'Cuestionario, rúbrica, coevaluación o ticket de salida.'],
                ].map(([title, desc]) => (
                  <li key={title} className="border border-slate-200 p-3.5">
                    <p className="font-display text-sm font-semibold text-slate-900">{title}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{desc}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className="min-w-0 border border-slate-200 bg-white p-6 lg:col-span-5 break-words">
              <h3 className="font-display text-base font-semibold text-slate-900">
                Métodos activos y organización colaborativa
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {course.methodologyMethods.map((m) => (
                  <li key={m} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-600 space-y-1.5">
                <p><strong className="text-slate-900">Equipos base:</strong> 4 personas estables divididas en parejas fijas.</p>
                <p><strong className="text-slate-900">Roles rotativos:</strong> Líder, Analista técnico, Analista legal/negocio y Relator sin repetir en talleres consecutivos.</p>
                <p><strong className="text-slate-900">Simulación Red vs. Blue:</strong> Células de 8 (4 vs. 4) en tablero de mesa.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'evaluacion' && (
          <div className="space-y-6">
            <div className="border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
              <div className="text-xs text-amber-900">
                <p className="font-semibold">
                  Criterios de aprobación vigentes en estado provisional (pendiente de validación institucional · SO-6)
                </p>
                <p className="mt-1">
                  Escala {course.gradingPolicy.scaleMin.toFixed(1)} a {course.gradingPolicy.scaleMax.toFixed(1)} · Umbral propuesto: nota final ≥ {course.gradingPolicy.passingScore.toFixed(1)}/5,0 y asistencia ≥ {course.gradingPolicy.minAttendancePercent} % (32/40 h). Coevaluación grupal configurable entre {course.gradingPolicy.coEvaluationMinFactor} y {course.gradingPolicy.coEvaluationMaxFactor}.
                </p>
              </div>
            </div>

            <div className="border border-slate-200 bg-white p-6">
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Componentes y ponderación (Total = 100 %)
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2 pr-4 font-medium">Componente</th>
                      <th className="py-2 pr-4 font-medium">Evidencias asociadas</th>
                      <th className="py-2 pr-4 font-medium">Rúbrica</th>
                      <th className="py-2 text-right font-medium">Peso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {evaluationComponents.map((comp) => (
                      <tr key={comp.id}>
                        <td className="py-3 pr-4 font-medium text-slate-900">{comp.name}</td>
                        <td className="py-3 pr-4 text-slate-600">{comp.evidences}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-slate-600">{comp.rubricCode ?? 'Lista / Automática'}</td>
                        <td className="py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {comp.weightPercent} %
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-slate-300 bg-slate-50 font-semibold">
                      <td className="py-3 pr-4" colSpan={3}>Total del programa</td>
                      <td className="py-3 text-right font-mono tabular-nums">
                        {evaluationComponents.reduce((a, c) => a + c.weightPercent, 0)} %
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {rubrics.map((r) => (
                <div key={r.id} className="min-w-0 border border-slate-200 bg-white p-5 break-words">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-base font-semibold text-slate-900">
                      {r.code} · {r.title}
                    </h3>
                    <span className="font-mono text-xs text-slate-500">{r.version}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{r.note}</p>
                  <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
                    {r.criteria.map((c) => (
                      <li key={c.id} className="flex justify-between gap-2 text-slate-700">
                        <span className="min-w-0 flex-1 break-words">{c.name}</span>
                        <span className="font-mono font-medium tabular-nums shrink-0">{c.weightPercent} %</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'recursos' && (
          <div className="min-w-0 border border-slate-200 bg-white p-6 break-words">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Materiales del aula
            </h2>
            {user.role === 'solo_lectura' ? (
              <div className="mt-3 border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
                <div className="flex items-start gap-3">
                  <Lock className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
                  <div className="min-w-0 flex-1 break-words">
                    <p className="font-medium text-slate-900">
                      Materiales reservados para participantes con sesión iniciada
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      En modo solo lectura únicamente se habilita la consulta del catálogo público y la ficha del programa. Inicia sesión como estudiante o profesor para acceder a guías, simuladores, cuestionarios y entregables.
                    </p>
                    <button
                      type="button"
                      onClick={onRequestEnrollment}
                      className="mt-4 inline-flex items-center gap-1.5 bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800"
                    >
                      <span>Iniciar sesión</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-1 text-xs text-slate-500">
                  Se listan recursos requeridos y opcionales conforme a tus permisos vigentes.
                </p>
                <div className="mt-4 divide-y divide-slate-100">
                  {resources.map((res) => (
                    <div key={res.id} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1 break-words">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500">
                          <span>{res.blockId}</span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{res.type.replace('_', ' ')}</span>
                          <span aria-hidden="true">·</span>
                          <span>{res.required ? 'Requerido' : 'Opcional'}</span>
                        </div>
                        <p className="mt-0.5 text-sm font-medium text-slate-900">{res.title}</p>
                        <p className="text-xs text-slate-500">
                          {res.durationOrSize} · {res.attribution}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600 shrink-0">
                        <FileText className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        <span>{res.hasSpanishSubtitles ? 'Subtítulos ES / Transcripción' : 'Acceso en aula'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'equipo' && (
          <div className="grid gap-6 md:grid-cols-3">
            {instructors.map((inst) => (
              <div key={inst.id} className="border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  <span>Perfil con publicación autorizada</span>
                </div>
                <h3 className="mt-2 font-display text-base font-semibold text-slate-900">
                  {inst.name}
                </h3>
                <p className="text-xs font-medium text-slate-600">{inst.roleTitle}</p>
                <p className="mt-2 text-xs text-slate-500">{inst.area}</p>
                <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-700">
                  {inst.bio}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
