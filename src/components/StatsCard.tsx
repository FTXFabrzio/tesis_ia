import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: number;
  goal: number;
  icon: LucideIcon;
  color: string;
}

export function StatsCard({ title, value, goal, icon: Icon, color }: StatsCardProps) {
  const percentage = Math.min(Math.round((value / goal) * 100), 100);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors shadow-lg">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-2 rounded-lg", color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-2xl font-bold text-white">{value} / {goal}</span>
      </div>
      <div>
        <p className="text-slate-400 text-sm font-medium mb-2">{title}</p>
        <div className="w-full bg-slate-800 rounded-full h-2">
          <div 
            className={cn("h-full rounded-full transition-all duration-500", color.replace('bg-', 'bg-'))}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-right text-xs text-slate-500 mt-1">{percentage}% Completado</p>
      </div>
    </div>
  );
}
