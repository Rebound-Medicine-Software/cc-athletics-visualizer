
export interface CCApiConfig {
  apiKey: string;
}

export interface CCTeam {
  id: string;
  name: string;
  creation_date: string;
}

export interface CCAthleteInfo {
  gender?: string;
  birth_date?: string | number;
  height_cm?: number;
  weight_kg?: number;
}

export interface CCRecording {
  date: string;
  exercise_name?: string;
  jump_analysis?: any[];
  isometric_analysis?: {
    trials: any[];
  };
  pogo_jump_analysis?: {
    avg_metrics: any;
    jumps: any[];
  };
}

export interface CCAthlete {
  id: string;
  name: string;
  team_id: string;
  player_info?: CCAthleteInfo;
  recordings?: { [key: string]: CCRecording };
}

export interface CCTeamsResponse {
  teams: CCTeam[];
}

export interface CCAthleteResponse {
  athletes: CCAthlete[];
}

export class CCAthletics {
  private apiKey: string;
  private baseUrl = 'https://europe-west1-forcemate-desktop.cloudfunctions.net';

  constructor(config: CCApiConfig) {
    this.apiKey = config.apiKey;
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getTeams(): Promise<CCTeamsResponse> {
    return this.makeRequest<CCTeamsResponse>('/get_teams');
  }

  async getAthletes(analysisType: 'Jump' | 'Isometric' | 'Pogo'): Promise<CCAthleteResponse> {
    return this.makeRequest<CCAthleteResponse>(`/get_athletes?analysis_type=${analysisType}`);
  }

  async getAllData() {
    const [teams, jumpAthletes, isometricAthletes, pogoAthletes] = await Promise.all([
      this.getTeams(),
      this.getAthletes('Jump'),
      this.getAthletes('Isometric'),
      this.getAthletes('Pogo'),
    ]);

    return {
      teams: teams.teams,
      jumpAthletes: jumpAthletes.athletes,
      isometricAthletes: isometricAthletes.athletes,
      pogoAthletes: pogoAthletes.athletes,
    };
  }
}
