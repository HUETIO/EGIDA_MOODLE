import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  BLOCKS,
  CASE_STUDIES,
  COURSE_RESOURCES,
  DEFAULT_COURSE_ID,
  INITIAL_COURSE_CONFIG,
  INSTITUTIONAL_ASSUMPTIONS,
  LEARNING_OUTCOMES,
  MODULES,
  RUBRICS,
} from '../src/shared/curriculum.ts';
import type {
  AttendanceRecord,
  AuditLogEntry,
  BlockSpec,
  CalendarEventItem,
  CourseConfig,
  CourseResource,
  ForumPost,
  InstitutionalAssumption,
  NotificationItem,
  QuizAttemptRecord,
  RubricDefinition,
  SubmissionRecord,
  TeamGroup,
  UserProfile,
  UserRole,
} from '../src/shared/types.ts';

export interface StoredDatabase {
  users: UserProfile[];
  courses: CourseConfig[];
  blocksByCourse: Record<string, BlockSpec[]>;
  resourcesByCourse: Record<string, CourseResource[]>;
  rubrics: RubricDefinition[];
  teams: TeamGroup[];
  submissions: SubmissionRecord[];
  quizAttempts: QuizAttemptRecord[];
  attendance: AttendanceRecord[];
  forumPosts: ForumPost[];
  calendarEvents: CalendarEventItem[];
  notifications: NotificationItem[];
  assumptions: InstitutionalAssumption[];
  auditLogs: AuditLogEntry[];
  interactiveProgress: Record<string, {
    acronymsChallengeBest?: number;
    wordSearchFoundCount?: number;
    wordSearchRiskTerms?: string;
    attackSearchFoundCount?: number;
    cyberopolisScore?: number;
    crisisDecisions?: string[];
    redBlueRoundsCompleted?: number;
  }>;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_PATH = path.join(DATA_DIR, 'egida-store.json');

export function createSeedDatabase(options?: { includeSimulationData?: boolean }): StoredDatabase {
  const includeSimulationData = options?.includeSimulationData ?? false;
  const users: UserProfile[] = [
    {
      id: 'profesor-1',
      email: 'profesor@andina.edu.co',
      displayName: 'Prof. Alejandro Mendoza (Titular)',
      role: 'profesor',
      status: 'activo',
      profileContext: 'Docente titular · Gestión de Ciberseguridad',
      assignedCourseIds: [DEFAULT_COURSE_ID],
      enrolledCourseIds: [],
      preferences: { largeText: false, highContrast: false, timezone: 'America/Bogota' },
    },
    {
      id: 'profesor-externo',
      email: 'profesor.externo@andina.edu.co',
      displayName: 'Prof. Carolina Duarte (Otro curso)',
      role: 'profesor',
      status: 'activo',
      profileContext: 'Docente de curso ajeno (para verificación de aislamiento)',
      assignedCourseIds: ['curso-gobierno-datos-02'],
      enrolledCourseIds: [],
      preferences: { largeText: false, highContrast: false, timezone: 'America/Bogota' },
    },
    {
      id: 'estudiante-a',
      email: 'estudiante.a@andina.edu.co',
      displayName: 'Laura Ramírez (Estudiante A)',
      role: 'estudiante',
      status: 'activo',
      profileContext: 'Perfil civil · Coordinación operativa',
      assignedCourseIds: [],
      enrolledCourseIds: [DEFAULT_COURSE_ID],
      teamId: 'team-alfa',
      pairId: 'pair-alfa-1',
      preferences: { largeText: false, highContrast: false, timezone: 'America/Bogota' },
    },
    {
      id: 'estudiante-b',
      email: 'estudiante.b@andina.edu.co',
      displayName: 'Mayor Carlos Patiño (Estudiante B)',
      role: 'estudiante',
      status: 'activo',
      profileContext: 'Sector Seguridad y Defensa',
      assignedCourseIds: [],
      enrolledCourseIds: [DEFAULT_COURSE_ID],
      teamId: 'team-bravo',
      pairId: 'pair-bravo-1',
      preferences: { largeText: false, highContrast: false, timezone: 'America/Bogota' },
    },
    {
      id: 'solo-lectura',
      email: 'visitante@institucion-ejemplo.edu.co',
      displayName: 'Visitante Institucional (Solo lectura)',
      role: 'solo_lectura',
      status: 'activo',
      profileContext: 'Consulta pública autorizada',
      assignedCourseIds: [],
      enrolledCourseIds: [],
      preferences: { largeText: false, highContrast: false, timezone: 'America/Bogota' },
    },
  ];

  const secondCourseBlueprint: CourseConfig = {
    ...INITIAL_COURSE_CONFIG,
    id: 'curso-gobierno-datos-02',
    code: 'EGIDA-GD-02',
    title: 'Seminario de Gobierno de Datos y Resiliencia (Borrador futuro)',
    subtitle: 'Curso adicional en preparación para demostrar escalabilidad multi-curso de la arquitectura EGIDA_MOODLE.',
    totalHours: 16,
    formativeHours: 14,
    guestHours: 2,
    theoryMinutes: 288,
    practiceMinutes: 672,
    published: false,
    enrollmentOpen: false,
    coverImageKey: '2_GobiernoDatos',
    coverImageUrl: '', // Deliberately empty to demonstrate accessible placeholder without broken image
    coverImageAlt: 'Imagen pendiente de configuración para el curso futuro de Gobierno de Datos.',
    readOnlyPolicy: {
      allowCatalogCard: false,
      allowProgramOverview: false,
      publicSampleBlockIds: [],
      contactEmail: 'coordinacion.academica@institucion-ejemplo.edu.co',
    },
  };

  const teams: TeamGroup[] = [
    {
      id: 'team-alfa',
      courseId: DEFAULT_COURSE_ID,
      name: 'Equipo Alfa (4 integrantes)',
      cellName: 'Célula 1 (Alfa Blue vs. Bravo Red)',
      assignedCaseId: CASE_STUDIES[5].id, // NotPetya (Set B)
      memberIds: ['estudiante-a', 'demo-alfa-2', 'demo-alfa-3', 'demo-alfa-4'],
      pairs: [
        { id: 'pair-alfa-1', label: 'Pareja Alfa-1', memberIds: ['estudiante-a', 'demo-alfa-2'] },
        { id: 'pair-alfa-2', label: 'Pareja Alfa-2', memberIds: ['demo-alfa-3', 'demo-alfa-4'] },
      ],
      rotations: {
        B01: { 'estudiante-a': 'Líder', 'demo-alfa-2': 'Analista técnico', 'demo-alfa-3': 'Analista legal/negocio', 'demo-alfa-4': 'Relator' },
        B05: { 'estudiante-a': 'Analista legal/negocio', 'demo-alfa-2': 'Relator', 'demo-alfa-3': 'Líder', 'demo-alfa-4': 'Analista técnico' },
        B09: { 'estudiante-a': 'Relator', 'demo-alfa-2': 'Líder', 'demo-alfa-3': 'Analista técnico', 'demo-alfa-4': 'Analista legal/negocio' },
      },
    },
    {
      id: 'team-bravo',
      courseId: DEFAULT_COURSE_ID,
      name: 'Equipo Bravo (4 integrantes)',
      cellName: 'Célula 1 (Alfa Blue vs. Bravo Red)',
      assignedCaseId: CASE_STUDIES[2].id, // Target (Set A)
      memberIds: ['estudiante-b', 'demo-bravo-2', 'demo-bravo-3', 'demo-bravo-4'],
      pairs: [
        { id: 'pair-bravo-1', label: 'Pareja Bravo-1', memberIds: ['estudiante-b', 'demo-bravo-2'] },
        { id: 'pair-bravo-2', label: 'Pareja Bravo-2', memberIds: ['demo-bravo-3', 'demo-bravo-4'] },
      ],
      rotations: {
        B01: { 'estudiante-b': 'Analista técnico', 'demo-bravo-2': 'Líder', 'demo-bravo-3': 'Relator', 'demo-bravo-4': 'Analista legal/negocio' },
        B05: { 'estudiante-b': 'Relator', 'demo-bravo-2': 'Analista legal/negocio', 'demo-bravo-3': 'Analista técnico', 'demo-bravo-4': 'Líder' },
      },
    },
  ];

  const submissions: SubmissionRecord[] = [
    {
      id: 'sub-seed-t1-a',
      courseId: DEFAULT_COURSE_ID,
      activityId: 'ACT-T1',
      blockId: 'B01',
      studentId: 'estudiante-a',
      teamId: 'team-alfa',
      isGroupSubmission: true,
      status: 'calificada',
      answers: {
        activos_cia:
          '1) Sistema WMS de despacho: C-Media, I-Alta, D-Crítica.\n2) Portal web de clientes: C-Alta, I-Alta, D-Alta.\n3) Red OT de bandas transportadoras: C-Baja, I-Crítica, D-Crítica.\n4) Nómina y talento humano: C-Crítica, I-Alta, D-Media.\n5) Respaldos fuera de línea: C-Alta, I-Crítica, D-Crítica.',
        escenario_riesgo:
          'Amenaza de ransomware explotando acceso remoto sin MFA hacia el servidor WMS, interrumpiendo el despacho regional durante 48 horas. Control inicial: MFA + segmentación + copias inmutables.',
      },
      attachmentNames: ['T1_Activos_AndinaLogistica_Alfa.pdf'],
      aiAssistanceDeclared: false,
      version: 1,
      updatedAt: '2026-11-20T18:30:00Z',
      submittedAt: '2026-11-20T18:30:00Z',
      receiptCode: 'REC-B01-ALFA-001',
      grade: {
        rawScore: 4.5,
        coEvalFactor: 1.0,
        finalScore: 4.5,
        feedback:
          'Excelente diferenciación entre criticidad de integridad/disponibilidad en la red OT frente a confidencialidad en nómina. Siguiente paso: precisar RTO en B09.',
        gradedBy: 'profesor-1',
        gradedAt: '2026-11-21T10:15:00Z',
        publishedToStudent: true,
      },
    },
    {
      id: 'sub-seed-t1-b',
      courseId: DEFAULT_COURSE_ID,
      activityId: 'ACT-T1',
      blockId: 'B01',
      studentId: 'estudiante-b',
      teamId: 'team-bravo',
      isGroupSubmission: true,
      status: 'entregada',
      answers: {
        activos_cia: 'Inventario privado del Estudiante B / Equipo Bravo sobre Andina Logística S.A.S.',
        escenario_riesgo: 'Escenario confidencial de evaluación para Equipo Bravo.',
      },
      attachmentNames: ['T1_Bravo_Privado.pdf'],
      aiAssistanceDeclared: false,
      version: 1,
      updatedAt: '2026-11-21T14:00:00Z',
      submittedAt: '2026-11-21T14:00:00Z',
      receiptCode: 'REC-B01-BRAVO-002',
    },
  ];

  const quizAttempts: QuizAttemptRecord[] = [
    {
      id: 'qa-seed-q0-a',
      courseId: DEFAULT_COURSE_ID,
      quizId: 'Q0',
      studentId: 'estudiante-a',
      attemptNumber: 1,
      answers: { 'q0-1': 1, 'q0-2': 1, 'q0-3': 1, 'q0-4': 1, 'q0-5': 1, 'q0-6': 1, 'q0-7': 1, 'q0-8': 1, 'q0-9': 1, 'q0-10': 1 },
      scorePercent: 80,
      scoreFiveScale: 4.0,
      diagnosticOnly: true,
      submittedAt: '2026-11-19T16:10:00Z',
    },
    {
      id: 'qa-seed-q0-b',
      courseId: DEFAULT_COURSE_ID,
      quizId: 'Q0',
      studentId: 'estudiante-b',
      attemptNumber: 1,
      answers: { 'q0-1': 1 },
      scorePercent: 60,
      scoreFiveScale: 3.0,
      diagnosticOnly: true,
      submittedAt: '2026-11-19T16:20:00Z',
    },
  ];

  const attendance: AttendanceRecord[] = [
    { courseId: DEFAULT_COURSE_ID, blockId: 'B01', studentId: 'estudiante-a', status: 'presente', minutesAttended: 120, updatedBy: 'profesor-1', updatedAt: '2026-11-19T19:00:00Z' },
    { courseId: DEFAULT_COURSE_ID, blockId: 'B02', studentId: 'estudiante-a', status: 'presente', minutesAttended: 120, updatedBy: 'profesor-1', updatedAt: '2026-11-20T19:00:00Z' },
    { courseId: DEFAULT_COURSE_ID, blockId: 'B01', studentId: 'estudiante-b', status: 'presente', minutesAttended: 120, updatedBy: 'profesor-1', updatedAt: '2026-11-19T19:00:00Z' },
  ];

  const forumPosts: ForumPost[] = [
    {
      id: 'post-anuncio-1',
      courseId: DEFAULT_COURSE_ID,
      channel: 'anuncios',
      authorId: 'profesor-1',
      authorName: 'Prof. Alejandro Mendoza',
      authorRole: 'profesor',
      title: 'Bienvenida al Diplomado en Ciberseguridad · Reglas éticas y Andina Logística S.A.S.',
      body: 'Bienvenidos al programa de 40 horas: 30 h del componente base B01–B15 y 10 h complementarias C01–C05. Recuerden que todos los talleres usan exclusivamente la organización ficticia Andina Logística S.A.S. y no deben publicar datos laborales reales ni credenciales.',
      createdAt: '2026-11-18T09:00:00Z',
      reported: false,
      moderatedHidden: false,
    },
    {
      id: 'post-disc-1',
      courseId: DEFAULT_COURSE_ID,
      channel: 'discusion_general',
      authorId: 'estudiante-a',
      authorName: 'Laura Ramírez',
      authorRole: 'estudiante',
      title: 'Duda conceptual sobre disponibilidad e integridad en el WMS',
      body: 'Para T1, nuestro equipo concluyó que la integridad de los manifiestos de carga es tan crítica como la disponibilidad del despacho. ¿Cómo priorizar controles si el presupuesto inicial es limitado?',
      createdAt: '2026-11-20T11:30:00Z',
      reported: false,
      moderatedHidden: false,
    },
  ];

  const calendarEvents: CalendarEventItem[] = [
    {
      id: 'ev-j1',
      courseId: DEFAULT_COURSE_ID,
      blockId: 'B01',
      title: 'Jornada 1 · B01–B02: Fundamentos y panorama de amenazas',
      kind: 'sesion',
      startIso: '2026-11-28T08:00:00-05:00',
      endIso: '2026-11-28T13:00:00-05:00',
      modalityNote: 'Jornada de 5 h · descansos incluidos',
      instructions: 'Completar diagnóstico y fundamentos CIA, amenazas, activos y riesgo.',
      changeHistory: ['Reformulado según cronograma aprobado'],
    },
    {
      id: 'ev-j2',
      courseId: DEFAULT_COURSE_ID,
      blockId: 'B03',
      title: 'Jornada 2 · B03–B04: Ataques e ingeniería social',
      kind: 'sesion',
      startIso: '2026-11-30T06:00:00-05:00',
      endIso: '2026-11-30T09:00:00-05:00',
      modalityNote: 'Jornada de 3 h · descansos incluidos',
      instructions: 'Analizar malware, ransomware, phishing avanzado e higiene digital.',
      changeHistory: ['Reformulado según cronograma aprobado'],
    },
    {
      id: 'ev-j3',
      courseId: DEFAULT_COURSE_ID,
      blockId: 'B05',
      title: 'Jornada 3 · B05–B06: Estudios de caso',
      kind: 'entrega',
      startIso: '2026-12-02T06:00:00-05:00',
      endIso: '2026-12-02T09:00:00-05:00',
      modalityNote: 'Jornada de 3 h · descansos incluidos',
      instructions: 'Presentar análisis con Kill Chain, MITRE ATT&CK y fuentes APA 7.',
      changeHistory: ['Reformulado según cronograma aprobado'],
    },
    {
      id: 'ev-j4',
      courseId: DEFAULT_COURSE_ID,
      blockId: 'B07',
      title: 'Jornada 4 · B07–B08: Riesgos y arquitectura defensiva',
      kind: 'simulacion',
      startIso: '2026-12-04T06:00:00-05:00',
      endIso: '2026-12-04T09:00:00-05:00',
      modalityNote: 'Jornada de 3 h · descansos incluidos',
      instructions: 'Priorizar riesgos y configurar controles defensivos de identidad y SOC.',
      changeHistory: ['Reformulado según cronograma aprobado'],
    },
    {
      id: 'ev-j5',
      courseId: DEFAULT_COURSE_ID,
      blockId: 'B09',
      title: 'Jornada 5 · B09–B11: Respuesta y simulación Red/Blue',
      kind: 'simulacion',
      startIso: '2026-12-05T08:00:00-05:00',
      endIso: '2026-12-05T13:00:00-05:00',
      modalityNote: 'Jornada de 5 h · descansos incluidos',
      instructions: 'Ejecutar playbook, Sala de Crisis y reglas de enfrentamiento.',
      changeHistory: ['Reformulado según cronograma aprobado'],
    },
    {
      id: 'ev-j6',
      courseId: DEFAULT_COURSE_ID,
      blockId: 'B12',
      title: 'Jornada 6 · B12: AAR y cierre Red/Blue',
      kind: 'simulacion',
      startIso: '2026-12-07T06:00:00-05:00',
      endIso: '2026-12-07T09:00:00-05:00',
      modalityNote: 'Jornada de 3 h · descansos incluidos',
      instructions: 'Documentar rondas, defensas, mejoras y límites éticos.',
      changeHistory: ['Reformulado según cronograma aprobado'],
    },
    {
      id: 'ev-j7',
      courseId: DEFAULT_COURSE_ID,
      blockId: 'B13',
      title: 'Jornada 7 · B13: Evaluación final',
      kind: 'entrega',
      startIso: '2026-12-09T06:00:00-05:00',
      endIso: '2026-12-09T09:00:00-05:00',
      modalityNote: 'Jornada de 3 h · descansos incluidos',
      instructions: 'Orientar y desarrollar el ensayo argumentativo final.',
      changeHistory: ['Reformulado según cronograma aprobado'],
    },
    {
      id: 'ev-j8',
      courseId: DEFAULT_COURSE_ID,
      blockId: 'B14',
      title: 'Jornada 8 · B14–B15: Invitados y cierre base',
      kind: 'invitado',
      startIso: '2026-12-11T06:00:00-05:00',
      endIso: '2026-12-11T09:00:00-05:00',
      modalityNote: 'Jornada de 3 h · descansos incluidos',
      instructions: 'Participar en las intervenciones sobre ciberdelitos y ciberdefensa.',
      changeHistory: ['Reformulado según cronograma aprobado'],
    },
    {
      id: 'ev-j9',
      courseId: DEFAULT_COURSE_ID,
      blockId: 'C01',
      title: 'Jornada 9 · C01–C02: Redes y SOC',
      kind: 'sesion',
      startIso: '2026-12-12T08:00:00-05:00',
      endIso: '2026-12-12T13:00:00-05:00',
      modalityNote: 'Jornada de 5 h · descansos incluidos',
      instructions: 'Realizar laboratorio de red y clasificación de alertas SIEM/EDR.',
      changeHistory: ['Incluidos bloques complementarios aprobados'],
    },
    {
      id: 'ev-j10',
      courseId: DEFAULT_COURSE_ID,
      blockId: 'C03',
      title: 'Jornada 10 · C03–C04: Vulnerabilidades y forense',
      kind: 'sesion',
      startIso: '2026-12-14T06:00:00-05:00',
      endIso: '2026-12-14T09:00:00-05:00',
      modalityNote: 'Jornada de 3 h · descansos incluidos',
      instructions: 'Priorizar CVE/CVSS y revisar evidencia y permisos cloud.',
      changeHistory: ['Incluidos bloques complementarios aprobados'],
    },
    {
      id: 'ev-j11',
      courseId: DEFAULT_COURSE_ID,
      blockId: 'C05',
      title: 'Jornada 11 · C05: IA segura y DevSecOps',
      kind: 'sesion',
      startIso: '2026-12-16T06:00:00-05:00',
      endIso: '2026-12-16T10:00:00-05:00',
      modalityNote: 'Jornada de 4 h · descansos incluidos',
      instructions: 'Analizar phishing con IA, deepfakes, OWASP, APIs y controles DevSecOps.',
      changeHistory: ['Incluidos bloques complementarios aprobados'],
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif-1',
      userId: 'estudiante-a',
      courseId: DEFAULT_COURSE_ID,
      title: 'Retroalimentación publicada en bloque B01',
      summary: 'El docente publicó evaluación y comentarios para una actividad entregada.',
      createdAt: '2026-11-21T10:15:00Z',
      read: false,
    },
    {
      id: 'notif-2',
      userId: 'profesor-1',
      courseId: DEFAULT_COURSE_ID,
      title: 'Nueva entrega pendiente de revisión',
      summary: 'Se registró una entrega en el bloque B01 del curso asignado.',
      createdAt: '2026-11-21T14:05:00Z',
      read: false,
    },
  ];

  const auditLogs: AuditLogEntry[] = [
    {
      id: 'aud-1',
      actorId: 'profesor-1',
      actorRole: 'profesor',
      action: 'CALIFICACION_PUBLICADA',
      resourceType: 'submission',
      resourceId: 'sub-seed-t1-a',
      courseId: DEFAULT_COURSE_ID,
      outcome: 'permitido',
      detail: 'Publicada nota de T1 para Equipo Alfa.',
      timestamp: '2026-11-21T10:15:00Z',
    },
  ];

  return {
    users: includeSimulationData ? users : [],
    courses: [INITIAL_COURSE_CONFIG, secondCourseBlueprint],
    blocksByCourse: {
      [DEFAULT_COURSE_ID]: BLOCKS.map((b) => ({ ...b })),
      'curso-gobierno-datos-02': BLOCKS.slice(0, 4).map((b) => ({
        ...b,
        published: false,
        publicSample: false,
      })),
    },
    resourcesByCourse: {
      [DEFAULT_COURSE_ID]: COURSE_RESOURCES.map((r) => ({ ...r })),
      'curso-gobierno-datos-02': [],
    },
    rubrics: RUBRICS.map((r) => ({ ...r })),
    teams: includeSimulationData ? teams : [],
    submissions: includeSimulationData ? submissions : [],
    quizAttempts: includeSimulationData ? quizAttempts : [],
    attendance: includeSimulationData ? attendance : [],
    forumPosts: includeSimulationData ? forumPosts : [],
    calendarEvents: includeSimulationData ? calendarEvents : [],
    notifications: includeSimulationData ? notifications : [],
    assumptions: INSTITUTIONAL_ASSUMPTIONS.map((a) => ({ ...a })),
    auditLogs: includeSimulationData ? auditLogs : [],
    interactiveProgress: includeSimulationData ? {
      'estudiante-a': { acronymsChallengeBest: 8, wordSearchFoundCount: 4 },
    } : {},
  };
}

const SIMULATION_USER_IDS = new Set([
  'profesor-1',
  'profesor-externo',
  'estudiante-a',
  'estudiante-b',
  'solo-lectura',
  'demo-alfa-2',
  'demo-alfa-3',
  'demo-alfa-4',
  'demo-bravo-2',
  'demo-bravo-3',
  'demo-bravo-4',
]);

function removeSimulationData(db: StoredDatabase): boolean {
  const originalCounts = [
    db.users.length,
    db.teams.length,
    db.submissions.length,
    db.quizAttempts.length,
    db.attendance.length,
    db.forumPosts.length,
    db.notifications.length,
    db.auditLogs.length,
  ];
  db.users = db.users.filter((user) => !SIMULATION_USER_IDS.has(user.id));
  db.teams = db.teams.filter(
    (team) => !team.memberIds.some((memberId) => SIMULATION_USER_IDS.has(memberId))
  );
  db.submissions = db.submissions.filter((item) => !SIMULATION_USER_IDS.has(item.studentId));
  db.quizAttempts = db.quizAttempts.filter((item) => !SIMULATION_USER_IDS.has(item.studentId));
  db.attendance = db.attendance.filter((item) => !SIMULATION_USER_IDS.has(item.studentId));
  db.forumPosts = db.forumPosts.filter((item) => !SIMULATION_USER_IDS.has(item.authorId));
  db.notifications = db.notifications.filter((item) => !SIMULATION_USER_IDS.has(item.userId));
  db.auditLogs = db.auditLogs.filter((item) => !SIMULATION_USER_IDS.has(item.actorId));
  for (const userId of SIMULATION_USER_IDS) {
    delete db.interactiveProgress[userId];
  }
  const updatedCounts = [
    db.users.length,
    db.teams.length,
    db.submissions.length,
    db.quizAttempts.length,
    db.attendance.length,
    db.forumPosts.length,
    db.notifications.length,
    db.auditLogs.length,
  ];
  return originalCounts.some((count, index) => count !== updatedCounts[index]);
}

export class EgidaStore {
  private db: StoredDatabase;
  private persistToDisk: boolean;

  constructor(options?: { persistToDisk?: boolean; seed?: StoredDatabase }) {
    this.persistToDisk = options?.persistToDisk ?? true;
    if (options?.seed) {
      this.db = options.seed;
      return;
    }
    if (this.persistToDisk && fs.existsSync(DB_PATH)) {
      try {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        this.db = JSON.parse(raw) as StoredDatabase;
        if (removeSimulationData(this.db)) this.save();
      } catch {
        this.db = createSeedDatabase();
        this.save();
      }
    } else {
      this.db = createSeedDatabase();
      if (this.persistToDisk) {
        this.save();
      }
    }
  }

  get state(): StoredDatabase {
    return this.db;
  }

  resolveIdentity(
    identity: { uid: string; email: string; displayName?: string },
    coordinatorEmails: Set<string>
  ): UserProfile {
    const email = identity.email.trim().toLowerCase();
    let changed = false;
    let user = this.db.users.find((candidate) => candidate.firebaseUid === identity.uid);
    if (!user) {
      user = this.db.users.find((candidate) => candidate.email.trim().toLowerCase() === email);
    }

    if (!user) {
      const isCoordinator = coordinatorEmails.has(email);
      user = {
        id: `usr-${crypto.randomUUID()}`,
        email,
        displayName: identity.displayName?.trim() || email,
        role: 'solo_lectura',
        status: isCoordinator ? 'activo' : 'pendiente',
        isCoordinator,
        profileContext: 'Cuenta pendiente de asignación académica por coordinación.',
        assignedCourseIds: [],
        enrolledCourseIds: [],
        preferences: { largeText: false, highContrast: false, timezone: 'America/Bogota' },
      };
      this.db.users.push(user);
      changed = true;
    }

    if (user.firebaseUid !== identity.uid) {
      user.firebaseUid = identity.uid;
      changed = true;
    }
    const isCoordinator = coordinatorEmails.has(email);
    if (user.isCoordinator !== isCoordinator) {
      user.isCoordinator = isCoordinator;
      changed = true;
    }
    if (isCoordinator && user.status === 'pendiente') {
      user.status = 'activo';
      changed = true;
    }
    if (identity.displayName?.trim() && user.displayName === user.email) {
      user.displayName = identity.displayName.trim();
      changed = true;
    }
    if (changed) this.save();
    return user;
  }

  createManagedUser(input: {
    email: string;
    displayName: string;
    role: UserRole;
    courseIds: string[];
  }): UserProfile {
    const email = input.email.trim().toLowerCase();
    const user: UserProfile = {
      id: `usr-${crypto.randomUUID()}`,
      email,
      displayName: input.displayName.trim(),
      role: input.role,
      status: 'activo',
      profileContext: 'Asignado por coordinación académica.',
      assignedCourseIds: input.role === 'profesor' ? [...input.courseIds] : [],
      enrolledCourseIds: input.role === 'estudiante' ? [...input.courseIds] : [],
      preferences: { largeText: false, highContrast: false, timezone: 'America/Bogota' },
    };
    this.db.users.push(user);
    this.save();
    return user;
  }

  save(): void {
    if (!this.persistToDisk) return;
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpPath = `${DB_PATH}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(this.db, null, 2), 'utf-8');
    fs.renameSync(tmpPath, DB_PATH);
  }

  addAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    this.db.auditLogs.unshift({
      ...entry,
      id: `aud-${crypto.randomBytes(4).toString('hex')}`,
      timestamp: new Date().toISOString(),
    });
    if (this.db.auditLogs.length > 500) {
      this.db.auditLogs = this.db.auditLogs.slice(0, 500);
    }
    this.save();
  }

  getLearningOutcomes() {
    return LEARNING_OUTCOMES;
  }

  getModules() {
    return MODULES;
  }
}
