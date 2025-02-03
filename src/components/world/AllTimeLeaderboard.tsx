import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface LeaderboardEntry {
  resources: number;
  user_id: string;
}

export const AllTimeLeaderboard: React.FC = () => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const fetchLeaders = async () => {
      const { data, error } = await supabase
        .from('user_progress')
        .select('resources, user_id')
        .order('resources', { ascending: false });

      if (error) {
        console.error('Error fetching leaderboard:', error);
        return;
      }

      setLeaders(data || []);
    };

    // Initial fetch
    fetchLeaders();

    // Subscribe to changes
    const channel = supabase
      .channel('all-time-leaders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_progress'
        },
        () => {
          fetchLeaders();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <div className="fixed top-4 left-4 z-10 bg-gray-800/90 p-4 rounded-lg backdrop-blur-sm shadow-lg">
      <h3 className="text-white font-bold mb-2 text-sm">All-Time Leaders</h3>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {leaders.map((leader, index) => (
          <div 
            key={leader.user_id}
            className="flex items-center gap-2 text-sm"
          >
            <span className="text-yellow-400 w-4">{index + 1}.</span>
            <span className="text-white">Player {index + 1}</span>
            <span className="text-yellow-400">💰 {leader.resources}</span>
          </div>
        ))}
        {leaders.length === 0 && (
          <div className="text-gray-400 text-sm">No scores yet</div>
        )}
      </div>
    </div>
  );
};