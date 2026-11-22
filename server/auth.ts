import type { NextFunction, Request, Response } from 'express';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { UserProfile, UserRole } from '../src/shared/types.ts';
import type { EgidaStore } from './store.ts';

export interface AuthIdentity {
  uid: string;
  email: string;
  displayName?: string;
  emailVerified: boolean;
  providerId: string;
}

export type FirebaseTokenVerifier = (token: string) => Promise<AuthIdentity>;

export class FirebaseAuthConfigurationError extends Error {}

export async function verifyFirebaseIdToken(token: string): Promise<AuthIdentity> {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ??
    process.env.GCLOUD_PROJECT ??
    process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    throw new FirebaseAuthConfigurationError('FIREBASE_PROJECT_ID no está configurado.');
  }

  const app =
    getApps().find((candidate) => candidate.name === 'egida-auth') ??
    initializeApp(
      { credential: applicationDefault(), projectId },
      'egida-auth'
    );
  let decoded: {
    uid: string;
    email?: string;
    name?: string;
    email_verified?: boolean;
    firebase?: { sign_in_provider?: string };
  };
  try {
    decoded = await getAuth(app).verifyIdToken(token);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string' &&
      error.code.startsWith('auth/')
    ) {
      throw error;
    }
    throw new FirebaseAuthConfigurationError('No se pudo verificar el token de Firebase.');
  }
  if (!decoded.email) {
    throw new Error('La cuenta de Google no tiene un correo electrónico verificado.');
  }
  return {
    uid: decoded.uid,
    email: decoded.email,
    displayName: decoded.name,
    emailVerified: decoded.email_verified === true,
    providerId: decoded.firebase?.sign_in_provider ?? '',
  };
}

function getCoordinatorEmails(): Set<string> {
  return new Set(
    (process.env.COORDINATOR_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export interface AuthenticatedRequest extends Request {
  currentUser: UserProfile;
  isAnonymousReadOnly: boolean;
  isAuthenticated: boolean;
  isCoordinator: boolean;
}

function guestProfile(): UserProfile {
  return {
    id: 'guest',
    email: '',
    displayName: 'Visitante',
    role: 'solo_lectura',
    status: 'activo',
    profileContext: 'Consulta pública',
    assignedCourseIds: [],
    enrolledCourseIds: [],
    preferences: { largeText: false, highContrast: false, timezone: 'America/Bogota' },
  };
}

export function createAuthMiddleware(
  store: EgidaStore,
  verifyToken: FirebaseTokenVerifier = verifyFirebaseIdToken,
  coordinatorEmails: Set<string> = getCoordinatorEmails()
) {
  const attachUser = async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      if (!token) {
        return res.status(401).json({ error: 'Token de acceso inválido.' });
      }
      let identity: AuthIdentity;
      try {
        identity = await verifyToken(token);
      } catch (error) {
        if (error instanceof FirebaseAuthConfigurationError) {
          return res.status(503).json({ error: 'El inicio de sesión no está configurado.' });
        }
        return res.status(401).json({ error: 'Token de acceso inválido o expirado.' });
      }
      if (!identity.emailVerified || !identity.email || identity.providerId !== 'google.com') {
        return res.status(401).json({ error: 'Se requiere una cuenta de Google verificada.' });
      }
      let user: UserProfile;
      try {
        user = store.resolveIdentity(identity, coordinatorEmails);
      } catch (error) {
        return next(error);
      }
      authReq.currentUser = user;
      authReq.isAuthenticated = true;
      authReq.isCoordinator = user.isCoordinator === true;
      authReq.isAnonymousReadOnly =
        user.role === 'solo_lectura' || user.status !== 'activo';
      return next();
    }
    authReq.currentUser = guestProfile();
    authReq.isAuthenticated = false;
    authReq.isCoordinator = false;
    authReq.isAnonymousReadOnly = true;
    next();
  };

  const requireAuthenticatedRole = (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (
      !authReq.isAuthenticated ||
      authReq.currentUser.status !== 'activo' ||
      authReq.currentUser.role === 'solo_lectura'
    ) {
      store.addAudit({
        actorId: authReq.currentUser.id,
        actorRole: authReq.currentUser.role,
        action: 'ACCESO_DENEGADO_SIN_PERFIL_ACTIVO',
        resourceType: 'route',
        resourceId: req.path,
        outcome: 'denegado',
        detail: 'Usuario no autenticado, pendiente o solo lectura intentó acceder a operación protegida.',
      });
      return res.status(403).json({
        error: 'Se requiere un perfil institucional activo para esta operación.',
      });
    }
    next();
  };

  const requireCoordinator = (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (
      !authReq.isAuthenticated ||
      authReq.currentUser.status !== 'activo' ||
      !authReq.isCoordinator
    ) {
      store.addAudit({
        actorId: authReq.currentUser.id,
        actorRole: authReq.currentUser.role,
        action: 'ACCESO_DENEGADO_GESTION_USUARIOS',
        resourceType: 'route',
        resourceId: req.path,
        outcome: 'denegado',
        detail: 'Intento de acceso a gestión de usuarios sin permiso de coordinación.',
      });
      return res.status(403).json({ error: 'Operación reservada a coordinación.' });
    }
    next();
  };

  const requireCourseReadAccess = (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    const courseId = req.params.courseId;
    const course = store.state.courses.find((c) => c.id === courseId);
    if (!course) {
      return res.status(404).json({ error: 'Recurso no disponible.' });
    }
    const user = authReq.currentUser;
    if (
      !authReq.isAuthenticated ||
      user.status !== 'activo' ||
      user.role === 'solo_lectura'
    ) {
      if (!course.published || !course.readOnlyPolicy.allowCatalogCard) {
        return res.status(403).json({ error: 'Acceso no autorizado al recurso solicitado.' });
      }
      return next();
    }
    if (user.role === 'profesor' && !user.assignedCourseIds.includes(courseId)) {
      store.addAudit({
        actorId: user.id,
        actorRole: user.role,
        action: 'ACCESO_DENEGADO_CURSO_AJENO',
        resourceType: 'course',
        resourceId: courseId,
        courseId,
        outcome: 'denegado',
        detail: 'Profesor intentó consultar curso no asignado.',
      });
      return res.status(403).json({ error: 'No tiene autorización sobre este curso.' });
    }
    if (user.role === 'estudiante' && (!course.published || !user.enrolledCourseIds.includes(courseId))) {
      store.addAudit({
        actorId: user.id,
        actorRole: user.role,
        action: 'ACCESO_DENEGADO_NO_MATRICULADO',
        resourceType: 'course',
        resourceId: courseId,
        courseId,
        outcome: 'denegado',
        detail: 'Estudiante intentó consultar curso sin matrícula activa.',
      });
      return res.status(403).json({ error: 'No tiene autorización sobre este curso.' });
    }
    next();
  };

  const requireProfessorOfCourse = (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    const courseId = req.params.courseId;
    const user = authReq.currentUser;
    if (
      !authReq.isAuthenticated ||
      user.status !== 'activo' ||
      user.role !== 'profesor' ||
      !user.assignedCourseIds.includes(courseId)
    ) {
      store.addAudit({
        actorId: user.id,
        actorRole: user.role,
        action: 'ACCESO_DOCENTE_DENEGADO',
        resourceType: 'teacher_area',
        resourceId: req.path,
        courseId,
        outcome: 'denegado',
        detail: 'Intento de acceso administrativo docente sin asignación en el curso.',
      });
      return res.status(403).json({ error: 'Operación reservada al profesor asignado al curso.' });
    }
    next();
  };

  return {
    attachUser,
    requireAuthenticatedRole,
    requireCoordinator,
    requireCourseReadAccess,
    requireProfessorOfCourse,
  };
}
