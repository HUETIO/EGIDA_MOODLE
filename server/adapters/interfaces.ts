/**
 * Decoupled integration boundaries (Section 8: LMS/Moodle, Quiz providers, and bounded AI agents).
 * No external provider is claimed active unless explicitly configured and verified.
 */

export interface AdapterHealthStatus {
  id: string;
  name: string;
  mode: 'native_local' | 'not_configured' | 'configured';
  description: string;
  lastCheckedAt: string;
}

export interface LmsIntegrationAdapter {
  readonly id: string;
  getStatus(): AdapterHealthStatus;
  describeBoundary(): {
    supportedModes: string[];
    sourceOfTruthRule: string;
  };
}

export interface QuizProviderAdapter {
  readonly id: string;
  getStatus(): AdapterHealthStatus;
  supportsImmediateFeedback(): boolean;
}

export interface BoundedAiAgentAdapter {
  readonly id: string;
  getStatus(): AdapterHealthStatus;
  allowedActions: string[];
  prohibitedActions: string[];
}

export class NativeMoodleBoundaryAdapter implements LmsIntegrationAdapter {
  readonly id = 'moodle-boundary';

  getStatus(): AdapterHealthStatus {
    const ltiConfigured = Boolean(process.env.MOODLE_LTI_ISSUER && process.env.MOODLE_CLIENT_ID);
    return {
      id: this.id,
      name: 'Adaptador LMS / Moodle',
      mode: ltiConfigured ? 'configured' : 'not_configured',
      description: ltiConfigured
        ? 'Integración LTI/REST configurada mediante variables de entorno.'
        : 'Modo independiente activo. Adaptador Moodle/LTI desacoplado pendiente de validación institucional (SO-10).',
      lastCheckedAt: new Date().toISOString(),
    };
  }

  describeBoundary() {
    return {
      supportedModes: [
        'Publicación de curso/recursos en Moodle',
        'Herramienta externa LTI 1.3 (sujeta a aprobación institucional)',
        'Sincronización autorizada de matrícula/finalización/notas con fuente única de verdad',
      ],
      sourceOfTruthRule:
        'EGIDA_MOODLE actúa como fuente única de progreso y notas mientras no exista acuerdo formal de sincronización bidireccional.',
    };
  }
}

export class NativeQuizAdapter implements QuizProviderAdapter {
  readonly id = 'native-quiz-engine';

  getStatus(): AdapterHealthStatus {
    return {
      id: this.id,
      name: 'Motor Nativo de Cuestionarios (Q0–Q4)',
      mode: 'native_local',
      description:
        'Ejecución nativa sin dependencia obligatoria de Kahoot/Slido. Adaptador externo disponible para integración futura.',
      lastCheckedAt: new Date().toISOString(),
    };
  }

  supportsImmediateFeedback(): boolean {
    return true;
  }
}

export class BoundedPedagogicalAgentAdapter implements BoundedAiAgentAdapter {
  readonly id = 'bounded-ai-draft-assistant';
  allowedActions = [
    'Sugerir borrador de retroalimentación formativa para revisión docente',
    'Resumir progreso agregado sin datos personales identificables',
  ];
  prohibitedActions = [
    'Publicar cursos o cambiar visibilidad sin aprobación docente',
    'Modificar calificaciones o rúbricas automáticamente',
    'Actuar durante evaluaciones restringidas (B13)',
    'Entrenar modelos externos con entregas de estudiantes',
  ];

  getStatus(): AdapterHealthStatus {
    return {
      id: this.id,
      name: 'Frontera de Asistencia IA Acotada',
      mode: process.env.GEMINI_API_KEY ? 'not_configured' : 'not_configured',
      description:
        'Interfaz desacoplada deshabilitada por defecto para evaluación humana; nunca altera notas ni opera en exámenes sin autorización (SO-9).',
      lastCheckedAt: new Date().toISOString(),
    };
  }
}
