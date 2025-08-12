import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Save, X, Video } from "lucide-react";
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

  const handleSave = async () => {
    if (!editForm.test_name?.trim()) {
      toast.error("Test name is required");
      return;
    }

    try {
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('exercise_videos')
          .update({
            test_name: editForm.test_name,
            video_url: editForm.video_url,
            Purpose: editForm.Purpose,
            Procedure: editForm.Procedure,
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
            test_name: editForm.test_name,
            video_url: editForm.video_url,
            Purpose: editForm.Purpose,
            Procedure: editForm.Procedure
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
          <Button onClick={() => setIsAdding(true)} disabled={isAdding || editingId}>
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
                <TableHead>Video URL</TableHead>
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
                          <a 
                            href={video.video_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View Video
                          </a>
                        ) : (
                          <span className="text-gray-400">No URL</span>
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