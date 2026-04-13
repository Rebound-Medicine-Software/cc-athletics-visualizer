import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Save, X, Video, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ExerciseVideo {
  id: string;
  test_name: string;
  video_url: string | null;
  Purpose: string | null;
  Procedure: string | null;
  created_at: string;
  updated_at: string;
}

export const DemonstrationsTab = () => {
  const [videos, setVideos] = useState<ExerciseVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ExerciseVideo>>({});

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('exercise_videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error("Failed to load exercise videos");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (video: ExerciseVideo) => {
    setEditingId(video.id);
    setEditForm(video);
  };

  const getYouTubeId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1] || null;
  };

  const getVimeoId = (url: string): string | null => {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match?.[1] || null;
  };

  const renderVideoPreview = (url: string) => {
    const ytId = getYouTubeId(url);
    if (ytId) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block w-32 h-20 rounded overflow-hidden relative group">
          <img
            src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
            alt="Video preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Video className="w-6 h-6 text-white" />
          </div>
        </a>
      );
    }

    const vimeoId = getVimeoId(url);
    if (vimeoId) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block w-32 h-20 rounded overflow-hidden relative group">
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}?background=1&autoplay=1&loop=1&muted=1`}
            className="w-full h-full pointer-events-none"
            allow="autoplay"
            title="Video preview"
          />
        </a>
      );
    }

    if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block w-32 h-20 rounded overflow-hidden relative group">
          <video
            src={url}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Video className="w-6 h-6 text-white" />
          </div>
        </a>
      );
    }

    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
        <Video className="w-4 h-4" />
        View Video
      </a>
    );
  };

  const normalizeVideoInput = (input: string): string => {
    const trimmed = input.trim();

    const unwrapped = trimmed
      .replace(/^['"`]+|['"`]+$/g, "")
      .replace(/\"/g, '"')
      .replace(/\'/g, "'")
      .trim();

    const iframeMatch = unwrapped.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (iframeMatch?.[1]) {
      return iframeMatch[1].trim();
    }

    const urlMatch = unwrapped.match(/https?:\/\/[^\s"'<>]+/i);
    if (urlMatch?.[0]) {
      return urlMatch[0].trim();
    }

    return unwrapped;
  };

  const isEmbeddableVideoUrl = (url: string): boolean => {
    const normalizedUrl = normalizeVideoInput(url);
    if (!normalizedUrl) return true;
    if (/(?:youtube\.com\/(?:watch|shorts|embed)|youtu\.be\/)/i.test(normalizedUrl)) return true;
    if (/vimeo\.com\//i.test(normalizedUrl)) return true;
    if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(normalizedUrl)) return true;
    return false;
  };

  const handleSave = async () => {
    if (!editForm.test_name?.trim()) {
      toast.error("Test name is required");
      return;
    }

    const videoUrl = editForm.video_url ? normalizeVideoInput(editForm.video_url) : editForm.video_url;

    if (videoUrl && !isEmbeddableVideoUrl(videoUrl)) {
      toast.error("Please enter a valid embeddable video URL (YouTube, Vimeo, iframe embed code, or direct video file .mp4/.webm/.ogg/.mov)");
      return;
    }

    const cleanedForm = { ...editForm, video_url: videoUrl };

    try {
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('exercise_videos')
          .update({
            test_name: cleanedForm.test_name,
            video_url: cleanedForm.video_url,
            Purpose: cleanedForm.Purpose,
            Procedure: cleanedForm.Procedure,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success("Exercise video updated successfully");
      } else {
        // Add new
        const { error } = await supabase
          .from('exercise_videos')
          .insert({
            test_name: cleanedForm.test_name,
            video_url: cleanedForm.video_url,
            Purpose: cleanedForm.Purpose,
            Procedure: cleanedForm.Procedure
          });

        if (error) throw error;
        toast.success("Exercise video added successfully");
      }

      setEditingId(null);
      setIsAdding(false);
      setEditForm({});
      fetchVideos();
    } catch (error) {
      console.error('Error saving video:', error);
      toast.error("Failed to save exercise video");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this exercise video?")) return;

    try {
      const { error } = await supabase
        .from('exercise_videos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Exercise video deleted successfully");
      fetchVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error("Failed to delete exercise video");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setEditForm({});
  };

  if (loading) {
    return <div className="p-4">Loading exercise videos...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Video className="w-6 h-6" />
            Exercise Videos Management
          </CardTitle>
          <Button onClick={() => setIsAdding(true)} disabled={isAdding || !!editingId}>
            <Plus className="w-4 h-4 mr-2" />
            Add Video
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isAdding && (
            <Card className="p-4 border-2 border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="add-test-name">Test Name *</Label>
                  <Input
                    id="add-test-name"
                    value={editForm.test_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, test_name: e.target.value })}
                    placeholder="Enter test name"
                  />
                </div>
                <div>
                  <Label htmlFor="add-video-url">Video URL</Label>
                  <Input
                    id="add-video-url"
                    value={editForm.video_url || ''}
                    onChange={(e) => setEditForm({ ...editForm, video_url: e.target.value })}
                    placeholder="Enter video URL"
                  />
                </div>
                <div>
                  <Label htmlFor="add-purpose">Purpose</Label>
                  <Textarea
                    id="add-purpose"
                    value={editForm.Purpose || ''}
                    onChange={(e) => setEditForm({ ...editForm, Purpose: e.target.value })}
                    placeholder="Enter purpose"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="add-procedure">Procedure</Label>
                  <Textarea
                    id="add-procedure"
                    value={editForm.Procedure || ''}
                    onChange={(e) => setEditForm({ ...editForm, Procedure: e.target.value })}
                    placeholder="Enter procedure"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button onClick={handleCancel} variant="outline">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test Name</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Procedure</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.map((video) => (
                <TableRow key={video.id}>
                  {editingId === video.id ? (
                    <>
                      <TableCell>
                        <Input
                          value={editForm.test_name || ''}
                          onChange={(e) => setEditForm({ ...editForm, test_name: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.video_url || ''}
                          onChange={(e) => setEditForm({ ...editForm, video_url: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Textarea
                          value={editForm.Purpose || ''}
                          onChange={(e) => setEditForm({ ...editForm, Purpose: e.target.value })}
                          rows={2}
                        />
                      </TableCell>
                      <TableCell>
                        <Textarea
                          value={editForm.Procedure || ''}
                          onChange={(e) => setEditForm({ ...editForm, Procedure: e.target.value })}
                          rows={2}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button onClick={handleCancel} size="sm" variant="outline">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">{video.test_name}</TableCell>
                      <TableCell>
                        {video.video_url ? (
                          renderVideoPreview(video.video_url)
                        ) : (
                          <span className="text-muted-foreground">No URL</span>
                        )}
                      </TableCell>
                      <TableCell>{video.Purpose || <span className="text-gray-400">Not set</span>}</TableCell>
                      <TableCell>{video.Procedure || <span className="text-gray-400">Not set</span>}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleEdit(video)} 
                            size="sm" 
                            variant="outline"
                            disabled={isAdding || editingId !== null}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            onClick={() => handleDelete(video.id)} 
                            size="sm" 
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            disabled={isAdding || editingId !== null}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {videos.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No exercise videos found. Click "Add Video" to create one.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};