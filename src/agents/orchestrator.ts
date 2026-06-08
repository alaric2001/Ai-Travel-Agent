/**
 * Orchestrator Core
 * Mendelegasikan request ke agen spesialis yang sesuai.
 * Kompatibel sebagai Dify.ai Custom Tool endpoint.
 */

export type AgentType = 'BOOKING' | 'AUDIT' | 'FUEL';

export interface OrchestratorRequest {
  employeeId: number;
  agentType: AgentType;
  payload: Record<string, unknown>;
}

export interface OrchestratorResponse {
  agentType: AgentType;
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export class OrchestratorCore {
  async route(req: OrchestratorRequest): Promise<OrchestratorResponse> {
    switch (req.agentType) {
      case 'BOOKING': return this.delegateBooking(req);
      case 'AUDIT':   return this.delegateAudit(req);
      case 'FUEL':    return this.delegateFuel(req);
      default: return { agentType: req.agentType, success: false, error: 'Unknown agent type' };
    }
  }

  private async delegateBooking(req: OrchestratorRequest): Promise<OrchestratorResponse> {
    const { processBookingRequest } = await import('./booking.agent');
    const result = await processBookingRequest(req.employeeId, req.payload.rawInput as string);
    return { agentType: 'BOOKING', success: true, data: result as never };
  }

  private async delegateAudit(_req: OrchestratorRequest): Promise<OrchestratorResponse> {
    return { agentType: 'AUDIT', success: false, error: 'AuditAgent: coming in Phase 3' };
  }

  private async delegateFuel(_req: OrchestratorRequest): Promise<OrchestratorResponse> {
    return { agentType: 'FUEL', success: false, error: 'FuelAgent: coming in Phase 4' };
  }
}

export const orchestrator = new OrchestratorCore();
