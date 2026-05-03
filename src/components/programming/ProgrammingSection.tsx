import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SectionHeader } from '../dashboard/SectionHeader';
import { ComingSoonSection } from '../dashboard/ComingSoonSection';
import { ExerciseLibrary } from './exerciseLibrary/ExerciseLibrary';

export const ProgrammingSection = () => {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Programming"
        description="Build a team exercise library, design templates, and assign programmes to athletes."
      />
      <Tabs defaultValue="library" className="space-y-4">
        <TabsList>
          <TabsTrigger value="library">Exercise Library</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>
        <TabsContent value="library">
          <ExerciseLibrary />
        </TabsContent>
        <TabsContent value="templates">
          <ComingSoonSection
            title="Programme Templates"
            description="Design reusable training programmes with phases, blocks, and prescriptions."
            eta="Next phase"
            bullets={[
              'Multi-week template builder',
              'Drag-and-drop blocks & exercises',
              'Sets, reps, load, tempo, RPE',
              'Publish and version templates',
            ]}
          />
        </TabsContent>
        <TabsContent value="assignments">
          <ComingSoonSection
            title="Athlete Assignments"
            description="Assign templates to athletes with per-athlete overrides and adherence tracking."
            eta="Following phase"
            bullets={[
              'Assign templates to athletes',
              'Per-athlete sets/reps overrides',
              'Track adherence and completion',
              'Link results to test outcomes',
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
