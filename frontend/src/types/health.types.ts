export interface HealthResponse {
  success: boolean;
  message: string;
}

export interface DbHealthResponse {
  success: boolean;
  message: string;
  data: {
    database: string;
    status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
    latencyMs?: number;
    timestamp: string;
    details?: string;
  };
}

export type ConnectionStatus = 'loading' | 'connected' | 'error';
