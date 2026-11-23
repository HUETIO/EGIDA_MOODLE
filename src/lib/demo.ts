import {
  ACTIVITIES,
  BLOCKS,
  CASE_STUDIES,
  COURSE_RESOURCES,
  DEFAULT_COURSE_ID,
  EVALUATION_COMPONENTS,
  INITIAL_COURSE_CONFIG,
  INSTITUTIONAL_ASSUMPTIONS,
  INSTRUCTORS_PUBLIC,
  LEARNING_OUTCOMES,
  MODULES,
  PHISHING_SAMPLES,
  QUIZZES,
  RUBRICS,
} from '../shared/curriculum.ts';
import type {
  AttendanceRecord,
  CalendarEventItem,
  ForumPost,
  SubmissionRecord,
  TeamGroup,
  UserProfile,
} from '../shared/types.ts';

export type DemoRole = 'estudiante' | 'profesor' | 'coordinacion';

export const DEMO_STORAGE_KEY = 'egida-demo-role';

export const DEMO_USERS: Record<DemoRole, UserProfile> = {
  estudiante: {
    id: 'demo-estudiante',
    email: 'laura.ramirez@ejemplo.demo',
    displayName: 'Laura Ramírez',
    role: 'estudiante',
    status: 'activo',
    isCoordinator: false,
    profileContext: 'Estudiante civil · Equipo Alfa',
    assignedCourseIds: [],
    enrolledCourseIds: [DEFAULT_COURSE_ID],
    teamId: 'demo-team-alfa',
    pairId: 'demo-pair-alfa',
    preferences: { largeText: false, highContrast: false, timezone: 'America/Bogota' },
  },
  profesor: {
    id: 'demo-profesor',
    email: 'alejandro.mendoza@ejemplo.demo',
    displayName: 'Prof. Alejandro Mendoza',
    role: 'profesor',
    status: 'activo',
    isCoordinator: false,
    profileContext: 'Docente titular · Gestión de Ciberseguridad',
    assignedCourseIds: [DEFAULT_COURSE_ID],
    enrolledCourseIds: [],
    preferences: { largeText: false, highContrast: false, timezone: 'America/Bogota' },
  },
  coordinacion: {
    id: 'demo-coordinacion',
    email: 'coordinacion@ejemplo.demo',
    displayName: 'Coordinación Académica',
    role: 'profesor',
    status: 'activo',
    isCoordinator: true,
    profileContext: 'Administración académica',
    assignedCourseIds: [DEFAULT_COURSE_ID],
    enrolledCourseIds: [],
    preferences: { largeText: false, highContrast: false, timezone: 'America/Bogota' },
  },
};

const demoStudents: UserProfile[] = [
  DEMO_USERS.estudiante,
  {
    ...DEMO_USERS.estudiante,
    id: 'demo-estudiante-2',
    email: 'carlos.patino@ejemplo.demo',
    displayName: 'Mayor Carlos Patiño',
    profileContext: 'Estudiante · Seguridad y Defensa',
    teamId: 'demo-team-bravo',
  },
  {
    ...DEMO_USERS.estudiante,
    id: 'demo-estudiante-3',
    email: 'maria.torres@ejemplo.demo',
    displayName: 'María Torres',
    profileContext: 'Estudiante civil · Gestión de riesgos',
  },
  {
    ...DEMO_USERS.estudiante,
    id: 'demo-estudiante-4',
    email: 'juan.castro@ejemplo.demo',
    displayName: 'Juan Castro',
    profileContext: 'Estudiante · Infraestructura crítica',
  },
];

const teams: TeamGroup[] = [
  {
    id: 'demo-team-alfa',
    courseId: DEFAULT_COURSE_ID,
    name: 'Equipo Alfa',
    cellName: 'Célula Alfa',
    assignedCaseId: CASE_STUDIES[5]?.id ?? '',
    memberIds: demoStudents.slice(0, 2).map((student) => student.id),
    pairs: [{ id: 'demo-pair-alfa', label: 'Pareja Alfa', memberIds: demoStudents.slice(0, 2).map((student) => student.id) }],
    rotations: {},
  },
  {
    id: 'demo-team-bravo',
    courseId: DEFAULT_COURSE_ID,
    name: 'Equipo Bravo',
    cellName: 'Célula Bravo',
    assignedCaseId: CASE_STUDIES[2]?.id ?? '',
    memberIds: demoStudents.slice(2).map((student) => student.id),
    pairs: [],
    rotations: {},
  },
];

const submissions: SubmissionRecord[] = [
  {
    id: 'demo-sub-t1',
    courseId: DEFAULT_COURSE_ID,
    activityId: 'ACT-T1',
    blockId: 'B01',
    studentId: 'demo-estudiante',
    teamId: 'demo-team-alfa',
    isGroupSubmission: true,
    status: 'calificada',
    answers: {
      activos_cia: 'WMS crítico para integridad y disponibilidad; nómina con alta confidencialidad.',
      escenario_riesgo: 'Ransomware contra el WMS. Controles: MFA, segmentación y respaldos inmutables.',
    },
    attachmentNames: ['T1_equipo_alfa.pdf'],
    aiAssistanceDeclared: false,
    version: 1,
    updatedAt: '2026-11-21T14:00:00-05:00',
    submittedAt: '2026-11-21T14:00:00-05:00',
    receiptCode: 'DEMO-B01-001',
    grade: {
      rawScore: 4.5,
      coEvalFactor: 1,
      finalScore: 4.5,
      feedback: 'Buen análisis de criticidad y controles prioritarios.',
      gradedBy: 'demo-profesor',
      gradedAt: '2026-11-22T10:00:00-05:00',
      publishedToStudent: true,
    },
  },
];

const attendance: AttendanceRecord[] = [
  { courseId: DEFAULT_COURSE_ID, blockId: 'B01', studentId: 'demo-estudiante', status: 'presente', minutesAttended: 120, updatedBy: 'demo-profesor', updatedAt: '2026-11-28T13:00:00-05:00' },
  { courseId: DEFAULT_COURSE_ID, blockId: 'B02', studentId: 'demo-estudiante', status: 'presente', minutesAttended: 120, updatedBy: 'demo-profesor', updatedAt: '2026-11-28T13:00:00-05:00' },
  { courseId: DEFAULT_COURSE_ID, blockId: 'B03', studentId: 'demo-estudiante', status: 'presente', minutesAttended: 120, updatedBy: 'demo-profesor', updatedAt: '2026-11-30T09:00:00-05:00' },
];

const calendarEvents: CalendarEventItem[] = [
  { id: 'demo-j1', courseId: DEFAULT_COURSE_ID, blockId: 'B01', title: 'Jornada 1 · B01–B02', kind: 'sesion', startIso: '2026-11-28T08:00:00-05:00', endIso: '2026-11-28T13:00:00-05:00', modalityNote: 'Jornada de 5 h · descansos incluidos', instructions: 'Fundamentos, amenazas y activos.', changeHistory: ['Cronograma de demostración'] },
  { id: 'demo-j2', courseId: DEFAULT_COURSE_ID, blockId: 'B03', title: 'Jornada 2 · B03–B04', kind: 'sesion', startIso: '2026-11-30T06:00:00-05:00', endIso: '2026-11-30T09:00:00-05:00', modalityNote: 'Jornada de 3 h · descansos incluidos', instructions: 'Ataques e ingeniería social.', changeHistory: ['Cronograma de demostración'] },
  { id: 'demo-j9', courseId: DEFAULT_COURSE_ID, blockId: 'C01', title: 'Jornada 9 · C01–C02', kind: 'sesion', startIso: '2026-12-12T08:00:00-05:00', endIso: '2026-12-12T13:00:00-05:00', modalityNote: 'Jornada de 5 h · descansos incluidos', instructions: 'Redes y SOC.', changeHistory: ['Bloques complementarios'] },
  { id: 'demo-j11', courseId: DEFAULT_COURSE_ID, blockId: 'C05', title: 'Jornada 11 · C05', kind: 'sesion', startIso: '2026-12-16T06:00:00-05:00', endIso: '2026-12-16T10:00:00-05:00', modalityNote: 'Jornada de 4 h · descansos incluidos', instructions: 'IA segura y DevSecOps.', changeHistory: ['Bloques complementarios'] },
];

const forumPosts: ForumPost[] = [
  {
    id: 'demo-forum-1',
    courseId: DEFAULT_COURSE_ID,
    channel: 'anuncios',
    authorId: 'demo-profesor',
    authorName: 'Prof. Alejandro Mendoza',
    authorRole: 'profesor',
    title: 'Bienvenida al demostrador EGIDA',
    body: 'Este entorno usa perfiles y datos ficticios para presentar el diplomado ampliado a 40 horas.',
    createdAt: '2026-11-23T10:00:00-05:00',
    reported: false,
    moderatedHidden: false,
  },
];

export function getDemoRole(): DemoRole {
  const saved = localStorage.getItem(DEMO_STORAGE_KEY);
  return saved === 'profesor' || saved === 'coordinacion' ? saved : 'estudiante';
}

export function createDemoCoursePayload(role: DemoRole) {
  const user = DEMO_USERS[role];
  const selectedStudent = DEMO_USERS.estudiante;
  const attendedMinutes = attendance.reduce((sum, record) => sum + record.minutesAttended, 0);
  const summary = {
    studentId: selectedStudent.id,
    courseId: DEFAULT_COURSE_ID,
    components: [
      { componentId: 'comp-talleres', name: 'Talleres y casos', weightPercent: 25, scoreFiveScale: 4.5, weightedContribution: 1.125, status: 'evaluado' as const, detail: 'Evidencias parciales demostrativas' },
      { componentId: 'comp-ensayo', name: 'Ensayo final', weightPercent: 20, scoreFiveScale: null, weightedContribution: 0, status: 'pendiente' as const, detail: 'Pendiente en la demo' },
    ],
    provisionalTotal: 4.5,
    evaluatedWeightPercent: 25,
    isProvisional: true,
    provisionalReason: 'Datos de demostración',
    attendancePercent: Math.round(attendedMinutes / (INITIAL_COURSE_CONFIG.totalHours * 60) * 100),
    attendedHours: attendedMinutes / 60,
    totalProgramHours: INITIAL_COURSE_CONFIG.totalHours,
    meetsProposedThreshold: true,
    progressPercent: 15,
    completedBlocksCount: 3,
    totalBlocksCount: BLOCKS.length,
  };

  return {
    accessLevel: role === 'profesor' || role === 'coordinacion' ? 'profesor' as const : 'estudiante' as const,
    course: INITIAL_COURSE_CONFIG,
    modules: MODULES,
    learningOutcomes: LEARNING_OUTCOMES,
    blocks: BLOCKS,
    resources: COURSE_RESOURCES,
    activities: ACTIVITIES,
    quizzes: QUIZZES,
    rubrics: RUBRICS,
    evaluationComponents: EVALUATION_COMPONENTS,
    instructors: INSTRUCTORS_PUBLIC,
    caseStudies: CASE_STUDIES,
    phishingSamples: PHISHING_SAMPLES,
    assumptions: INSTITUTIONAL_ASSUMPTIONS,
    submissions,
    quizAttempts: [],
    attendance,
    summary,
    calendarEvents,
    notifications: [
      { id: 'demo-notification', userId: selectedStudent.id, courseId: DEFAULT_COURSE_ID, title: 'Nueva retroalimentación de demostración', summary: 'El docente publicó comentarios sobre el taller T1.', createdAt: '2026-11-22T10:00:00-05:00', read: false },
    ],
    interactiveProgress: {},
    teams,
    students: demoStudents.map((student) => ({
      id: student.id,
      displayName: student.displayName,
      email: student.email,
      profileContext: student.profileContext,
      teamId: student.teamId,
      pairId: student.pairId,
    })),
    cohortSummaries: demoStudents.map((student) => ({ ...{
      studentId: student.id,
      displayName: student.displayName,
      profileContext: student.profileContext,
      teamId: student.teamId,
      summary: { ...summary, studentId: student.id },
    } })),
    auditLogs: [],
    analytics: {
      cohortSize: demoStudents.length,
      avgAttendancePercent: 75,
      q0BaselineAvgPercent: 68,
      q1ToQ4AvgPercent: 82,
      learningGainPoints: 14,
      pendingGradingCount: 3,
    },
  };
}
