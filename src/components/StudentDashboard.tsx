import { ArrowRight, Calendar, CheckCircle2, Clock, FileCheck2, Shield } from 'lucide-react';
import type {
  BlockSpec,
  CalendarEventItem,
  CourseConfig,
  NotificationItem,
  SubmissionRecord,
  UserProfile,
} from '../shared/types.ts';
import type { StudentGradeSummary } from '../../server/grading.ts';

interface StudentDashboardProps {
  user: UserProfile;
  course: CourseConfig;
  blocks: BlockSpec[];
  submissions: SubmissionRecord[];
  summary: StudentGradeSummary;
  calendarEvents: CalendarEventItem[];
  notifications: NotificationItem[];
  onOpenBlock: (blockId: string) => void;
  onOpenGradesTab: () => void;
}

export function StudentDashboard({
  user,
  course,
  blocks,
  submissions,
  summary,
  calendarEvents,
  notifications,
  onOpenBlock,
  onOpenGradesTab,
}: StudentDashboardProps) {
  // Determine next unfinished block transparently
  const submittedBlocks = new Set(
    submissions
      .filter((s) => s.status === 'entregada' || s.status === 'calificada' || s.status === 'en_revision')
      .map((s) => s.blockId)
  );
  const nextBlock = blocks.find((b) => !submittedBlocks.has(b.id)) ?? blocks[0];

  return (
    <section aria-labelledby="student-dash-heading" className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium text-blue-700">
            Panel del estudiante · {user.profileContext}
          </p>
          <h1 id="student-dash-heading" className="mt-1 font-display text-2xl font-bold text-slate-900">
            Hola, {user.displayName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Visualiza tu avance por evidencias demostradas, próximas fechas y retroalimentación personal.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-500 tabular-nums">
          Zona horaria: {user.preferences.timezone}
        </div>
      </div>

      {/* Continue Learning Hero */}
      {nextBlock && (
        <div className="mt-6 grid gap-6 border border-slate-200 bg-white p-6 lg:grid-cols-12 items-center">
          <div className="min-w-0 lg:col-span-8 break-words">
            <p className="text-xs font-mono text-blue-700">
              Continuar aprendiendo · Siguiente bloque sugerido: {nextBlock.code} ({nextBlock.hourRange})
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-slate-900">
              {nextBlock.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{nextBlock.objective}</p>
            <p className="mt-2 text-xs text-slate-500">
              Evidencia esperada: {nextBlock.expectedEvidence} · Resultados: {nextBlock.learningOutcomeIds.join(', ')}
            </p>
          </div>
          <div className="min-w-0 flex flex-col items-start gap-3 lg:col-span-4 lg:items-end">
            <button
              type="button"
              onClick={() => onOpenBlock(nextBlock.id)}
              className="inline-flex items-center gap-2 bg-blue-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800 sm:whitespace-nowrap"
            >
              <span>Retomar en {nextBlock.code}</span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
            <span className="text-xs text-slate-500 tabular-nums">
              {summary.completedBlocksCount} de {summary.totalBlocksCount} bloques con evidencia completada
            </span>
          </div>
        </div>
      )}

      {/* KPI Row (transparent rules, no screen-time inflation) */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">Progreso por evidencias</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {summary.progressPercent} %
          </p>
          <p className="mt-1 text-xs text-slate-600 tabular-nums">
            {summary.completedBlocksCount}/{summary.totalBlocksCount} bloques completados
          </p>
        </div>
        <div className="border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">Asistencia registrada</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {summary.attendancePercent} %
          </p>
          <p className="mt-1 text-xs text-slate-600 tabular-nums">
            {summary.attendedHours} h / {summary.totalProgramHours} h (mín. {course.gradingPolicy.minAttendancePercent} %)
          </p>
        </div>
        <div className="border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">Nota acumulada provisional</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {summary.provisionalTotal.toFixed(2)} / 5.0
          </p>
          <p className="mt-1 text-xs text-amber-700 tabular-nums">
            {summary.evaluatedWeightPercent} % ponderado evaluado (Provisional)
          </p>
        </div>
        <div className="border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">Entregas registradas</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {submissions.length}
          </p>
          <button
            type="button"
            onClick={onOpenGradesTab}
            className="mt-1 text-xs font-medium text-blue-700 hover:underline"
          >
            Ver detalle de notas y rúbricas
          </button>
        </div>
      </div>

      {/* Main grid: Progress by component + Calendar & Recent Activity */}
      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 border border-slate-200 bg-white p-6 lg:col-span-7 break-words">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Mis cursos y avance evaluativo (regla transparente)
            </h2>
            <span className="text-xs text-slate-500 shrink-0">Escala 0,0–5,0</span>
          </div>
          <p className="mt-3 text-xs text-slate-600">
            El progreso refleja bloques con actividades y cuestionarios requeridos efectivamente enviados, nunca solo tiempo en pantalla.
          </p>
          <div className="mt-4 divide-y divide-slate-100">
            {summary.components.map((c) => (
              <div key={c.componentId} className="flex flex-wrap items-center justify-between gap-4 py-3 text-sm">
                <div className="min-w-0 flex-1 break-words">
                  <p className="font-medium text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.detail}</p>
                </div>
                <div className="text-right font-mono tabular-nums shrink-0">
                  <p className="font-semibold text-slate-900">
                    {c.scoreFiveScale !== null ? `${c.scoreFiveScale.toFixed(2)} / 5.0` : 'Pendiente'}
                  </p>
                  <p className="text-xs text-slate-500">Peso {c.weightPercent} %</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 space-y-6 lg:col-span-5 break-words">
          <div className="min-w-0 border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calendar className="h-4 w-4 text-blue-700 shrink-0" aria-hidden="true" />
              <h2 className="font-display text-base font-semibold text-slate-900">
                Próximas sesiones y entregas
              </h2>
            </div>
            <ul className="mt-3 space-y-3">
              {calendarEvents.slice(0, 4).map((ev) => (
                <li key={ev.id} className="border-b border-slate-100 pb-2.5 last:border-b-0 last:pb-0">
                  <p className="text-xs font-mono text-slate-500 tabular-nums">
                    {new Date(ev.startIso).toLocaleDateString('es-CO', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-slate-900">{ev.title}</p>
                  <p className="text-xs text-slate-600">{ev.modalityNote}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileCheck2 className="h-4 w-4 text-emerald-700 shrink-0" aria-hidden="true" />
              <h2 className="font-display text-base font-semibold text-slate-900">
                Actividad reciente y avisos propios
              </h2>
            </div>
            {notifications.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">Sin notificaciones recientes.</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {notifications.map((n) => (
                  <li key={n.id} className="text-xs border-b border-slate-100 pb-2 last:border-b-0 break-words">
                    <p className="font-medium text-slate-900">{n.title}</p>
                    <p className="text-slate-600">{n.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Block Grid Overview */}
      <div className="mt-8 min-w-0 border border-slate-200 bg-white p-6 break-words">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Mapa rápido de los 20 bloques (B01–B15 y C01–C05)
          </h2>
          <span className="text-xs text-slate-500 tabular-nums">40 horas totales</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {blocks.map((b) => {
            const sub = submissions.find((s) => s.blockId === b.id);
            const stateText = sub?.status === 'calificada'
              ? 'Evaluado'
              : sub?.status === 'entregada'
                ? 'Entregado'
                : sub?.status === 'borrador'
                  ? 'En curso'
                  : 'Disponible';
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onOpenBlock(b.id)}
                className="min-w-0 flex flex-col justify-between border border-slate-200 p-3 text-left transition-colors hover:border-blue-600 hover:bg-slate-50 break-words"
              >
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-mono text-slate-500">
                  <span>{b.code}</span>
                  <span>{b.hourRange}</span>
                </div>
                <p className="mt-1.5 text-xs font-semibold text-slate-900 line-clamp-2">{b.title}</p>
                <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-slate-700">
                  {stateText === 'Evaluado' || stateText === 'Entregado' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
                  ) : stateText === 'En curso' ? (
                    <Clock className="h-3.5 w-3.5 text-amber-700 shrink-0" aria-hidden="true" />
                  ) : (
                    <Shield className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                  )}
                  <span>{stateText}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
