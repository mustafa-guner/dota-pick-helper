import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HeroRole } from '@dota-pick-helper/shared-types';

export interface RoleAnalysisModelOutput {
  roles: { role: HeroRole; confidence: number; rank: number }[];
  summary: string;
}

const ROLE_ANALYSIS_TOOL = {
  type: 'function',
  function: {
    name: 'submit_role_analysis',
    description:
      'Submit the structured hero lane/role analysis for the current Dota 2 patch.',
    parameters: {
      type: 'object',
      properties: {
        roles: {
          type: 'array',
          minItems: 1,
          maxItems: 3,
          description:
            'The realistic current lane roles for this hero, ranked by suitability (rank 1 = best fit).',
          items: {
            type: 'object',
            properties: {
              role: {
                type: 'string',
                enum: ['SAFELANE', 'MID', 'OFFLANE', 'SOFT_SUPPORT', 'HARD_SUPPORT'],
              },
              confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: 'How confident you are this role currently fits, 0-1.',
              },
              rank: { type: 'integer', minimum: 1 },
            },
            required: ['role', 'confidence', 'rank'],
          },
        },
        summary: {
          type: 'string',
          description:
            '2-4 sentences explaining the recommendation, explicitly referencing this patch\'s specific balance changes to the hero when relevant.',
        },
      },
      required: ['roles', 'summary'],
    },
  },
} as const;

interface OllamaChatResponse {
  message?: {
    content?: string;
    tool_calls?: { function: { name: string; arguments: unknown } }[];
  };
}

@Injectable()
export class OllamaClientService {
  private readonly logger = new Logger(OllamaClientService.name);
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('ollamaBaseUrl') ?? 'http://localhost:11434';
    this.model = this.configService.get<string>('ollamaModel') ?? 'llama3.1';
  }

  async getRoleRecommendation(system: string, user: string): Promise<RoleAnalysisModelOutput> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          stream: false,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          tools: [ROLE_ANALYSIS_TOOL],
        }),
      });
    } catch (error) {
      this.logger.error(`Failed to reach Ollama at ${this.baseUrl}: ${(error as Error).message}`);
      throw new InternalServerErrorException('AI analysis backend is unreachable');
    }

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Ollama returned ${response.status}: ${body}`);
      throw new InternalServerErrorException('AI analysis failed to produce a result');
    }

    const data = (await response.json()) as OllamaChatResponse;
    const toolCall = data.message?.tool_calls?.find(
      (call) => call.function.name === ROLE_ANALYSIS_TOOL.function.name,
    );

    if (toolCall) {
      try {
        return this.parseModelOutput(toolCall.function.arguments);
      } catch (error) {
        this.logger.error(`Malformed tool call arguments: ${(error as Error).message}`);
      }
    }

    // Some models ignore tool_choice and just answer in content — fall back to parsing that.
    const content = data.message?.content;
    if (content) {
      try {
        return this.parseModelOutput(content);
      } catch (error) {
        this.logger.error(`Malformed content body: ${(error as Error).message}`);
      }
    }

    this.logger.error('Ollama response did not include a usable tool call or JSON body');
    throw new InternalServerErrorException('AI analysis failed to produce a structured result');
  }

  /**
   * Parses and validates the model's output shape. Local models occasionally nest a
   * JSON-encoded array as a *string* inside an otherwise well-formed object (e.g. `roles` comes
   * back as `"[{...}]"` instead of `[{...}]`) — this normalizes that and rejects anything that
   * still doesn't match, rather than letting malformed data reach the database.
   */
  private parseModelOutput(raw: unknown): RoleAnalysisModelOutput {
    const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('model output is not a JSON object');
    }

    let roles: unknown = (parsed as Record<string, unknown>).roles;
    if (typeof roles === 'string') {
      roles = JSON.parse(roles);
    }
    if (!Array.isArray(roles) || roles.length === 0) {
      throw new Error('"roles" is not a non-empty array');
    }
    for (const entry of roles) {
      if (
        !entry ||
        typeof entry !== 'object' ||
        typeof (entry as Record<string, unknown>).role !== 'string' ||
        typeof (entry as Record<string, unknown>).confidence !== 'number' ||
        typeof (entry as Record<string, unknown>).rank !== 'number'
      ) {
        throw new Error('"roles" contains a malformed entry');
      }
    }

    const summary = (parsed as Record<string, unknown>).summary;
    if (typeof summary !== 'string') {
      throw new Error('"summary" is not a string');
    }

    return { roles: roles as RoleAnalysisModelOutput['roles'], summary };
  }
}
