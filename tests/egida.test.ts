import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import express from 'express';
import {
  BLOCKS,
  CYBERATTACK_14_CONCEPTS,
  DEFAULT_COURSE_ID,
  EVALUATION_COMPONENTS,
  LEARNING_OUTCOMES,
  MODULES,
  PHISHING_SAMPLES,
  QUIZZES,
  RUBRICS,
  WORD_SEARCH_28_TERMS,
} from '../src/shared/curriculum.ts';
import { createApiRouter } from '../server/routes.ts';
import { createSeedDatabase, EgidaStore } from '../server/store.ts';
import { computeStudentSummary } from '../server/grading.ts';

async function startTestServer() {
  const store = new EgidaStore({
    persistToDisk: false,
    seed: createSeedDatabase({ includeSimulationData: true }),
  });
  store.state.users.push({
    id: 'coordinator-test',
    email: 'coordinator@example.test',
    displayName: 'Coordinación de prueba',
    role: 'solo_lectura',
    status: 'activo',
    profileContext: 'Coordinación',
    assignedCourseIds: [],
    enrolledCourseIds: [],
    preferences: { largeText: false, highContrast: false, timezone: 'America/Bogota' },
  });
  const app = express();
  app.use('/api', createApiRouter(store, {
    coordinatorEmails: new Set(['coordinator@example.test']),
    verifyFirebaseToken: async (token) => {
      if (token === 'new-student') {
        return {
          uid: 'new-student-uid',
          email: 'new.student@example.test',
          displayName: 'Nuevo estudiante',
          emailVerified: true,
          providerId: 'google.com',
        };
      }
      if (token === 'wrong-provider') {
        return {
          uid: 'password-user',
          email: 'password.user@example.test',
          displayName: 'No Google',
          emailVerified: true,
          providerId: 'password',
        };
      }
      const user = store.state.users.find((candidate) => candidate.id === token);
      if (!user) throw new Error('Invalid test token.');
      return {
        uid: user.id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: true,
        providerId: 'google.com',
      };
    },
  }));
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  return {
    baseUrl,
    store,
    close: () => new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))),
  };
}

test('Autenticación: no se crean usuarios simulados en el arranque y se retira el acceso de demostración', async () => {
  const store = new EgidaStore({ persistToDisk: false });
  assert.equal(store.state.users.length, 0);

  const { baseUrl, close } = await startTestServer();
  try {
    const guest = await fetch(`${baseUrl}/api/auth/me`);
    const guestData = (await guest.json()) as { user: { role: string }; isAuthenticated: boolean };
    assert.equal(guestData.user.role, 'solo_lectura');
    assert.equal(guestData.isAuthenticated, false);

    const demoLogin = await fetch(`${baseUrl}/api/auth/demo-login`, { method: 'POST' });
    assert.equal(demoLogin.status, 404);

    const nonGoogle = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer wrong-provider' },
    });
    assert.equal(nonGoogle.status, 401);

    const newUserMe = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer new-student' },
    });
    const newUserData = (await newUserMe.json()) as {
      user: { email: string; role: string; status: string };
      isAuthenticated: boolean;
    };
    assert.equal(newUserData.isAuthenticated, true);
    assert.equal(newUserData.user.email, 'new.student@example.test');
    assert.equal(newUserData.user.role, 'solo_lectura');
    assert.equal(newUserData.user.status, 'pendiente');

    const pendingSubmission = await fetch(
      `${baseUrl}/api/courses/${DEFAULT_COURSE_ID}/submissions`,
      { headers: { Authorization: 'Bearer new-student' } }
    );
    assert.equal(pendingSubmission.status, 403);
  } finally {
    await close();
  }
});

test('Autorización: cuentas pendientes o suspendidas solo reciben contenido público', async () => {
  const { baseUrl, store, close } = await startTestServer();
  try {
    const token = await loginAs(baseUrl, 'estudiante-a');
    const profile = store.state.users.find((user) => user.id === 'estudiante-a');
    assert.ok(profile);
    profile.status = 'suspendido';

    const courseResponse = await fetch(`${baseUrl}/api/courses/${DEFAULT_COURSE_ID}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(courseResponse.status, 200);
    const courseData = (await courseResponse.json()) as {
      accessLevel: string;
      submissions?: unknown[];
      students?: unknown[];
    };
    assert.equal(courseData.accessLevel, 'solo_lectura');
    assert.equal(courseData.submissions, undefined);
    assert.equal(courseData.students, undefined);
  } finally {
    await close();
  }
});

test('Gestión de usuarios: solo coordinación registra roles y asignaciones por curso', async () => {
  const { baseUrl, store, close } = await startTestServer();
  try {
    const studentToken = await loginAs(baseUrl, 'estudiante-a');
    const denied = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(denied.status, 403);

    const coordinatorToken = await loginAs(baseUrl, 'coordinator-test');
    const created = await fetch(`${baseUrl}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${coordinatorToken}`,
      },
      body: JSON.stringify({
        email: 'docente@example.test',
        displayName: 'Docente de prueba',
        role: 'profesor',
        courseIds: [DEFAULT_COURSE_ID],
      }),
    });
    assert.equal(created.status, 201);
    const createdData = (await created.json()) as {
      user: { id: string; role: string; assignedCourseIds: string[]; status: string };
    };
    assert.equal(createdData.user.role, 'profesor');
    assert.equal(createdData.user.status, 'activo');
    assert.deepEqual(createdData.user.assignedCourseIds, [DEFAULT_COURSE_ID]);

    const duplicate = await fetch(`${baseUrl}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${coordinatorToken}`,
      },
      body: JSON.stringify({
        email: 'DOCENTE@example.test',
        displayName: 'Docente duplicado',
        role: 'profesor',
        courseIds: [DEFAULT_COURSE_ID],
      }),
    });
    assert.equal(duplicate.status, 409);

    const userId = createdData.user.id;
    const update = await fetch(`${baseUrl}/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${coordinatorToken}`,
      },
      body: JSON.stringify({ role: 'estudiante', status: 'activo', courseIds: [DEFAULT_COURSE_ID] }),
    });
    assert.equal(update.status, 200);
    assert.equal(store.state.users.find((user) => user.id === userId)?.enrolledCourseIds[0], DEFAULT_COURSE_ID);
    assert.ok(store.state.auditLogs.some((entry) => entry.action === 'ROL_Y_MATRICULA_ACTUALIZADOS'));
  } finally {
    await close();
  }
});

async function loginAs(_baseUrl: string, userId: string): Promise<string> {
  return userId;
}

test('1. Integridad curricular: 15 bloques, 30h (26h + 4h), 70% práctica / 30% teoría, pesos 100%', () => {
  assert.equal(MODULES.length, 8);
  assert.equal(BLOCKS.length, 15);

  const totalMinutes = BLOCKS.reduce((acc, b) => acc + b.durationMinutes, 0);
  const theoryMinutes = BLOCKS.reduce((acc, b) => acc + b.theoryMinutes, 0);
  const practiceMinutes = BLOCKS.reduce((acc, b) => acc + b.practiceMinutes, 0);
  assert.equal(totalMinutes, 1800); // 30 hours
  assert.equal(theoryMinutes, 540); // 30%
  assert.equal(practiceMinutes, 1260); // 70%

  const formativeHours = BLOCKS.slice(0, 13).reduce((acc, b) => acc + b.durationMinutes / 60, 0);
  const guestHours = BLOCKS.slice(13, 15).reduce((acc, b) => acc + b.durationMinutes / 60, 0);
  assert.equal(formativeHours, 26);
  assert.equal(guestHours, 4);

  assert.equal(LEARNING_OUTCOMES.length, 7);
  assert.equal(EVALUATION_COMPONENTS.reduce((a, c) => a + c.weightPercent, 0), 100);
  for (const rubric of RUBRICS) {
    assert.equal(
      rubric.criteria.reduce((a, c) => a + c.weightPercent, 0),
      100,
      `Rúbrica ${rubric.code} debe sumar 100%`
    );
  }
  assert.equal(WORD_SEARCH_28_TERMS.length, 28);
  assert.equal(CYBERATTACK_14_CONCEPTS.length, 14);
  assert.equal(QUIZZES.find((q) => q.id === 'Q0')?.questions.length, 10);
  assert.equal(QUIZZES.find((q) => q.id === 'Q0')?.diagnosticOnly, true);
});

test('2. Autorización en servidor: aislamiento de solo lectura, entre estudiantes y entre cursos', async () => {
  const { baseUrl, close } = await startTestServer();
  try {
    // a) Solo lectura (anónimo) solo tiene acceso al catálogo público; aula, recursos, interactivos y rutas privadas están bloqueadas
    const roCatalog = await fetch(`${baseUrl}/api/catalog`);
    assert.equal(roCatalog.status, 200);
    const roCatalogData = (await roCatalog.json()) as {
      courses: { id: string; canEnterClassroom: boolean }[];
    };
    assert.equal(roCatalogData.courses[0].canEnterClassroom, false);

    const roSub = await fetch(`${baseUrl}/api/courses/${DEFAULT_COURSE_ID}/submissions`);
    assert.equal(roSub.status, 403);

    const roGrades = await fetch(`${baseUrl}/api/courses/${DEFAULT_COURSE_ID}/grades`);
    assert.equal(roGrades.status, 403);

    const roKey = await fetch(`${baseUrl}/api/courses/${DEFAULT_COURSE_ID}/resources/res-b02-solucionario`);
    assert.equal(roKey.status, 403);

    const roB01Res = await fetch(`${baseUrl}/api/courses/${DEFAULT_COURSE_ID}/resources/res-b01-guia`);
    assert.equal(roB01Res.status, 403);

    const roPrivateRes = await fetch(`${baseUrl}/api/courses/${DEFAULT_COURSE_ID}/resources/res-b04-cyberopolis`);
    assert.equal(roPrivateRes.status, 403);

    const roCourse = await fetch(`${baseUrl}/api/courses/${DEFAULT_COURSE_ID}`);
    assert.equal(roCourse.status, 200);
    const roData = (await roCourse.json()) as {
      accessLevel: string;
      resources: unknown[];
      activities: unknown[];
      quizzes: unknown[];
      interactives?: unknown;
      submissions?: unknown;
      students?: unknown;
    };
    assert.equal(roData.accessLevel, 'solo_lectura');
    assert.equal(roData.resources.length, 0);
    assert.equal(roData.activities.length, 0);
    assert.equal(roData.quizzes.length, 0);
    assert.equal(roData.interactives, undefined);
    assert.equal(roData.submissions, undefined);
    assert.equal(roData.students, undefined);

    // b) Estudiante A no puede leer entregas de Estudiante B ni claves docentes
    const tokenA = await loginAs(baseUrl, 'estudiante-a');
    const crossStudent = await fetch(
      `${baseUrl}/api/courses/${DEFAULT_COURSE_ID}/submissions?studentId=estudiante-b`,
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    assert.equal(crossStudent.status, 403);

    const studentKey = await fetch(
      `${baseUrl}/api/courses/${DEFAULT_COURSE_ID}/resources/res-b02-solucionario`,
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    assert.equal(studentKey.status, 403);

    const studentCourseRes = await fetch(`${baseUrl}/api/courses/${DEFAULT_COURSE_ID}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const studentCourse = (await studentCourseRes.json()) as {
      quizzes: { questions: { correctIndex: number }[] }[];
    };
    assert.equal(studentCourse.quizzes[0].questions[0].correctIndex, -1);

    // c) Profesor externo (curso ajeno) no puede ver ni exportar el diplomado
    const tokenExtProf = await loginAs(baseUrl, 'profesor-externo');
    const extCourse = await fetch(`${baseUrl}/api/courses/${DEFAULT_COURSE_ID}`, {
      headers: { Authorization: `Bearer ${tokenExtProf}` },
    });
    assert.equal(extCourse.status, 403);

    const extExport = await fetch(`${baseUrl}/api/courses/${DEFAULT_COURSE_ID}/teacher/export`, {
      headers: { Authorization: `Bearer ${tokenExtProf}` },
    });
    assert.equal(extExport.status, 403);
  } finally {
    await close();
  }
});

test('3. Flujo completo: borrador -> entrega -> calificación con coevaluación (0,8-1,0) -> auditoría -> cálculo provisional', async () => {
  const { baseUrl, store, close } = await startTestServer();
  try {
    const tokenA = await loginAs(baseUrl, 'estudiante-a');
    const tokenProf = await loginAs(baseUrl, 'profesor-1');

    // Borrador T2
    const draftRes = await fetch(`${baseUrl}/api/courses/${DEFAULT_COURSE_ID}/submissions/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        activityId: 'ACT-T2',
        answers: { matriz_muestras: 'Borrador inicial M1-M6' },
      }),
    });
    assert.equal(draftRes.status, 200);

    // Entrega final T2
    const submitRes = await fetch(`${baseUrl}/api/courses/${DEFAULT_COURSE_ID}/submissions/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        activityId: 'ACT-T2',
        answers: {
          matriz_muestras:
            'M1: dominio .example y urgencia artificial -> Reportar al CSIRT. M2: solicitud BEC sin llamada -> Verificar por directorio interno. M3: comunicado interno sin credenciales -> Verificar. M4: adjunto .zip sospechoso -> Reportar. M5: premio pidiendo PII -> Eliminar. M6: solicitud de código MFA -> Reportar inmediatamente.',
          leccion_pareja:
            'Todo cambio bancario o solicitud privilegiada exige validación por canal alterno registrado en directorio interno.',
        },
        aiAssistanceDeclared: false,
      }),
    });
    assert.equal(submitRes.status, 200);
    const submitData = (await submitRes.json()) as { submission: { id: string; status: string; receiptCode: string } };
    assert.equal(submitData.submission.status, 'entregada');
    assert.ok(submitData.submission.receiptCode.startsWith('REC-B03'));

    // Profesor califica con coevaluación 0.9
    const gradeRes = await fetch(`${baseUrl}/api/courses/${DEFAULT_COURSE_ID}/teacher/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenProf}` },
      body: JSON.stringify({
        submissionId: submitData.submission.id,
        rawScore: 4.6,
        coEvalFactor: 0.9,
        feedback: 'Excelente identificación de indicadores en las 6 muestras.',
        publishedToStudent: true,
      }),
    });
    assert.equal(gradeRes.status, 200);
    const gradeData = (await gradeRes.json()) as { submission: { grade: { finalScore: number } } };
    assert.equal(gradeData.submission.grade.finalScore, 4.14);

    // Verificar cálculo provisional (hay componentes faltantes)
    const course = store.state.courses[0];
    const summary = computeStudentSummary({
      studentId: 'estudiante-a',
      course,
      submissions: store.state.submissions,
      quizAttempts: store.state.quizAttempts,
      attendance: store.state.attendance,
    });
    assert.equal(summary.isProvisional, true);
    assert.ok(summary.evaluatedWeightPercent < 100);

    // Verificar auditoría registrada
    assert.ok(store.state.auditLogs.some((l) => l.action === 'CALIFICACION_ACTUALIZADA'));

    // Profesor envía recordatorio a estudiante con tareas pendientes; estudiante no puede invocarlo
    const studentRemindAttempt = await fetch(`${baseUrl}/api/courses/${DEFAULT_COURSE_ID}/teacher/remind`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        studentIds: ['estudiante-b'],
        title: 'Intento no autorizado',
        message: 'No debería permitirse desde rol estudiante.',
      }),
    });
    assert.equal(studentRemindAttempt.status, 403);

    const profRemind = await fetch(`${baseUrl}/api/courses/${DEFAULT_COURSE_ID}/teacher/remind`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenProf}` },
      body: JSON.stringify({
        studentIds: ['estudiante-b'],
        activityId: 'ACT-T2',
        blockId: 'B03',
        title: 'Recordatorio B03 (T2)',
        message: 'Recuerda completar y enviar el taller T2 en el aula.',
      }),
    });
    assert.equal(profRemind.status, 201);
    const remindData = (await profRemind.json()) as { sentCount: number };
    assert.equal(remindData.sentCount, 1);
    assert.ok(store.state.auditLogs.some((l) => l.action === 'RECORDATORIO_ESTUDIANTES_ENVIADO'));
  } finally {
    await close();
  }
});

test('4. Seguridad educativa: muestras ficticias de entrenamiento sin dominios reales ni recolección de credenciales', () => {
  assert.equal(PHISHING_SAMPLES.length, 6);
  for (const sample of PHISHING_SAMPLES) {
    assert.equal(sample.label, 'Material de entrenamiento');
    assert.ok(
      sample.senderEmail.endsWith('.example') || sample.senderEmail.endsWith('.invalid'),
      `Dominio debe ser ficticio (.example o .invalid): ${sample.senderEmail}`
    );
  }
});
