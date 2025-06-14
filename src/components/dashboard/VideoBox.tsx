
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface VideoBoxProps {
  testName: string;
}

interface ExerciseVideo {
  id: string;
  test_name: string;
  video_url: string | null;
  Purpose: string | null;
  Procedure: string | null;
}

export const VideoBox = ({ testName }: VideoBoxProps) => {
  const [videoLink, setVideoLink] = useState<string | null>(null);
  const [purpose, setPurpose] = useState<string | null>(null);
  const [procedure, setProcedure] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchVideo() {
      setVideoLink(null);
      setPurpose(null);
      setProcedure(null);
      if (!testName) return;
      setIsLoading(true);

      const { data, error } = await supabase
        .from("exercise_videos")
        .select("video_url,Purpose,Procedure")
        .eq("test_name", testName)
        .maybeSingle();

      if (data) {
        setVideoLink(data.video_url || null);
        setPurpose(data.Purpose || null);
        setProcedure(data.Procedure || null);
      } else {
        setVideoLink(null);
        setPurpose(null);
        setProcedure(null);
      }
      setIsLoading(false);
    }

    fetchVideo();
  }, [testName]);

  // Helper: Converts YouTube link to embed URL
  function getYoutubeEmbed(url: string) {
    // Support normal, /watch, and /shorts links
    if (!url) return "";
    // Shorts: https://youtube.com/shorts/VIDEO_ID
    let match = url.match(/(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    // Watch: https://youtube.com/watch?v=VIDEO_ID
    match = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    // youtu.be/VIDEO_ID
    match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    // Default: try to return the original url (may still fail to embed)
    return url;
  }

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
          <div className="w-full">
            <div className="aspect-video mb-2">
              <iframe
                title="Test Instructional Video"
                className="w-full h-full rounded-lg"
                src={getYoutubeEmbed(videoLink)}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {/* Purpose & Procedure sections */}
            {purpose && (
              <div className="mb-2 w-full text-left">
                <span className="font-semibold text-gray-700">Purpose:</span>{" "}
                <span className="text-gray-700">{purpose}</span>
              </div>
            )}
            {procedure && (
              <div className="w-full text-left">
                <span className="font-semibold text-gray-700">Procedure:</span>{" "}
                <span className="text-gray-700">{procedure}</span>
              </div>
            )}
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
