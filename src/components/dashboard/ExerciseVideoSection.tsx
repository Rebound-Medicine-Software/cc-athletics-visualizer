
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ExerciseVideoSectionProps {
  selectedTest: string;
}

export const ExerciseVideoSection = ({ selectedTest }: ExerciseVideoSectionProps) => {
  const { data: videoData } = useQuery({
    queryKey: ['exercise-video', selectedTest],
    queryFn: async () => {
      if (!selectedTest) return null;
      
      const { data, error } = await supabase
        .from('exercise_videos')
        .select('*')
        .eq('test_name', selectedTest)
        .single();
      
      if (error) {
        console.error('Error fetching video data:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!selectedTest,
  });

  if (!selectedTest) {
    return (
      <Card className="h-64">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Select a test to view demonstration</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{selectedTest} - Demonstration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center relative">
          {videoData?.video_url ? (
            <video 
              controls 
              className="w-full h-full rounded-lg"
              poster={videoData.thumbnail_url}
            >
              <source src={videoData.video_url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="text-center text-gray-500">
              <Play className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm">Video demonstration coming soon</p>
            </div>
          )}
        </div>
        {videoData?.description && (
          <p className="text-xs text-gray-600 mt-2">{videoData.description}</p>
        )}
      </CardContent>
    </Card>
  );
};
