import { useCallback, useEffect, useState } from 'react';
import { Bell, Eye, Lock, Shield, SlidersHorizontal, UserCheck, X } from 'lucide-react';
import {
  GoogleAuthProvider,
  browserSessionPersistence,
  onIdTokenChanged,
  setPersistence,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { DEFAULT_COURSE_ID } from './shared/curriculum.ts';
import type {
  ActivityDefinition,
  AttendanceRecord,
  AuditLogEntry,
  BlockSpec,
  CalendarEventItem,
  CaseStudySpec,
  CourseConfig,
  CourseInstructorPublic,
  CourseResource,
  EvaluationComponent,
  ForumPost,
  InstitutionalAssumption,
  LearningOutcome,
  ModuleUnit,
  NotificationItem,
  PhishingTrainingSample,
  QuizAttemptRecord,
  QuizDefinition,
  RubricDefinition,
  SubmissionRecord,
  TeamGroup,
  UserProfile,
} from './shared/types.ts';
import type { StudentGradeSummary } from '../server/grading.ts';
import { apiFetch, setAuthToken } from './lib/api.ts';
import { CatalogView, type CatalogCourseItem } from './components/CatalogView.tsx';
import { DiplomaOverview } from './components/DiplomaOverview.tsx';
import { StudentDashboard } from './components/StudentDashboard.tsx';
import { ClassroomView, type ClassroomTab } from './components/ClassroomView.tsx';
import { TeacherWorkspace } from './components/TeacherWorkspace.tsx';
import { InteractivesHub, type InteractiveToolId } from './components/interactives/InteractivesHub.tsx';
import { CoordinatorWorkspace } from './components/CoordinatorWorkspace.tsx';
import { getFirebaseAuth, isFirebaseConfigured } from './lib/firebase.ts';

type ActiveRoute = 'catalog' | 'overview' | 'dashboard' | 'classroom' | 'interactives' | 'teacher' | 'admin';

interface CoursePayload {
  accessLevel: 'solo_lectura' | 'estudiante' | 'profesor';
  course: CourseConfig;
  modules: ModuleUnit[];
  learningOutcomes: LearningOutcome[];
  blocks: BlockSpec[];
  resources: CourseResource[];
  activities: ActivityDefinition[];
  quizzes: QuizDefinition[];
  rubrics: RubricDefinition[];
  evaluationComponents: EvaluationComponent[];
  instructors: CourseInstructorPublic[];
  caseStudies: CaseStudySpec[];
  phishingSamples?: PhishingTrainingSample[];
  assumptions: InstitutionalAssumption[];
  submissions?: SubmissionRecord[];
  quizAttempts?: QuizAttemptRecord[];
  attendance?: AttendanceRecord[];
  summary?: StudentGradeSummary;
  calendarEvents?: CalendarEventItem[];
  notifications?: NotificationItem[];
  interactiveProgress?: Record<string, unknown>;
  teams?: TeamGroup[];
  students?: {
    id: string;
    displayName: string;
    email: string;
    profileContext: string;
    teamId?: string;
    pairId?: string;
  }[];
  cohortSummaries?: {
    studentId: string;
    displayName: string;
    profileContext: string;
    teamId?: string;
    summary: StudentGradeSummary;
  }[];
  auditLogs?: AuditLogEntry[];
  analytics?: {
    cohortSize: number;
    avgAttendancePercent: number;
    q0BaselineAvgPercent: number;
    q1ToQ4AvgPercent: number;
    learningGainPoints: number;
    pendingGradingCount: number;
  };
}

export default function App() {
  const [route, setRoute] = useState<ActiveRoute>('catalog');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [courses, setCourses] = useState<CatalogCourseItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(DEFAULT_COURSE_ID);
  const [courseData, setCourseData] = useState<CoursePayload | null>(null);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [adaptersHealth, setAdaptersHealth] = useState<
    { id: string; name: string; mode: string; description: string }[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Classroom / Interactive deep-links
  const [classroomBlockId, setClassroomBlockId] = useState('B01');
  const [classroomTab, setClassroomTab] = useState<ClassroomTab>('contenido');
  const [interactiveTool, setInteractiveTool] = useState<InteractiveToolId>('acronyms');

  // Modals / Popovers
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  // Sync accessibility preferences onto <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('a11y-large-text', largeText);
    root.classList.toggle('a11y-high-contrast', highContrast);
  }, [largeText, highContrast]);

  // Esc key closes open dialogs/popovers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAccountModalOpen(false);
        setNotificationsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const loadWorkspace = useCallback(async (targetCourseId = selectedCourseId) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [meRes, catRes, healthRes] = await Promise.all([
        apiFetch<{
          user: UserProfile;
          isAuthenticated: boolean;
          isCoordinator: boolean;
        }>('/api/auth/me'),
        apiFetch<{ courses: CatalogCourseItem[] }>('/api/catalog'),
        apiFetch<{
          adapters: { id: string; name: string; mode: string; description: string }[];
        }>('/api/health'),
      ]);

      setUser({ ...meRes.user, isCoordinator: meRes.isCoordinator });
      setAuthenticated(meRes.isAuthenticated);
      setCourses(catRes.courses);
      setAdaptersHealth(healthRes.adapters);
      setLargeText(meRes.user.preferences.largeText);
      setHighContrast(meRes.user.preferences.highContrast);

      const courseToLoad =
        catRes.courses.some((c) => c.id === targetCourseId)
          ? targetCourseId
          : catRes.courses[0]?.id;

      if (courseToLoad) {
        setSelectedCourseId(courseToLoad);
        const detail = await apiFetch<CoursePayload>(`/api/courses/${courseToLoad}`);
        setCourseData(detail);

        if (meRes.user.role !== 'solo_lectura') {
          const forumRes = await apiFetch<{ posts: ForumPost[] }>(
            `/api/courses/${courseToLoad}/forum`
          );
          setForumPosts(forumRes.posts);
        } else {
          setForumPosts([]);
        }
      } else {
        setCourseData(null);
        setForumPosts([]);
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'Error al cargar la plataforma.');
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    let active = true;
    const auth = getFirebaseAuth();
    if (!auth) {
      setAuthToken(null);
      void loadWorkspace();
      return () => {
        active = false;
      };
    }

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      try {
        setAuthToken(firebaseUser ? await firebaseUser.getIdToken() : null);
        if (active) await loadWorkspace();
      } catch (err) {
        if (active) setErrorMsg((err as Error).message || 'No se pudo validar la sesión de Google.');
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [loadWorkspace]);

  const handleGoogleSignIn = async () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setErrorMsg('Falta configurar Firebase Authentication para este entorno.');
      return;
    }
    try {
      setErrorMsg(null);
      await setPersistence(auth, browserSessionPersistence);
      await signInWithPopup(auth, new GoogleAuthProvider());
      setAccountModalOpen(false);
    } catch (err) {
      setErrorMsg((err as Error).message || 'No se pudo iniciar sesión con Google.');
    }
  };

  const handleSignOut = async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    try {
      await signOut(auth);
      setAuthToken(null);
      setAuthenticated(false);
      setRoute('catalog');
      setAccountModalOpen(false);
    } catch (err) {
      setErrorMsg((err as Error).message || 'No se pudo cerrar la sesión.');
    }
  };

  const handleBrandClick = () => {
    if (user?.role === 'profesor') setRoute('teacher');
    else if (user?.role === 'estudiante') setRoute('dashboard');
    else setRoute('catalog');
  };

  const isReadOnly =
    !user ||
    user.role === 'solo_lectura' ||
    user.status !== 'activo';

  useEffect(() => {
    if (isReadOnly && route !== 'catalog' && route !== 'overview' && !(route === 'admin' && user?.isCoordinator)) {
      setRoute('catalog');
    }
  }, [isReadOnly, route, user?.isCoordinator]);

  const isTeacherOfSelected =
    user?.status === 'activo' &&
    user.role === 'profesor' &&
    user.assignedCourseIds.includes(selectedCourseId);

  const notifications = courseData?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 overflow-x-clip">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-blue-700 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Saltar al contenido principal
      </a>

      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 sm:gap-6 px-4 sm:px-6 py-3.5">
          {/* Zone 1: Single text wordmark */}
          <button
            type="button"
            onClick={handleBrandClick}
            className="font-display text-lg font-bold tracking-tight text-slate-900 hover:text-blue-700 whitespace-nowrap shrink-0"
          >
            EGIDA_MOODLE
          </button>

          {/* Zone 2: 4–5 concise single-line navigation links */}
          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-sm font-medium text-slate-600"
          >
            <button
              type="button"
              disabled={isReadOnly}
              aria-disabled={isReadOnly}
              title={
                isReadOnly
                  ? 'Inicia sesión como estudiante o profesor para acceder al aula'
                  : undefined
              }
              onClick={() => {
                if (!isReadOnly) setRoute('classroom');
              }}
              aria-current={route === 'classroom' && !isReadOnly ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 whitespace-nowrap shrink-0 transition-colors duration-150 ${
                isReadOnly
                  ? 'cursor-not-allowed text-slate-400 opacity-65'
                  : route === 'classroom'
                    ? 'bg-indigo-700 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-white hover:text-indigo-700'
              }`}
            >
              {isReadOnly && <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
              <span>Aula</span>
            </button>
            <button
              type="button"
              disabled={isReadOnly}
              aria-disabled={isReadOnly}
              title={
                isReadOnly
                  ? 'Inicia sesión como estudiante o profesor para acceder a los interactivos'
                  : undefined
              }
              onClick={() => {
                if (!isReadOnly) setRoute('interactives');
              }}
              aria-current={route === 'interactives' && !isReadOnly ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 whitespace-nowrap shrink-0 transition-colors duration-150 ${
                isReadOnly
                  ? 'cursor-not-allowed text-slate-400 opacity-65'
                  : route === 'interactives'
                    ? 'bg-amber-700 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-white hover:text-amber-700'
              }`}
            >
              {isReadOnly && <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
              <span>Interactivos</span>
            </button>
            <button
              type="button"
              onClick={() => setRoute('catalog')}
              aria-current={route === 'catalog' || route === 'overview' ? 'page' : undefined}
              className={`rounded-md px-3.5 py-1.5 whitespace-nowrap shrink-0 transition-colors duration-150 ${
                route === 'catalog' || route === 'overview'
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-white hover:text-blue-700'
              }`}
            >
              Catálogo
            </button>
            {user?.role === 'estudiante' && (
              <button
                type="button"
                onClick={() => setRoute('dashboard')}
                aria-current={route === 'dashboard' ? 'page' : undefined}
                className={`rounded-md px-3.5 py-1.5 whitespace-nowrap shrink-0 transition-colors duration-150 ${
                  route === 'dashboard'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-white hover:text-emerald-700'
                }`}
              >
                Mi panel
              </button>
            )}
            {isTeacherOfSelected && (
              <button
                type="button"
                onClick={() => setRoute('teacher')}
                aria-current={route === 'teacher' ? 'page' : undefined}
                className={`rounded-md px-3.5 py-1.5 whitespace-nowrap shrink-0 transition-colors duration-150 ${
                  route === 'teacher'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-white hover:text-slate-900'
                }`}
              >
                Docencia
              </button>
            )}
            {user?.isCoordinator && (
              <button
                type="button"
                onClick={() => setRoute('admin')}
                aria-current={route === 'admin' ? 'page' : undefined}
                className={`rounded-md px-3.5 py-1.5 whitespace-nowrap shrink-0 transition-colors duration-150 ${
                  route === 'admin'
                    ? 'bg-violet-800 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-white hover:text-violet-800'
                }`}
              >
                Coordinación
              </button>
            )}
          </nav>

          {/* Zone 3: Primary Account / Access Action */}
          <div className="flex items-center gap-3 shrink-0">
            {user && user.status === 'activo' && user.role !== 'solo_lectura' && (
              <button
                type="button"
                aria-label={`Notificaciones (${unreadCount} sin leer)`}
                onClick={() => setNotificationsOpen((v) => !v)}
                className="relative border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="sr-only">{unreadCount} notificaciones nuevas</span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setAccountModalOpen(true)}
              className="inline-flex items-center gap-2 bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {user?.isCoordinator
                  ? 'Coordinación'
                  : user?.status === 'activo' && user.role === 'profesor'
                    ? 'Profesor'
                    : user?.status === 'activo' && user.role === 'estudiante'
                      ? 'Estudiante'
                      : authenticated
                        ? 'Acceso pendiente'
                        : 'Iniciar sesión'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Strip */}
      <nav
        aria-label="Navegación móvil"
        className="flex md:hidden items-center gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600"
      >
        <button
          type="button"
          disabled={isReadOnly}
          aria-disabled={isReadOnly}
          onClick={() => {
            if (!isReadOnly) setRoute('classroom');
          }}
          className={`inline-flex items-center gap-1 rounded px-2.5 py-1 whitespace-nowrap shrink-0 ${
            isReadOnly
              ? 'cursor-not-allowed text-slate-400 opacity-65'
              : route === 'classroom'
                ? 'bg-indigo-700 text-white'
                : 'text-slate-700'
          }`}
        >
          {isReadOnly && <Lock className="h-3 w-3" aria-hidden="true" />}
          <span>Aula</span>
        </button>
        <button
          type="button"
          disabled={isReadOnly}
          aria-disabled={isReadOnly}
          onClick={() => {
            if (!isReadOnly) setRoute('interactives');
          }}
          className={`inline-flex items-center gap-1 rounded px-2.5 py-1 whitespace-nowrap shrink-0 ${
            isReadOnly
              ? 'cursor-not-allowed text-slate-400 opacity-65'
              : route === 'interactives'
                ? 'bg-amber-700 text-white'
                : 'text-slate-700'
          }`}
        >
          {isReadOnly && <Lock className="h-3 w-3" aria-hidden="true" />}
          <span>Interactivos</span>
        </button>
        <button
          type="button"
          onClick={() => setRoute('catalog')}
          className={`rounded px-2.5 py-1 whitespace-nowrap shrink-0 ${
            route === 'catalog' || route === 'overview'
              ? 'bg-blue-700 text-white'
              : 'text-slate-700'
          }`}
        >
          Catálogo
        </button>
        {user?.role === 'estudiante' && (
          <button
            type="button"
            onClick={() => setRoute('dashboard')}
            className={`rounded px-2.5 py-1 whitespace-nowrap shrink-0 ${
              route === 'dashboard' ? 'bg-emerald-700 text-white' : 'text-slate-700'
            }`}
          >
            Mi panel
          </button>
        )}
        {isTeacherOfSelected && (
          <button
            type="button"
            onClick={() => setRoute('teacher')}
            className={`rounded px-2.5 py-1 whitespace-nowrap shrink-0 ${
              route === 'teacher' ? 'bg-slate-900 text-white' : 'text-slate-700'
            }`}
          >
            Docencia
          </button>
        )}
        {user?.isCoordinator && (
          <button
            type="button"
            onClick={() => setRoute('admin')}
            className={`rounded px-2.5 py-1 whitespace-nowrap shrink-0 ${
              route === 'admin' ? 'bg-violet-800 text-white' : 'text-slate-700'
            }`}
          >
            Coordinación
          </button>
        )}
      </nav>

      {/* Read-only notice band (Section 4.15) */}
      {user?.role === 'solo_lectura' && !user.isCoordinator && (
        <div
          role="status"
          className="border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-xs text-amber-950"
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 shrink-0 text-amber-800" aria-hidden="true" />
              <span>
                <strong>{authenticated ? 'Acceso pendiente:' : 'Modo solo lectura:'}</strong>{' '}
                {authenticated
                  ? 'Tu cuenta de Google necesita un rol activo asignado por coordinación.'
                  : 'El catálogo público está disponible; inicia sesión con Google para solicitar acceso al aula.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAccountModalOpen(true)}
              className="font-semibold text-amber-950 underline whitespace-nowrap shrink-0"
            >
              {authenticated ? 'Ver estado de acceso' : 'Iniciar sesión'}
            </button>
          </div>
        </div>
      )}

      {/* Notifications Popover */}
      {notificationsOpen && (
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 relative">
          <div
            role="dialog"
            aria-label="Avisos del curso"
            className="absolute right-4 sm:right-6 top-2 z-40 w-80 max-w-[calc(100vw-2rem)] border border-slate-300 bg-white p-4 shadow-lg break-words"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="font-display text-sm font-semibold text-slate-900">Notificaciones</h2>
              <button
                type="button"
                aria-label="Cerrar notificaciones"
                onClick={() => setNotificationsOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {notifications.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">Sin avisos nuevos.</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100 text-xs">
                {notifications.map((n) => (
                  <li key={n.id} className="py-2">
                    <p className="font-medium text-slate-900">{n.title}</p>
                    <p className="text-slate-600">{n.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div role="alert" className="mx-auto mt-4 w-full max-w-6xl px-6">
          <div className="flex items-center justify-between border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-900">
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="font-medium underline">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main id="main-content" className="flex-1 min-w-0">
        {route === 'catalog' && user && (
          <CatalogView
            courses={courses}
            user={user}
            loading={loading}
            onOpenOverview={(courseId) => {
              setSelectedCourseId(courseId);
              loadWorkspace(courseId);
              setRoute('overview');
            }}
            onContinueCourse={(courseId) => {
              if (isReadOnly) {
                setAccountModalOpen(true);
                return;
              }
              setSelectedCourseId(courseId);
              setRoute('classroom');
            }}
            onOpenRoleModal={() => setAccountModalOpen(true)}
          />
        )}

        {route === 'admin' && user?.isCoordinator && (
          <CoordinatorWorkspace currentUserId={user.id} />
        )}

        {route === 'overview' && courseData && user && (
          <DiplomaOverview
            course={courseData.course}
            modules={courseData.modules}
            blocks={courseData.blocks}
            learningOutcomes={courseData.learningOutcomes}
            evaluationComponents={courseData.evaluationComponents}
            rubrics={courseData.rubrics}
            resources={courseData.resources}
            instructors={courseData.instructors}
            assumptions={courseData.assumptions}
            user={user}
            onBackCatalog={() => setRoute('catalog')}
            onEnterClassroom={() => {
              if (isReadOnly) {
                setAccountModalOpen(true);
                return;
              }
              setRoute('classroom');
            }}
            onRequestEnrollment={() => setAccountModalOpen(true)}
          />
        )}

        {route === 'dashboard' && !isReadOnly && courseData && user?.role === 'estudiante' && courseData.summary && (
          <StudentDashboard
            user={user}
            course={courseData.course}
            blocks={courseData.blocks}
            submissions={courseData.submissions ?? []}
            summary={courseData.summary}
            calendarEvents={courseData.calendarEvents ?? []}
            notifications={courseData.notifications ?? []}
            onOpenBlock={(blockId) => {
              setClassroomBlockId(blockId);
              setClassroomTab('contenido');
              setRoute('classroom');
            }}
            onOpenGradesTab={() => {
              setClassroomTab('calificaciones');
              setRoute('classroom');
            }}
          />
        )}

        {route === 'classroom' && !isReadOnly && courseData && user && (
          <ClassroomView
            user={user}
            course={courseData.course}
            modules={courseData.modules}
            blocks={courseData.blocks}
            learningOutcomes={courseData.learningOutcomes}
            resources={courseData.resources}
            activities={courseData.activities}
            quizzes={courseData.quizzes}
            rubrics={courseData.rubrics}
            caseStudies={courseData.caseStudies}
            phishingSamples={courseData.phishingSamples ?? []}
            submissions={courseData.submissions ?? []}
            quizAttempts={courseData.quizAttempts ?? []}
            summary={courseData.summary}
            calendarEvents={courseData.calendarEvents ?? []}
            forumPosts={forumPosts}
            initialBlockId={classroomBlockId}
            initialTab={classroomTab}
            onSaveDraft={async (payload) => {
              await apiFetch(`/api/courses/${courseData.course.id}/submissions/draft`, {
                method: 'POST',
                body: JSON.stringify(payload),
              });
              await loadWorkspace(courseData.course.id);
            }}
            onSubmitActivity={async (payload) => {
              await apiFetch(`/api/courses/${courseData.course.id}/submissions/submit`, {
                method: 'POST',
                body: JSON.stringify(payload),
              });
              await loadWorkspace(courseData.course.id);
            }}
            onSubmitQuiz={async (quizId, answers) => {
              const res = await apiFetch<{ attempt: QuizAttemptRecord }>(
                `/api/courses/${courseData.course.id}/quizzes/${quizId}/attempt`,
                {
                  method: 'POST',
                  body: JSON.stringify({ answers }),
                }
              );
              await loadWorkspace(courseData.course.id);
              return res.attempt;
            }}
            onCreateForumPost={async (payload) => {
              await apiFetch(`/api/courses/${courseData.course.id}/forum`, {
                method: 'POST',
                body: JSON.stringify(payload),
              });
              await loadWorkspace(courseData.course.id);
            }}
            onReportForumPost={async (postId, reason) => {
              await apiFetch(`/api/courses/${courseData.course.id}/forum/${postId}/report`, {
                method: 'POST',
                body: JSON.stringify({ reason }),
              });
              await loadWorkspace(courseData.course.id);
            }}
            onLaunchInteractive={(toolId) => {
              setInteractiveTool(toolId);
              setRoute('interactives');
            }}
            onOpenTeacherWorkspace={
              isTeacherOfSelected ? () => setRoute('teacher') : undefined
            }
          />
        )}

        {route === 'interactives' && !isReadOnly && user && (
          <InteractivesHub
            userRole={user.role}
            initialTool={interactiveTool}
            savedProgress={courseData?.interactiveProgress as never}
            onSaveProgress={async (payload) => {
              await apiFetch(`/api/courses/${selectedCourseId}/interactives/progress`, {
                method: 'POST',
                body: JSON.stringify(payload),
              });
              await loadWorkspace(selectedCourseId);
            }}
          />
        )}

        {route === 'teacher' && courseData && isTeacherOfSelected && (
          <TeacherWorkspace
            course={courseData.course}
            blocks={courseData.blocks}
            activities={courseData.activities}
            teams={courseData.teams ?? []}
            students={courseData.students ?? []}
            cohortSummaries={courseData.cohortSummaries ?? []}
            submissions={courseData.submissions ?? []}
            quizzes={courseData.quizzes}
            quizAttempts={courseData.quizAttempts ?? []}
            attendance={courseData.attendance ?? []}
            assumptions={courseData.assumptions}
            auditLogs={courseData.auditLogs ?? []}
            analytics={
              courseData.analytics ?? {
                cohortSize: 0,
                avgAttendancePercent: 0,
                q0BaselineAvgPercent: 0,
                q1ToQ4AvgPercent: 0,
                learningGainPoints: 0,
                pendingGradingCount: 0,
              }
            }
            adaptersHealth={adaptersHealth}
            onGradeSubmission={async (payload) => {
              await apiFetch(`/api/courses/${courseData.course.id}/teacher/grade`, {
                method: 'POST',
                body: JSON.stringify(payload),
              });
              await loadWorkspace(courseData.course.id);
            }}
            onRemindStudents={async (payload) => {
              const res = await apiFetch<{ sentCount: number }>(
                `/api/courses/${courseData.course.id}/teacher/remind`,
                {
                  method: 'POST',
                  body: JSON.stringify(payload),
                }
              );
              await loadWorkspace(courseData.course.id);
              return res.sentCount;
            }}
            onRecordAttendance={async (payload) => {
              await apiFetch(`/api/courses/${courseData.course.id}/teacher/attendance`, {
                method: 'POST',
                body: JSON.stringify(payload),
              });
              await loadWorkspace(courseData.course.id);
            }}
            onToggleBlockFlag={async (blockId, patch) => {
              await apiFetch(`/api/courses/${courseData.course.id}/teacher/blocks/${blockId}`, {
                method: 'PATCH',
                body: JSON.stringify(patch),
              });
              await loadWorkspace(courseData.course.id);
            }}
            onRotateTeam={async (teamId, blockId) => {
              await apiFetch(`/api/courses/${courseData.course.id}/teacher/teams/${teamId}/rotate`, {
                method: 'POST',
                body: JSON.stringify({ blockId }),
              });
              await loadWorkspace(courseData.course.id);
            }}
            onUpdateConfig={async (patch) => {
              await apiFetch(`/api/courses/${courseData.course.id}/teacher/config`, {
                method: 'PATCH',
                body: JSON.stringify(patch),
              });
              await loadWorkspace(courseData.course.id);
            }}
            onExportReport={async () => {
              const res = await apiFetch<Record<string, unknown>>(
                `/api/courses/${courseData.course.id}/teacher/export`
              );
              await loadWorkspace(courseData.course.id);
              return res;
            }}
          />
        )}
      </main>

      {/* Account, Google sign-in & accessibility modal */}
      {accountModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        >
          <div className="w-full max-w-lg border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 id="account-modal-title" className="font-display text-lg font-bold text-slate-900">
                  Perfil de acceso y accesibilidad
                </h2>
                <p className="text-xs text-slate-500">
                  La identidad se valida con Google; coordinación administra roles y matrículas.
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar ventana"
                onClick={() => setAccountModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {user && (
              <div className="mt-4 border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="font-semibold text-slate-900">Sesión actual: {user.displayName}</p>
                <p className="text-slate-600">
                  {user.isCoordinator ? 'Permiso: coordinación' : `Rol: ${user.role}`}
                  {user.status && ` · Estado: ${user.status}`}
                </p>
                <p className="mt-1 text-slate-600">{user.profileContext}</p>
              </div>
            )}

            <div className="mt-4">
              {!authenticated ? (
                <div className="border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-600">
                    Usa tu cuenta institucional de Google. Si aún no tienes un rol asignado,
                    coordinación deberá aprobar tu acceso.
                  </p>
                  {isFirebaseConfigured() ? (
                    <button
                      type="button"
                      onClick={() => void handleGoogleSignIn()}
                      className="mt-3 inline-flex items-center gap-2 bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800"
                    >
                      <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Continuar con Google
                    </button>
                  ) : (
                    <p role="status" className="mt-3 text-xs text-amber-800">
                      El inicio de sesión estará disponible cuando se configure Firebase para este entorno.
                    </p>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="border border-slate-300 px-4 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50"
                >
                  Cerrar sesión de Google
                </button>
              )}
              {authenticated && user?.status === 'pendiente' && (
                <p role="status" className="mt-3 border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  Tu identidad de Google está verificada, pero aún no tienes un rol académico activo.
                  Contacta a coordinación.
                </p>
              )}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Preferencias de accesibilidad</span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-4 text-xs">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={largeText}
                    onChange={async (e) => {
                      const val = e.target.checked;
                      setLargeText(val);
                      if (user && user.role !== 'solo_lectura') {
                        await apiFetch('/api/auth/preferences', {
                          method: 'PATCH',
                          body: JSON.stringify({ largeText: val }),
                        });
                      }
                    }}
                  />
                  <span>Texto ampliado</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={async (e) => {
                      const val = e.target.checked;
                      setHighContrast(val);
                      if (user && user.role !== 'solo_lectura') {
                        await apiFetch('/api/auth/preferences', {
                          method: 'PATCH',
                          body: JSON.stringify({ highContrast: val }),
                        });
                      }
                    }}
                  />
                  <span>Contraste reforzado</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clean Quiet Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <span>
              EGIDA_MOODLE · Diplomado en Ciberseguridad (30 h · Escenario ficticio Andina Logística S.A.S.)
            </span>
          </div>
          <span>
            Certificación institucional pendiente de validación operativa (SO-1 a SO-12).
          </span>
        </div>
      </footer>
    </div>
  );
}
