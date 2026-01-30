"use client";

export interface StatItem {
  label: string;
  value: string;
  color?: 'green' | 'red' | 'neutral';
}

interface StatsBlockProps {
  stats: StatItem[];
}

export default function StatsBlock({ stats }: StatsBlockProps) {
  const getColorClass = (color?: 'green' | 'red' | 'neutral') => {
    switch (color) {
      case 'green':
        return 'text-green-600 dark:text-green-400';
      case 'red':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-zinc-900 dark:text-zinc-50';
    }
  };

  // Determine grid columns based on number of stats
  const getGridClass = () => {
    switch (stats.length) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 sm:grid-cols-2';
      case 3:
        return 'grid-cols-1 sm:grid-cols-3';
      case 4:
      default:
        return 'grid-cols-1 sm:grid-cols-4';
    }
  };

  return (
    <div className={`grid gap-4 ${getGridClass()}`}>
      {stats.map((stat, index) => (
        <div
          key={index}
          className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {stat.label}
          </p>
          <p className={`text-2xl font-bold ${getColorClass(stat.color)}`}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
