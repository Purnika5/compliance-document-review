import { client } from './client';
import { ICopilotSearchRequest, ICopilotSearchResponse } from '@/types/copilot.types';

export const copilotApi = {
  /**
   * Executes filterable document search and retrieves Grok neural compliance briefing.
   */
  async search(payload: ICopilotSearchRequest): Promise<ICopilotSearchResponse> {
    return client.request<ICopilotSearchResponse>('/api/documents/search', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
