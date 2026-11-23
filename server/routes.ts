import crypto from 'node:crypto';
import express from 'express';
import { z } from 'zod';
import {
  ACTIVITIES,
  ACRONYMS_TABLE,
  CASE_STUDIES,
  CYBERATTACK_14_CONCEPTS,
  EVALUATION_COMPONENTS,
  INSTRUCTORS_PUBLIC,
  LEARNING_OUTCOMES,
  MODULES,
  PHISHING_SAMPLES,
  QUIZZES,
  RED_BLUE_CARDS,
  WORD_SEARCH_28_TERMS,
} from '../src/shared/curriculum.ts';
import type {
  BlockSpec,
  CourseConfig,
  QuizDefinition,
  SubmissionRecord,
  TeamRole,
} from '../src/shared/types.ts';
import {
  BoundedPedagogicalAgentAdapter,
  NativeMoodleBoundaryAdapter,
  NativeQuizAdapter,
} from './adapters/interfaces.ts';
import {
  createAuthMiddleware,
  type AuthenticatedRequest,
  type FirebaseTokenVerifier,
} from './auth.ts';
import { computeStudentSummary } from './grading.ts';
import type { EgidaStore } from './store.ts';

function sanitizeQuizForUser(quiz: QuizDefinition, isProfessor: boolean) {
  if (isProfessor) return quiz;
  return {
    ...quiz,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      raCode: q.raCode,
      correctIndex: -1, // Stripped on server before grading
      explanation: '',
    })),
  };
}

function sanitizeBlockForReadOnly(block: BlockSpec, isPublicSample: boolean): BlockSpec {
  if (isPublicSample) return block;
  return {
    ...block,
    activityInstructions: 'Contenido reservado para participantes matriculados en el diplomado.',
    expectedEvidence: 'Disponible al ingresar con matrícula activa.',
    finalReflectionPrompt: 'Disponible en el aula del curso.',
    nextStepHint: 'Solicita acceso institucional para continuar el recorrido.',
  };
}

export function createApiRouter(
  store: EgidaStore,
  options?: {
    verifyFirebaseToken?: FirebaseTokenVerifier;
    coordinatorEmails?: Set<string>;
  }
) {
  const router = express.Router();
  const {
    attachUser,
    requireAuthenticatedRole,
    requireCoordinator,
    requireCourseReadAccess,
    requireProfessorOfCourse,
  } = createAuthMiddleware(
    store,
    options?.verifyFirebaseToken,
    options?.coordinatorEmails
  );

  const moodleAdapter = new NativeMoodleBoundaryAdapter();
  const quizAdapter = new NativeQuizAdapter();
  const aiAdapter = new BoundedPedagogicalAgentAdapter();

  router.use(express.json({ limit: '1mb' }));
  router.use(attachUser);

  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      platform: 'EGIDA_MOODLE',
      adapters: [moodleAdapter.getStatus(), quizAdapter.getStatus(), aiAdapter.getStatus()],
      moodleBoundary: moodleAdapter.describeBoundary(),
    });
  });

  router.get('/auth/me', (req, res) => {
    const authReq = req as AuthenticatedRequest;
    res.json({
      user: authReq.currentUser,
      isAnonymousReadOnly: authReq.isAnonymousReadOnly,
      isAuthenticated: authReq.isAuthenticated,
      isCoordinator: authReq.isCoordinator,
    });
  });

  router.get('/admin/users', requireCoordinator, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    res.json({
      users: store.state.users.map((user) => ({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        status: user.status ?? 'activo',
        profileContext: user.profileContext,
        assignedCourseIds: user.assignedCourseIds,
        enrolledCourseIds: user.enrolledCourseIds,
      })),
      courses: store.state.courses.map(({ id, code, title }) => ({ id, code, title })),
      coordinatorId: authReq.currentUser.id,
    });
  });

  router.post('/admin/users', requireCoordinator, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const schema = z.object({
      email: z.string().email().max(254),
      displayName: z.string().trim().min(2).max(120),
      role: z.enum(['profesor', 'estudiante', 'solo_lectura']),
      courseIds: z.array(z.string().min(1).max(64)).max(100),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos de usuario inválidos.' });
    }
    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    if (store.state.users.some((user) => user.email.trim().toLowerCase() === normalizedEmail)) {
      return res.status(409).json({ error: 'Ya existe un usuario registrado con ese correo.' });
    }
    const courseIds = Array.from(new Set(parsed.data.courseIds));
    if (
      parsed.data.role === 'solo_lectura' && courseIds.length > 0 ||
      courseIds.some((id) => !store.state.courses.some((course) => course.id === id))
    ) {
      return res.status(400).json({ error: 'La asignación de cursos no es válida para el rol.' });
    }

    const user = store.createManagedUser({ ...parsed.data, email: normalizedEmail, courseIds });
    store.addAudit({
      actorId: authReq.currentUser.id,
      actorRole: authReq.currentUser.role,
      action: 'USUARIO_CREADO_POR_COORDINACION',
      resourceType: 'user',
      resourceId: user.id,
      outcome: 'permitido',
      detail: `Se registró un perfil ${user.role} con ${courseIds.length} curso(s).`,
    });
    res.status(201).json({ user });
  });

  router.patch('/admin/users/:userId', requireCoordinator, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = store.state.users.find((candidate) => candidate.id === req.params.userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    if (user.id === authReq.currentUser.id) {
      return res.status(400).json({ error: 'No puedes modificar tu propio acceso de coordinación.' });
    }

    const schema = z.object({
      role: z.enum(['profesor', 'estudiante', 'solo_lectura']),
      status: z.enum(['pendiente', 'activo', 'suspendido']),
      courseIds: z.array(z.string().min(1).max(64)).max(100),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos de asignación inválidos.' });
    }
    const courseIds = Array.from(new Set(parsed.data.courseIds));
    if (
      parsed.data.role === 'solo_lectura' && courseIds.length > 0 ||
      courseIds.some((id) => !store.state.courses.some((course) => course.id === id))
    ) {
      return res.status(400).json({ error: 'La asignación de cursos no es válida para el rol.' });
    }

    user.role = parsed.data.role;
    user.status = parsed.data.status;
    user.profileContext = 'Asignado por coordinación académica.';
    user.assignedCourseIds = parsed.data.role === 'profesor' ? courseIds : [];
    user.enrolledCourseIds = parsed.data.role === 'estudiante' ? courseIds : [];
    store.save();
    store.addAudit({
      actorId: authReq.currentUser.id,
      actorRole: authReq.currentUser.role,
      action: 'ROL_Y_MATRICULA_ACTUALIZADOS',
      resourceType: 'user',
      resourceId: user.id,
      outcome: 'permitido',
      detail: `Se actualizó el perfil a ${user.role} (${user.status}) en ${courseIds.length} curso(s).`,
    });
    res.json({ user });
  });

  router.patch('/auth/preferences', requireAuthenticatedRole, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const schema = z.object({
      largeText: z.boolean().optional(),
      highContrast: z.boolean().optional(),
      timezone: z.string().min(3).max(60).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Preferencias inválidas.' });
    }
    const user = store.state.users.find((u) => u.id === authReq.currentUser.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    user.preferences = { ...user.preferences, ...parsed.data };
    store.save();
    res.json({ user });
  });

  // Catalog (strictly filtered by role)
  router.get('/catalog', (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.currentUser;
    const readOnly = authReq.isAnonymousReadOnly;

    const visibleCourses = store.state.courses
      .filter((course) => {
        if (readOnly) {
          return course.published && course.readOnlyPolicy.allowCatalogCard;
        }
        if (user.role === 'estudiante') {
          return course.published;
        }
        // Profesor sees published courses or courses assigned to them
        return course.published || user.assignedCourseIds.includes(course.id);
      })
      .map((course) => {
        const isEnrolled = user.enrolledCourseIds.includes(course.id);
        const isAssignedProfessor =
          user.role === 'profesor' && user.assignedCourseIds.includes(course.id);

        // Read-only never receives internal cohort/enrollment metrics or classroom access
        if (readOnly) {
          return {
            id: course.id,
            code: course.code,
            title: course.title,
            subtitle: course.subtitle,
            typeLabel: course.typeLabel,
            totalHours: course.totalHours,
            formativeHours: course.formativeHours,
            guestHours: course.guestHours,
            theoryMinutes: course.theoryMinutes,
            practiceMinutes: course.practiceMinutes,
            modality: course.modality,
            coverImageKey: course.coverImageKey,
            coverImageUrl: course.coverImageUrl,
            coverImageAlt: course.coverImageAlt,
            published: course.published,
            enrollmentStatusLabel: 'Catálogo público · Inicia sesión para acceder al aula',
            canEnterClassroom: false,
            isEnrolled: false,
            isAssignedProfessor: false,
          };
        }

        return {
          ...course,
          isEnrolled,
          isAssignedProfessor,
          canEnterClassroom: isEnrolled || isAssignedProfessor,
          enrollmentStatusLabel: isAssignedProfessor
            ? 'Profesor asignado'
            : isEnrolled
              ? 'Matriculado activo'
              : 'Disponible para solicitud institucional',
        };
      });

    res.json({ courses: visibleCourses });
  });

  // Course workspace data (strictly scoped by role and assignment)
  router.get('/courses/:courseId', requireCourseReadAccess, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.currentUser;
    const courseId = req.params.courseId;
    const course = store.state.courses.find((c) => c.id === courseId) as CourseConfig;
    const allBlocks = store.state.blocksByCourse[courseId] ?? [];
    const allResources = store.state.resourcesByCourse[courseId] ?? [];

    // Read-only view: ONLY public catalog/program overview (no classroom resources, activities, quizzes, or interactives)
    if (authReq.isAnonymousReadOnly) {
      const blocks = allBlocks
        .filter((b) => b.published)
        .map((b) => sanitizeBlockForReadOnly(b, false));
      const instructors = INSTRUCTORS_PUBLIC.filter((i) => i.consentPublished);

      return res.json({
        accessLevel: 'solo_lectura',
        course: {
          ...course,
          cohortName: 'Catálogo público · Solo lectura',
        },
        modules: MODULES,
        learningOutcomes: LEARNING_OUTCOMES,
        blocks,
        resources: [],
        activities: [],
        quizzes: [], // Never expose quiz items in read-only mode
        rubrics: store.state.rubrics,
        evaluationComponents: EVALUATION_COMPONENTS,
        instructors,
        caseStudies: [],
        assumptions: store.state.assumptions,
      });
    }

    // Student view: strictly own submissions, attempts, attendance, summary, and non-teacher resources
    if (user.role === 'estudiante') {
      const publishedBlocks = allBlocks.filter((b) => b.published);
      const studentResources = allResources.filter((r) => !r.teacherOnly);
      const studentSubmissions = store.state.submissions.filter(
        (s) => s.courseId === courseId && s.studentId === user.id
      );
      const studentAttempts = store.state.quizAttempts.filter(
        (a) => a.courseId === courseId && a.studentId === user.id
      );
      const studentAttendance = store.state.attendance.filter(
        (a) => a.courseId === courseId && a.studentId === user.id
      );
      const myTeam = store.state.teams.find(
        (t) => t.courseId === courseId && t.id === user.teamId
      );
      const summary = computeStudentSummary({
        studentId: user.id,
        course,
        submissions: store.state.submissions,
        quizAttempts: store.state.quizAttempts,
        attendance: store.state.attendance,
        blocks: publishedBlocks,
      });

      const myNotifications = store.state.notifications.filter(
        (n) => n.courseId === courseId && n.userId === user.id
      );

      return res.json({
        accessLevel: 'estudiante',
        course,
        modules: MODULES,
        learningOutcomes: LEARNING_OUTCOMES,
        blocks: publishedBlocks,
        resources: studentResources,
        activities: ACTIVITIES,
        quizzes: QUIZZES.map((q) => sanitizeQuizForUser(q, false)),
        rubrics: store.state.rubrics,
        evaluationComponents: EVALUATION_COMPONENTS,
        instructors: INSTRUCTORS_PUBLIC.filter((i) => i.consentPublished),
        caseStudies: CASE_STUDIES,
        phishingSamples: PHISHING_SAMPLES,
        assumptions: store.state.assumptions,
        myTeam: myTeam
          ? {
              ...myTeam,
              // Expose non-personal labels for team coordination
              memberLabels: myTeam.memberIds.map((id, idx) =>
                id === user.id ? `${user.displayName} (Tú)` : `Integrante ${idx + 1}`
              ),
            }
          : null,
        submissions: studentSubmissions.map((s) =>
          s.grade && !s.grade.publishedToStudent
            ? { ...s, grade: undefined, status: 'en_revision' as const }
            : s
        ),
        quizAttempts: studentAttempts,
        attendance: studentAttendance,
        summary,
        calendarEvents: store.state.calendarEvents.filter((e) => e.courseId === courseId),
        notifications: myNotifications,
        interactiveProgress: store.state.interactiveProgress[user.id] ?? {},
        interactives: {
          acronyms: ACRONYMS_TABLE,
          wordSearchTerms: WORD_SEARCH_28_TERMS,
          cyberattacks: CYBERATTACK_14_CONCEPTS,
          redBlueCards: RED_BLUE_CARDS,
        },
      });
    }

    // Assigned Professor view
    const enrolledStudents = store.state.users.filter(
      (u) => u.role === 'estudiante' && u.enrolledCourseIds.includes(courseId)
    );
    const cohortSummaries = enrolledStudents.map((st) => ({
      studentId: st.id,
      displayName: st.displayName,
      profileContext: st.profileContext,
      teamId: st.teamId,
      summary: computeStudentSummary({
        studentId: st.id,
        course,
        submissions: store.state.submissions,
        quizAttempts: store.state.quizAttempts,
        attendance: store.state.attendance,
        blocks: allBlocks,
      }),
    }));

    // Aggregated KPI calculations (Section 11.3)
    const avgAttendance =
      cohortSummaries.length > 0
        ? Math.round(
            cohortSummaries.reduce((a, s) => a + s.summary.attendancePercent, 0) /
              cohortSummaries.length
          )
        : 0;

    const q0Avg = (() => {
      const q0s = store.state.quizAttempts.filter((q) => q.courseId === courseId && q.quizId === 'Q0');
      if (q0s.length === 0) return 0;
      return Math.round(q0s.reduce((a, b) => a + b.scorePercent, 0) / q0s.length);
    })();
    const q14Avg = (() => {
      const q14s = store.state.quizAttempts.filter(
        (q) => q.courseId === courseId && ['Q1', 'Q2', 'Q3', 'Q4'].includes(q.quizId)
      );
      if (q14s.length === 0) return 0;
      return Math.round(q14s.reduce((a, b) => a + b.scorePercent, 0) / q14s.length);
    })();

    return res.json({
      accessLevel: 'profesor',
      course,
      modules: MODULES,
      learningOutcomes: LEARNING_OUTCOMES,
      blocks: allBlocks,
      resources: allResources,
      activities: ACTIVITIES,
      quizzes: QUIZZES,
      rubrics: store.state.rubrics,
      evaluationComponents: EVALUATION_COMPONENTS,
      instructors: INSTRUCTORS_PUBLIC,
      caseStudies: CASE_STUDIES,
      phishingSamples: PHISHING_SAMPLES,
      assumptions: store.state.assumptions,
      teams: store.state.teams.filter((t) => t.courseId === courseId),
      students: enrolledStudents.map((s) => ({
        id: s.id,
        displayName: s.displayName,
        email: s.email,
        profileContext: s.profileContext,
        teamId: s.teamId,
        pairId: s.pairId,
      })),
      cohortSummaries,
      submissions: store.state.submissions.filter((s) => s.courseId === courseId),
      quizAttempts: store.state.quizAttempts.filter((a) => a.courseId === courseId),
      attendance: store.state.attendance.filter((a) => a.courseId === courseId),
      calendarEvents: store.state.calendarEvents.filter((e) => e.courseId === courseId),
      notifications: store.state.notifications.filter(
        (n) => n.courseId === courseId && n.userId === user.id
      ),
      auditLogs: store.state.auditLogs.filter(
        (l) => !l.courseId || l.courseId === courseId
      ).slice(0, 40),
      analytics: {
        cohortSize: enrolledStudents.length,
        avgAttendancePercent: avgAttendance,
        q0BaselineAvgPercent: q0Avg,
        q1ToQ4AvgPercent: q14Avg,
        learningGainPoints: q14Avg > 0 ? q14Avg - q0Avg : 0,
        pendingGradingCount: store.state.submissions.filter(
          (s) => s.courseId === courseId && (s.status === 'entregada' || s.status === 'en_revision')
        ).length,
      },
      interactives: {
        acronyms: ACRONYMS_TABLE,
        wordSearchTerms: WORD_SEARCH_28_TERMS,
        cyberattacks: CYBERATTACK_14_CONCEPTS,
        redBlueCards: RED_BLUE_CARDS,
      },
    });
  });

  // Protected resource endpoint (prevents direct URL enumeration of teacher-only or private resources)
  router.get('/courses/:courseId/resources/:resourceId', requireCourseReadAccess, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { courseId, resourceId } = req.params;
    if (authReq.isAnonymousReadOnly) {
      store.addAudit({
        actorId: authReq.currentUser.id,
        actorRole: authReq.currentUser.role,
        action: 'ACCESO_RECURSO_SOLO_LECTURA_DENEGADO',
        resourceType: 'resource',
        resourceId,
        courseId,
        outcome: 'denegado',
        detail: 'Modo solo lectura intentó acceder a material del aula.',
      });
      return res.status(403).json({
        error: 'Acceso restringido en modo solo lectura. Inicia sesión para consultar materiales del aula.',
      });
    }
    const resources = store.state.resourcesByCourse[courseId] ?? [];
    const resource = resources.find((r) => r.id === resourceId);
    if (!resource) {
      return res.status(404).json({ error: 'Recurso no disponible.' });
    }
    if (resource.teacherOnly && authReq.currentUser.role !== 'profesor') {
      store.addAudit({
        actorId: authReq.currentUser.id,
        actorRole: authReq.currentUser.role,
        action: 'ACCESO_SOLUCIONARIO_DENEGADO',
        resourceType: 'resource',
        resourceId,
        courseId,
        outcome: 'denegado',
        detail: 'Intento de acceso directo a material exclusivo del profesor.',
      });
      return res.status(403).json({ error: 'Acceso restringido a docentes autorizados.' });
    }
    res.json({ resource });
  });

  // Submissions query (strict student isolation)
  router.get('/courses/:courseId/submissions', requireCourseReadAccess, requireAuthenticatedRole, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { courseId } = req.params;
    const requestedStudentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;

    if (authReq.currentUser.role === 'estudiante') {
      if (requestedStudentId && requestedStudentId !== authReq.currentUser.id) {
        store.addAudit({
          actorId: authReq.currentUser.id,
          actorRole: authReq.currentUser.role,
          action: 'ACCESO_ENTREGA_AJENA_DENEGADO',
          resourceType: 'submission',
          resourceId: requestedStudentId,
          courseId,
          outcome: 'denegado',
          detail: 'Estudiante intentó consultar entregas de otro participante.',
        });
        return res.status(403).json({ error: 'No tiene autorización para consultar entregas de terceros.' });
      }
      const own = store.state.submissions.filter(
        (s) => s.courseId === courseId && s.studentId === authReq.currentUser.id
      );
      return res.json({ submissions: own });
    }

    const all = store.state.submissions.filter(
      (s) =>
        s.courseId === courseId &&
        (!requestedStudentId || s.studentId === requestedStudentId)
    );
    return res.json({ submissions: all });
  });

  // Save draft or submit activity
  const submissionSchema = z.object({
    activityId: z.string().min(1).max(40),
    answers: z.record(z.string(), z.string().max(12000)),
    attachmentNames: z.array(z.string().max(120)).max(5).optional(),
    aiAssistanceDeclared: z.boolean().optional(),
    aiAssistanceDetail: z.string().max(500).optional(),
  });

  router.post('/courses/:courseId/submissions/:mode', requireCourseReadAccess, requireAuthenticatedRole, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { courseId, mode } = req.params;
    if (mode !== 'draft' && mode !== 'submit') {
      return res.status(400).json({ error: 'Acción de entrega inválida.' });
    }
    if (authReq.currentUser.role !== 'estudiante') {
      return res.status(403).json({ error: 'Solo estudiantes matriculados realizan entregas.' });
    }

    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos de entrega inválidos. Verifica longitud y formato.' });
    }
    const activity = ACTIVITIES.find((a) => a.id === parsed.data.activityId);
    if (!activity) {
      return res.status(404).json({ error: 'Actividad no encontrada.' });
    }

    if (mode === 'submit') {
      for (const field of activity.promptFields) {
        const val = (parsed.data.answers[field.key] ?? '').trim();
        if (val.length < (field.minChars ?? 10)) {
          return res.status(400).json({
            error: `El campo "${field.label}" requiere al menos ${field.minChars ?? 10} caracteres antes de entregar.`,
          });
        }
      }
      if (parsed.data.aiAssistanceDeclared && !(parsed.data.aiAssistanceDetail ?? '').trim()) {
        return res.status(400).json({
          error: 'Debes describir brevemente cómo utilizaste asistencia de IA según la política declarativa.',
        });
      }
    }

    const now = new Date().toISOString();
    let existing = store.state.submissions.find(
      (s) =>
        s.courseId === courseId &&
        s.activityId === activity.id &&
        s.studentId === authReq.currentUser.id
    );

    if (!existing) {
      existing = {
        id: `sub-${crypto.randomBytes(4).toString('hex')}`,
        courseId,
        activityId: activity.id,
        blockId: activity.blockId,
        studentId: authReq.currentUser.id,
        teamId: authReq.currentUser.teamId,
        isGroupSubmission: activity.mode !== 'individual',
        status: mode === 'submit' ? 'entregada' : 'borrador',
        answers: parsed.data.answers,
        attachmentNames: parsed.data.attachmentNames ?? [],
        aiAssistanceDeclared: Boolean(parsed.data.aiAssistanceDeclared),
        aiAssistanceDetail: parsed.data.aiAssistanceDetail,
        version: 1,
        updatedAt: now,
        submittedAt: mode === 'submit' ? now : undefined,
        receiptCode: mode === 'submit' ? `REC-${activity.blockId}-${crypto.randomBytes(3).toString('hex').toUpperCase()}` : undefined,
      };
      store.state.submissions.push(existing);
    } else {
      existing.answers = parsed.data.answers;
      existing.attachmentNames = parsed.data.attachmentNames ?? existing.attachmentNames;
      existing.aiAssistanceDeclared = Boolean(parsed.data.aiAssistanceDeclared);
      existing.aiAssistanceDetail = parsed.data.aiAssistanceDetail;
      existing.version += 1;
      existing.updatedAt = now;
      if (mode === 'submit') {
        existing.status = 'entregada';
        existing.submittedAt = now;
        existing.receiptCode =
          existing.receiptCode ??
          `REC-${activity.blockId}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      }
    }

    if (mode === 'submit') {
      const assignedProf = store.state.users.find(
        (u) => u.role === 'profesor' && u.assignedCourseIds.includes(courseId)
      );
      if (assignedProf) {
        store.state.notifications.unshift({
          id: `notif-${crypto.randomBytes(4).toString('hex')}`,
          userId: assignedProf.id,
          courseId,
          title: `Nueva entrega en ${activity.blockId}`,
          summary: `Actividad ${activity.code} lista para revisión.`,
          createdAt: now,
          read: false,
        });
      }
      store.addAudit({
        actorId: authReq.currentUser.id,
        actorRole: authReq.currentUser.role,
        action: 'ENTREGA_REGISTRADA',
        resourceType: 'submission',
        resourceId: existing.id,
        courseId,
        outcome: 'permitido',
        detail: `Entrega ${activity.code} (${existing.receiptCode}).`,
      });
    } else {
      store.save();
    }

    const course = store.state.courses.find((c) => c.id === courseId) as CourseConfig;
    const summary = computeStudentSummary({
      studentId: authReq.currentUser.id,
      course,
      submissions: store.state.submissions,
      quizAttempts: store.state.quizAttempts,
      attendance: store.state.attendance,
      blocks: store.state.blocksByCourse[courseId],
    });

    res.json({ submission: existing, summary });
  });

  // Quiz submission
  router.post('/courses/:courseId/quizzes/:quizId/attempt', requireCourseReadAccess, requireAuthenticatedRole, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { courseId, quizId } = req.params;
    if (authReq.currentUser.role !== 'estudiante') {
      return res.status(403).json({ error: 'Solo estudiantes matriculados presentan cuestionarios.' });
    }
    const quiz = QUIZZES.find((q) => q.id === quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Cuestionario no encontrado.' });
    }

    const schema = z.object({
      answers: z.record(z.string(), z.number().int().min(0).max(5)),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Respuestas de cuestionario inválidas.' });
    }

    const priorAttempts = store.state.quizAttempts.filter(
      (a) => a.courseId === courseId && a.quizId === quizId && a.studentId === authReq.currentUser.id
    );
    if (priorAttempts.length >= quiz.maxAttempts) {
      return res.status(400).json({
        error: `Has alcanzado el máximo de ${quiz.maxAttempts} intentos permitidos para ${quiz.code}.`,
      });
    }

    let correctCount = 0;
    const questionResults = quiz.questions.map((q) => {
      const selectedIndex = parsed.data.answers[q.id] ?? -1;
      const isCorrect = selectedIndex === q.correctIndex;
      if (isCorrect) correctCount += 1;
      return {
        questionId: q.id,
        selectedIndex,
        isCorrect,
        ...(quiz.revealAnswersAfterSubmit
          ? { correctIndex: q.correctIndex, explanation: q.explanation }
          : {}),
      };
    });

    const scorePercent = Math.round((correctCount / quiz.questions.length) * 100);
    const scoreFiveScale = Number(((correctCount / quiz.questions.length) * 5).toFixed(2));

    const attempt = {
      id: `qa-${crypto.randomBytes(4).toString('hex')}`,
      courseId,
      quizId,
      studentId: authReq.currentUser.id,
      attemptNumber: priorAttempts.length + 1,
      answers: parsed.data.answers,
      scorePercent,
      scoreFiveScale,
      diagnosticOnly: quiz.diagnosticOnly,
      submittedAt: new Date().toISOString(),
      questionResults,
    };
    store.state.quizAttempts.push(attempt);
    store.addAudit({
      actorId: authReq.currentUser.id,
      actorRole: authReq.currentUser.role,
      action: 'CUESTIONARIO_ENVIADO',
      resourceType: 'quiz',
      resourceId: quizId,
      courseId,
      outcome: 'permitido',
      detail: `Intento #${attempt.attemptNumber} en ${quiz.code} (${scorePercent}%).`,
    });

    const course = store.state.courses.find((c) => c.id === courseId) as CourseConfig;
    const summary = computeStudentSummary({
      studentId: authReq.currentUser.id,
      course,
      submissions: store.state.submissions,
      quizAttempts: store.state.quizAttempts,
      attendance: store.state.attendance,
      blocks: store.state.blocksByCourse[courseId],
    });

    res.json({ attempt, summary });
  });

  // Grades summary (student sees strictly own)
  router.get('/courses/:courseId/grades', requireCourseReadAccess, requireAuthenticatedRole, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { courseId } = req.params;
    const course = store.state.courses.find((c) => c.id === courseId) as CourseConfig;
    const blocks = store.state.blocksByCourse[courseId];

    if (authReq.currentUser.role === 'estudiante') {
      const summary = computeStudentSummary({
        studentId: authReq.currentUser.id,
        course,
        submissions: store.state.submissions,
        quizAttempts: store.state.quizAttempts,
        attendance: store.state.attendance,
        blocks,
      });
      return res.json({ summary });
    }

    const students = store.state.users.filter(
      (u) => u.role === 'estudiante' && u.enrolledCourseIds.includes(courseId)
    );
    const cohort = students.map((s) =>
      computeStudentSummary({
        studentId: s.id,
        course,
        submissions: store.state.submissions,
        quizAttempts: store.state.quizAttempts,
        attendance: store.state.attendance,
        blocks,
      })
    );
    return res.json({ cohort });
  });

  // Forum endpoints
  router.get('/courses/:courseId/forum', requireCourseReadAccess, requireAuthenticatedRole, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { courseId } = req.params;
    const posts = store.state.forumPosts.filter((p) => {
      if (p.courseId !== courseId) return false;
      if (p.moderatedHidden && authReq.currentUser.role !== 'profesor') return false;
      if (
        p.channel === 'coordinacion_equipo' &&
        authReq.currentUser.role === 'estudiante' &&
        p.teamId !== authReq.currentUser.teamId
      ) {
        return false;
      }
      return true;
    });
    res.json({ posts });
  });

  router.post('/courses/:courseId/forum', requireCourseReadAccess, requireAuthenticatedRole, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { courseId } = req.params;
    const schema = z.object({
      channel: z.enum(['anuncios', 'discusion_general', 'coordinacion_equipo']),
      title: z.string().min(4).max(140),
      body: z.string().min(8).max(3000),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Publicación inválida. Revisa título y contenido.' });
    }
    if (parsed.data.channel === 'anuncios' && authReq.currentUser.role !== 'profesor') {
      return res.status(403).json({ error: 'Solo el profesor asignado puede publicar anuncios oficiales.' });
    }
    const post = {
      id: `post-${crypto.randomBytes(4).toString('hex')}`,
      courseId,
      channel: parsed.data.channel,
      teamId: parsed.data.channel === 'coordinacion_equipo' ? authReq.currentUser.teamId : undefined,
      authorId: authReq.currentUser.id,
      authorName: authReq.currentUser.displayName,
      authorRole: authReq.currentUser.role,
      title: parsed.data.title.trim(),
      body: parsed.data.body.trim(),
      createdAt: new Date().toISOString(),
      reported: false,
      moderatedHidden: false,
    };
    store.state.forumPosts.unshift(post);
    store.save();
    res.status(201).json({ post });
  });

  router.post('/courses/:courseId/forum/:postId/report', requireCourseReadAccess, requireAuthenticatedRole, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { courseId, postId } = req.params;
    const schema = z.object({ reason: z.string().min(4).max(300) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Indica brevemente el motivo del reporte.' });
    }
    const post = store.state.forumPosts.find((p) => p.id === postId && p.courseId === courseId);
    if (!post) {
      return res.status(404).json({ error: 'Publicación no encontrada.' });
    }
    post.reported = true;
    post.reportReason = parsed.data.reason;
    store.addAudit({
      actorId: authReq.currentUser.id,
      actorRole: authReq.currentUser.role,
      action: 'PUBLICACION_FORO_REPORTADA',
      resourceType: 'forum_post',
      resourceId: postId,
      courseId,
      outcome: 'permitido',
      detail: 'Reporte enviado para moderación docente.',
    });
    res.json({ post });
  });

  // Save interactive lab progress
  router.post('/courses/:courseId/interactives/progress', requireCourseReadAccess, requireAuthenticatedRole, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const schema = z.object({
      acronymsChallengeBest: z.number().int().min(0).max(10).optional(),
      wordSearchFoundCount: z.number().int().min(0).max(28).optional(),
      wordSearchRiskTerms: z.string().max(1500).optional(),
      attackSearchFoundCount: z.number().int().min(0).max(14).optional(),
      cyberopolisScore: z.number().int().min(0).max(100).optional(),
      crisisDecisions: z.array(z.string().max(300)).max(12).optional(),
      redBlueRoundsCompleted: z.number().int().min(0).max(6).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos de progreso interactivo inválidos.' });
    }
    const current = store.state.interactiveProgress[authReq.currentUser.id] ?? {};
    store.state.interactiveProgress[authReq.currentUser.id] = {
      ...current,
      ...parsed.data,
    };
    store.save();
    res.json({ progress: store.state.interactiveProgress[authReq.currentUser.id] });
  });

  // ========================
  // TEACHER-ONLY ROUTES (Strictly enforced by requireProfessorOfCourse)
  // ========================
  router.post('/courses/:courseId/teacher/grade', requireProfessorOfCourse, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { courseId } = req.params;
    const schema = z.object({
      submissionId: z.string().min(1),
      rawScore: z.number().min(0).max(5),
      coEvalFactor: z.number().min(0.8).max(1.0).default(1.0),
      feedback: z.string().min(5).max(3000),
      publishedToStudent: z.boolean().default(true),
      rubricScores: z.record(z.string(), z.number().min(0).max(5)).optional(),
      rubricVersion: z.string().max(80).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Calificación o factor de coevaluación fuera de rango (0,0–5,0 y 0,8–1,0).' });
    }

    const sub = store.state.submissions.find(
      (s) => s.id === parsed.data.submissionId && s.courseId === courseId
    );
    if (!sub) {
      return res.status(404).json({ error: 'Entrega no encontrada en este curso.' });
    }

    const finalScore = Number(
      Math.min(5, parsed.data.rawScore * (sub.isGroupSubmission ? parsed.data.coEvalFactor : 1.0)).toFixed(2)
    );
    const now = new Date().toISOString();
    sub.status = 'calificada';
    sub.grade = {
      rawScore: Number(parsed.data.rawScore.toFixed(2)),
      coEvalFactor: sub.isGroupSubmission ? Number(parsed.data.coEvalFactor.toFixed(2)) : 1.0,
      finalScore,
      rubricScores: parsed.data.rubricScores,
      rubricVersion: parsed.data.rubricVersion ?? 'v1.0',
      feedback: parsed.data.feedback.trim(),
      gradedBy: authReq.currentUser.id,
      gradedAt: now,
      publishedToStudent: parsed.data.publishedToStudent,
    };

    if (parsed.data.publishedToStudent) {
      store.state.notifications.unshift({
        id: `notif-${crypto.randomBytes(4).toString('hex')}`,
        userId: sub.studentId,
        courseId,
        title: `Calificación publicada en ${sub.blockId}`,
        summary: 'Tu entrega ha sido evaluada con retroalimentación formativa.',
        createdAt: now,
        read: false,
      });
    }

    store.addAudit({
      actorId: authReq.currentUser.id,
      actorRole: authReq.currentUser.role,
      action: 'CALIFICACION_ACTUALIZADA',
      resourceType: 'submission',
      resourceId: sub.id,
      courseId,
      outcome: 'permitido',
      detail: `Nota ${finalScore}/5,0 (factor ${sub.grade.coEvalFactor}) publicada=${parsed.data.publishedToStudent}.`,
    });

    res.json({ submission: sub });
  });

  router.post('/courses/:courseId/teacher/attendance', requireProfessorOfCourse, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { courseId } = req.params;
    const schema = z.object({
      studentId: z.string().min(1),
      blockId: z.string().min(1),
      status: z.enum(['presente', 'ausente', 'justificado', 'pendiente']),
      minutesAttended: z.number().int().min(0).max(120),
      correctionReason: z.string().max(300).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Registro de asistencia inválido.' });
    }
    const existing = store.state.attendance.find(
      (a) =>
        a.courseId === courseId &&
        a.studentId === parsed.data.studentId &&
        a.blockId === parsed.data.blockId
    );
    const now = new Date().toISOString();
    if (existing) {
      existing.status = parsed.data.status;
      existing.minutesAttended = parsed.data.minutesAttended;
      existing.updatedBy = authReq.currentUser.id;
      existing.updatedAt = now;
      existing.correctionReason = parsed.data.correctionReason;
    } else {
      store.state.attendance.push({
        courseId,
        ...parsed.data,
        updatedBy: authReq.currentUser.id,
        updatedAt: now,
      });
    }
    store.addAudit({
      actorId: authReq.currentUser.id,
      actorRole: authReq.currentUser.role,
      action: 'ASISTENCIA_REGISTRADA',
      resourceType: 'attendance',
      resourceId: `${parsed.data.studentId}:${parsed.data.blockId}`,
      courseId,
      outcome: 'permitido',
      detail: `Estado ${parsed.data.status} (${parsed.data.minutesAttended} min). ${parsed.data.correctionReason ?? ''}`.trim(),
    });
    res.json({ attendance: store.state.attendance.filter((a) => a.courseId === courseId) });
  });

  router.patch('/courses/:courseId/teacher/blocks/:blockId', requireProfessorOfCourse, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { courseId, blockId } = req.params;
    const schema = z.object({
      title: z.string().min(4).max(160).optional(),
      objective: z.string().min(10).max(800).optional(),
      published: z.boolean().optional(),
      publicSample: z.boolean().optional(),
      prerequisiteBlockId: z.string().nullable().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Cambios de bloque inválidos.' });
    }
    const blocks = store.state.blocksByCourse[courseId] ?? [];
    const block = blocks.find((b) => b.id === blockId);
    if (!block) {
      return res.status(404).json({ error: 'Bloque no encontrado.' });
    }
    if (parsed.data.title !== undefined) block.title = parsed.data.title;
    if (parsed.data.objective !== undefined) block.objective = parsed.data.objective;
    if (parsed.data.published !== undefined) block.published = parsed.data.published;
    if (parsed.data.publicSample !== undefined) {
      block.publicSample = parsed.data.publicSample;
      const course = store.state.courses.find((c) => c.id === courseId);
      if (course) {
        const set = new Set(course.readOnlyPolicy.publicSampleBlockIds);
        if (parsed.data.publicSample) set.add(blockId);
        else set.delete(blockId);
        course.readOnlyPolicy.publicSampleBlockIds = Array.from(set);
      }
    }
    if (parsed.data.prerequisiteBlockId !== undefined) {
      block.prerequisiteBlockId = parsed.data.prerequisiteBlockId ?? undefined;
    }

    store.addAudit({
      actorId: authReq.currentUser.id,
      actorRole: authReq.currentUser.role,
      action: 'BLOQUE_ACTUALIZADO',
      resourceType: 'block',
      resourceId: blockId,
      courseId,
      outcome: 'permitido',
      detail: `Publicado=${block.published}, MuestraPublica=${block.publicSample}.`,
    });
    res.json({ block });
  });

  router.patch('/courses/:courseId/teacher/config', requireProfessorOfCourse, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { courseId } = req.params;
    const course = store.state.courses.find((c) => c.id === courseId);
    if (!course) {
      return res.status(404).json({ error: 'Curso no encontrado.' });
    }
    const schema = z.object({
      coverImageUrl: z.string().max(300).optional(),
      coverImageKey: z.string().max(80).optional(),
      modality: z.enum(['Presencial', 'Híbrida sincrónica', 'Virtual asincrónica con sesiones sincrónicas']).optional(),
      scheduleMode: z.enum(['8 jornadas (4 h)', '11 jornadas', '15 sesiones (2 h)']).optional(),
      passingScore: z.number().min(1).max(5).optional(),
      minAttendancePercent: z.number().int().min(50).max(100).optional(),
      aiPolicyNote: z.string().min(5).max(500).optional(),
      assumptionUpdate: z
        .object({
          id: z.string(),
          status: z.enum(['pendiente_validacion', 'validado_institucion']),
        })
        .optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Configuración inválida.' });
    }
    // Validate coverImageUrl so javascript: or arbitrary schemes cannot be injected
    if (parsed.data.coverImageUrl !== undefined) {
      const url = parsed.data.coverImageUrl.trim();
      if (url !== '' && !url.startsWith('/src/') && !url.startsWith('https://')) {
        return res.status(400).json({ error: 'Ruta de imagen no permitida. Usa ruta local segura o vacía para placeholder.' });
      }
      course.coverImageUrl = url;
    }
    if (parsed.data.coverImageKey !== undefined) course.coverImageKey = parsed.data.coverImageKey;
    if (parsed.data.modality !== undefined) course.modality = parsed.data.modality;
    if (parsed.data.scheduleMode !== undefined) course.scheduleMode = parsed.data.scheduleMode;
    if (parsed.data.passingScore !== undefined) course.gradingPolicy.passingScore = parsed.data.passingScore;
    if (parsed.data.minAttendancePercent !== undefined) course.gradingPolicy.minAttendancePercent = parsed.data.minAttendancePercent;
    if (parsed.data.aiPolicyNote !== undefined) course.gradingPolicy.aiPolicyNote = parsed.data.aiPolicyNote;
    if (parsed.data.assumptionUpdate) {
      const target = store.state.assumptions.find((a) => a.id === parsed.data.assumptionUpdate?.id);
      if (target) {
        target.status = parsed.data.assumptionUpdate.status;
      }
    }

    store.addAudit({
      actorId: authReq.currentUser.id,
      actorRole: authReq.currentUser.role,
      action: 'CONFIGURACION_CURSO_MODIFICADA',
      resourceType: 'course_config',
      resourceId: courseId,
      courseId,
      outcome: 'permitido',
      detail: 'Actualizada configuración académica o supuestos institucionales.',
    });
    res.json({ course, assumptions: store.state.assumptions });
  });

  router.post('/courses/:courseId/teacher/teams/:teamId/rotate', requireProfessorOfCourse, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { courseId, teamId } = req.params;
    const schema = z.object({ blockId: z.string().min(2).max(10) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Bloque inválido para rotación.' });
    }
    const team = store.state.teams.find((t) => t.id === teamId && t.courseId === courseId);
    if (!team) {
      return res.status(404).json({ error: 'Equipo no encontrado.' });
    }
    const roles: TeamRole[] = ['Líder', 'Analista técnico', 'Analista legal/negocio', 'Relator'];
    const rotationCount = Object.keys(team.rotations).length + 1;
    const nextMap: Record<string, TeamRole> = {};
    team.memberIds.forEach((memberId, idx) => {
      nextMap[memberId] = roles[(idx + rotationCount) % roles.length];
    });
    team.rotations[parsed.data.blockId] = nextMap;

    store.addAudit({
      actorId: authReq.currentUser.id,
      actorRole: authReq.currentUser.role,
      action: 'ROLES_EQUIPO_ROTADOS',
      resourceType: 'team',
      resourceId: teamId,
      courseId,
      outcome: 'permitido',
      detail: `Rotación aplicada en ${parsed.data.blockId} sin repetir rol consecutivo.`,
    });
    res.json({ team });
  });

  router.post('/courses/:courseId/teacher/forum/:postId/moderate', requireProfessorOfCourse, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { courseId, postId } = req.params;
    const post = store.state.forumPosts.find((p) => p.id === postId && p.courseId === courseId);
    if (!post) return res.status(404).json({ error: 'Publicación no encontrada.' });
    post.moderatedHidden = !post.moderatedHidden;
    store.addAudit({
      actorId: authReq.currentUser.id,
      actorRole: authReq.currentUser.role,
      action: 'FORO_MODERADO',
      resourceType: 'forum_post',
      resourceId: postId,
      courseId,
      outcome: 'permitido',
      detail: `Visibilidad oculta=${post.moderatedHidden}.`,
    });
    res.json({ post });
  });

  router.post('/courses/:courseId/teacher/remind', requireProfessorOfCourse, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { courseId } = req.params;
    const schema = z.object({
      studentIds: z.array(z.string().min(1)).min(1).max(100),
      activityId: z.string().min(1).max(40).optional(),
      blockId: z.string().min(1).max(16).optional(),
      title: z.string().min(4).max(120),
      message: z.string().min(6).max(600),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos de recordatorio inválidos.' });
    }

    const enrolledIds = new Set(
      store.state.users
        .filter((u) => u.role === 'estudiante' && u.enrolledCourseIds.includes(courseId))
        .map((u) => u.id)
    );
    const validTargetIds = Array.from(new Set(parsed.data.studentIds)).filter((id) =>
      enrolledIds.has(id)
    );
    if (validTargetIds.length === 0) {
      return res.status(400).json({ error: 'No hay estudiantes matriculados válidos seleccionados.' });
    }

    const now = new Date().toISOString();
    const created = validTargetIds.map((studentId) => {
      const item = {
        id: `notif-${crypto.randomBytes(4).toString('hex')}`,
        userId: studentId,
        courseId,
        title: parsed.data.title.trim(),
        summary: parsed.data.message.trim(),
        createdAt: now,
        read: false,
      };
      store.state.notifications.unshift(item);
      return item;
    });

    store.addAudit({
      actorId: authReq.currentUser.id,
      actorRole: authReq.currentUser.role,
      action: 'RECORDATORIO_ESTUDIANTES_ENVIADO',
      resourceType: 'notification',
      resourceId: parsed.data.activityId ?? parsed.data.blockId ?? courseId,
      courseId,
      outcome: 'permitido',
      detail: `Recordatorio enviado a ${created.length} estudiante(s): ${parsed.data.title.trim()}.`,
    });

    res.status(201).json({ sentCount: created.length, notifications: created });
  });

  router.get('/courses/:courseId/teacher/export', requireProfessorOfCourse, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { courseId } = req.params;
    const course = store.state.courses.find((c) => c.id === courseId) as CourseConfig;
    const students = store.state.users.filter(
      (u) => u.role === 'estudiante' && u.enrolledCourseIds.includes(courseId)
    );
    const rows = students.map((s) => {
      const summary = computeStudentSummary({
        studentId: s.id,
        course,
        submissions: store.state.submissions,
        quizAttempts: store.state.quizAttempts,
        attendance: store.state.attendance,
        blocks: store.state.blocksByCourse[courseId],
      });
      return {
        estudiante: s.displayName,
        progresoPorcentaje: summary.progressPercent,
        asistenciaPorcentaje: summary.attendancePercent,
        notaProvisional: summary.provisionalTotal,
        estado: summary.isProvisional ? 'Provisional' : 'Consolidado',
      };
    });

    store.addAudit({
      actorId: authReq.currentUser.id,
      actorRole: authReq.currentUser.role,
      action: 'REPORTE_ACADEMICO_EXPORTADO',
      resourceType: 'export',
      resourceId: courseId,
      courseId,
      outcome: 'permitido',
      detail: `Exportación autorizada (${rows.length} registros).`,
    });

    res.json({
      exportedAt: new Date().toISOString(),
      courseTitle: course.title,
      provisionalNotice: 'Reporte sujeto a validación institucional de umbrales (SO-6 / SO-12).',
      rows,
    });
  });

  return router;
}
