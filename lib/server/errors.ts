export const PUBLIC_ERROR_CODES = [
  "INVALID_AUDIO",
  "AUDIO_TOO_LARGE",
  "AUDIO_TOO_LONG",
  "CONFIGURATION_ERROR",
  "TRANSCRIPTION_FAILED",
  "PLANNING_FAILED",
  "INVALID_MODEL_OUTPUT",
  "UPSTREAM_TIMEOUT",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
] as const;

export type PublicErrorCode = (typeof PUBLIC_ERROR_CODES)[number];

type ErrorDefinition = Readonly<{
  status: 400 | 413 | 429 | 500 | 502 | 504;
  retryable: boolean;
  message: string;
}>;

const ERROR_DEFINITIONS = {
  INVALID_AUDIO: {
    status: 400,
    retryable: false,
    message: "Choose a supported audio file and try again.",
  },
  AUDIO_TOO_LARGE: {
    status: 413,
    retryable: false,
    message: "The audio file is too large.",
  },
  AUDIO_TOO_LONG: {
    status: 400,
    retryable: false,
    message: "The audio recording is too long.",
  },
  CONFIGURATION_ERROR: {
    status: 500,
    retryable: false,
    message: "The service is not configured correctly.",
  },
  TRANSCRIPTION_FAILED: {
    status: 502,
    retryable: true,
    message: "We could not transcribe the audio. Please try again.",
  },
  PLANNING_FAILED: {
    status: 502,
    retryable: true,
    message: "We could not create the plan. Please try again.",
  },
  INVALID_MODEL_OUTPUT: {
    status: 502,
    retryable: true,
    message: "The plan response was invalid. Please try again.",
  },
  UPSTREAM_TIMEOUT: {
    status: 504,
    retryable: true,
    message: "The inference service took too long to respond. Please try again.",
  },
  RATE_LIMITED: {
    status: 429,
    retryable: true,
    message: "Too many requests. Please try again later.",
  },
  INTERNAL_ERROR: {
    status: 500,
    retryable: false,
    message: "Something went wrong. Please try again.",
  },
} as const satisfies Record<PublicErrorCode, ErrorDefinition>;

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
  return error instanceof AajError && error.code in ERROR_DEFINITIONS;
}

export function mapErrorToPublicResponse(
  error: unknown,
  correlationId: string,
): PublicErrorMapping {
  const code: PublicErrorCode = isKnownFailure(error)
    ? error.code
    : "INTERNAL_ERROR";
  const definition = ERROR_DEFINITIONS[code];

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
