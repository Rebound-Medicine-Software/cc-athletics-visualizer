
import { TestData, JumpMetrics, IsometricMetrics, PogoMetrics } from '@/types/forcePlateTypes';
import { CCAthlete, CCTeam } from './ccAthleticsApi';

export class DataProcessor {
  private teamMap: Map<string, string> = new Map();

  setTeams(teams: CCTeam[]) {
    this.teamMap.clear();
    teams.forEach(team => {
      this.teamMap.set(team.id, team.name);
    });
  }

  private formatDate(date: string): string {
    return new Date(date).toISOString().split('T')[0];
  }

  private extractDemographics(athlete: CCAthlete) {
    const info = athlete.player_info || {};
    let age = null;
    
    if (info.birth_date) {
      const birthDate = typeof info.birth_date === 'number' 
        ? new Date(info.birth_date) 
        : new Date(info.birth_date);
      
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }
    }

    return {
      gender: info.gender,
      age,
      height_cm: info.height_cm,
      weight_kg: info.weight_kg,
    };
  }

  processJumpData(athletes: CCAthlete[]): TestData[] {
    const testData: TestData[] = [];

    athletes.forEach(athlete => {
      const demographics = this.extractDemographics(athlete);
      
      Object.values(athlete.recordings || {}).forEach(recording => {
        const jumps = recording.jump_analysis || [];
        
        jumps.forEach((jump, index) => {
          const rawJumpType = (jump.plot_annotations?.jump_type || '').toUpperCase();
          const testName = rawJumpType === 'CMJ' ? 'Countermovement Jump'
                          : rawJumpType === 'SJ' ? 'Squat Jump'
                          : rawJumpType === 'DJ' ? 'Drop Jump'
                          : 'Jump Test';

          testData.push({
            athlete_id: athlete.id,
            athlete_name: athlete.name,
            team_name: this.teamMap.get(athlete.team_id) || 'Unknown Team',
            test_date: this.formatDate(jump.date),
            test_name: testName,
            repetition_number: index + 1,
            gender: demographics.gender,
            metrics: jump.metric_table as JumpMetrics,
          });
        });
      });
    });

    return testData;
  }

  processIsometricData(athletes: CCAthlete[]): TestData[] {
    const testData: TestData[] = [];

    athletes.forEach(athlete => {
      const demographics = this.extractDemographics(athlete);
      
      Object.values(athlete.recordings || {}).forEach(recording => {
        const analysis = recording.isometric_analysis;
        if (!analysis?.trials) return;

        analysis.trials.forEach((trial, index) => {
          testData.push({
            athlete_id: athlete.id,
            athlete_name: athlete.name,
            team_name: this.teamMap.get(athlete.team_id) || 'Unknown Team',
            test_date: this.formatDate(recording.date),
            test_name: recording.exercise_name || 'Isometric Test',
            repetition_number: index + 1,
            gender: demographics.gender,
            metrics: trial.total_metrics as IsometricMetrics,
          });
        });
      });
    });

    return testData;
  }

  processPogoData(athletes: CCAthlete[]): TestData[] {
    const testData: TestData[] = [];

    athletes.forEach(athlete => {
      const demographics = this.extractDemographics(athlete);
      
      Object.values(athlete.recordings || {}).forEach(recording => {
        const analysis = recording.pogo_jump_analysis;
        if (!analysis) return;

        // Add average metrics row
        if (analysis.avg_metrics) {
          testData.push({
            athlete_id: athlete.id,
            athlete_name: athlete.name,
            team_name: this.teamMap.get(athlete.team_id) || 'Unknown Team',
            test_date: this.formatDate(recording.date),
            test_name: 'Pogo Jump',
            repetition_number: 0, // 0 indicates average
            gender: demographics.gender,
            metrics: analysis.avg_metrics as PogoMetrics,
          });
        }

        // Add individual jump data
        (analysis.jumps || []).forEach((jump, index) => {
          testData.push({
            athlete_id: athlete.id,
            athlete_name: athlete.name,
            team_name: this.teamMap.get(athlete.team_id) || 'Unknown Team',
            test_date: this.formatDate(recording.date),
            test_name: 'Pogo Jump',
            repetition_number: index + 1,
            gender: demographics.gender,
            metrics: jump as PogoMetrics,
          });
        });
      });
    });

    return testData;
  }
}
