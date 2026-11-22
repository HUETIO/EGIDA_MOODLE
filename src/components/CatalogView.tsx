import { ArrowRight, BookOpen, Clock, Layers, Lock, Shield } from 'lucide-react';
import type { CourseConfig, UserProfile } from '../shared/types.ts';
import { CourseCoverImage } from './CourseCoverImage.tsx';

export interface CatalogCourseItem extends CourseConfig {
  isEnrolled: boolean;
  isAssignedProfessor: boolean;
  canEnterClassroom: boolean;
  enrollmentStatusLabel: string;
}

interface CatalogViewProps {
  courses: CatalogCourseItem[];
  user: UserProfile;
  loading: boolean;
  onOpenOverview: (courseId: string) => void;
  onContinueCourse: (courseId: string) => void;
  onOpenRoleModal: () => void;
}

export function CatalogView({
  courses,
  user,
  loading,
  onOpenOverview,
  onContinueCourse,
  onOpenRoleModal,
}: CatalogViewProps) {
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="h-8 w-64 animate-pulse bg-slate-200" />
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="h-80 animate-pulse border border-slate-200 bg-white" />
        </div>
      </div>
    );
  }

  return (
    <section aria-labelledby="catalog-heading" className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-6 border-b border-slate-200 pb-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-wide text-blue-700">
            Catálogo académico · Educación continua
          </p>
          <h1
            id="catalog-heading"
            className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900"
            style={{ textWrap: 'balance' }}
          >
            Formación estratégica y defensiva en ciberseguridad
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            Plataforma diseñada para perfiles civiles, militares y policiales sin conocimientos técnicos previos. Recorre módulos claros, practica en entornos seguros sobre la empresa ficticia Andina Logística S.A.S. y evalúa tu progreso con transparencia.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {courses[0] && (
            user.role === 'solo_lectura' ? (
              <button
                type="button"
                onClick={onOpenRoleModal}
                className="inline-flex items-center gap-2 bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
              >
                <Lock className="h-4 w-4" aria-hidden="true" />
                <span>Iniciar sesión para entrar al aula</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onContinueCourse(courses[0].id)}
                className="inline-flex items-center gap-2 bg-blue-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
              >
                <span>Ir al aula del diplomado</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )
          )}
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="mt-10 border border-slate-200 bg-white p-10 text-center">
          <Shield className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
          <h2 className="mt-4 font-display text-lg font-semibold text-slate-900">
            Aún no hay programas publicados para este perfil
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Si esperabas ver un diplomado asignado o matrícula activa, verifica tu rol de acceso o comunícate con la coordinación académica institucional.
          </p>
          <button
            type="button"
            onClick={onOpenRoleModal}
            className="mt-5 border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Revisar perfil de acceso
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          {courses.map((course, idx) => (
            <article
              key={course.id}
              className={`${
                idx === 0 ? 'lg:col-span-8' : 'lg:col-span-4'
              } min-w-0 group flex flex-col justify-between border border-slate-200 bg-white transition-colors hover:border-slate-300 break-words`}
            >
              <div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenOverview(course.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenOverview(course.id);
                    }
                  }}
                  aria-label={`Abrir ficha del programa ${course.title}`}
                  className="cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700"
                >
                  <CourseCoverImage
                    imageKey={course.coverImageKey}
                    imageUrl={course.coverImageUrl}
                    alt={course.coverImageAlt}
                    title={course.title}
                    className={idx === 0 ? 'h-56 w-full' : 'h-40 w-full'}
                  />
                  <div className="p-6 pb-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                      <span>{course.code}</span>
                      <span aria-hidden="true">·</span>
                      <span>{course.totalHours} horas ({course.formativeHours} h formación + {course.guestHours} h invitados)</span>
                      <span aria-hidden="true">·</span>
                      <span>{course.modality}</span>
                    </div>
                    <h2 className="mt-2 font-display text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      {course.title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {course.subtitle}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-4">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600 tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      <span>70 % práctica (1260 min) / 30 % teoría (540 min)</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      <span>6 módulos + Evaluación + Invitados</span>
                    </span>
                    <span className="font-medium text-slate-800">
                      Estado: {course.enrollmentStatusLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
                <button
                  type="button"
                  onClick={() => onOpenOverview(course.id)}
                  className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
                >
                  <BookOpen className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  <span>Ver programa</span>
                </button>
                {user.role === 'solo_lectura' ? (
                  <button
                    type="button"
                    onClick={onOpenRoleModal}
                    className="inline-flex items-center gap-1.5 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
                  >
                    <Lock className="h-4 w-4" aria-hidden="true" />
                    <span>Iniciar sesión para acceder</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onContinueCourse(course.id)}
                    className="inline-flex items-center gap-1.5 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
                  >
                    <span>
                      {course.canEnterClassroom ? 'Continuar' : 'Solicitar acceso'}
                    </span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </article>
          ))}

          {courses.length === 1 && (
            <aside className="min-w-0 lg:col-span-4 flex flex-col justify-between border border-slate-200 bg-white p-6 break-words">
              <div>
                <p className="text-xs font-medium text-slate-500">Estructura del programa</p>
                <h3 className="mt-1 font-display text-lg font-semibold text-slate-900">
                  Recorrido integral de 30 horas
                </h3>
                <dl className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <dt className="text-slate-600">Componente formativo (B01–B13)</dt>
                    <dd className="font-mono font-medium text-slate-900 tabular-nums">26 h</dd>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <dt className="text-slate-600">Espacio de invitados (B14–B15)</dt>
                    <dd className="font-mono font-medium text-slate-900 tabular-nums">4 h</dd>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <dt className="text-slate-600">Práctica guiada y simulación</dt>
                    <dd className="font-mono font-medium text-slate-900 tabular-nums">70 % (21 h)</dd>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <dt className="text-slate-600">Exposición teórica</dt>
                    <dd className="font-mono font-medium text-slate-900 tabular-nums">30 % (9 h)</dd>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <dt className="text-slate-600">Hilo conductor</dt>
                    <dd className="font-medium text-slate-900">Andina Logística S.A.S.</dd>
                  </div>
                </dl>
              </div>
              <p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
                Aviso institucional: Los supuestos operativos y umbrales de aprobación permanecen configurables y sujetos a validación antes de certificar.
              </p>
            </aside>
          )}
        </div>
      )}
    </section>
  );
}
