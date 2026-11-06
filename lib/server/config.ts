import { AajError } from "./errors";

export const VERIFIED_PLANNER_MODEL = "0gm-1.0-35b-a3b" as const;

export type DemoServerConfig = Readonly<{
  mode: "demo";
}>;

export type RealServerConfig = Readonly<{
  mode: "real";
  plannerModel: typeof VERIFIED_PLANNER_MODEL;
  getZeroGApiKey(): string;
}>;

export type ServerConfig = DemoServerConfig | RealServerConfig;
export type ServerEnvironment = Readonly<Record<string, string | undefined>>;

class ValidatedRealServerConfig implements RealServerConfig {
  readonly mode = "real" as const;
  readonly plannerModel = VERIFIED_PLANNER_MODEL;
  readonly #zeroGApiKey: string;

  constructor(zeroGApiKey: string) {
    this.#zeroGApiKey = zeroGApiKey;
    Object.freeze(this);
  }

  getZeroGApiKey(): string {
    return this.#zeroGApiKey;
  }
}

function configurationError(): never {
  throw new AajError("CONFIGURATION_ERROR");
}

export function loadServerConfig(
  environment: ServerEnvironment = process.env,
): ServerConfig {
  const demoMode = environment.AAJ_DEMO_MODE;
  if (demoMode !== undefined && demoMode !== "false" && demoMode !== "true") {
    configurationError();
  }

  if (demoMode === "true") {
    return Object.freeze({ mode: "demo" as const });
  }

  const apiKey = environment.ZERO_G_API_KEY?.trim();
  if (!apiKey) configurationError();

  if (environment.ZERO_G_PLANNER_MODEL !== VERIFIED_PLANNER_MODEL) {
    configurationError();
  }

  return new ValidatedRealServerConfig(apiKey);
}
