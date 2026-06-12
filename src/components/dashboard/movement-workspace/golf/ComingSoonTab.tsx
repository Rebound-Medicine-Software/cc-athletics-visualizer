import { Card } from '@/components/ui/card';
import { Lock } from 'lucide-react';

export function ComingSoonTab({ title, description }: { title: string; description: string }) {
  return (
    <Card className="p-12 bg-slate-950 border-slate-800 text-center text-slate-300">
      <Lock className="mx-auto h-8 w-8 text-slate-500 mb-3" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">{description}</p>
    </Card>
  );
}
