import {
  ACTIVITIES,
  BLOCKS,
  EVALUATION_COMPONENTS,
  QUIZZES,
} from '../src/shared/curriculum.ts';
import type {
  AttendanceRecord,
  CourseConfig,
  QuizAttemptRecord,
  SubmissionRecord,
} from '../src/shared/types.ts';

export interface StudentGradeSummary {
  studentId: string;
  courseId: string;
  components: {
    componentId: string;
    name: string;
    weightPercent: number;
    scoreFiveScale: number | null;
    weightedContribution: number;
    status: 'evaluado' | 'pendiente';
    detail: string;
  }[];
  provisionalTotal: number;
  evaluatedWeightPercent: number;
  isProvisional: boolean;
  provisionalReason: string;
  attendancePercent: number;
  attendedHours: number;
  totalProgramHours: number;
  meetsProposedThreshold: boolean;
  progressPercent: number;
  completedBlocksCount: number;
  totalBlocksCount: number;
}

export function computeStudentSummary(params: {
  studentId: string;
  course: CourseConfig;
  submissions: SubmissionRecord[];
  quizAttempts: QuizAttemptRecord[];
  attendance: AttendanceRecord[];
  blocks?: typeof BLOCKS;
}): StudentGradeSummary {
  const { studentId, course, submissions, quizAttempts, attendance } = params;
  const courseBlocks = params.blocks ?? BLOCKS;

  const studentSubs = submissions.filter(
    (s) => s.courseId === course.id && s.studentId === studentId
  );
  const studentQuizzes = quizAttempts.filter(
    (q) => q.courseId === course.id && q.studentId === studentId
  );
  const studentAtt = attendance.filter(
    (a) => a.courseId === course.id && a.studentId === studentId
  );

  // Progress rule: transparent completion based on required activities/quizzes submitted or graded per block
  const completedBlockIds = new Set<string>();
  for (const block of courseBlocks) {
    const blockActivities = ACTIVITIES.filter((a) => a.blockId === block.id && a.required);
    const blockQuizzes = QUIZZES.filter((q) => q.blockId === block.id);

    const hasActivityDone =
      blockActivities.length === 0 ||
      blockActivities.every((act) =>
        studentSubs.some(
          (s) =>
            s.activityId === act.id &&
            (s.status === 'entregada' || s.status === 'en_revision' || s.status === 'calificada')
        )
      );

    const hasQuizDone =
      blockQuizzes.length === 0 ||
      blockQuizzes.every((qz) => studentQuizzes.some((att) => att.quizId === qz.id));

    if (hasActivityDone && hasQuizDone) {
      completedBlockIds.add(block.id);
    }
  }

  const totalBlocksCount = courseBlocks.length;
  const completedBlocksCount = completedBlockIds.size;
  const progressPercent =
    totalBlocksCount > 0 ? Math.round((completedBlocksCount / totalBlocksCount) * 100) : 0;

  // Attendance calculation
  const attendedMinutes = studentAtt
    .filter((a) => a.status === 'presente' || a.status === 'justificado')
    .reduce((acc, a) => acc + a.minutesAttended, 0);
  const totalMinutes = course.totalHours * 60;
  const attendancePercent = totalMinutes > 0 ? Math.round((attendedMinutes / totalMinutes) * 100) : 0;
  const attendedHours = Number((attendedMinutes / 60).toFixed(1));

  // Component scores (single source of truth)
  const componentSummaries = EVALUATION_COMPONENTS.map((comp) => {
    if (comp.id === 'comp-cuestionarios') {
      const gradedQuizIds = ['Q1', 'Q2', 'Q3', 'Q4'];
      const scores = gradedQuizIds.map((qId) => {
        const attempts = studentQuizzes.filter((a) => a.quizId === qId);
        if (attempts.length === 0) return null;
        return Math.max(...attempts.map((a) => a.scoreFiveScale));
      });
      const completed = scores.filter((s): s is number => s !== null);
      if (completed.length === 0) {
        return {
          componentId: comp.id,
          name: comp.name,
          weightPercent: comp.weightPercent,
          scoreFiveScale: null,
          weightedContribution: 0,
          status: 'pendiente' as const,
          detail: `0/4 cuestionarios calificables completados (Q0 es diagnóstico).`,
        };
      }
      const avg = Number((completed.reduce((a, b) => a + b, 0) / 4).toFixed(2));
      const allDone = completed.length === 4;
      return {
        componentId: comp.id,
        name: comp.name,
        weightPercent: comp.weightPercent,
        scoreFiveScale: avg,
        weightedContribution: Number(((avg * comp.weightPercent) / 100).toFixed(2)),
        status: allDone ? ('evaluado' as const) : ('pendiente' as const),
        detail: `${completed.length}/4 cuestionarios calificables completados (Q1–Q4).`,
      };
    }

    const matchingActivities = ACTIVITIES.filter((a) => a.evaluationComponentId === comp.id);
    const gradedSubs = matchingActivities
      .map((act) =>
        studentSubs.find(
          (s) => s.activityId === act.id && s.grade && s.grade.publishedToStudent
        )
      )
      .filter((s): s is SubmissionRecord => Boolean(s));

    if (gradedSubs.length === 0) {
      return {
        componentId: comp.id,
        name: comp.name,
        weightPercent: comp.weightPercent,
        scoreFiveScale: null,
        weightedContribution: 0,
        status: 'pendiente' as const,
        detail: `0/${matchingActivities.length} evidencias calificadas y publicadas.`,
      };
    }

    const avg = Number(
      (
        gradedSubs.reduce((acc, s) => acc + (s.grade?.finalScore ?? 0), 0) / gradedSubs.length
      ).toFixed(2)
    );
    const allGraded = gradedSubs.length === matchingActivities.length;
    return {
      componentId: comp.id,
      name: comp.name,
      weightPercent: comp.weightPercent,
      scoreFiveScale: avg,
      weightedContribution: Number(((avg * comp.weightPercent) / 100).toFixed(2)),
      status: allGraded ? ('evaluado' as const) : ('pendiente' as const),
      detail: `${gradedSubs.length}/${matchingActivities.length} evidencias calificadas y publicadas.`,
    };
  });

  const evaluatedWeightPercent = componentSummaries
    .filter((c) => c.status === 'evaluado')
    .reduce((acc, c) => acc + c.weightPercent, 0);

  const provisionalTotal = Number(
    componentSummaries.reduce((acc, c) => acc + c.weightedContribution, 0).toFixed(2)
  );

  const missingComponents = componentSummaries.some((c) => c.status === 'pendiente');
  const isProvisional = missingComponents || course.gradingPolicy.provisionalStatus;
  const provisionalReason = missingComponents
    ? 'Resultado provisional: existen componentes pendientes de entrega o calificación publicada.'
    : 'Resultado provisional sujeto a validación institucional de umbrales (SO-6).';

  const meetsProposedThreshold =
    !missingComponents &&
    provisionalTotal >= course.gradingPolicy.passingScore &&
    attendancePercent >= course.gradingPolicy.minAttendancePercent;

  return {
    studentId,
    courseId: course.id,
    components: componentSummaries,
    provisionalTotal,
    evaluatedWeightPercent,
    isProvisional,
    provisionalReason,
    attendancePercent,
    attendedHours,
    totalProgramHours: course.totalHours,
    meetsProposedThreshold,
    progressPercent,
    completedBlocksCount,
    totalBlocksCount,
  };
}
