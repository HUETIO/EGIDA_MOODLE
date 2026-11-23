import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiFetch } from '../lib/api.ts';
import type { UserRole } from '../shared/types.ts';
import { DEMO_STORAGE_KEY, DEMO_USERS } from '../lib/demo.ts';

type ManagedStatus = 'pendiente' | 'activo' | 'suspendido';
type ManagedRole = UserRole;

interface CourseOption {
  id: string;
  code: string;
  title: string;
}

interface ManagedUser {
  id: string;
  email: string;
  displayName: string;
  role: ManagedRole;
  status: ManagedStatus;
  profileContext: string;
  assignedCourseIds: string[];
  enrolledCourseIds: string[];
}

interface UserDraft {
  role: ManagedRole;
  status: ManagedStatus;
  courseIds: string[];
}

interface WorkspaceData {
  users: ManagedUser[];
  courses: CourseOption[];
}

interface CoordinatorWorkspaceProps {
  currentUserId: string;
}

const emptyNewUser = {
  email: '',
  displayName: '',
  role: 'estudiante' as ManagedRole,
  courseIds: [] as string[],
};

export function CoordinatorWorkspace({ currentUserId }: CoordinatorWorkspaceProps) {
  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const [newUser, setNewUser] = useState(emptyNewUser);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (DEMO_MODE) {
      const demoUsers: ManagedUser[] = Object.values(DEMO_USERS).map((user) => ({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        status: user.status ?? 'activo',
        profileContext: user.profileContext,
        assignedCourseIds: user.assignedCourseIds,
        enrolledCourseIds: user.enrolledCourseIds,
      }));
      setUsers(demoUsers);
      setCourses([{ id: 'diplomado-ciberseguridad', code: 'EGIDA-CS-01', title: 'Diplomado en Ciberseguridad · 40 h' }]);
      setDrafts(Object.fromEntries(demoUsers.map((user) => [
        user.id,
        {
          role: user.role,
          status: user.status,
          courseIds: user.role === 'profesor' ? user.assignedCourseIds : user.enrolledCourseIds,
        },
      ])));
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<WorkspaceData>('/api/admin/users');
      setUsers(data.users);
      setCourses(data.courses);
      setDrafts(Object.fromEntries(data.users.map((user) => [
        user.id,
        {
          role: user.role,
          status: user.status,
          courseIds: user.role === 'profesor' ? user.assignedCourseIds : user.enrolledCourseIds,
        },
      ])));
    } catch (err) {
      setError((err as Error).message || 'No se pudo cargar la gestión de usuarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const toggleCourse = (courseIds: string[], courseId: string) =>
    courseIds.includes(courseId)
      ? courseIds.filter((id) => id !== courseId)
      : [...courseIds, courseId];

  const updateDraft = (userId: string, patch: Partial<UserDraft>) => {
    setDrafts((current) => ({
      ...current,
      [userId]: { ...current[userId], ...patch },
    }));
  };

  const saveUser = async (user: ManagedUser) => {
    if (DEMO_MODE) {
      setNotice(`Demostración: ${user.displayName} no requiere cambios reales.`);
      return;
    }
    const draft = drafts[user.id];
    if (!draft) return;
    setSavingUserId(user.id);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        body: JSON.stringify(draft),
      });
      setNotice(`Se actualizó el acceso de ${user.displayName}.`);
      await loadUsers();
    } catch (err) {
      setError((err as Error).message || 'No se pudo guardar el usuario.');
    } finally {
      setSavingUserId(null);
    }
  };

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (DEMO_MODE) {
      setNotice('Demostración: el alta de usuarios ficticios no se persiste ni crea cuentas reales.');
      setNewUser(emptyNewUser);
      return;
    }
    try {
      await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });
      setNewUser(emptyNewUser);
      setNotice('Usuario registrado. Su acceso quedará vinculado al correo verificado de Google.');
      await loadUsers();
    } catch (err) {
      setError((err as Error).message || 'No se pudo registrar el usuario.');
    }
  };

  const courseSelector = (
    selectedCourseIds: string[],
    onChange: (courseIds: string[]) => void,
    disabled = false
  ) => (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      {courses.map((course) => (
        <label key={course.id} className="flex items-start gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={selectedCourseIds.includes(course.id)}
            disabled={disabled}
            onChange={() => onChange(toggleCourse(selectedCourseIds, course.id))}
          />
          <span>{course.code} · {course.title}</span>
        </label>
      ))}
    </div>
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Coordinación</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-slate-900">Usuarios y matrículas</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Google confirma la identidad. El rol y los cursos se conceden aquí; cada cambio requiere
          una cuenta de coordinación autorizada.
        </p>
      </header>

      {error && <p role="alert" className="mt-5 border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</p>}
      {notice && <p role="status" className="mt-5 border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}

      <form onSubmit={createUser} className="mt-6 border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Registrar estudiante o profesor</h2>
        <p className="mt-1 text-xs text-slate-600">
          El correo debe coincidir con la cuenta de Google verificada que utilizará la persona.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-xs font-medium text-slate-700">
            Nombre
            <input
              required
              minLength={2}
              maxLength={120}
              value={newUser.displayName}
              onChange={(event) => setNewUser({ ...newUser, displayName: event.target.value })}
              className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            Correo Google
            <input
              required
              type="email"
              maxLength={254}
              value={newUser.email}
              onChange={(event) => setNewUser({ ...newUser, email: event.target.value })}
              className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            Rol
            <select
              value={newUser.role}
              onChange={(event) => setNewUser({
                ...newUser,
                role: event.target.value as ManagedRole,
                courseIds: [],
              })}
              className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="estudiante">Estudiante</option>
              <option value="profesor">Profesor</option>
              <option value="solo_lectura">Solo lectura</option>
            </select>
          </label>
        </div>
        <div className="mt-4">
          <span className="text-xs font-medium text-slate-700">Cursos asignados</span>
          {newUser.role === 'solo_lectura'
            ? <p className="mt-2 text-xs text-slate-500">El perfil de solo lectura no se matricula en cursos.</p>
            : courseSelector(newUser.courseIds, (courseIds) => setNewUser({ ...newUser, courseIds }))}
        </div>
        <button type="submit" className="mt-5 bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
          Registrar usuario
        </button>
      </form>

      <div className="mt-8">
        <h2 className="font-semibold text-slate-900">Usuarios registrados</h2>
        {loading ? (
          <p className="mt-3 text-sm text-slate-600">Cargando usuarios...</p>
        ) : users.length === 0 ? (
          <p className="mt-3 border border-slate-200 bg-white p-5 text-sm text-slate-600">
            Aún no hay usuarios registrados. Los usuarios aparecerán aquí al iniciar sesión con Google
            o al ser registrados por coordinación.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {users.map((user) => {
              const draft = drafts[user.id];
              const isCurrentCoordinator = user.id === currentUserId;
              return (
                <article key={user.id} className="border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{user.displayName}</h3>
                      <p className="mt-1 text-xs text-slate-600">{user.email}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{user.profileContext}</p>
                    </div>
                    <span className="text-xs font-medium text-slate-600">
                      {isCurrentCoordinator ? 'Cuenta actual de coordinación' : `Estado: ${user.status}`}
                    </span>
                  </div>
                  {draft && (
                    <>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <label className="text-xs font-medium text-slate-700">
                          Rol
                          <select
                            disabled={isCurrentCoordinator}
                            value={draft.role}
                            onChange={(event) => updateDraft(user.id, {
                              role: event.target.value as ManagedRole,
                              courseIds: [],
                            })}
                            className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-sm"
                          >
                            <option value="estudiante">Estudiante</option>
                            <option value="profesor">Profesor</option>
                            <option value="solo_lectura">Solo lectura</option>
                          </select>
                        </label>
                        <label className="text-xs font-medium text-slate-700">
                          Estado
                          <select
                            disabled={isCurrentCoordinator}
                            value={draft.status}
                            onChange={(event) => updateDraft(user.id, {
                              status: event.target.value as ManagedStatus,
                            })}
                            className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-sm"
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="activo">Activo</option>
                            <option value="suspendido">Suspendido</option>
                          </select>
                        </label>
                      </div>
                      {draft.role === 'solo_lectura'
                        ? <p className="mt-3 text-xs text-slate-500">Sin cursos asignados.</p>
                        : courseSelector(
                            draft.courseIds,
                            (courseIds) => updateDraft(user.id, { courseIds }),
                            isCurrentCoordinator
                          )}
                      <button
                        type="button"
                        disabled={isCurrentCoordinator || savingUserId === user.id}
                        onClick={() => void saveUser(user)}
                        className="mt-4 border border-slate-300 px-4 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingUserId === user.id ? 'Guardando...' : 'Guardar asignación'}
                      </button>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
