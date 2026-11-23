import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  FileWarning,
  KeyRound,
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type {
  ActivityDefinition,
  AttendanceRecord,
  AuditLogEntry,
  BlockSpec,
  CourseConfig,
  InstitutionalAssumption,
  QuizAttemptRecord,
  QuizDefinition,
  SubmissionRecord,
  TeamGroup,
} from '../shared/types.ts';
import type { StudentGradeSummary } from '../../server/grading.ts';

export type TeacherTab =
  | 'resumen'
  | 'contenido'
  | 'participantes'
  | 'actividades'
  | 'calificaciones'
  | 'asistencia'
  | 'analitica'
  | 'configuracion';

type TaskMatrixStatus = 'por_calificar' | 'calificada' | 'borrador' | 'no_realizada';
type MatrixViewTab = 'all' | 'estudiante' | TaskMatrixStatus;

interface TeacherWorkspaceProps {
  course: CourseConfig;
  blocks: BlockSpec[];
  activities: ActivityDefinition[];
  teams: TeamGroup[];
  students: {
    id: string;
    displayName: string;
    email: string;
    profileContext: string;
    teamId?: string;
    pairId?: string;
  }[];
  cohortSummaries: {
    studentId: string;
    displayName: string;
    profileContext: string;
    teamId?: string;
    summary: StudentGradeSummary;
  }[];
  submissions: SubmissionRecord[];
  quizzes: QuizDefinition[];
  quizAttempts: QuizAttemptRecord[];
  attendance: AttendanceRecord[];
  assumptions: InstitutionalAssumption[];
  auditLogs: AuditLogEntry[];
  analytics: {
    cohortSize: number;
    avgAttendancePercent: number;
    q0BaselineAvgPercent: number;
    q1ToQ4AvgPercent: number;
    learningGainPoints: number;
    pendingGradingCount: number;
  };
  adaptersHealth: { id: string; name: string; mode: string; description: string }[];
  onGradeSubmission: (payload: {
    submissionId: string;
    rawScore: number;
    coEvalFactor: number;
    feedback: string;
    publishedToStudent: boolean;
  }) => Promise<void>;
  onRemindStudents: (payload: {
    studentIds: string[];
    activityId?: string;
    blockId?: string;
    title: string;
    message: string;
  }) => Promise<number>;
  onRecordAttendance: (payload: {
    studentId: string;
    blockId: string;
    status: 'presente' | 'ausente' | 'justificado' | 'pendiente';
    minutesAttended: number;
    correctionReason: string;
  }) => Promise<void>;
  onToggleBlockFlag: (blockId: string, patch: { published?: boolean; publicSample?: boolean }) => Promise<void>;
  onRotateTeam: (teamId: string, blockId: string) => Promise<void>;
  onUpdateConfig: (patch: Record<string, unknown>) => Promise<void>;
  onExportReport: () => Promise<Record<string, unknown>>;
}

const TEACHER_TABS: { id: TeacherTab; label: string }[] = [
  { id: 'resumen', label: 'Resumen docente' },
  { id: 'contenido', label: 'Contenido' },
  { id: 'participantes', label: 'Participantes' },
  { id: 'actividades', label: 'Actividades y cuestionarios' },
  { id: 'calificaciones', label: 'Calificaciones' },
  { id: 'asistencia', label: 'Asistencia' },
  { id: 'analitica', label: 'Analítica' },
  { id: 'configuracion', label: 'Configuración' },
];

export function TeacherWorkspace({
  course,
  blocks,
  activities,
  teams,
  students,
  cohortSummaries,
  submissions,
  quizzes,
  quizAttempts,
  attendance,
  assumptions,
  auditLogs,
  analytics,
  adaptersHealth,
  onGradeSubmission,
  onRemindStudents,
  onRecordAttendance,
  onToggleBlockFlag,
  onRotateTeam,
  onUpdateConfig,
  onExportReport,
}: TeacherWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<TeacherTab>('resumen');
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Interactive teacher validation dashboard state
  const [taskStatusFilter, setTaskStatusFilter] = useState<MatrixViewTab>('estudiante');
  const [taskStudentFilter, setTaskStudentFilter] = useState<string>('all');
  const [taskActivityFilter, setTaskActivityFilter] = useState<string>('all');
  const [expandedStudentIds, setExpandedStudentIds] = useState<string[]>([]);
  const [studentActivityFilter, setStudentActivityFilter] = useState<Record<string, 'pending' | 'all'>>({});
  const [reminderDraft, setReminderDraft] = useState<{
    studentIds: string[];
    studentLabel: string;
    activityId?: string;
    blockId?: string;
    title: string;
    message: string;
  } | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);

  // Grading form state
  const [gradingFilter, setGradingFilter] = useState<'pending' | 'all'>('pending');
  const [gradingSubId, setGradingSubId] = useState<string>(() => {
    const firstPending = submissions.find(
      (s) => s.status === 'entregada' || s.status === 'en_revision'
    );
    return firstPending?.id ?? submissions[0]?.id ?? '';
  });
  const [rawScoreInput, setRawScoreInput] = useState<string>('4.5');
  const [coEvalFactor, setCoEvalFactor] = useState<number>(1.0);
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [publishGrade, setPublishGrade] = useState(true);
  const [confirmGradeOpen, setConfirmGradeOpen] = useState(false);
  const [showAnswersPreview, setShowAnswersPreview] = useState(true);

  // Attendance form state
  const [attStudentId, setAttStudentId] = useState(students[0]?.id ?? '');
  const [attBlockId, setAttBlockId] = useState('B03');
  const [attStatus, setAttStatus] = useState<'presente' | 'ausente' | 'justificado'>('presente');
  const [attReason, setAttReason] = useState('Asistencia verificada en sesión sincrónica');

  // Config state
  const [coverUrlInput, setCoverUrlInput] = useState(course.coverImageUrl);
  const [modalityInput, setModalityInput] = useState(course.modality);
  const [passingInput, setPassingInput] = useState(course.gradingPolicy.passingScore);
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [showQuizKeys, setShowQuizKeys] = useState(false);

  const taskMatrix = useMemo(() => {
    const items: {
      key: string;
      student: TeacherWorkspaceProps['students'][number];
      activity: ActivityDefinition;
      submission?: SubmissionRecord;
      status: TaskMatrixStatus;
    }[] = [];

    for (const student of students) {
      for (const activity of activities) {
        const sub = submissions.find(
          (s) => s.studentId === student.id && s.activityId === activity.id
        );
        let status: TaskMatrixStatus = 'no_realizada';
        if (sub) {
          if (sub.status === 'calificada') status = 'calificada';
          else if (sub.status === 'entregada' || sub.status === 'en_revision')
            status = 'por_calificar';
          else status = 'borrador';
        }
        items.push({
          key: `${student.id}:${activity.id}`,
          student,
          activity,
          submission: sub,
          status,
        });
      }
    }
    return items;
  }, [students, activities, submissions]);

  const counts = useMemo(() => {
    const porCalificar = taskMatrix.filter((i) => i.status === 'por_calificar').length;
    const calificadas = taskMatrix.filter((i) => i.status === 'calificada').length;
    const borrador = taskMatrix.filter((i) => i.status === 'borrador').length;
    const noRealizadas = taskMatrix.filter((i) => i.status === 'no_realizada').length;
    return {
      total: taskMatrix.length,
      porCalificar,
      calificadas,
      borrador,
      noRealizadas,
    };
  }, [taskMatrix]);

  const filteredMatrix = useMemo(() => {
    return taskMatrix.filter((item) => {
      if (
        taskStatusFilter !== 'all' &&
        taskStatusFilter !== 'estudiante' &&
        item.status !== taskStatusFilter
      ) {
        return false;
      }
      if (taskStudentFilter !== 'all' && item.student.id !== taskStudentFilter) return false;
      if (taskActivityFilter !== 'all' && item.activity.id !== taskActivityFilter) return false;
      return true;
    });
  }, [taskMatrix, taskStatusFilter, taskStudentFilter, taskActivityFilter]);

  const toggleStudentRow = (studentId: string) => {
    setExpandedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const pendingSubmissions = useMemo(
    () => submissions.filter((s) => s.status === 'entregada' || s.status === 'en_revision'),
    [submissions]
  );

  const selectSubmissionForGrading = (sub: SubmissionRecord, switchTab = false) => {
    setGradingSubId(sub.id);
    setRawScoreInput((sub.grade?.rawScore ?? 4.5).toFixed(1));
    setCoEvalFactor(sub.grade?.coEvalFactor ?? 1.0);
    setGradeFeedback(sub.grade?.feedback ?? '');
    setPublishGrade(sub.grade?.publishedToStudent ?? true);
    setConfirmGradeOpen(false);
    setShowAnswersPreview(true);
    if (switchTab) {
      setActiveTab('calificaciones');
    }
  };

  const openReminderForStudents = (opts: {
    targetStudents: TeacherWorkspaceProps['students'];
    activity?: ActivityDefinition;
    missingCount?: number;
  }) => {
    if (opts.targetStudents.length === 0) return;
    const isSingle = opts.targetStudents.length === 1;
    const studentLabel = isSingle
      ? opts.targetStudents[0].displayName
      : `${opts.targetStudents.length} estudiantes con pendientes`;

    const title = opts.activity
      ? `Recordatorio pendiente · ${opts.activity.blockId} (${opts.activity.code})`
      : 'Recordatorio de actividades pendientes';

    const message = opts.activity
      ? `Hola, aún no registramos tu entrega final de "${opts.activity.title}" (${opts.activity.blockId}). Ingresa al Aula → Actividades para enviarla antes del ${new Date(opts.activity.dueDateIso).toLocaleDateString('es-CO')}.`
      : `Hola, tienes ${opts.missingCount ?? 'varias'} actividad(es) pendiente(s) o en borrador en ${course.code}. Revisa tu tablero en el Aula y completa tus envíos.`;

    setReminderDraft({
      studentIds: opts.targetStudents.map((s) => s.id),
      studentLabel,
      activityId: opts.activity?.id,
      blockId: opts.activity?.blockId,
      title,
      message,
    });
  };

  return (
    <section aria-labelledby="teacher-heading" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 min-w-0">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-blue-700">
            Área del profesor · Alcance verificado en {course.code}
          </p>
          <h1 id="teacher-heading" className="mt-1 font-display text-2xl font-bold text-slate-900">
            Gestión docente: {course.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Administra publicación de bloques, equipos rotativos, calificación por rúbricas, asistencia auditada y supuestos institucionales.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pendingSubmissions.length > 0 && (
            <button
              type="button"
              onClick={() => selectSubmissionForGrading(pendingSubmissions[0], true)}
              className="inline-flex items-center gap-1.5 bg-amber-700 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-800 sm:whitespace-nowrap"
            >
              <ClipboardCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Calificar pendientes ({pendingSubmissions.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              const data = await onExportReport();
              setExportResult(JSON.stringify(data, null, 2));
              setFeedbackBanner('Reporte académico exportado y registrado en bitácora de auditoría.');
            }}
            className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 sm:whitespace-nowrap"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Exportar reporte autorizado</span>
          </button>
        </div>
      </div>

      {/* 8 Teacher Tabs */}
      <div
        role="tablist"
        aria-label="Pestañas del área docente"
        className="mt-4 flex items-center gap-1 overflow-x-auto border-b border-slate-200"
      >
        {TEACHER_TABS.map((t) => {
          const selected = activeTab === t.id;
          const label =
            t.id === 'calificaciones' && pendingSubmissions.length > 0
              ? `${t.label} (${pendingSubmissions.length})`
              : t.label;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-2.5 text-xs font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                selected
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {feedbackBanner && (
        <div role="status" className="mt-4 flex items-center justify-between border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-900">
          <span>{feedbackBanner}</span>
          <button type="button" onClick={() => setFeedbackBanner(null)} className="underline">Cerrar</button>
        </div>
      )}

      {/* 1. RESUMEN DOCENTE — DASHBOARD INTERACTIVO DE ENTREGAS Y VALIDACIÓN */}
      {activeTab === 'resumen' && (
        <div className="mt-6 space-y-6">
          {/* Interactive KPI Filter Strip */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => setTaskStatusFilter('por_calificar')}
              className={`border p-5 text-left transition-colors ${
                taskStatusFilter === 'por_calificar'
                  ? 'border-amber-600 bg-amber-50'
                  : 'border-amber-200 bg-amber-50/50 hover:border-amber-400'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-medium text-amber-900">
                <span>Por calificar (entregadas)</span>
                <Clock className="h-4 w-4 text-amber-700" aria-hidden="true" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-amber-800 tabular-nums">
                {counts.porCalificar}
              </p>
              <p className="mt-1 text-[11px] text-amber-900/80">
                Clic para validar entregas pendientes
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTaskStatusFilter('calificada')}
              className={`border p-5 text-left transition-colors ${
                taskStatusFilter === 'calificada'
                  ? 'border-emerald-600 bg-emerald-50'
                  : 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-medium text-emerald-900">
                <span>Hechas y calificadas</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-emerald-800 tabular-nums">
                {counts.calificadas}
              </p>
              <p className="mt-1 text-[11px] text-emerald-900/80">
                De {counts.total} entregas esperadas en cohorte
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTaskStatusFilter('borrador')}
              className={`border p-5 text-left transition-colors ${
                taskStatusFilter === 'borrador'
                  ? 'border-sky-600 bg-sky-50'
                  : 'border-sky-200 bg-sky-50/40 hover:border-sky-400'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-medium text-sky-900">
                <span>En borrador (sin enviar)</span>
                <FileWarning className="h-4 w-4 text-sky-700" aria-hidden="true" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-sky-800 tabular-nums">
                {counts.borrador}
              </p>
              <p className="mt-1 text-[11px] text-sky-900/80">
                Iniciadas por estudiantes, falta envío final
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTaskStatusFilter('no_realizada')}
              className={`border p-5 text-left transition-colors ${
                taskStatusFilter === 'no_realizada'
                  ? 'border-rose-600 bg-rose-50'
                  : 'border-rose-200 bg-rose-50/40 hover:border-rose-400'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-medium text-rose-900">
                <span>No realizadas</span>
                <AlertTriangle className="h-4 w-4 text-rose-700" aria-hidden="true" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-rose-800 tabular-nums">
                {counts.noRealizadas}
              </p>
              <p className="mt-1 text-[11px] text-rose-900/80">
                Clic para filtrar y enviar recordatorio
              </p>
            </button>
          </div>

          {/* Cohort Distribution Bar + Secondary Indicators */}
          <div className="min-w-0 border border-slate-200 bg-white p-6 break-words">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Estado global de entregas de la cohorte
                </h2>
                <p className="text-xs text-slate-500 tabular-nums">
                  {analytics.cohortSize} estudiantes · {activities.length} actividades evaluables · Asistencia promedio {analytics.avgAttendancePercent} % · Supuestos pendientes {assumptions.filter((a) => a.status === 'pendiente_validacion').length}/{assumptions.length}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {pendingSubmissions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => selectSubmissionForGrading(pendingSubmissions[0], true)}
                    className="inline-flex items-center gap-1.5 bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-800"
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Ir a calificar siguiente entrega</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
                {counts.noRealizadas + counts.borrador > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const studentsWithMissing = students.filter((st) =>
                        taskMatrix.some(
                          (item) =>
                            item.student.id === st.id &&
                            (item.status === 'no_realizada' || item.status === 'borrador')
                        )
                      );
                      openReminderForStudents({
                        targetStudents: studentsWithMissing,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-900 hover:bg-rose-100"
                  >
                    <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Avisar a estudiantes con tareas pendientes</span>
                  </button>
                )}
              </div>
            </div>

            {counts.total > 0 && (
              <div className="mt-4">
                <div className="flex h-3 w-full overflow-hidden bg-slate-100">
                  <div
                    className="bg-emerald-600 transition-all"
                    style={{ width: `${(counts.calificadas / counts.total) * 100}%` }}
                    title={`Calificadas: ${counts.calificadas}`}
                  />
                  <div
                    className="bg-amber-500 transition-all"
                    style={{ width: `${(counts.porCalificar / counts.total) * 100}%` }}
                    title={`Por calificar: ${counts.porCalificar}`}
                  />
                  <div
                    className="bg-sky-500 transition-all"
                    style={{ width: `${(counts.borrador / counts.total) * 100}%` }}
                    title={`En borrador: ${counts.borrador}`}
                  />
                  <div
                    className="bg-slate-300 transition-all"
                    style={{ width: `${(counts.noRealizadas / counts.total) * 100}%` }}
                    title={`No realizadas: ${counts.noRealizadas}`}
                  />
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-600 tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 bg-emerald-600 inline-block" aria-hidden="true" />
                    <span>Calificadas: {counts.calificadas}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 bg-amber-500 inline-block" aria-hidden="true" />
                    <span>Por calificar: {counts.porCalificar}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 bg-sky-500 inline-block" aria-hidden="true" />
                    <span>En borrador: {counts.borrador}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 bg-slate-300 inline-block" aria-hidden="true" />
                    <span>No realizadas: {counts.noRealizadas}</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Student Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {students.map((st) => {
              const stItems = taskMatrix.filter((i) => i.student.id === st.id);
              const stDone = stItems.filter((i) => i.status === 'calificada').length;
              const stPendingGrade = stItems.filter((i) => i.status === 'por_calificar').length;
              const stDraft = stItems.filter((i) => i.status === 'borrador').length;
              const stMissing = stItems.filter((i) => i.status === 'no_realizada').length;
              const summaryEntry = cohortSummaries.find((c) => c.studentId === st.id);

              return (
                <div key={st.id} className="min-w-0 border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-bold text-slate-900 break-words">{st.displayName}</p>
                      <p className="text-xs text-slate-500 break-words">
                        {st.profileContext} · Equipo: {st.teamId ?? 'Sin equipo'}
                      </p>
                    </div>
                    {summaryEntry && (
                      <div className="text-right font-mono text-xs tabular-nums shrink-0">
                        <p className="font-bold text-slate-900">
                          {summaryEntry.summary.provisionalTotal.toFixed(2)} / 5.0
                        </p>
                        <p className="text-slate-500">
                          Asist. {summaryEntry.summary.attendancePercent} %
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 border-y border-slate-100 py-2.5 text-center text-[11px] sm:grid-cols-4 tabular-nums">
                    <div>
                      <p className="font-mono font-bold text-emerald-700">{stDone}</p>
                      <p className="text-slate-500">Calificadas</p>
                    </div>
                    <div>
                      <p className="font-mono font-bold text-amber-700">{stPendingGrade}</p>
                      <p className="text-slate-500">Por calificar</p>
                    </div>
                    <div>
                      <p className="font-mono font-bold text-sky-700">{stDraft}</p>
                      <p className="text-slate-500">Borrador</p>
                    </div>
                    <div>
                      <p className="font-mono font-bold text-rose-700">{stMissing}</p>
                      <p className="text-slate-500">Sin hacer</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setTaskStatusFilter('estudiante');
                        setTaskStudentFilter('all');
                        setExpandedStudentIds([st.id]);
                        setStudentActivityFilter((prev) => ({ ...prev, [st.id]: 'pending' }));
                      }}
                      className="border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-800 hover:bg-slate-50"
                    >
                      Ver detalle de tareas
                    </button>
                    {stMissing + stDraft > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          openReminderForStudents({
                            targetStudents: [st],
                            missingCount: stMissing + stDraft,
                          })
                        }
                        className="inline-flex items-center gap-1.5 border border-rose-300 bg-rose-50 px-3 py-1.5 font-medium text-rose-900 hover:bg-rose-100"
                      >
                        <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Avisar pendientes ({stMissing + stDraft})</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inline Reminder Composer */}
          {reminderDraft && (
            <div
              role="dialog"
              aria-label="Enviar recordatorio a estudiante"
              className="border border-blue-300 bg-blue-50/70 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-semibold uppercase tracking-wide text-blue-800">
                    Notificación directa al estudiante
                  </p>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Enviar aviso a: {reminderDraft.studentLabel}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setReminderDraft(null)}
                  className="text-xs font-medium text-slate-600 underline hover:text-slate-900"
                >
                  Cancelar
                </button>
              </div>
              <div className="mt-3 grid gap-3 text-xs">
                <div>
                  <label htmlFor="reminder-title" className="block font-medium text-slate-700">
                    Asunto del aviso
                  </label>
                  <input
                    id="reminder-title"
                    type="text"
                    value={reminderDraft.title}
                    onChange={(e) =>
                      setReminderDraft({ ...reminderDraft, title: e.target.value })
                    }
                    className="mt-1 w-full border border-slate-300 bg-white px-3 py-2"
                  />
                </div>
                <div>
                  <label htmlFor="reminder-message" className="block font-medium text-slate-700">
                    Mensaje para el estudiante (visible en sus notificaciones y Mi panel)
                  </label>
                  <textarea
                    id="reminder-message"
                    rows={3}
                    value={reminderDraft.message}
                    onChange={(e) =>
                      setReminderDraft({ ...reminderDraft, message: e.target.value })
                    }
                    className="mt-1 w-full border border-slate-300 bg-white px-3 py-2"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={sendingReminder}
                    onClick={async () => {
                      try {
                        setSendingReminder(true);
                        const sentCount = await onRemindStudents({
                          studentIds: reminderDraft.studentIds,
                          activityId: reminderDraft.activityId,
                          blockId: reminderDraft.blockId,
                          title: reminderDraft.title,
                          message: reminderDraft.message,
                        });
                        setReminderDraft(null);
                        setFeedbackBanner(
                          `Aviso enviado y auditado correctamente a ${sentCount} estudiante(s).`
                        );
                      } catch (err) {
                        setFeedbackBanner((err as Error).message);
                      } finally {
                        setSendingReminder(false);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{sendingReminder ? 'Enviando...' : 'Enviar aviso ahora'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filterable Task & Validation Matrix (Grouped by Student, No Mixing) */}
          <div className="min-w-0 border border-slate-200 bg-white p-5 sm:p-6 break-words">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4">
              <div className="min-w-0">
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Matriz de validación de entregas por estudiante (
                  {taskStatusFilter === 'estudiante'
                    ? `${students.filter((st) => taskStudentFilter === 'all' || st.id === taskStudentFilter).length} estudiantes`
                    : `${filteredMatrix.length} registros`}
                  )
                </h2>
                <p className="text-xs text-slate-500">
                  Cada estudiante cuenta con su propia sección sin mezclar registros. Haz clic en un estudiante para desplegar sus actividades pendientes de Bloque y Actividad.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 max-w-full">
                  {(
                    [
                      ['all', `Todas (${counts.total})`],
                      ['estudiante', `Estudiante (${students.length})`],
                      ['por_calificar', `Por calificar (${counts.porCalificar})`],
                      ['no_realizada', `No realizadas (${counts.noRealizadas})`],
                      ['borrador', `Borrador (${counts.borrador})`],
                      ['calificada', `Calificadas (${counts.calificadas})`],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTaskStatusFilter(key)}
                      className={`rounded-md px-2.5 py-1.5 font-medium transition-colors whitespace-nowrap ${
                        taskStatusFilter === key
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700 hover:bg-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <select
                  value={taskStudentFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTaskStudentFilter(val);
                    if (val !== 'all') {
                      setExpandedStudentIds((prev) =>
                        prev.includes(val) ? prev : [...prev, val]
                      );
                    }
                  }}
                  aria-label="Filtrar por estudiante"
                  className="max-w-full border border-slate-300 bg-white px-2.5 py-1.5"
                >
                  <option value="all">Todos los estudiantes</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.displayName}
                    </option>
                  ))}
                </select>

                <select
                  value={taskActivityFilter}
                  onChange={(e) => setTaskActivityFilter(e.target.value)}
                  aria-label="Filtrar por actividad"
                  className="max-w-full border border-slate-300 bg-white px-2.5 py-1.5"
                >
                  <option value="all">Todas las actividades</option>
                  {activities.map((act) => (
                    <option key={act.id} value={act.id}>
                      {act.blockId} · {act.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {taskStatusFilter === 'estudiante' ? (
              <div className="mt-4 space-y-2">
                <div className="hidden sm:grid sm:grid-cols-12 gap-3 border-b border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <div className="col-span-5">Estudiante (clic para ver actividades pendientes)</div>
                  <div className="col-span-2 text-center">Pendientes</div>
                  <div className="col-span-2 text-center">Por calificar</div>
                  <div className="col-span-1 text-center">Hechas</div>
                  <div className="col-span-2 text-right">Acción rápida</div>
                </div>

                {students
                  .filter((st) => taskStudentFilter === 'all' || st.id === taskStudentFilter)
                  .map((st) => {
                    const allStItems = filteredMatrix.filter((i) => i.student.id === st.id);
                    const pendingStItems = allStItems.filter(
                      (i) => i.status !== 'calificada'
                    );
                    const missingOrDraftCount = allStItems.filter(
                      (i) => i.status === 'no_realizada' || i.status === 'borrador'
                    ).length;
                    const porCalificarCount = allStItems.filter(
                      (i) => i.status === 'por_calificar'
                    ).length;
                    const doneCount = allStItems.filter((i) => i.status === 'calificada').length;

                    const isExpanded = expandedStudentIds.includes(st.id);
                    const innerScope = studentActivityFilter[st.id] ?? 'pending';
                    const visibleItems =
                      innerScope === 'pending' ? pendingStItems : allStItems;
                    const summaryEntry = cohortSummaries.find((c) => c.studentId === st.id);

                    return (
                      <div
                        key={st.id}
                        className={`min-w-0 border transition-colors ${
                          isExpanded
                            ? 'border-blue-300 bg-blue-50/25'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        {/* Clickable Student Row */}
                        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:grid sm:grid-cols-12 sm:items-center">
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            onClick={() => toggleStudentRow(st.id)}
                            className="sm:col-span-5 min-w-0 flex items-center gap-2.5 text-left group focus-visible:outline-2 focus-visible:outline-blue-700"
                          >
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center border transition-colors ${
                                isExpanded
                                  ? 'border-blue-700 bg-blue-700 text-white'
                                  : 'border-slate-300 bg-slate-50 text-slate-600 group-hover:border-blue-500 group-hover:text-blue-700'
                              }`}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                            </span>
                            <div className="min-w-0 flex-1 break-words">
                              <p className="font-display text-sm font-bold text-slate-900 group-hover:text-blue-700">
                                {st.displayName}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {st.profileContext} · {st.teamId ?? 'Sin equipo'}
                                {summaryEntry
                                  ? ` · Nota prov. ${summaryEntry.summary.provisionalTotal.toFixed(2)}/5.0`
                                  : ''}
                              </p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleStudentRow(st.id)}
                            className="sm:col-span-2 text-center font-mono text-xs tabular-nums hover:underline"
                          >
                            <span className="sm:hidden text-slate-500 mr-1">Pendientes:</span>
                            <span className="font-bold text-rose-700">{pendingStItems.length}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleStudentRow(st.id)}
                            className="sm:col-span-2 text-center font-mono text-xs tabular-nums hover:underline"
                          >
                            <span className="sm:hidden text-slate-500 mr-1">Por calificar:</span>
                            <span className="font-bold text-amber-700">{porCalificarCount}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleStudentRow(st.id)}
                            className="sm:col-span-1 text-center font-mono text-xs tabular-nums hover:underline"
                          >
                            <span className="sm:hidden text-slate-500 mr-1">Hechas:</span>
                            <span className="font-bold text-emerald-700">{doneCount}</span>
                          </button>

                          <div className="sm:col-span-2 flex items-center justify-end gap-2">
                            {missingOrDraftCount > 0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  openReminderForStudents({
                                    targetStudents: [st],
                                    missingCount: missingOrDraftCount,
                                  })
                                }
                                className="inline-flex items-center gap-1 border border-rose-300 bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-900 hover:bg-rose-100"
                              >
                                <Bell className="h-3 w-3 shrink-0" aria-hidden="true" />
                                <span>Avisar ({missingOrDraftCount})</span>
                              </button>
                            ) : (
                              <span className="text-[11px] font-medium text-emerald-700">Al día</span>
                            )}
                          </div>
                        </div>

                        {/* Expanded Student Activities Section ("Bloque y actividad") */}
                        {isExpanded && (
                          <div className="border-t border-blue-200 bg-white p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                              <p className="text-xs font-semibold text-slate-900">
                                Actividades de {st.displayName} ({visibleItems.length})
                              </p>
                              <div className="flex items-center gap-1 rounded-md bg-slate-100 p-0.5 text-[11px]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setStudentActivityFilter((prev) => ({
                                      ...prev,
                                      [st.id]: 'pending',
                                    }))
                                  }
                                  className={`rounded px-2.5 py-1 font-medium ${
                                    innerScope === 'pending'
                                      ? 'bg-slate-900 text-white'
                                      : 'text-slate-700 hover:bg-white'
                                  }`}
                                >
                                  Pendientes ({pendingStItems.length})
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setStudentActivityFilter((prev) => ({
                                      ...prev,
                                      [st.id]: 'all',
                                    }))
                                  }
                                  className={`rounded px-2.5 py-1 font-medium ${
                                    innerScope === 'all'
                                      ? 'bg-slate-900 text-white'
                                      : 'text-slate-700 hover:bg-white'
                                  }`}
                                >
                                  Todas ({allStItems.length})
                                </button>
                              </div>
                            </div>

                            {visibleItems.length === 0 ? (
                              <p className="py-4 text-center text-xs text-slate-500">
                                {innerScope === 'pending'
                                  ? `${st.displayName} no tiene actividades pendientes en este filtro.`
                                  : 'No hay actividades registradas para este filtro.'}
                              </p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[600px] text-left text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-slate-500">
                                      <th className="py-2 pr-3 font-medium">Bloque y actividad</th>
                                      <th className="py-2 pr-3 font-medium">Estado</th>
                                      <th className="py-2 pr-3 font-medium">Detalle / Nota</th>
                                      <th className="py-2 text-right font-medium">Acción docente</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {visibleItems.map((item) => (
                                      <tr key={item.key} className="align-middle hover:bg-slate-50/70">
                                        <td className="py-2.5 pr-3 max-w-sm break-words">
                                          <p className="font-mono text-[11px] text-slate-500">
                                            {item.activity.blockId} · {item.activity.code} · Límite{' '}
                                            {new Date(item.activity.dueDateIso).toLocaleDateString('es-CO')}
                                          </p>
                                          <p className="font-medium text-slate-900">
                                            {item.activity.title}
                                          </p>
                                        </td>
                                        <td className="py-2.5 pr-3 whitespace-nowrap">
                                          {item.status === 'por_calificar' && (
                                            <span className="inline-flex items-center gap-1.5 font-semibold text-amber-800">
                                              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                                              <span>Por calificar</span>
                                            </span>
                                          )}
                                          {item.status === 'calificada' && (
                                            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                              <span>Calificada</span>
                                            </span>
                                          )}
                                          {item.status === 'borrador' && (
                                            <span className="inline-flex items-center gap-1.5 font-medium text-sky-700">
                                              <FileWarning className="h-3.5 w-3.5" aria-hidden="true" />
                                              <span>En borrador</span>
                                            </span>
                                          )}
                                          {item.status === 'no_realizada' && (
                                            <span className="inline-flex items-center gap-1.5 font-medium text-rose-700">
                                              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                                              <span>No realizada</span>
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-600 tabular-nums">
                                          {item.status === 'calificada' && item.submission?.grade
                                            ? `${item.submission.grade.finalScore.toFixed(2)} / 5.0 · ${item.submission.receiptCode ?? ''}`
                                            : item.submission
                                              ? `${item.submission.receiptCode ?? 'Sin recibo'} · Act. ${new Date(item.submission.updatedAt).toLocaleDateString('es-CO')}`
                                              : 'Sin envíos registrados'}
                                        </td>
                                        <td className="py-2.5 text-right whitespace-nowrap">
                                          {item.status === 'por_calificar' && item.submission && (
                                            <button
                                              type="button"
                                              onClick={() => selectSubmissionForGrading(item.submission!, true)}
                                              className="inline-flex items-center gap-1.5 bg-amber-700 px-3 py-1.5 font-semibold text-white hover:bg-amber-800"
                                            >
                                              <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                              <span>Validar y calificar</span>
                                            </button>
                                          )}
                                          {item.status === 'calificada' && item.submission && (
                                            <button
                                              type="button"
                                              onClick={() => selectSubmissionForGrading(item.submission!, true)}
                                              className="inline-flex items-center gap-1 border border-emerald-300 bg-emerald-50 px-3 py-1.5 font-medium text-emerald-900 hover:bg-emerald-100"
                                            >
                                              <span>Revisar / editar nota</span>
                                            </button>
                                          )}
                                          {(item.status === 'no_realizada' || item.status === 'borrador') && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                openReminderForStudents({
                                                  targetStudents: [item.student],
                                                  activity: item.activity,
                                                })
                                              }
                                              className="inline-flex items-center gap-1.5 border border-rose-300 bg-rose-50 px-3 py-1.5 font-medium text-rose-900 hover:bg-rose-100"
                                            >
                                              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                                              <span>Avisar estudiante</span>
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              /* Grouped by Student Sections for Todas / Por calificar / No realizadas / Borrador / Calificadas */
              <div className="mt-4 space-y-5">
                {students
                  .filter((st) => taskStudentFilter === 'all' || st.id === taskStudentFilter)
                  .map((st) => {
                    const stFiltered = filteredMatrix.filter((i) => i.student.id === st.id);
                    if (stFiltered.length === 0) return null;
                    const missingInSection = stFiltered.filter(
                      (i) => i.status === 'no_realizada' || i.status === 'borrador'
                    ).length;

                    return (
                      <section
                        key={st.id}
                        aria-label={`Entregas de ${st.displayName}`}
                        className="min-w-0 border border-slate-200 bg-slate-50/40"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-100/80 px-4 py-2.5">
                          <div className="min-w-0 flex-1 break-words">
                            <h3 className="font-display text-sm font-bold text-slate-900">
                              {st.displayName}
                            </h3>
                            <p className="text-[11px] text-slate-600">
                              {st.profileContext} · {st.teamId ?? 'Sin equipo'} · {stFiltered.length} actividad(es) en esta sección
                            </p>
                          </div>
                          {missingInSection > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                openReminderForStudents({
                                  targetStudents: [st],
                                  missingCount: missingInSection,
                                })
                              }
                              className="inline-flex items-center gap-1 border border-rose-300 bg-white px-2.5 py-1 text-[11px] font-medium text-rose-900 hover:bg-rose-50 shrink-0"
                            >
                              <Bell className="h-3 w-3" aria-hidden="true" />
                              <span>Avisar pendientes ({missingInSection})</span>
                            </button>
                          )}
                        </div>

                        <div className="overflow-x-auto bg-white px-4 py-2">
                          <table className="w-full min-w-[600px] text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-500">
                                <th className="py-2 pr-3 font-medium">Bloque y actividad</th>
                                <th className="py-2 pr-3 font-medium">Estado</th>
                                <th className="py-2 pr-3 font-medium">Detalle / Nota</th>
                                <th className="py-2 text-right font-medium">Acción docente</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {stFiltered.map((item) => (
                                <tr key={item.key} className="align-middle hover:bg-slate-50/70">
                                  <td className="py-2.5 pr-3 max-w-sm break-words">
                                    <p className="font-mono text-[11px] text-slate-500">
                                      {item.activity.blockId} · {item.activity.code} · Límite{' '}
                                      {new Date(item.activity.dueDateIso).toLocaleDateString('es-CO')}
                                    </p>
                                    <p className="font-medium text-slate-900">{item.activity.title}</p>
                                  </td>
                                  <td className="py-2.5 pr-3 whitespace-nowrap">
                                    {item.status === 'por_calificar' && (
                                      <span className="inline-flex items-center gap-1.5 font-semibold text-amber-800">
                                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                                        <span>Por calificar</span>
                                      </span>
                                    )}
                                    {item.status === 'calificada' && (
                                      <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                        <span>Calificada</span>
                                      </span>
                                    )}
                                    {item.status === 'borrador' && (
                                      <span className="inline-flex items-center gap-1.5 font-medium text-sky-700">
                                        <FileWarning className="h-3.5 w-3.5" aria-hidden="true" />
                                        <span>En borrador</span>
                                      </span>
                                    )}
                                    {item.status === 'no_realizada' && (
                                      <span className="inline-flex items-center gap-1.5 font-medium text-rose-700">
                                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                                        <span>No realizada</span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-600 tabular-nums">
                                    {item.status === 'calificada' && item.submission?.grade
                                      ? `${item.submission.grade.finalScore.toFixed(2)} / 5.0 · ${item.submission.receiptCode ?? ''}`
                                      : item.submission
                                        ? `${item.submission.receiptCode ?? 'Sin recibo'} · Act. ${new Date(item.submission.updatedAt).toLocaleDateString('es-CO')}`
                                        : 'Sin envíos registrados'}
                                  </td>
                                  <td className="py-2.5 text-right whitespace-nowrap">
                                    {item.status === 'por_calificar' && item.submission && (
                                      <button
                                        type="button"
                                        onClick={() => selectSubmissionForGrading(item.submission!, true)}
                                        className="inline-flex items-center gap-1.5 bg-amber-700 px-3 py-1.5 font-semibold text-white hover:bg-amber-800"
                                      >
                                        <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                        <span>Validar y calificar</span>
                                      </button>
                                    )}
                                    {item.status === 'calificada' && item.submission && (
                                      <button
                                        type="button"
                                        onClick={() => selectSubmissionForGrading(item.submission!, true)}
                                        className="inline-flex items-center gap-1 border border-emerald-300 bg-emerald-50 px-3 py-1.5 font-medium text-emerald-900 hover:bg-emerald-100"
                                      >
                                        <span>Revisar / editar nota</span>
                                      </button>
                                    )}
                                    {(item.status === 'no_realizada' || item.status === 'borrador') && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openReminderForStudents({
                                            targetStudents: [item.student],
                                            activity: item.activity,
                                          })
                                        }
                                        className="inline-flex items-center gap-1.5 border border-rose-300 bg-rose-50 px-3 py-1.5 font-medium text-rose-900 hover:bg-rose-100"
                                      >
                                        <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                                        <span>Avisar estudiante</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    );
                  })}

                {filteredMatrix.length === 0 && (
                  <p className="border border-slate-200 py-6 text-center text-xs text-slate-500">
                    No hay tareas que coincidan con los filtros seleccionados.
                  </p>
                )}
              </div>
            )}
          </div>

          {exportResult && (
            <div className="border border-slate-200 bg-slate-900 p-4 text-xs text-slate-100">
              <p className="font-semibold text-sky-300">Vista previa de exportación auditada (JSON)</p>
              <pre className="mt-2 max-h-48 overflow-auto font-mono text-[11px]">{exportResult}</pre>
            </div>
          )}
        </div>
      )}

      {/* 2. CONTENIDO */}
      {activeTab === 'contenido' && (
        <div className="mt-6 border border-slate-200 bg-white p-6">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Control de publicación y muestra pública de solo lectura (B01–B15 y C01–C05)
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Controla qué bloques están publicados para matrícula activa y cuáles conforman la muestra pública de solo lectura.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-medium">Bloque</th>
                  <th className="py-2 pr-3 font-medium">Título</th>
                  <th className="py-2 pr-3 font-medium">T / P</th>
                  <th className="py-2 pr-3 font-medium">Publicado</th>
                  <th className="py-2 font-medium">Muestra solo lectura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {blocks.map((b) => (
                  <tr key={b.id}>
                    <td className="py-2.5 pr-3 font-mono font-semibold">{b.code}</td>
                    <td className="py-2.5 pr-3 text-slate-900">{b.title}</td>
                    <td className="py-2.5 pr-3 font-mono text-slate-600 tabular-nums">
                      {b.theoryMinutes}m / {b.practiceMinutes}m
                    </td>
                    <td className="py-2.5 pr-3">
                      <button
                        type="button"
                        onClick={async () => {
                          await onToggleBlockFlag(b.id, { published: !b.published });
                          setFeedbackBanner(`Estado de publicación actualizado en ${b.code}.`);
                        }}
                        className={`border px-2.5 py-1 font-medium ${
                          b.published
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : 'border-slate-300 bg-slate-100 text-slate-600'
                        }`}
                      >
                        {b.published ? 'Publicado' : 'Borrador'}
                      </button>
                    </td>
                    <td className="py-2.5">
                      <button
                        type="button"
                        onClick={async () => {
                          await onToggleBlockFlag(b.id, { publicSample: !b.publicSample });
                          setFeedbackBanner(`Política de muestra pública actualizada en ${b.code}.`);
                        }}
                        className={`border px-2.5 py-1 font-medium ${
                          b.publicSample
                            ? 'border-blue-300 bg-blue-50 text-blue-800'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        {b.publicSample ? 'Público (muestra)' : 'Privado matrícula'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. PARTICIPANTES */}
      {activeTab === 'participantes' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 border border-slate-200 bg-white p-6 lg:col-span-6 break-words">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Participantes matriculados en este curso
            </h2>
            <ul className="mt-4 divide-y divide-slate-100 text-xs">
              {students.map((st) => (
                <li key={st.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 break-words">
                    <p className="font-semibold text-slate-900">{st.displayName}</p>
                    <p className="text-slate-500 break-words">{st.email} · {st.profileContext}</p>
                  </div>
                  <span className="font-mono text-slate-600 shrink-0">{st.teamId ?? 'Sin equipo'}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 border border-slate-200 bg-white p-6 lg:col-span-6 break-words">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-700 shrink-0" aria-hidden="true" />
              <h2 className="font-display text-base font-semibold text-slate-900">
                Equipos base de 4, parejas y rotación de roles
              </h2>
            </div>
            <div className="mt-4 space-y-4">
              {teams.map((t) => (
                <div key={t.id} className="min-w-0 border border-slate-200 p-4 text-xs break-words">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{t.name}</p>
                    <button
                      type="button"
                      onClick={async () => {
                        await onRotateTeam(t.id, 'B10');
                        setFeedbackBanner(`Roles rotados para ${t.name} sin repetir consecutivos.`);
                      }}
                      className="inline-flex items-center gap-1 border border-slate-300 px-2.5 py-1 font-medium text-slate-800 hover:bg-slate-50 shrink-0"
                    >
                      <RefreshCw className="h-3 w-3" aria-hidden="true" />
                      <span>Rotar roles (B10)</span>
                    </button>
                  </div>
                  <p className="mt-1 text-slate-500">{t.cellName} · Caso: {t.assignedCaseId}</p>
                  <p className="mt-2 font-mono text-[11px] text-slate-700 break-words">
                    Parejas: {t.pairs.map((p) => p.label).join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. ACTIVIDADES Y CUESTIONARIOS (Teacher Keys!) */}
      {activeTab === 'actividades' && (
        <div className="mt-6 min-w-0 border border-slate-200 bg-white p-6 break-words">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Claves de cuestionarios y solucionarios (Solo profesor)
              </h2>
              <p className="text-xs text-slate-500">
                Estas claves nunca se envían al cliente de estudiantes ni al modo de solo lectura.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowQuizKeys((v) => !v)}
              className="inline-flex items-center gap-1.5 bg-slate-900 px-3.5 py-2 text-xs font-medium text-white shrink-0"
            >
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{showQuizKeys ? 'Ocultar claves' : 'Ver claves Q0–Q4'}</span>
            </button>
          </div>
          <div className="mt-4 space-y-4">
            {quizzes.map((qz) => {
              const attempts = quizAttempts.filter((a) => a.quizId === qz.id);
              const avg = attempts.length
                ? Math.round(attempts.reduce((a, b) => a + b.scorePercent, 0) / attempts.length)
                : 0;
              return (
                <div key={qz.id} className="min-w-0 border border-slate-200 p-4 text-xs break-words">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{qz.title}</p>
                    <span className="font-mono text-slate-600 tabular-nums shrink-0">
                      Intentos registrados: {attempts.length} · Promedio: {avg} %
                    </span>
                  </div>
                  {showQuizKeys && (
                    <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-2 text-slate-700">
                      {qz.questions.map((q, i) => (
                        <li key={q.id}>
                          <strong>{i + 1}.</strong> {q.prompt} →{' '}
                          <span className="font-medium text-emerald-700">
                            {q.options[q.correctIndex]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. CALIFICACIONES */}
      {activeTab === 'calificaciones' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 space-y-6 lg:col-span-6">
            <div className="min-w-0 border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    Cola de validación y revisión de entregas
                  </h2>
                  <p className="text-xs text-slate-500">
                    Selecciona una entrega pendiente para revisarla y asignar nota.
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setGradingFilter('pending')}
                    className={`rounded-md px-2.5 py-1 font-medium whitespace-nowrap ${
                      gradingFilter === 'pending'
                        ? 'bg-amber-700 text-white'
                        : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    Por calificar ({pendingSubmissions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGradingFilter('all')}
                    className={`rounded-md px-2.5 py-1 font-medium whitespace-nowrap ${
                      gradingFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    Todas ({submissions.length})
                  </button>
                </div>
              </div>

              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1 text-xs">
                {(gradingFilter === 'pending' ? pendingSubmissions : submissions).length === 0 ? (
                  <p className="py-4 text-center text-slate-500">
                    {gradingFilter === 'pending'
                      ? 'No hay entregas pendientes por calificar en este momento.'
                      : 'No hay entregas registradas todavía.'}
                  </p>
                ) : (
                  (gradingFilter === 'pending' ? pendingSubmissions : submissions).map((sub) => {
                    const stName =
                      students.find((s) => s.id === sub.studentId)?.displayName ?? sub.studentId;
                    const act = activities.find((a) => a.id === sub.activityId);
                    const selected = sub.id === gradingSubId;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => selectSubmissionForGrading(sub)}
                        className={`w-full border p-3 text-left transition-colors break-words ${
                          selected
                            ? 'border-blue-700 bg-blue-50'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                          <span className="font-semibold text-slate-900">
                            {sub.blockId} · {act?.code ?? sub.activityId} · {stName}
                          </span>
                          <span
                            className={
                              sub.status === 'calificada'
                                ? 'font-semibold text-emerald-700'
                                : sub.status === 'entregada' || sub.status === 'en_revision'
                                  ? 'font-semibold text-amber-800'
                                  : 'text-slate-500'
                            }
                          >
                            {sub.status.toUpperCase()}
                            {sub.grade ? ` · ${sub.grade.finalScore.toFixed(2)}/5.0` : ''}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-600">{act?.title ?? sub.activityId}</p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="min-w-0 border border-slate-200 bg-white p-6">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Libro de calificaciones provisionales
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-2 font-medium">Estudiante</th>
                      <th className="py-2 pr-2 font-medium">Progreso</th>
                      <th className="py-2 pr-2 font-medium">Asistencia</th>
                      <th className="py-2 font-medium">Nota provisional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cohortSummaries.map((cs) => (
                      <tr key={cs.studentId}>
                        <td className="py-2.5 pr-2 font-medium text-slate-900">{cs.displayName}</td>
                        <td className="py-2.5 pr-2 font-mono tabular-nums">{cs.summary.progressPercent} %</td>
                        <td className="py-2.5 pr-2 font-mono tabular-nums">{cs.summary.attendancePercent} %</td>
                        <td className="py-2.5 font-mono font-semibold tabular-nums">
                          {cs.summary.provisionalTotal.toFixed(2)} / 5.0
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="min-w-0 border border-slate-200 bg-white p-6 lg:col-span-6 lg:self-start break-words">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Calificar entrega y aplicar coevaluación (0,8–1,0)
            </h2>
            <div className="mt-4 space-y-4 text-xs">
              {/* Regla explícita de escala 0,0 a 5,0 */}
              <div className="border border-blue-200 bg-blue-50/80 p-3 text-blue-950">
                <p className="font-semibold">
                  Escala oficial permitida: únicamente de 0,0 a 5,0
                </p>
                <p className="mt-0.5 text-[11px] text-blue-900">
                  Usa decimales o enteros entre <strong>0,0</strong> y <strong>5,0</strong> (por ejemplo 3,5 o 4,5). No ingreses valores naturales altos como <strong>1000</strong>, <strong>2000</strong>, <strong>100</strong> ni porcentajes.
                </p>
              </div>

              <div>
                <label htmlFor="sub-select" className="block font-medium text-slate-700">
                  Entrega seleccionada
                </label>
                <select
                  id="sub-select"
                  value={gradingSubId}
                  onChange={(e) => {
                    const found = submissions.find((s) => s.id === e.target.value);
                    if (found) selectSubmissionForGrading(found);
                    else setGradingSubId(e.target.value);
                  }}
                  className="mt-1 w-full max-w-full border border-slate-300 bg-white p-2"
                >
                  {submissions.map((s) => {
                    const stName =
                      students.find((st) => st.id === s.studentId)?.displayName ?? s.studentId;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.blockId} · {s.activityId} · {stName} ({s.status})
                      </option>
                    );
                  })}
                </select>
              </div>

              {(() => {
                const selectedSub = submissions.find((s) => s.id === gradingSubId);
                if (!selectedSub) return null;
                const stName =
                  students.find((st) => st.id === selectedSub.studentId)?.displayName ??
                  selectedSub.studentId;
                const act = activities.find((a) => a.id === selectedSub.activityId);

                return (
                  <div className="border border-slate-200 bg-slate-50 p-3.5 text-slate-700 space-y-2 break-words overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div className="min-w-0 flex-1 font-mono text-[11px] text-slate-600">
                        <p className="font-semibold text-slate-900">
                          {stName} · {selectedSub.isGroupSubmission ? 'Trabajo en equipo' : 'Entrega individual'}
                        </p>
                        <p>
                          Recibo: {selectedSub.receiptCode ?? 'Borrador'} ·{' '}
                          {selectedSub.submittedAt
                            ? `Enviado ${new Date(selectedSub.submittedAt).toLocaleString('es-CO')}`
                            : 'Aún en borrador'}
                        </p>
                        {act && <p className="font-sans text-slate-600 mt-0.5">{act.title}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAnswersPreview((v) => !v)}
                        className="border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 shrink-0"
                      >
                        {showAnswersPreview ? 'Ocultar respuestas' : 'Ver respuestas'}
                      </button>
                    </div>

                    {showAnswersPreview && (
                      <div className="space-y-2">
                        {selectedSub.aiAssistanceDeclared && (
                          <p className="border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-950 break-words">
                            <strong>Declaración de IA:</strong>{' '}
                            {selectedSub.aiAssistanceDetail || 'Declarada por el estudiante.'}
                          </p>
                        )}
                        {Object.entries(selectedSub.answers).map(([k, v]) => (
                          <p key={k} className="leading-relaxed break-words">
                            <strong className="text-slate-900">{k}:</strong> {v}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {(() => {
                const selectedSub = submissions.find((s) => s.id === gradingSubId);
                const normalizedRawStr = rawScoreInput.trim().replace(',', '.');
                const parsedRaw = normalizedRawStr === '' ? NaN : Number(normalizedRawStr);
                const isRawValid =
                  Number.isFinite(parsedRaw) && parsedRaw >= 0 && parsedRaw <= 5;
                const isFactorValid =
                  Number.isFinite(coEvalFactor) && coEvalFactor >= 0.8 && coEvalFactor <= 1.0;
                const effectiveFactor = selectedSub?.isGroupSubmission ? coEvalFactor : 1.0;
                const computedFinal = isRawValid && isFactorValid
                  ? Number(Math.min(5, parsedRaw * effectiveFactor).toFixed(2))
                  : null;
                const meetsPassing =
                  computedFinal !== null && computedFinal >= course.gradingPolicy.passingScore;

                const performanceLabel =
                  computedFinal === null
                    ? 'Nota inválida'
                    : computedFinal >= 4.5
                      ? 'Excelente'
                      : computedFinal >= 4.0
                        ? 'Sobresaliente'
                        : computedFinal >= course.gradingPolicy.passingScore
                          ? 'Aprobado'
                          : 'Por debajo del umbral';

                const presets = [
                  { label: '5,0 · Excelente', val: 5.0 },
                  { label: '4,5 · Sobresaliente', val: 4.5 },
                  { label: '4,0 · Bueno', val: 4.0 },
                  { label: '3,5 · Mín. aprobatorio', val: 3.5 },
                  { label: '2,5 · Por mejorar', val: 2.5 },
                ];

                const feedbackTemplates = [
                  'Evidencia completa, clara y alineada con el contexto de Andina Logística S.A.S.',
                  'Buen análisis conceptual; falta detallar controles preventivos y responsables.',
                  'Revisar criterios de la rúbrica y reforzar la justificación técnica.',
                ];

                return (
                  <>
                    {/* Botones rápidos de nota + slider interactivo */}
                    <div className="border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900">
                          Selector rápido (rango 0,0 a 5,0)
                        </span>
                        <span className="font-mono text-[11px] text-slate-600 tabular-nums">
                          Mín. aprobatorio provisional: {course.gradingPolicy.passingScore.toFixed(1)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {presets.map((p) => {
                          const isSelectedPreset =
                            isRawValid && Math.abs(parsedRaw - p.val) < 0.05;
                          return (
                            <button
                              key={p.val}
                              type="button"
                              onClick={() => {
                                setRawScoreInput(p.val.toFixed(1));
                                setConfirmGradeOpen(false);
                              }}
                              className={`border px-2.5 py-1 text-[11px] font-medium transition-colors tabular-nums ${
                                isSelectedPreset
                                  ? 'border-blue-700 bg-blue-700 text-white'
                                  : 'border-slate-300 bg-white text-slate-800 hover:border-blue-500 hover:bg-blue-50'
                              }`}
                            >
                              {p.label}
                            </button>
                          );
                        })}
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                          <span>Ajuste fino con deslizador (0,0 – 5,0)</span>
                          <span className="font-mono font-semibold text-slate-900 tabular-nums">
                            {isRawValid ? `${parsedRaw.toFixed(1)} / 5,0` : 'Fuera de rango'}
                          </span>
                        </div>
                        <input
                          type="range"
                          aria-label="Deslizador de nota base de 0,0 a 5,0"
                          min={0}
                          max={5}
                          step={0.1}
                          value={isRawValid ? parsedRaw : 0}
                          onChange={(e) => {
                            setRawScoreInput(Number(e.target.value).toFixed(1));
                            setConfirmGradeOpen(false);
                          }}
                          className="w-full accent-blue-700 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="min-w-0">
                        <label htmlFor="raw-score" className="block font-medium text-slate-700">
                          Nota base (solo 0,0 a 5,0)
                        </label>
                        <input
                          id="raw-score"
                          type="text"
                          inputMode="decimal"
                          value={rawScoreInput}
                          onChange={(e) => {
                            setRawScoreInput(e.target.value);
                            setConfirmGradeOpen(false);
                          }}
                          placeholder="Ej. 4.5"
                          aria-invalid={!isRawValid}
                          className={`mt-1 w-full border p-2 font-mono ${
                            isRawValid
                              ? 'border-slate-300 bg-white text-slate-900'
                              : 'border-red-500 bg-red-50 text-red-900'
                          }`}
                        />
                        <p className="mt-1 text-[11px] text-slate-500">
                          Rango válido: 0,0 a 5,0 (no usar 1000, 2000, etc.).
                        </p>
                      </div>

                      <div className="min-w-0">
                        <label
                          htmlFor="coevaluacion-factor"
                          className="block font-medium text-slate-700"
                        >
                          Factor coevaluación (0,8 a 1,0)
                        </label>
                        <input
                          id="coevaluacion-factor"
                          type="number"
                          min={0.8}
                          max={1.0}
                          step={0.05}
                          disabled={selectedSub ? !selectedSub.isGroupSubmission : false}
                          value={selectedSub && !selectedSub.isGroupSubmission ? 1.0 : coEvalFactor}
                          onChange={(e) => {
                            setCoEvalFactor(Number(e.target.value));
                            setConfirmGradeOpen(false);
                          }}
                          className="mt-1 w-full border border-slate-300 bg-white p-2 font-mono disabled:bg-slate-100 disabled:text-slate-500"
                        />
                        <p className="mt-1 text-[11px] text-slate-500">
                          {selectedSub && !selectedSub.isGroupSubmission
                            ? 'Actividad individual: factor fijo en 1,00.'
                            : 'Solo para entregas en equipo (0,80–1,00).'}
                        </p>
                      </div>
                    </div>

                    {/* Alerta inmediata si el profesor escribe 1000, 2000 o un valor fuera de 0,0–5,0 */}
                    {!isRawValid && (
                      <div
                        role="alert"
                        className="border border-red-300 bg-red-50 p-3 text-red-900 space-y-2"
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-red-700 mt-0.5" aria-hidden="true" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">
                              Valor inválido: la calificación debe estar únicamente entre 0,0 y 5,0
                            </p>
                            <p className="mt-0.5 text-[11px] text-red-800">
                              No se permiten valores naturales altos como 1000 o 2000, números negativos ni texto no numérico.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRawScoreInput('4.0')}
                          className="border border-red-400 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-900 hover:bg-red-100"
                        >
                          Restablecer a valor válido (4,0)
                        </button>
                      </div>
                    )}

                    {!isFactorValid && (
                      <div
                        role="alert"
                        className="border border-red-300 bg-red-50 p-3 text-red-900 flex items-center justify-between gap-2"
                      >
                        <span className="text-[11px] font-semibold">
                          El factor de coevaluación debe estar entre 0,80 y 1,00.
                        </span>
                        <button
                          type="button"
                          onClick={() => setCoEvalFactor(1.0)}
                          className="border border-red-400 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-900 hover:bg-red-100 shrink-0"
                        >
                          Usar 1,00
                        </button>
                      </div>
                    )}

                    {/* Vista previa en vivo del cálculo de nota final */}
                    <div
                      className={`border p-3.5 transition-colors ${
                        computedFinal === null
                          ? 'border-red-200 bg-red-50/40'
                          : meetsPassing
                            ? 'border-emerald-200 bg-emerald-50/70'
                            : 'border-amber-200 bg-amber-50/70'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-medium text-slate-600">
                            Cálculo en tiempo real (escala 0,0–5,0)
                          </p>
                          <p className="font-display text-sm font-bold text-slate-900">
                            {performanceLabel}
                          </p>
                        </div>
                        <div className="text-right font-mono tabular-nums">
                          <p className="text-xl font-bold text-slate-900">
                            {computedFinal !== null ? `${computedFinal.toFixed(2)} / 5.0` : '— / 5.0'}
                          </p>
                          {computedFinal !== null && (
                            <p className="text-[11px] text-slate-600">
                              {parsedRaw.toFixed(2)} × {effectiveFactor.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label htmlFor="grade-feedback" className="block font-medium text-slate-700">
                          Retroalimentación formativa
                        </label>
                        <span className="text-[11px] text-slate-500">
                          Plantillas rápidas de apoyo:
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {feedbackTemplates.map((tpl) => (
                          <button
                            key={tpl}
                            type="button"
                            onClick={() =>
                              setGradeFeedback((prev) => (prev.trim() ? `${prev.trim()} ${tpl}` : tpl))
                            }
                            className="border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 hover:border-blue-400 hover:bg-blue-50 text-left"
                          >
                            + {tpl}
                          </button>
                        ))}
                      </div>
                      <textarea
                        id="grade-feedback"
                        rows={3}
                        value={gradeFeedback}
                        onChange={(e) => setGradeFeedback(e.target.value)}
                        placeholder="Qué estuvo bien, qué mejorar y siguiente paso..."
                        className="mt-2 w-full border border-slate-300 p-2"
                      />
                    </div>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={publishGrade}
                        onChange={(e) => setPublishGrade(e.target.checked)}
                      />
                      <span>Publicar calificación y notificar al estudiante</span>
                    </label>

                    <button
                      type="button"
                      disabled={!gradingSubId || !isRawValid || !isFactorValid}
                      onClick={() => setConfirmGradeOpen(true)}
                      className="bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Registrar calificación
                    </button>

                    {confirmGradeOpen && isRawValid && isFactorValid && computedFinal !== null && (
                      <div role="dialog" className="border border-blue-200 bg-blue-50 p-3">
                        <p className="font-semibold text-blue-950 tabular-nums">
                          Confirmar nota final {computedFinal.toFixed(2)} / 5.0 (quedará auditada)
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await onGradeSubmission({
                                submissionId: gradingSubId,
                                rawScore: parsedRaw,
                                coEvalFactor: effectiveFactor,
                                feedback:
                                  gradeFeedback.trim() ||
                                  'Evaluado conforme a criterios del bloque.',
                                publishedToStudent: publishGrade,
                              });
                              setConfirmGradeOpen(false);
                              setFeedbackBanner('Calificación guardada y auditada.');
                            }}
                            className="bg-blue-700 px-3 py-1 text-white hover:bg-blue-800"
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmGradeOpen(false)}
                            className="border border-slate-300 bg-white px-3 py-1 hover:bg-slate-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 6. ASISTENCIA */}
      {activeTab === 'asistencia' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 border border-slate-200 bg-white p-6 lg:col-span-5 break-words">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Registrar o corregir asistencia (auditado)
            </h2>
            <div className="mt-4 space-y-3 text-xs">
              <select
                value={attStudentId}
                onChange={(e) => setAttStudentId(e.target.value)}
                aria-label="Estudiante"
                className="w-full max-w-full border border-slate-300 bg-white p-2"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.displayName}</option>
                ))}
              </select>
              <select
                value={attBlockId}
                onChange={(e) => setAttBlockId(e.target.value)}
                aria-label="Bloque"
                className="w-full max-w-full border border-slate-300 bg-white p-2"
              >
                {blocks.map((b) => (
                  <option key={b.id} value={b.id}>{b.code} · {b.title}</option>
                ))}
              </select>
              <select
                value={attStatus}
                onChange={(e) => setAttStatus(e.target.value as typeof attStatus)}
                aria-label="Estado de asistencia"
                className="w-full max-w-full border border-slate-300 bg-white p-2"
              >
                <option value="presente">Presente (120 min)</option>
                <option value="justificado">Justificado (120 min)</option>
                <option value="ausente">Ausente (0 min)</option>
              </select>
              <input
                type="text"
                value={attReason}
                onChange={(e) => setAttReason(e.target.value)}
                placeholder="Justificación del registro o corrección"
                className="w-full border border-slate-300 p-2"
              />
              <button
                type="button"
                onClick={async () => {
                  await onRecordAttendance({
                    studentId: attStudentId,
                    blockId: attBlockId,
                    status: attStatus,
                    minutesAttended: attStatus === 'ausente' ? 0 : 120,
                    correctionReason: attReason,
                  });
                  setFeedbackBanner(`Asistencia guardada para ${attBlockId}.`);
                }}
                className="w-full bg-slate-900 py-2 font-medium text-white hover:bg-blue-700"
              >
                Guardar asistencia
              </button>
            </div>
          </div>

          <div className="min-w-0 border border-slate-200 bg-white p-6 lg:col-span-7 break-words">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Registros recientes de asistencia
            </h3>
            <div className="mt-3 divide-y divide-slate-100 text-xs">
              {attendance.map((a, idx) => (
                <div key={idx} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span className="min-w-0 break-words">
                    <strong className="font-mono">{a.blockId}</strong> · {a.studentId}
                  </span>
                  <span className="font-mono text-slate-700 tabular-nums shrink-0">
                    {a.status.toUpperCase()} ({a.minutesAttended} min)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. ANALÍTICA */}
      {activeTab === 'analitica' && (
        <div className="mt-6 space-y-6">
          <div className="border border-slate-200 bg-white p-6">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Indicadores agregados propuestos por el programa (Sección 11.3)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Métricas agregadas de cohorte ({analytics.cohortSize} participantes). No exponen datos individuales ni establecen causalidad automática.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 tabular-nums">
              <div className="border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Meta asistencia (≥ 90 %)</p>
                <p className="mt-1 font-mono text-xl font-bold text-slate-900">{analytics.avgAttendancePercent} %</p>
              </div>
              <div className="border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Línea base Q0</p>
                <p className="mt-1 font-mono text-xl font-bold text-slate-900">{analytics.q0BaselineAvgPercent} %</p>
              </div>
              <div className="border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Promedio Q1–Q4</p>
                <p className="mt-1 font-mono text-xl font-bold text-slate-900">{analytics.q1ToQ4AvgPercent} %</p>
              </div>
              <div className="border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Ganancia Q0 → Q1–Q4 (meta ≥ +30 pp)</p>
                <p className="mt-1 font-mono text-xl font-bold text-blue-700">
                  {analytics.learningGainPoints >= 0 ? `+${analytics.learningGainPoints}` : analytics.learningGainPoints} pp
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. CONFIGURACIÓN */}
      {activeTab === 'configuracion' && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="min-w-0 border border-slate-200 bg-white p-6 lg:col-span-6 space-y-4 text-xs break-words">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Configuración de curso e imagen `1_Ciberseguridad`
              </h2>
              <div>
                <label htmlFor="cover-url" className="block font-medium text-slate-700">
                  Ruta imagen configurable (`{course.coverImageKey}`) — deja vacío para probar placeholder accesible
                </label>
                <input
                  id="cover-url"
                  type="text"
                  value={coverUrlInput}
                  onChange={(e) => setCoverUrlInput(e.target.value)}
                  className="mt-1 w-full border border-slate-300 p-2 font-mono"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <label htmlFor="modality-select" className="block font-medium text-slate-700">Modalidad</label>
                  <select
                    id="modality-select"
                    value={modalityInput}
                    onChange={(e) => setModalityInput(e.target.value as CourseConfig['modality'])}
                    className="mt-1 w-full max-w-full border border-slate-300 bg-white p-2"
                  >
                    <option value="Presencial">Presencial</option>
                    <option value="Híbrida sincrónica">Híbrida sincrónica</option>
                    <option value="Virtual asincrónica con sesiones sincrónicas">Virtual asincrónica</option>
                  </select>
                </div>
                <div className="min-w-0">
                  <label htmlFor="passing-score" className="block font-medium text-slate-700">Nota aprobatoria provisional (SO-6)</label>
                  <input
                    id="passing-score"
                    type="number"
                    min={1}
                    max={5}
                    step={0.1}
                    value={passingInput}
                    onChange={(e) => setPassingInput(Number(e.target.value))}
                    className="mt-1 w-full border border-slate-300 p-2 font-mono"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await onUpdateConfig({
                    coverImageUrl: coverUrlInput,
                    modality: modalityInput,
                    passingScore: passingInput,
                  });
                  setFeedbackBanner('Configuración del curso actualizada y auditada.');
                }}
                className="bg-slate-900 px-4 py-2 font-medium text-white hover:bg-blue-700"
              >
                Guardar configuración
              </button>

              <div className="border-t border-slate-100 pt-4">
                <p className="font-semibold text-slate-900">Adaptadores externos desacoplados</p>
                <ul className="mt-2 space-y-2">
                  {adaptersHealth.map((ad) => (
                    <li key={ad.id} className="min-w-0 border border-slate-200 p-2.5 break-words">
                      <div className="flex flex-wrap justify-between gap-2 font-medium text-slate-900">
                        <span>{ad.name}</span>
                        <span className="font-mono text-[11px] text-slate-500">{ad.mode}</span>
                      </div>
                      <p className="mt-0.5 text-slate-600">{ad.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="min-w-0 border border-slate-200 bg-white p-6 lg:col-span-6 break-words">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-700 shrink-0" aria-hidden="true" />
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Supuestos institucionales (SO-1 a SO-12)
                </h2>
              </div>
              <div className="mt-3 max-h-96 overflow-y-auto divide-y divide-slate-100 text-xs">
                {assumptions.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0 flex-1 break-words">
                      <p className="font-semibold text-slate-900">{a.code} · {a.title}</p>
                      <p className="text-slate-600">{a.currentValue}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const nextStatus =
                          a.status === 'pendiente_validacion'
                            ? 'validado_institucion'
                            : 'pendiente_validacion';
                        await onUpdateConfig({
                          assumptionUpdate: { id: a.id, status: nextStatus },
                        });
                        setFeedbackBanner(`Supuesto ${a.code} actualizado a ${nextStatus}.`);
                      }}
                      className={`shrink-0 border px-2.5 py-1 font-medium ${
                        a.status === 'validado_institucion'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-amber-300 bg-amber-50 text-amber-800'
                      }`}
                    >
                      {a.status === 'validado_institucion' ? 'Validado' : 'Pendiente'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-slate-200 bg-white p-6 min-w-0">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Registro de auditoría de acciones sensibles
            </h3>
            <div className="mt-3 max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs font-mono">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="text-slate-900 break-words min-w-0">
                    {log.action} · {log.actorId} ({log.actorRole}) → {log.detail}
                  </span>
                  <span className={`shrink-0 ${log.outcome === 'denegado' ? 'text-red-700' : 'text-slate-500'}`}>
                    {log.outcome} · {new Date(log.timestamp).toLocaleTimeString('es-CO')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
