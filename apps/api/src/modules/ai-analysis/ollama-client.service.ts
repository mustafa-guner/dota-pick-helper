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
      const args = toolCall.function.arguments;
      return (typeof args === 'string' ? JSON.parse(args) : args) as RoleAnalysisModelOutput;
    }

    // Some models ignore tool_choice and just answer in content — fall back to parsing that.
    const content = data.message?.content;
    if (content) {
      try {
        return JSON.parse(content) as RoleAnalysisModelOutput;
      } catch {
        // fall through to error below
      }
    }

    this.logger.error('Ollama response did not include a usable tool call or JSON body');
    throw new InternalServerErrorException('AI analysis failed to produce a structured result');
  }
}
