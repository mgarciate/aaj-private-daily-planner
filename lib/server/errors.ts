type ErrorDefinition = Readonly<{
  code: string;
  status: 400 | 413 | 429 | 500 | 502 | 504;
  retryable: boolean;
  message: string;
}>;

function freezeErrorDefinitions<
  const T extends {
    readonly [K in keyof T]: ErrorDefinition & Readonly<{ code: K }>;
  },
>(
  definitions: T,
): Readonly<T> {
  for (const definition of Object.values(definitions)) Object.freeze(definition);
  return Object.freeze(definitions);
}

export const PUBLIC_ERROR_DEFINITIONS = freezeErrorDefinitions({
  INVALID_AUDIO: {
    code: "INVALID_AUDIO",
    status: 400,
    retryable: false,
    message: "Choose a supported audio file and try again.",
  },
  AUDIO_TOO_LARGE: {
    code: "AUDIO_TOO_LARGE",
    status: 413,
    retryable: false,
    message: "The audio file is too large.",
  },
  AUDIO_TOO_LONG: {
    code: "AUDIO_TOO_LONG",
    status: 400,
    retryable: false,
    message: "The audio recording is too long.",
  },
  CONFIGURATION_ERROR: {
    code: "CONFIGURATION_ERROR",
    status: 500,
    retryable: false,
    message: "The service is not configured correctly.",
  },
  TRANSCRIPTION_FAILED: {
    code: "TRANSCRIPTION_FAILED",
    status: 502,
    retryable: true,
    message: "We could not transcribe the audio. Please try again.",
  },
  PLANNING_FAILED: {
    code: "PLANNING_FAILED",
    status: 502,
    retryable: true,
    message: "We could not create the plan. Please try again.",
  },
  INVALID_MODEL_OUTPUT: {
    code: "INVALID_MODEL_OUTPUT",
    status: 502,
    retryable: true,
    message: "The plan response was invalid. Please try again.",
  },
  UPSTREAM_TIMEOUT: {
    code: "UPSTREAM_TIMEOUT",
    status: 504,
    retryable: true,
    message: "The inference service took too long to respond. Please try again.",
  },
  RATE_LIMITED: {
    code: "RATE_LIMITED",
    status: 429,
    retryable: true,
    message: "Too many requests. Please try again later.",
  },
  INTERNAL_ERROR: {
    code: "INTERNAL_ERROR",
    status: 500,
    retryable: false,
    message: "Something went wrong. Please try again.",
  },
} as const);

export type PublicErrorCode = keyof typeof PUBLIC_ERROR_DEFINITIONS;

export const PUBLIC_ERROR_CODES = Object.freeze(
  Object.keys(PUBLIC_ERROR_DEFINITIONS) as PublicErrorCode[],
);

export class AajError extends Error {
  readonly code: PublicErrorCode;

  constructor(code: PublicErrorCode, options?: ErrorOptions) {
    super(code, options);
    this.name = "AajError";
    this.code = code;
  }
}

export type PublicError = Readonly<{
  code: PublicErrorCode;
  message: string;
  retryable: boolean;
  correlationId: string;
}>;

export type ErrorResponse = Readonly<{
  error: PublicError;
}>;

export type PublicErrorMapping = Readonly<{
  status: ErrorDefinition["status"];
  body: ErrorResponse;
}>;

function isKnownFailure(error: unknown): error is AajError {
  return error instanceof AajError && error.code in PUBLIC_ERROR_DEFINITIONS;
}

export function mapErrorToPublicResponse(
  error: unknown,
  correlationId: string,
): PublicErrorMapping {
  const code: PublicErrorCode = isKnownFailure(error)
    ? error.code
    : "INTERNAL_ERROR";
  const definition = PUBLIC_ERROR_DEFINITIONS[code];

  return {
    status: definition.status,
    body: {
      error: {
        code,
        message: definition.message,
        retryable: definition.retryable,
        correlationId,
      },
    },
  };
}
