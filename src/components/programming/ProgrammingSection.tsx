import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SectionHeader } from '../dashboard/SectionHeader';
import { ExerciseLibrary } from './exerciseLibrary/ExerciseLibrary';
import { TemplatesTab } from './templates/TemplatesTab';
import { AssignmentsTab } from './assignments/AssignmentsTab';

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
          <TabsTrigger value="templates">Programme Builder</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>
        <TabsContent value="library">
          <ExerciseLibrary />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="assignments">
          <AssignmentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
