export type UserRole = 'profesor' | 'estudiante' | 'solo_lectura';

export type TeamRole = 'Líder' | 'Analista técnico' | 'Analista legal/negocio' | 'Relator';

export type BlockStateLabel =
  | 'Disponible'
  | 'En curso'
  | 'Entregado'
  | 'Evaluado'
  | 'Completado'
  | 'Bloqueado';

export type ActivityMode = 'individual' | 'parejas' | 'equipo' | 'celula_8';

export type SubmissionStatus =
  | 'borrador'
  | 'entregada'
  | 'en_revision'
  | 'requiere_cambios'
  | 'calificada';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status?: 'pendiente' | 'activo' | 'suspendido';
  firebaseUid?: string;
  isCoordinator?: boolean;
  profileContext: string; // e.g., "Perfil civil / Gestión", "Fuerza Pública", "Docente titular"
  assignedCourseIds: string[];
  enrolledCourseIds: string[];
  teamId?: string;
  pairId?: string;
  preferences: {
    largeText: boolean;
    highContrast: boolean;
    timezone: string;
  };
}

export interface LearningOutcome {
  id: string; // RA1..RA7
  code: string;
  title: string;
  description: string;
  thresholdText: string;
  linkedModules: string[];
  linkedBlocks: string[];
  linkedEvidences: string[];
  rubricId?: string;
}

export interface ModuleUnit {
  id: string; // M1..M6, EV, IN
  code: string;
  title: string;
  hours: number;
  blockIds: string[];
  category: 'formativo' | 'evaluacion' | 'invitados';
  description: string;
}

export interface AgendaStage {
  stage: 'Activar' | 'Modelar' | 'Practicar' | 'Transferir' | 'Verificar';
  minutes: number;
  summary: string;
}

export interface CourseResource {
  id: string;
  blockId: string;
  moduleId: string;
  title: string;
  type: 'diapositivas' | 'guia' | 'plantilla' | 'video' | 'juego' | 'caso' | 'cuestionario' | 'referencia' | 'solucionario_docente';
  required: boolean;
  durationOrSize: string;
  attribution: string;
  licenseNote: string;
  hasSpanishSubtitles?: boolean;
  hasTranscript?: boolean;
  transcriptSummary?: string;
  fallbackAlternative: string;
  teacherOnly: boolean;
  publicSample: boolean;
  updatedAt: string;
  interactiveId?: 'acronyms' | 'wordsearch' | 'attacksearch' | 'cyberopolis' | 'crisisroom' | 'redblue';
}

export interface BlockSpec {
  id: string; // B01..B15 or C01..C05
  code: string;
  moduleId: string;
  order: number;
  title: string;
  hourRange: string;
  durationMinutes: number;
  theoryMinutes: number;
  practiceMinutes: number;
  objective: string;
  learningOutcomeIds: string[];
  agenda: AgendaStage[];
  mainActivityId: string;
  activityTitle: string;
  activityInstructions: string;
  expectedEvidence: string;
  rubricOrInstrument: string;
  mode: ActivityMode;
  completionCriterion: string;
  finalReflectionPrompt: string;
  nextStepHint: string;
  publicSample: boolean;
  published: boolean;
  prerequisiteBlockId?: string;
}

export interface ActivityDefinition {
  id: string;
  code: string; // T1..T6, V1..V4, CASE, RB, ESSAY, TTX, INV14, INV15
  blockId: string;
  title: string;
  kind: 'taller' | 'reflexion_video' | 'caso' | 'ttx' | 'simulacion' | 'ensayo' | 'invitado';
  mode: ActivityMode;
  required: boolean;
  estimatedMinutes: number;
  dueDateIso: string;
  latePolicy: string;
  instructions: string;
  steps: string[];
  safetyLimits: string;
  rubricId?: string;
  evaluationComponentId: string;
  promptFields: {
    key: string;
    label: string;
    helper: string;
    placeholder: string;
    minChars?: number;
  }[];
  publicSample: boolean;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number; // stripped by server for non-professors before release
  explanation: string;
  raCode: string;
}

export interface QuizDefinition {
  id: string; // Q0..Q4
  code: string;
  blockId: string;
  title: string;
  purpose: string;
  topics: string[];
  diagnosticOnly: boolean;
  weightPercent: number;
  durationMinutes: number;
  maxAttempts: number;
  dueDateIso: string;
  revealAnswersAfterSubmit: boolean;
  questions: QuizQuestion[];
}

export interface RubricCriterion {
  id: string;
  name: string;
  weightPercent: number;
  descriptors: {
    excelente: string;
    satisfactorio: string;
    basico: string;
    insuficiente: string;
  };
}

export interface RubricDefinition {
  id: string; // R1..R4
  code: string;
  title: string;
  version: string;
  provisional: boolean;
  note: string;
  criteria: RubricCriterion[];
}

export interface EvaluationComponent {
  id: string;
  name: string;
  evidences: string;
  weightPercent: number;
  rubricCode?: string;
}

export interface CaseStudySpec {
  id: string;
  set: 'Set A' | 'Set B' | 'Reserva regional';
  title: string;
  year: number;
  sector: string;
  attributionConfidence: string;
  summary: string;
  killChainFocus: string;
  mitreTactics: string[];
  ciaImpact: string;
  missingControls: string[];
  colombiaLessons: string[];
}

export interface PhishingTrainingSample {
  id: string;
  label: 'Material de entrenamiento';
  senderDisplay: string;
  senderEmail: string; // strictly .example or .invalid
  subject: string;
  snippet: string;
  indicators: string[];
  recommendedAction: 'Reportar' | 'Eliminar' | 'Verificar';
  pedagogicalExplanation: string;
}

export interface InstitutionalAssumption {
  id: string; // SO-1 .. SO-12
  code: string;
  title: string;
  currentValue: string;
  status: 'pendiente_validacion' | 'validado_institucion';
  impactArea: string;
}

export interface CourseConfig {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  typeLabel: string;
  totalHours: number;
  formativeHours: number;
  guestHours: number;
  theoryMinutes: number;
  practiceMinutes: number;
  modality: 'Presencial' | 'Híbrida sincrónica' | 'Virtual asincrónica con sesiones sincrónicas';
  coverImageKey: string; // logical ref: "1_Ciberseguridad"
  coverImageUrl: string; // configurable path or empty to test accessible fallback
  coverImageAlt: string;
  cohortName: string;
  enrollmentOpen: boolean;
  enrollmentPolicyNote: string;
  readOnlyPolicy: {
    allowCatalogCard: boolean;
    allowProgramOverview: boolean;
    publicSampleBlockIds: string[];
    contactEmail: string;
  };
  gradingPolicy: {
    scaleMin: number;
    scaleMax: number;
    passingScore: number;
    minAttendancePercent: number;
    coEvaluationMinFactor: number;
    coEvaluationMaxFactor: number;
    aiPolicyNote: string;
    provisionalStatus: boolean;
  };
  scheduleMode: '8 jornadas (4 h)' | '11 jornadas' | '15 sesiones (2 h)';
  published: boolean;
  generalCompetence: string;
  targetAudience: string;
  prerequisites: string;
  methodologySummary: string;
  methodologyMethods: string[];
}

export interface CourseInstructorPublic {
  id: string;
  name: string;
  roleTitle: string;
  area: string;
  bio: string;
  consentPublished: boolean;
}

export interface TeamGroup {
  id: string;
  courseId: string;
  name: string;
  cellName: string; // Célula 8 (4 vs 4)
  assignedCaseId: string;
  memberIds: string[];
  pairs: { id: string; label: string; memberIds: string[] }[];
  rotations: Record<string, Record<string, TeamRole>>; // blockId -> userId -> TeamRole
}

export interface SubmissionRecord {
  id: string;
  courseId: string;
  activityId: string;
  blockId: string;
  studentId: string;
  teamId?: string;
  isGroupSubmission: boolean;
  status: SubmissionStatus;
  answers: Record<string, string>;
  attachmentNames: string[];
  aiAssistanceDeclared: boolean;
  aiAssistanceDetail?: string;
  version: number;
  updatedAt: string;
  submittedAt?: string;
  receiptCode?: string;
  grade?: {
    rawScore: number; // 0.0 - 5.0
    coEvalFactor: number; // 0.8 - 1.0
    finalScore: number;
    rubricScores?: Record<string, number>;
    rubricVersion?: string;
    feedback: string;
    gradedBy: string;
    gradedAt: string;
    publishedToStudent: boolean;
  };
}

export interface QuizAttemptRecord {
  id: string;
  courseId: string;
  quizId: string;
  studentId: string;
  attemptNumber: number;
  answers: Record<string, number>;
  scorePercent: number;
  scoreFiveScale: number;
  diagnosticOnly: boolean;
  submittedAt: string;
  questionResults?: {
    questionId: string;
    selectedIndex: number;
    isCorrect: boolean;
    correctIndex?: number;
    explanation?: string;
  }[];
}

export interface AttendanceRecord {
  courseId: string;
  blockId: string;
  studentId: string;
  status: 'presente' | 'ausente' | 'justificado' | 'pendiente';
  minutesAttended: number;
  updatedBy: string;
  updatedAt: string;
  correctionReason?: string;
}

export interface ForumPost {
  id: string;
  courseId: string;
  channel: 'anuncios' | 'discusion_general' | 'coordinacion_equipo';
  teamId?: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  title: string;
  body: string;
  createdAt: string;
  reported: boolean;
  reportReason?: string;
  moderatedHidden: boolean;
}

export interface CalendarEventItem {
  id: string;
  courseId: string;
  blockId?: string;
  title: string;
  kind: 'sesion' | 'entrega' | 'invitado' | 'simulacion';
  startIso: string;
  endIso: string;
  modalityNote: string;
  instructions: string;
  changeHistory: string[];
}

export interface NotificationItem {
  id: string;
  userId: string;
  courseId: string;
  title: string; // Never contains sensitive info
  summary: string;
  createdAt: string;
  read: boolean;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorRole: UserRole;
  action: string;
  resourceType: string;
  resourceId: string;
  courseId?: string;
  outcome: 'permitido' | 'denegado';
  detail: string;
  timestamp: string;
}

export interface InteractiveAcronym {
  symbol: string;
  number: number;
  category: 'Fundamentos' | 'Amenazas' | 'Defensa y SOC' | 'Marcos y Leyes' | 'Operaciones';
  fullName: string;
  definition: string;
  defensiveExample: string;
  ciaConnection: string;
}

export interface RedBlueCard {
  id: string;
  team: 'Red' | 'Blue' | 'White';
  roundRange: string;
  code: string;
  title: string;
  frameworkRef: string;
  costPoints: number;
  description: string;
  counteredBy?: string[];
  pedagogicalNote: string;
}
