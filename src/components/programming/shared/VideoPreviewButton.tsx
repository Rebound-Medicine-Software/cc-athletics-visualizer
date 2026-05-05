import { useState } from 'react';
import { Play, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Convert a YouTube/Vimeo URL into an embeddable URL.
 * Falls back to the original URL if no transformation is known.
 */
export const toEmbedUrl = (raw: string): string | null => {
  if (!raw) return null;
  const url = raw.trim();
  // youtu.be/<id>
  const short = url.match(/youtu\.be\/([\w-]{6,})/);
  if (short) return `https://www.youtube.com/embed/${short[1]}`;
  // youtube.com/watch?v=<id>
  const watch = url.match(/[?&]v=([\w-]{6,})/);
  if (watch) return `https://www.youtube.com/embed/${watch[1]}`;
  // youtube.com/embed/<id>
  if (/youtube\.com\/embed\//.test(url)) return url;
  // youtube shorts
  const shorts = url.match(/youtube\.com\/shorts\/([\w-]{6,})/);
  if (shorts) return `https://www.youtube.com/embed/${shorts[1]}`;
  // vimeo
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
};

interface Props {
  url: string | null | undefined;
  label?: string;
  size?: 'sm' | 'icon';
}

export const VideoPreviewButton = ({ url, label = 'Video', size = 'sm' }: Props) => {
  const [open, setOpen] = useState(false);
  if (!url) return null;
  const embed = toEmbedUrl(url);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={size === 'icon' ? 'icon' : 'sm'}
        className={size === 'icon' ? 'h-7 w-7' : 'h-8 px-2'}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="Preview video"
      >
        <Play className="h-3.5 w-3.5 mr-1" />
        {size !== 'icon' && label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Exercise video</DialogTitle>
          </DialogHeader>
          {embed ? (
            <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
              <iframe
                src={embed}
                title="Exercise video"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="rounded-md border p-6 text-sm text-muted-foreground text-center">
              Preview not available for this URL.
            </div>
          )}
          <div className="flex justify-end">
            <Button asChild variant="outline" size="sm">
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open video
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
