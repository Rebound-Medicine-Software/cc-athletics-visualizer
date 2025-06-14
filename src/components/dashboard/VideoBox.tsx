
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface VideoBoxProps {
  testName: string;
}

interface TestVideo {
  id: string;
  test_name: string;
  test_link: string;
}

export const VideoBox = ({ testName }: VideoBoxProps) => {
  const [videoLink, setVideoLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchVideo() {
      setVideoLink(null);
      if (!testName) return;
      setIsLoading(true);
      const { data, error } = await supabase
        .from("test_videos")
        .select("test_link")
        .eq("test_name", testName)
        .maybeSingle();

      if (data && data.test_link) {
        setVideoLink(data.test_link);
      } else {
        setVideoLink(null);
      }
      setIsLoading(false);
    }

    fetchVideo();
  }, [testName]);

  // A responsive 16:9 video player, or a placeholder if no video
  return (
    <div className="w-full max-w-[420px]">
      <div className="bg-white border border-teal-200 rounded-lg shadow p-4 flex flex-col items-center min-h-[276px]">
        <div className="text-center mb-3 font-semibold text-teal-700">Instructional Video</div>
        {isLoading ? (
          <div className="flex items-center justify-center h-56 w-full">
            <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></span>
          </div>
        ) : videoLink ? (
          <div className="w-full aspect-video">
            <iframe
              title="Test Instructional Video"
              className="w-full h-full rounded-lg"
              src={getYoutubeEmbed(videoLink)}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-56 w-full text-gray-500 text-sm">
            {testName ? "No video available for this test." : "Select a test to see a video."}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper: Converts YouTube link to embed URL
function getYoutubeEmbed(url: string) {
  // Handles https://www.youtube.com/watch?v=... or https://youtu.be/...
  const match =
    url.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?&/]+)/) ||
    url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^?&/]+)/);
  return match
    ? `https://www.youtube.com/embed/${match[1]}`
    : url; // fallback
}
