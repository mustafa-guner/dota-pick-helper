import Anthropic from '@anthropic-ai/sdk';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HeroRole } from '@dota-pick-helper/shared-types';

export interface RoleAnalysisModelOutput {
  roles: { role: HeroRole; confidence: number; rank: number }[];
  summary: string;
}

const ROLE_ANALYSIS_TOOL: Anthropic.Tool = {
  name: 'submit_role_analysis',
  description:
    'Submit the structured hero lane/role analysis for the current Dota 2 patch.',
  input_schema: {
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
};

@Injectable()
export class ClaudeClientService {
  private readonly logger = new Logger(ClaudeClientService.name);
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.configService.get<string>('anthropicApiKey'),
    });
    this.model = this.configService.get<string>('anthropicModel') ?? 'claude-sonnet-5';
  }

  async getRoleRecommendation(system: string, user: string): Promise<RoleAnalysisModelOutput> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: user }],
      tools: [ROLE_ANALYSIS_TOOL],
      tool_choice: { type: 'tool', name: ROLE_ANALYSIS_TOOL.name },
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );

    if (!toolUse) {
      this.logger.error('Claude response did not include a tool_use block');
      throw new InternalServerErrorException('AI analysis failed to produce a structured result');
    }

    return toolUse.input as RoleAnalysisModelOutput;
  }
}
