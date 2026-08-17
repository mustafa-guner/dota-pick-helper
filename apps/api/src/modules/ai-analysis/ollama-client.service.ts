import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
}

/**
 * Ollama is only ever asked to write prose now — role/confidence numbers come from
 * RoleScoringService (real pro-match data), never from the model. This removes an entire class
 * of failure mode: earlier versions asked the model to invent a structured roles array via tool
 * calling, and small local models occasionally returned malformed shapes (e.g. a JSON-encoded
 * string instead of a real array) that corrupted stored data.
 */
@Injectable()
export class OllamaClientService {
  private readonly logger = new Logger(OllamaClientService.name);
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('ollamaBaseUrl') ?? 'http://localhost:11434';
    this.model = this.configService.get<string>('ollamaModel') ?? 'llama3.1';
  }

  async getSummary(system: string, user: string): Promise<string> {
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
    const content = data.message?.content?.trim();
    if (!content) {
      this.logger.error('Ollama response had no content');
      throw new InternalServerErrorException('AI analysis failed to produce a summary');
    }

    return content;
  }
}
