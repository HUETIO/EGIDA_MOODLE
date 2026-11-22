import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Flag,
  Lock,
  MessageSquare,
  Play,
  Save,
  Send,
  Shield,
} from 'lucide-react';
import type {
  ActivityDefinition,
  BlockSpec,
  CalendarEventItem,
  CaseStudySpec,
  CourseConfig,
  CourseResource,
  ForumPost,
  LearningOutcome,
  ModuleUnit,
  PhishingTrainingSample,
  QuizAttemptRecord,
  QuizDefinition,
  RubricDefinition,
  SubmissionRecord,
  UserProfile,
} from '../shared/types.ts';
import type { StudentGradeSummary } from '../../server/grading.ts';
import type { InteractiveToolId } from './interactives/InteractivesHub.tsx';

export type ClassroomTab =
  | 'contenido'
  | 'actividades'
  | 'cuestionarios'
  | 'calificaciones'
  | 'recursos'
  | 'foro'
  | 'calendario';

interface ClassroomViewProps {
  user: UserProfile;
  course: CourseConfig;
  modules: ModuleUnit[];
  blocks: BlockSpec[];
  learningOutcomes: LearningOutcome[];
  resources: CourseResource[];
  activities: ActivityDefinition[];
  quizzes: QuizDefinition[];
  rubrics: RubricDefinition[];
  caseStudies: CaseStudySpec[];
  phishingSamples: PhishingTrainingSample[];
  submissions: SubmissionRecord[];
  quizAttempts: QuizAttemptRecord[];
  summary?: StudentGradeSummary;
  calendarEvents: CalendarEventItem[];
  forumPosts: ForumPost[];
  initialBlockId?: string;
  initialTab?: ClassroomTab;
  onSaveDraft: (payload: {
    activityId: string;
    answers: Record<string, string>;
    aiAssistanceDeclared: boolean;
    aiAssistanceDetail?: string;
  }) => Promise<void>;
  onSubmitActivity: (payload: {
    activityId: string;
    answers: Record<string, string>;
    aiAssistanceDeclared: boolean;
    aiAssistanceDetail?: string;
  }) => Promise<void>;
  onSubmitQuiz: (quizId: string, answers: Record<string, number>) => Promise<QuizAttemptRecord>;
  onCreateForumPost: (payload: {
    channel: 'anuncios' | 'discusion_general' | 'coordinacion_equipo';
    title: string;
    body: string;
  }) => Promise<void>;
  onReportForumPost: (postId: string, reason: string) => Promise<void>;
  onLaunchInteractive: (toolId: InteractiveToolId) => void;
  onOpenTeacherWorkspace?: () => void;
}

const CLASSROOM_TABS: { id: ClassroomTab; label: string }[] = [
  { id: 'contenido', label: 'Contenido' },
  { id: 'actividades', label: 'Actividades' },
  { id: 'cuestionarios', label: 'Cuestionarios' },
  { id: 'calificaciones', label: 'Entregas y calificaciones' },
  { id: 'recursos', label: 'Recursos' },
  { id: 'foro', label: 'Foro / colaboración' },
  { id: 'calendario', label: 'Calendario' },
];

export function ClassroomView({
  user,
  course,
  modules,
  blocks,
  learningOutcomes,
  resources,
  activities,
  quizzes,
  rubrics,
  caseStudies,
  phishingSamples,
  submissions,
  quizAttempts,
  summary,
  calendarEvents,
  forumPosts,
  initialBlockId = 'B01',
  initialTab = 'contenido',
  onSaveDraft,
  onSubmitActivity,
  onSubmitQuiz,
  onCreateForumPost,
  onReportForumPost,
  onLaunchInteractive,
  onOpenTeacherWorkspace,
}: ClassroomViewProps) {
  const [selectedBlockId, setSelectedBlockId] = useState(initialBlockId);
  const [activeTab, setActiveTab] = useState<ClassroomTab>(initialTab);
  const [teacherStudentPreview, setTeacherStudentPreview] = useState(false);

  // Activity form state
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [aiDeclared, setAiDeclared] = useState(false);
  const [aiDetail, setAiDetail] = useState('');
  const [dirtyDraft, setDirtyDraft] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [reviewedBlocks, setReviewedBlocks] = useState<string[]>([]);

  // Quiz state
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<QuizAttemptRecord | null>(null);
  const [confirmQuizOpen, setConfirmQuizOpen] = useState(false);

  // Resource filters
  const [resModuleFilter, setResModuleFilter] = useState('all');
  const [resTypeFilter, setResTypeFilter] = useState('all');
  const [resSearch, setResSearch] = useState('');
  const [expandedTranscriptId, setExpandedTranscriptId] = useState<string | null>(null);

  // Forum state
  const [forumChannel, setForumChannel] = useState<'anuncios' | 'discusion_general' | 'coordinacion_equipo'>('discusion_general');
  const [forumTitle, setForumTitle] = useState('');
  const [forumBody, setForumBody] = useState('');
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');

  // Calendar filter
  const [calFilter, setCalFilter] = useState<string>('all');
  const [expandedModuleIds, setExpandedModuleIds] = useState<string[]>(() => {
    const initialMod = blocks.find((b) => b.id === initialBlockId)?.moduleId;
    return initialMod ? [initialMod] : modules[0] ? [modules[0].id] : [];
  });

  const isReadOnly = user.role === 'solo_lectura';
  const effectiveRole =
    user.role === 'profesor' && teacherStudentPreview ? 'estudiante' : user.role;

  const currentBlockIdx = Math.max(0, blocks.findIndex((b) => b.id === selectedBlockId));
  const currentBlock = blocks[currentBlockIdx] ?? blocks[0];
  const blockResources = resources.filter((r) => r.blockId === currentBlock?.id);
  const blockActivity = activities.find((a) => a.blockId === currentBlock?.id);
  const blockQuiz = quizzes.find((q) => q.blockId === currentBlock?.id);
  const existingSubmission = submissions.find((s) => s.activityId === blockActivity?.id);
  const blockLockedForReadOnly =
    isReadOnly && !course.readOnlyPolicy.publicSampleBlockIds.includes(currentBlock?.id ?? '');

  useEffect(() => {
    if (currentBlock?.moduleId) {
      setExpandedModuleIds((prev) =>
        prev.includes(currentBlock.moduleId) ? prev : [...prev, currentBlock.moduleId]
      );
    }
  }, [currentBlock?.moduleId]);

  const toggleModuleAccordion = (moduleId: string) => {
    setExpandedModuleIds((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  const allModulesExpanded =
    modules.length > 0 && modules.every((m) => expandedModuleIds.includes(m.id));

  // Load existing answers when changing block
  useEffect(() => {
    if (existingSubmission) {
      setDraftAnswers(existingSubmission.answers);
      setAiDeclared(existingSubmission.aiAssistanceDeclared);
      setAiDetail(existingSubmission.aiAssistanceDetail ?? '');
    } else {
      setDraftAnswers({});
      setAiDeclared(false);
      setAiDetail('');
    }
    setDirtyDraft(false);
    setConfirmSubmitOpen(false);
    setActiveQuizId(null);
    setQuizResult(null);
    setQuizAnswers({});
  }, [selectedBlockId, existingSubmission?.id]);

  const handleSelectBlock = async (nextBlockId: string) => {
    if (dirtyDraft && blockActivity && user.role === 'estudiante' && !isReadOnly) {
      try {
        await onSaveDraft({
          activityId: blockActivity.id,
          answers: draftAnswers,
          aiAssistanceDeclared: aiDeclared,
          aiAssistanceDetail: aiDetail,
        });
        setStatusBanner({ kind: 'ok', text: `Borrador guardado automáticamente antes de cambiar a ${nextBlockId}.` });
      } catch {
        setStatusBanner({ kind: 'err', text: 'No se pudo guardar el borrador pendiente antes de cambiar de bloque.' });
      }
    }
    setSelectedBlockId(nextBlockId);
  };

  const getBlockStateLabel = (block: BlockSpec) => {
    if (isReadOnly && !course.readOnlyPolicy.publicSampleBlockIds.includes(block.id)) {
      return 'Bloqueado';
    }
    const sub = submissions.find((s) => s.blockId === block.id);
    if (sub?.status === 'calificada') return 'Evaluado';
    if (sub?.status === 'entregada') return 'Entregado';
    if (sub?.status === 'borrador' || reviewedBlocks.includes(block.id)) return 'En curso';
    return 'Disponible';
  };

  const wordCount = (draftAnswers['cuerpo_ensayo'] ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <section aria-label="Aula del diplomado" className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      {user.role === 'profesor' && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-slate-200 bg-white px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Eye className="h-4 w-4 text-blue-700" aria-hidden="true" />
            <span>
              {teacherStudentPreview
                ? 'Modo vista previa como estudiante activo (los cambios no alteran datos reales).'
                : 'Estás viendo el aula con privilegios de profesor asignado.'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTeacherStudentPreview((v) => !v)}
              className="border border-slate-300 bg-slate-50 px-3 py-1.5 font-medium text-slate-800 hover:bg-slate-100"
            >
              {teacherStudentPreview ? 'Salir de vista estudiante' : 'Previsualizar como estudiante'}
            </button>
            {onOpenTeacherWorkspace && (
              <button
                type="button"
                onClick={onOpenTeacherWorkspace}
                className="bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
              >
                Ir a Área del profesor
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid w-full gap-6 lg:grid-cols-12 lg:items-stretch">
        {/* Left Sidebar: Collapsible Modules & Blocks B01-B15 */}
        <aside
          aria-label="Navegación de módulos y bloques"
          className="min-w-0 flex flex-col border border-slate-200 bg-white p-4 shadow-xs lg:col-span-3 lg:h-full"
        >
          <div className="border-b border-slate-100 pb-3">
            <p className="font-mono text-xs text-slate-500">{course.code}</p>
            <h2 className="font-display text-sm font-bold text-slate-900">{course.title}</h2>
            <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
              {course.formativeHours} h formación + {course.guestHours} h invitados
            </p>

            {(() => {
              const completedCount = blocks.filter((b) => {
                const state = getBlockStateLabel(b);
                return state === 'Evaluado' || state === 'Entregado';
              }).length;
              const pct = blocks.length > 0 ? Math.round((completedCount / blocks.length) * 100) : 0;
              return (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-600 tabular-nums">
                    <span>Avance de entregas</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {completedCount}/{blocks.length} ({pct} %)
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden bg-slate-100">
                    <div
                      className="h-full bg-indigo-700 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            <div className="mt-3 flex items-center justify-between gap-2 pt-1">
              <span className="text-[11px] font-medium text-slate-500">
                Módulos del recorrido
              </span>
              <button
                type="button"
                onClick={() =>
                  setExpandedModuleIds(allModulesExpanded ? [] : modules.map((m) => m.id))
                }
                className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
              >
                {allModulesExpanded ? 'Contraer todo' : 'Expandir todo'}
              </button>
            </div>
          </div>

          <nav className="mt-3 flex-1 min-h-0 space-y-2 overflow-y-auto pr-1">
            {modules.map((mod) => {
              const modBlocks = blocks.filter((b) => b.moduleId === mod.id);
              const isExpanded = expandedModuleIds.includes(mod.id);
              const containsCurrent = modBlocks.some((b) => b.id === currentBlock?.id);
              const modDoneCount = modBlocks.filter((b) => {
                const st = getBlockStateLabel(b);
                return st === 'Evaluado' || st === 'Entregado';
              }).length;

              return (
                <div
                  key={mod.id}
                  className={`border transition-colors ${
                    containsCurrent
                      ? 'border-indigo-200 bg-indigo-50/40'
                      : 'border-slate-200 bg-slate-50/40'
                  }`}
                >
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => toggleModuleAccordion(mod.id)}
                    className={`flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left transition-colors ${
                      containsCurrent
                        ? 'bg-indigo-50/90 text-indigo-950 hover:bg-indigo-100/70'
                        : 'bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 font-mono text-[11px] tabular-nums">
                        <span className={containsCurrent ? 'font-semibold text-indigo-800' : 'text-slate-500'}>
                          {mod.code} · {mod.hours} h
                        </span>
                        <span className={modDoneCount === modBlocks.length && modBlocks.length > 0 ? 'font-semibold text-emerald-700' : 'text-slate-500'}>
                          {modDoneCount}/{modBlocks.length}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs font-semibold leading-snug text-slate-900">
                        {mod.title}
                      </p>
                    </div>
                    <span className="mt-0.5 shrink-0 text-slate-500">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      )}
                    </span>
                  </button>

                  {isExpanded && (
                    <ul className="space-y-1 border-t border-slate-200/80 bg-white p-1.5">
                      {modBlocks.map((b) => {
                        const active = b.id === currentBlock?.id;
                        const state = getBlockStateLabel(b);
                        return (
                          <li key={b.id}>
                            <button
                              type="button"
                              onClick={() => handleSelectBlock(b.id)}
                              aria-current={active ? 'step' : undefined}
                              className={`w-full border px-2.5 py-2 text-left transition-all ${
                                active
                                  ? 'border-indigo-700 bg-indigo-700 text-white shadow-sm'
                                  : 'border-transparent bg-slate-50/70 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/50'
                              }`}
                            >
                              <div
                                className={`flex items-center justify-between gap-2 text-[11px] font-mono ${
                                  active ? 'text-indigo-100' : 'text-slate-500'
                                }`}
                              >
                                <span>{b.code} · {b.hourRange}</span>
                                <span
                                  className={`inline-flex items-center gap-1 font-sans font-medium ${
                                    active
                                      ? 'text-white'
                                      : state === 'Evaluado' || state === 'Entregado'
                                        ? 'text-emerald-700'
                                        : state === 'Bloqueado'
                                          ? 'text-slate-400'
                                          : state === 'En curso'
                                            ? 'text-amber-700'
                                            : 'text-slate-600'
                                  }`}
                                >
                                  {state === 'Bloqueado' ? (
                                    <Lock className="h-3 w-3" aria-hidden="true" />
                                  ) : state === 'Evaluado' || state === 'Entregado' ? (
                                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                                  ) : (
                                    <Clock className="h-3 w-3" aria-hidden="true" />
                                  )}
                                  <span>{state}</span>
                                </span>
                              </div>
                              <p
                                className={`mt-0.5 text-xs font-medium leading-snug ${
                                  active ? 'text-white' : 'text-slate-900'
                                }`}
                              >
                                {b.title}
                              </p>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main Classroom Area */}
        <div className="min-w-0 space-y-5 lg:col-span-9">
          {/* Block Header */}
          {currentBlock && (
            <div className="min-w-0 border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-500 tabular-nums">
                <span>
                  Bloque {currentBlock.code} ({currentBlock.hourRange}) · {currentBlock.learningOutcomeIds.join(', ')}
                </span>
                <span>
                  {currentBlock.durationMinutes} min ({currentBlock.theoryMinutes} min teoría · {currentBlock.practiceMinutes} min práctica)
                </span>
              </div>
              <h1 className="mt-1.5 font-display text-xl font-bold text-slate-900 sm:text-2xl">
                {currentBlock.title}
              </h1>
              <p className="mt-2 text-sm text-slate-700">
                <strong className="font-medium text-slate-900">Objetivo:</strong> {currentBlock.objective}
              </p>

              {/* Classroom 7 Tabs */}
              <div
                role="tablist"
                aria-label="Pestañas del aula"
                className="mt-5 flex items-center gap-1.5 overflow-x-auto rounded-lg border border-slate-200 bg-slate-100 p-1.5"
              >
                {CLASSROOM_TABS.map((t) => {
                  const disabledForReadOnly =
                    isReadOnly &&
                    ['calificaciones', 'foro', 'cuestionarios'].includes(t.id);
                  const selected = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      role="tab"
                      type="button"
                      disabled={disabledForReadOnly}
                      aria-selected={selected}
                      onClick={() => setActiveTab(t.id)}
                      className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 ${
                        selected
                          ? 'bg-indigo-700 text-white shadow-sm'
                          : 'bg-white/75 text-slate-800 hover:bg-white hover:text-indigo-700'
                      } disabled:bg-transparent disabled:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {statusBanner && (
            <div
              role="status"
              className={`border px-4 py-3 text-xs flex items-center justify-between ${
                statusBanner.kind === 'ok'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-red-200 bg-red-50 text-red-900'
              }`}
            >
              <span>{statusBanner.text}</span>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="font-medium underline"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* TAB 1: CONTENIDO */}
          {activeTab === 'contenido' && currentBlock && (
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="min-w-0 space-y-5 lg:col-span-8">
                {blockLockedForReadOnly ? (
                  <div className="border border-slate-200 bg-white p-8">
                    <Lock className="h-6 w-6 text-slate-400" aria-hidden="true" />
                    <h2 className="mt-3 font-display text-lg font-semibold text-slate-900">
                      Contenido completo reservado para matrícula activa
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      La vista de solo lectura únicamente habilita la muestra pública del bloque B01 y el programa general. Para recorrer {currentBlock.code}, inicia sesión con una cuenta de estudiante o profesor autorizado.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Espacio de actividad y entregable resaltado */}
                    <div
                      className={`min-w-0 border p-5 sm:p-6 ${
                        existingSubmission?.status === 'entregada' ||
                        existingSubmission?.status === 'calificada'
                          ? 'border-emerald-300 bg-emerald-50/75'
                          : 'border-amber-300 bg-amber-50/85'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p
                            className={`font-mono text-xs font-semibold uppercase tracking-wide break-words ${
                              existingSubmission?.status === 'entregada' ||
                              existingSubmission?.status === 'calificada'
                                ? 'text-emerald-800'
                                : 'text-amber-900'
                            }`}
                          >
                            {existingSubmission?.status === 'calificada'
                              ? `Entregable evaluado · ${currentBlock.code}`
                              : existingSubmission?.status === 'entregada'
                                ? `Evidencia entregada · ${currentBlock.code}`
                                : `Qué debes entregar · ${currentBlock.code}`}
                          </p>
                          <h2 className="font-display text-lg font-bold text-slate-900 break-words">
                            {blockActivity
                              ? `${blockActivity.code} · ${blockActivity.title}`
                              : currentBlock.activityTitle}
                          </h2>
                          {blockActivity && (
                            <p className="text-xs text-slate-700 tabular-nums">
                              Modalidad: {blockActivity.mode.replace('_', ' ')} · ~{blockActivity.estimatedMinutes} min · Fecha límite: {new Date(blockActivity.dueDateIso).toLocaleDateString('es-CO')}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 max-w-full">
                          <button
                            type="button"
                            onClick={() => setActiveTab('actividades')}
                            className={`inline-flex max-w-full items-center gap-2 px-4 py-2 text-xs font-semibold text-white transition-colors text-left sm:whitespace-nowrap ${
                              existingSubmission?.status === 'entregada' ||
                              existingSubmission?.status === 'calificada'
                                ? 'bg-emerald-700 hover:bg-emerald-800'
                                : 'bg-amber-700 hover:bg-amber-800'
                            }`}
                          >
                            <Send className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>
                              {blockActivity
                                ? existingSubmission?.status === 'entregada' ||
                                  existingSubmission?.status === 'calificada'
                                  ? 'Ver entrega en Actividades'
                                  : 'Ir a Actividades para entregar'
                                : 'Ir a Actividades'}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          </button>

                          {blockQuiz && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveQuizId(blockQuiz.id);
                                setActiveTab('cuestionarios');
                              }}
                              className="inline-flex items-center gap-1.5 border border-indigo-300 bg-white px-3.5 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-50 sm:whitespace-nowrap"
                            >
                              <span>Ir a {blockQuiz.code}</span>
                              <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div
                        className={`mt-4 border p-4 text-xs break-words ${
                          existingSubmission?.status === 'entregada' ||
                          existingSubmission?.status === 'calificada'
                            ? 'border-emerald-200 bg-white/90 text-emerald-950'
                            : 'border-amber-200 bg-white/95 text-slate-800'
                        }`}
                      >
                        <p className="font-semibold text-slate-900">
                          Evidencia por entregar:
                        </p>
                        <p className="mt-1 leading-relaxed text-slate-700 break-words">
                          {currentBlock.expectedEvidence}
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-600">
                          <span className="min-w-0 break-words">
                            <strong className="text-slate-900">Criterio:</strong> {currentBlock.completionCriterion}
                          </span>
                          <span className="font-mono font-semibold text-slate-800 break-words">
                            {existingSubmission
                              ? `Estado actual: ${existingSubmission.status.toUpperCase()}${
                                  existingSubmission.receiptCode
                                    ? ` · ${existingSubmission.receiptCode}`
                                    : ''
                                }`
                              : 'Estado actual: PENDIENTE DE ENTREGA'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border border-slate-200 bg-white p-6">
                      <h2 className="font-display text-base font-semibold text-slate-900">
                        Secuencia didáctica del bloque (2 horas)
                      </h2>
                      <ol className="mt-4 space-y-2.5">
                        {currentBlock.agenda.map((step) => (
                          <li key={step.stage} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2.5 last:border-b-0 text-sm">
                            <div>
                              <span className="font-semibold text-slate-900">{step.stage}:</span>{' '}
                              <span className="text-slate-700">{step.summary}</span>
                            </div>
                            <span className="font-mono text-xs text-slate-500 whitespace-nowrap tabular-nums">
                              {step.minutes} min
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Recursos y materiales enmarcados como complementos */}
                    <div className="min-w-0 border border-sky-200 bg-sky-50/40 p-5 sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-sky-200/70 pb-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-sky-800">
                            Material de apoyo complementario
                          </p>
                          <h2 className="mt-0.5 font-display text-base font-semibold text-slate-900">
                            Recursos y materiales complementarios del bloque
                          </h2>
                          <p className="mt-1 text-xs text-slate-600">
                            Estos materiales sirven de consulta y refuerzo para preparar tu entrega en Actividades; no sustituyen la evidencia evaluable.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('recursos')}
                          className="inline-flex items-center gap-1 border border-sky-300 bg-white px-3 py-1.5 text-xs font-medium text-sky-900 hover:bg-sky-50 whitespace-nowrap shrink-0"
                        >
                          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Biblioteca completa</span>
                        </button>
                      </div>

                      {blockResources.length === 0 ? (
                        <p className="mt-3 text-xs text-slate-600">
                          Este bloque no requiere lecturas adicionales; consulta la biblioteca de Recursos para materiales transversales del módulo.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2.5">
                          {blockResources.map((res) => (
                            <div key={res.id} className="border border-sky-100 bg-white p-3.5">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 flex-1 break-words">
                                  <p className="font-mono text-[11px] text-sky-800">
                                    Complemento · {res.type.replace('_', ' ')} · {res.required ? 'Apoyo base' : 'Apoyo opcional'} · {res.durationOrSize}
                                  </p>
                                  <p className="mt-0.5 text-sm font-semibold text-slate-900">{res.title}</p>
                                  <p className="mt-0.5 text-xs text-slate-500">{res.attribution}</p>
                                </div>
                                {res.interactiveId && (
                                  <button
                                    type="button"
                                    onClick={() => onLaunchInteractive(res.interactiveId!)}
                                    className="inline-flex items-center gap-1.5 bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
                                  >
                                    <Play className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span>Abrir complemento interactivo</span>
                                  </button>
                                )}
                                {res.type === 'video' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedTranscriptId(
                                        expandedTranscriptId === res.id ? null : res.id
                                      )
                                    }
                                    className="border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
                                  >
                                    {expandedTranscriptId === res.id
                                      ? 'Ocultar transcripción'
                                      : 'Subtítulos y alternativa'}
                                  </button>
                                )}
                              </div>
                              {expandedTranscriptId === res.id && (
                                <div className="mt-3 border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                                  <p className="font-semibold text-slate-900">
                                    Material alternativo accesible (subtítulos ES / transcripción):
                                  </p>
                                  <p className="mt-1">{res.transcriptSummary}</p>
                                  <p className="mt-1.5 text-slate-500">
                                    Respaldo en caso de fallo de enlace externo: {res.fallbackAlternative}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {currentBlock.id === 'B05' && (
                      <div className="min-w-0 border border-slate-200 bg-white p-6 break-words">
                        <h3 className="font-display text-base font-semibold text-slate-900">
                          Casos de estudio de referencia (Set A, Set B y Reserva)
                        </h3>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {caseStudies.slice(0, 6).map((cs) => (
                            <div key={cs.id} className="min-w-0 border border-slate-200 p-3 text-xs break-words">
                              <p className="font-mono text-blue-700">{cs.set} · {cs.year}</p>
                              <p className="font-semibold text-slate-900">{cs.title}</p>
                              <p className="mt-1 text-slate-600">{cs.summary}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Contextual Panel */}
              <aside className="min-w-0 space-y-4 lg:col-span-4 break-words">
                <div className="min-w-0 border border-slate-200 bg-white p-5 break-words">
                  <h3 className="font-display text-sm font-semibold text-slate-900">
                    Contexto y evidencia esperada
                  </h3>
                  <dl className="mt-3 space-y-2.5 text-xs">
                    <div>
                      <dt className="text-slate-500">Actividad principal</dt>
                      <dd className="font-medium text-slate-900">{currentBlock.activityTitle}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Modalidad de trabajo</dt>
                      <dd className="font-medium text-slate-900 capitalize">{currentBlock.mode.replace('_', ' ')}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Evidencia</dt>
                      <dd className="text-slate-700">{currentBlock.expectedEvidence}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Instrumento / Rúbrica</dt>
                      <dd className="text-slate-700">{currentBlock.rubricOrInstrument}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Criterio de finalización</dt>
                      <dd className="text-slate-700">{currentBlock.completionCriterion}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-900">Reflexión de cierre</p>
                    <p className="mt-1 text-xs text-slate-600">{currentBlock.finalReflectionPrompt}</p>
                  </div>
                </div>

                <div className="border border-slate-200 bg-white p-5">
                  <p className="text-xs font-semibold text-slate-900">Resultados de aprendizaje vinculados</p>
                  <ul className="mt-2 space-y-2 text-xs">
                    {learningOutcomes
                      .filter((r) => currentBlock.learningOutcomeIds.includes(r.id))
                      .map((r) => (
                        <li key={r.id} className="text-slate-600">
                          <strong className="font-mono text-blue-700">{r.code}:</strong> {r.description}
                        </li>
                      ))}
                  </ul>
                </div>
              </aside>
            </div>
          )}

          {/* TAB 2: ACTIVIDADES */}
          {activeTab === 'actividades' && currentBlock && (
            <div className="space-y-6">
              {blockLockedForReadOnly || !blockActivity ? (
                <div className="border border-slate-200 bg-white p-8 text-sm text-slate-600">
                  {blockLockedForReadOnly
                    ? 'En modo solo lectura las entregas y actividades están deshabilitadas fuera de la muestra pública B01.'
                    : 'Este bloque no tiene una entrega documental separada; revisa su cuestionario o interactivo.'}
                </div>
              ) : (
                <div className="min-w-0 border border-slate-200 bg-white p-6 break-words">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-blue-700 break-words">
                        {blockActivity.code} · {blockActivity.blockId} · Modo: {blockActivity.mode} · ~{blockActivity.estimatedMinutes} min
                      </p>
                      <h2 className="mt-1 font-display text-lg font-bold text-slate-900 break-words">
                        {blockActivity.title}
                      </h2>
                    </div>
                    {existingSubmission && (
                      <span className="font-mono text-xs font-semibold text-emerald-700 break-words">
                        Estado: {existingSubmission.status.toUpperCase()}
                        {existingSubmission.receiptCode ? ` · ${existingSubmission.receiptCode}` : ''}
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-sm text-slate-700">{blockActivity.instructions}</p>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="min-w-0 border border-slate-200 bg-slate-50 p-4 text-xs break-words">
                      <p className="font-semibold text-slate-900">Pasos recomendados</p>
                      <ol className="mt-1.5 list-decimal pl-4 space-y-1 text-slate-700">
                        {blockActivity.steps.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ol>
                    </div>
                    <div className="min-w-0 border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950 break-words">
                      <p className="font-semibold">Límites de seguridad y política</p>
                      <p className="mt-1">{blockActivity.safetyLimits}</p>
                      <p className="mt-1.5 text-amber-800">
                        Fecha de referencia: {new Date(blockActivity.dueDateIso).toLocaleDateString('es-CO')} · {blockActivity.latePolicy}
                      </p>
                    </div>
                  </div>

                  {/* T2 Safe Phishing Samples Inline Panel */}
                  {blockActivity.id === 'ACT-T2' && (
                    <div className="mt-5 min-w-0 border border-slate-200 p-4">
                      <h3 className="font-display text-sm font-semibold text-slate-900">
                        Visor de 6 muestras ficticias (Material de entrenamiento — sin envío real)
                      </h3>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {phishingSamples.map((sample, i) => (
                          <div key={sample.id} className="min-w-0 border border-slate-200 bg-slate-50 p-3 text-xs break-words">
                            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-amber-800">
                              <span>M{i + 1} · {sample.label}</span>
                              <span className="break-all">{sample.senderEmail}</span>
                            </div>
                            <p className="mt-1 font-semibold text-slate-900">{sample.subject}</p>
                            <p className="mt-1 text-slate-700">{sample.snippet}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Activity Form */}
                  <div className="mt-6 space-y-4">
                    {blockActivity.promptFields.map((field) => (
                      <div key={field.key}>
                        <div className="flex items-baseline justify-between gap-2">
                          <label htmlFor={`field-${field.key}`} className="block text-sm font-semibold text-slate-900">
                            {field.label}
                          </label>
                          {field.key === 'cuerpo_ensayo' && (
                            <span className="font-mono text-xs text-slate-600 tabular-nums">
                              Conteo: {wordCount} palabras (meta: 800–1100)
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{field.helper}</p>
                        <textarea
                          id={`field-${field.key}`}
                          rows={field.key === 'cuerpo_ensayo' ? 8 : 4}
                          disabled={effectiveRole !== 'estudiante'}
                          value={draftAnswers[field.key] ?? ''}
                          onChange={(e) => {
                            setDraftAnswers({ ...draftAnswers, [field.key]: e.target.value });
                            setDirtyDraft(true);
                          }}
                          placeholder={field.placeholder}
                          className="mt-1.5 w-full border border-slate-300 bg-white p-3 text-sm text-slate-900 disabled:bg-slate-100"
                        />
                      </div>
                    ))}

                    <div className="border border-slate-200 bg-slate-50 p-4 text-xs">
                      <label className="flex items-center gap-2 font-medium text-slate-900">
                        <input
                          type="checkbox"
                          disabled={effectiveRole !== 'estudiante'}
                          checked={aiDeclared}
                          onChange={(e) => {
                            setAiDeclared(e.target.checked);
                            setDirtyDraft(true);
                          }}
                        />
                        <span>Declaro haber utilizado asistencia de IA generativa (sujeto a política docente SO-9)</span>
                      </label>
                      {aiDeclared && (
                        <input
                          type="text"
                          disabled={effectiveRole !== 'estudiante'}
                          value={aiDetail}
                          onChange={(e) => setAiDetail(e.target.value)}
                          placeholder="Describe brevemente en qué paso se usó (ej. revisión ortográfica o esquema)..."
                          className="mt-2 w-full border border-slate-300 bg-white px-3 py-2 text-xs"
                        />
                      )}
                    </div>

                    {effectiveRole === 'estudiante' ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await onSaveDraft({
                                activityId: blockActivity.id,
                                answers: draftAnswers,
                                aiAssistanceDeclared: aiDeclared,
                                aiAssistanceDetail: aiDetail,
                              });
                              setDirtyDraft(false);
                              setStatusBanner({ kind: 'ok', text: 'Borrador guardado correctamente.' });
                            } catch (err) {
                              setStatusBanner({ kind: 'err', text: (err as Error).message });
                            }
                          }}
                          className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                        >
                          <Save className="h-4 w-4" aria-hidden="true" />
                          <span>Guardar borrador</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmSubmitOpen(true)}
                          className="inline-flex items-center gap-1.5 bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800"
                        >
                          <Send className="h-4 w-4" aria-hidden="true" />
                          <span>Entregar evidencia</span>
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        {isReadOnly
                          ? 'Vista de solo lectura: la participación y entrega de evidencias requiere matrícula activa.'
                          : 'Vista docente: los estudiantes matriculados envían sus evidencias desde este formulario.'}
                      </p>
                    )}

                    {confirmSubmitOpen && (
                      <div role="dialog" aria-label="Confirmación de entrega" className="border border-blue-300 bg-blue-50 p-4 text-xs">
                        <p className="font-semibold text-blue-950">
                          Confirmar entrega de {blockActivity.code}
                        </p>
                        <p className="mt-1 text-blue-900">
                          Al confirmar, se generará un recibo con fecha y hora y el docente podrá revisar tu evidencia.
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await onSubmitActivity({
                                  activityId: blockActivity.id,
                                  answers: draftAnswers,
                                  aiAssistanceDeclared: aiDeclared,
                                  aiAssistanceDetail: aiDetail,
                                });
                                setDirtyDraft(false);
                                setConfirmSubmitOpen(false);
                                setStatusBanner({
                                  kind: 'ok',
                                  text: `Evidencia ${blockActivity.code} entregada y registrada en servidor.`,
                                });
                              } catch (err) {
                                setConfirmSubmitOpen(false);
                                setStatusBanner({ kind: 'err', text: (err as Error).message });
                              }
                            }}
                            className="bg-blue-700 px-4 py-1.5 font-medium text-white hover:bg-blue-800"
                          >
                            Confirmar entrega final
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmSubmitOpen(false)}
                            className="border border-slate-300 bg-white px-4 py-1.5 font-medium text-slate-700"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CUESTIONARIOS */}
          {activeTab === 'cuestionarios' && (
            <div className="space-y-5">
              {activeQuizId ? (
                (() => {
                  const qz = quizzes.find((q) => q.id === activeQuizId)!;
                  return (
                    <div className="min-w-0 border border-slate-200 bg-white p-6 break-words">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-xs text-blue-700">
                            {qz.code} · {qz.diagnosticOnly ? 'Diagnóstico no calificable' : `Calificable (${qz.weightPercent} %)`}
                          </p>
                          <h2 className="font-display text-lg font-bold text-slate-900 break-words">{qz.title}</h2>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveQuizId(null)}
                          className="text-xs font-medium text-slate-600 hover:text-slate-900 shrink-0"
                        >
                          Volver a lista
                        </button>
                      </div>

                      {quizResult ? (
                        <div className="mt-5 space-y-4">
                          <div className="border border-emerald-200 bg-emerald-50 p-4">
                            <p className="font-display text-base font-bold text-emerald-950 tabular-nums">
                              Resultado registrado: {quizResult.scorePercent} % ({quizResult.scoreFiveScale.toFixed(2)} / 5.0)
                            </p>
                            <p className="mt-1 text-xs text-emerald-900">
                              {qz.diagnosticOnly
                                ? 'Este cuestionario es diagnóstico (no afecta tu nota final) y sirve como línea base.'
                                : 'Las respuestas detalladas se mantienen reservadas conforme a la política de evaluación del curso.'}
                            </p>
                          </div>
                          {quizResult.questionResults?.some((r) => r.explanation) && (
                            <div className="space-y-2">
                              {qz.questions.map((question, idx) => {
                                const res = quizResult.questionResults?.find((r) => r.questionId === question.id);
                                return (
                                  <div key={question.id} className="border border-slate-200 p-3 text-xs">
                                    <p className="font-medium text-slate-900">
                                      {idx + 1}. {question.prompt}
                                    </p>
                                    <p className={`mt-1 font-medium ${res?.isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                                      {res?.isCorrect ? 'Correcta' : 'Incorrecta'}
                                    </p>
                                    {res?.explanation && (
                                      <p className="mt-1 text-slate-600">{res.explanation}</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-5 space-y-5">
                          {qz.questions.map((question, idx) => (
                            <fieldset key={question.id} className="border border-slate-200 p-4">
                              <legend className="px-1 text-sm font-medium text-slate-900">
                                {idx + 1}. {question.prompt}
                              </legend>
                              <div className="mt-2.5 space-y-2">
                                {question.options.map((opt, oIdx) => (
                                  <label key={oIdx} className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={question.id}
                                      checked={quizAnswers[question.id] === oIdx}
                                      onChange={() => setQuizAnswers({ ...quizAnswers, [question.id]: oIdx })}
                                      className="mt-1"
                                    />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            </fieldset>
                          ))}

                          {effectiveRole === 'estudiante' ? (
                            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                              <span className="text-xs text-slate-500 tabular-nums">
                                Respondidas: {Object.keys(quizAnswers).length} / {qz.questions.length}
                              </span>
                              <button
                                type="button"
                                onClick={() => setConfirmQuizOpen(true)}
                                className="bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800"
                              >
                                Finalizar y enviar intento
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500">
                              Vista docente de preguntas (las claves están visibles en el Área del profesor).
                            </p>
                          )}

                          {confirmQuizOpen && (
                            <div role="dialog" className="border border-blue-200 bg-blue-50 p-4 text-xs">
                              <p className="font-semibold text-blue-950">¿Confirmar envío del cuestionario {qz.code}?</p>
                              <div className="mt-2 flex gap-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const attempt = await onSubmitQuiz(qz.id, quizAnswers);
                                      setQuizResult(attempt);
                                      setConfirmQuizOpen(false);
                                    } catch (err) {
                                      setConfirmQuizOpen(false);
                                      setStatusBanner({ kind: 'err', text: (err as Error).message });
                                    }
                                  }}
                                  className="bg-blue-700 px-4 py-1.5 font-medium text-white"
                                >
                                  Sí, enviar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmQuizOpen(false)}
                                  className="border border-slate-300 bg-white px-4 py-1.5"
                                >
                                  Revisar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {quizzes.map((qz) => {
                    const myAttempts = quizAttempts.filter((a) => a.quizId === qz.id);
                    const isCurrentBlockQuiz = blockQuiz?.id === qz.id;
                    return (
                      <div
                        key={qz.id}
                        className={`min-w-0 border bg-white p-5 break-words ${
                          isCurrentBlockQuiz ? 'border-blue-600' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-500">
                          <span>{qz.code} · Bloque {qz.blockId}</span>
                          <span>{qz.diagnosticOnly ? 'Diagnóstico (0 %)' : `Peso ${qz.weightPercent} %`}</span>
                        </div>
                        <h3 className="mt-1 font-display text-base font-semibold text-slate-900 break-words">
                          {qz.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-600">{qz.purpose}</p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600 tabular-nums">
                          <span>
                            {qz.questions.length} ítems · {qz.durationMinutes} min · Intentos: {myAttempts.length}/{qz.maxAttempts}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveQuizId(qz.id);
                              setQuizResult(null);
                              setQuizAnswers({});
                            }}
                            className="bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-blue-700 shrink-0"
                          >
                            {myAttempts.length > 0 ? 'Reintentar / Ver' : 'Iniciar'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ENTREGAS Y CALIFICACIONES */}
          {activeTab === 'calificaciones' && (
            <div className="space-y-5">
              {summary && (
                <div className="border border-slate-200 bg-white p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="font-display text-lg font-semibold text-slate-900">
                        Resumen personal de calificaciones
                      </h2>
                      <p className="text-xs text-amber-800">{summary.provisionalReason}</p>
                    </div>
                    <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                      {summary.provisionalTotal.toFixed(2)} / 5.0
                    </p>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs text-slate-500">
                          <th className="py-2 pr-3 font-medium">Componente</th>
                          <th className="py-2 pr-3 font-medium">Peso</th>
                          <th className="py-2 pr-3 font-medium">Nota</th>
                          <th className="py-2 font-medium">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {summary.components.map((c) => (
                          <tr key={c.componentId}>
                            <td className="py-2.5 pr-3 font-medium text-slate-900">{c.name}</td>
                            <td className="py-2.5 pr-3 font-mono tabular-nums">{c.weightPercent} %</td>
                            <td className="py-2.5 pr-3 font-mono tabular-nums">
                              {c.scoreFiveScale !== null ? `${c.scoreFiveScale.toFixed(2)}` : '—'}
                            </td>
                            <td className="py-2.5 text-xs text-slate-600">{c.detail}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="border border-slate-200 bg-white p-6">
                <h3 className="font-display text-base font-semibold text-slate-900">
                  Historial de entregas y retroalimentación
                </h3>
                {submissions.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-500">
                    Aún no registras entregas o borradores en este curso.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {submissions.map((sub) => (
                      <div key={sub.id} className="border border-slate-200 p-4 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono font-semibold text-slate-900">
                            {sub.blockId} · {sub.activityId} · {sub.status.toUpperCase()}
                          </span>
                          <span className="font-mono text-slate-500 tabular-nums">
                            {sub.receiptCode ?? 'Borrador'} · {new Date(sub.updatedAt).toLocaleDateString('es-CO')}
                          </span>
                        </div>
                        {sub.grade && (
                          <div className="mt-2 border-t border-slate-100 pt-2">
                            <p className="font-mono font-semibold text-emerald-700 tabular-nums">
                              Nota publicada: {sub.grade.finalScore.toFixed(2)} / 5.0 (Base {sub.grade.rawScore.toFixed(2)} × Factor coevaluación {sub.grade.coEvalFactor.toFixed(2)})
                            </p>
                            <p className="mt-1 text-slate-700">{sub.grade.feedback}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border border-slate-200 bg-white p-6">
                <h3 className="font-display text-base font-semibold text-slate-900">
                  Rúbricas oficiales y provisionales del diplomado
                </h3>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  {rubrics.map((r) => (
                    <div key={r.id} className="border border-slate-200 p-4 text-xs">
                      <p className="font-semibold text-slate-900">{r.code} · {r.title}</p>
                      <p className="text-slate-500">{r.version}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: RECURSOS */}
          {activeTab === 'recursos' && (
            <div className="min-w-0 border border-slate-200 bg-white p-6 break-words">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Biblioteca de recursos autorizados
                </h2>
                <div className="flex flex-wrap gap-2 text-xs max-w-full">
                  <input
                    type="search"
                    value={resSearch}
                    onChange={(e) => setResSearch(e.target.value)}
                    placeholder="Buscar recurso..."
                    aria-label="Buscar recurso autorizado"
                    className="w-full sm:w-auto max-w-full min-w-0 border border-slate-300 px-3 py-1.5"
                  />
                  <select
                    value={resModuleFilter}
                    onChange={(e) => setResModuleFilter(e.target.value)}
                    aria-label="Filtrar por módulo"
                    className="w-full sm:w-auto max-w-full min-w-0 border border-slate-300 bg-white px-2.5 py-1.5"
                  >
                    <option value="all">Todos los módulos</option>
                    {modules.map((m) => (
                      <option key={m.id} value={m.id}>{m.code} · {m.title}</option>
                    ))}
                  </select>
                  <select
                    value={resTypeFilter}
                    onChange={(e) => setResTypeFilter(e.target.value)}
                    aria-label="Filtrar por tipo"
                    className="w-full sm:w-auto max-w-full min-w-0 border border-slate-300 bg-white px-2.5 py-1.5"
                  >
                    <option value="all">Todos los tipos</option>
                    <option value="guia">Guía</option>
                    <option value="video">Video</option>
                    <option value="juego">Interactivo</option>
                    <option value="caso">Caso</option>
                    <option value="plantilla">Plantilla</option>
                    <option value="referencia">Referencia</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 divide-y divide-slate-100">
                {resources
                  .filter((r) => resModuleFilter === 'all' || r.moduleId === resModuleFilter)
                  .filter((r) => resTypeFilter === 'all' || r.type === resTypeFilter)
                  .filter((r) => r.title.toLowerCase().includes(resSearch.toLowerCase()))
                  .map((r) => (
                    <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                      <div className="min-w-0 flex-1 break-words">
                        <p className="font-mono text-xs text-slate-500">
                          {r.blockId} · {r.type.replace('_', ' ')} · {r.required ? 'Requerido' : 'Opcional'} · Actualizado {r.updatedAt}
                        </p>
                        <p className="font-medium text-slate-900">{r.title}</p>
                        <p className="text-xs text-slate-500">{r.attribution} · {r.licenseNote}</p>
                      </div>
                      {r.interactiveId ? (
                        <button
                          type="button"
                          onClick={() => onLaunchInteractive(r.interactiveId!)}
                          className="bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 shrink-0"
                        >
                          Abrir laboratorio
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 shrink-0">
                          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{r.durationOrSize}</span>
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 6: FORO / COLABORACIÓN */}
          {activeTab === 'foro' && (
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="min-w-0 border border-slate-200 bg-white p-6 lg:col-span-7 break-words">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    Anuncios y discusión del curso
                  </h2>
                  <MessageSquare className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  No publiques datos personales, incidentes laborales reales ni información reservada.
                </p>
                <div className="mt-4 space-y-4">
                  {forumPosts.map((post) => (
                    <article key={post.id} className="min-w-0 border border-slate-200 p-4 break-words">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-500">
                        <span className="min-w-0 break-words">
                          {post.channel === 'anuncios'
                            ? 'ANUNCIO DOCENTE'
                            : post.channel === 'coordinacion_equipo'
                              ? 'EQUIPO'
                              : 'DISCUSIÓN'}{' '}
                          · {post.authorName}
                        </span>
                        <span className="shrink-0">{new Date(post.createdAt).toLocaleDateString('es-CO')}</span>
                      </div>
                      <h3 className="mt-1 font-display text-sm font-semibold text-slate-900">{post.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-700">{post.body}</p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                        {post.reported && (
                          <span className="text-amber-700">Reportado para revisión docente</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setReportingPostId(post.id)}
                          className="ml-auto inline-flex items-center gap-1 text-slate-500 hover:text-red-700"
                        >
                          <Flag className="h-3 w-3" aria-hidden="true" />
                          <span>Reportar</span>
                        </button>
                      </div>
                      {reportingPostId === post.id && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <input
                            type="text"
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            placeholder="Motivo del reporte..."
                            className="min-w-0 flex-1 border border-slate-300 px-2 py-1 text-xs"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              await onReportForumPost(post.id, reportReason);
                              setReportingPostId(null);
                              setReportReason('');
                            }}
                            className="bg-slate-900 px-3 py-1 text-xs text-white shrink-0"
                          >
                            Enviar
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </div>

              <div className="min-w-0 border border-slate-200 bg-white p-6 lg:col-span-5 lg:self-start break-words">
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  Nueva publicación
                </h3>
                <div className="mt-3 space-y-3 text-xs">
                  <div>
                    <label htmlFor="forum-channel" className="block font-medium text-slate-700">Canal</label>
                    <select
                      id="forum-channel"
                      value={forumChannel}
                      onChange={(e) => setForumChannel(e.target.value as typeof forumChannel)}
                      className="mt-1 w-full max-w-full border border-slate-300 bg-white p-2"
                    >
                      {user.role === 'profesor' && <option value="anuncios">Anuncios oficiales (solo profesor)</option>}
                      <option value="discusion_general">Discusión general de conceptos</option>
                      {user.teamId && <option value="coordinacion_equipo">Coordinación de mi equipo</option>}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="forum-title" className="block font-medium text-slate-700">Título</label>
                    <input
                      id="forum-title"
                      type="text"
                      value={forumTitle}
                      onChange={(e) => setForumTitle(e.target.value)}
                      className="mt-1 w-full border border-slate-300 p-2"
                    />
                  </div>
                  <div>
                    <label htmlFor="forum-body" className="block font-medium text-slate-700">Mensaje</label>
                    <textarea
                      id="forum-body"
                      rows={4}
                      value={forumBody}
                      onChange={(e) => setForumBody(e.target.value)}
                      className="mt-1 w-full border border-slate-300 p-2"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await onCreateForumPost({ channel: forumChannel, title: forumTitle, body: forumBody });
                        setForumTitle('');
                        setForumBody('');
                        setStatusBanner({ kind: 'ok', text: 'Publicación agregada al foro.' });
                      } catch (err) {
                        setStatusBanner({ kind: 'err', text: (err as Error).message });
                      }
                    }}
                    className="w-full bg-slate-900 py-2 font-medium text-white hover:bg-blue-700"
                  >
                    Publicar en foro
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: CALENDARIO */}
          {activeTab === 'calendario' && (
            <div className="min-w-0 border border-slate-200 bg-white p-6 break-words">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-semibold text-slate-900">
                    Calendario académico ({course.scheduleMode})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Zona horaria: {user.preferences.timezone} · B05–B06 consecutivo recomendado; B11–B12 mismo día o consecutivo.
                  </p>
                </div>
                <select
                  value={calFilter}
                  onChange={(e) => setCalFilter(e.target.value)}
                  aria-label="Filtrar eventos del calendario"
                  className="max-w-full border border-slate-300 bg-white px-3 py-1.5 text-xs"
                >
                  <option value="all">Todos los eventos</option>
                  <option value="sesion">Sesiones</option>
                  <option value="entrega">Entregas y casos</option>
                  <option value="simulacion">TTX y Red vs. Blue</option>
                  <option value="invitado">Invitados (B14–B15)</option>
                </select>
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                {calendarEvents
                  .filter((e) => calFilter === 'all' || e.kind === calFilter)
                  .map((ev) => (
                    <div key={ev.id} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1 break-words">
                        <p className="font-mono text-xs text-blue-700 tabular-nums">
                          {new Date(ev.startIso).toLocaleString('es-CO')} · {ev.kind.toUpperCase()}
                        </p>
                        <p className="font-medium text-sm text-slate-900">{ev.title}</p>
                        <p className="text-xs text-slate-600">{ev.instructions}</p>
                      </div>
                      <span className="text-xs text-slate-500 shrink-0">{ev.modalityNote}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Bottom Block Stepper Bar */}
          {currentBlock && (
            <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 bg-white px-5 py-3.5">
              <button
                type="button"
                disabled={currentBlockIdx === 0}
                onClick={() => handleSelectBlock(blocks[currentBlockIdx - 1].id)}
                className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-40"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Anterior</span>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!reviewedBlocks.includes(currentBlock.id)) {
                        setReviewedBlocks([...reviewedBlocks, currentBlock.id]);
                      }
                      setStatusBanner({
                        kind: 'ok',
                        text: `Bloque ${currentBlock.code} marcado como revisado (recuerda completar la evidencia para sumar progreso).`,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50"
                  >
                    <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Marcar como revisado</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={currentBlockIdx >= blocks.length - 1}
                  onClick={() => handleSelectBlock(blocks[currentBlockIdx + 1].id)}
                  className="inline-flex items-center gap-1.5 bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  <span>Siguiente bloque</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
