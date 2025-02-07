import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../../../store/gameStore';
import { supabase } from '../../../../lib/supabase';

interface LeaderboardEntry {
  resources: number;
  user_id: string;
  username: string;
}

interface LeaderboardViewProps {
  onBack: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ onBack }) => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useGameStore();

  useEffect(() => {
    let mounted = true;
    let channel: any;

    const fetchLeaders = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data, error: fetchError } = await supabase
          .from('user_progress')
          .select('resources, user_id, username')
          .order('resources', { ascending: false });

        if (fetchError) throw fetchError;

        if (mounted) {
          setLeaders(data || []);
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        if (mounted) {
          setError('Failed to load leaderboard');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Initial fetch
    fetchLeaders();

    // Subscribe to changes
    channel = supabase
      .channel('all-time-leaders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_progress'
        },
        () => {
          if (mounted) {
            fetchLeaders();
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, []);

  return (
    <div className="px-4 pb-16 leaderboard-view-content">
      <div className="relative">
        {/* Top fade */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-[#1E1E1E] to-transparent pointer-events-none z-10" />
        
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[#1E1E1E] to-transparent pointer-events-none z-10" />
        
        {/* Scrollable content */}
        <div className="flex flex-col w-full max-h-[280px] overflow-y-auto">
          <div className="flex flex-col w-full min-h-full pt-4 pb-4">
            {isLoading ? (
              <div className="bg-white/[0.03] rounded-[16px] p-4 text-gray-400 text-center">
                Loading leaderboard...
              </div>
            ) : error ? (
              <div className="bg-white/[0.03] rounded-[16px] p-4 text-red-400 text-center">
                {error}
              </div>
            ) : leaders.length > 0 ? (
              leaders.map((leader, index, array) => (
                <button
                  key={leader.user_id}
                  className={`
                    flex justify-between items-center w-full
                    bg-white/[0.03] hover:bg-white/[0.05] active:bg-white/[0.06]
                    transition-all duration-200 ease-in-out p-3
                    ${index === 0 ? 'rounded-t-[16px]' : ''}
                    ${index === array.length - 1 ? 'rounded-b-[16px]' : ''}
                    ${index !== array.length - 1 ? 'mb-[2px]' : ''}
                    ${leader.user_id === user?.id ? 'bg-blue-500/20' : ''}
                    group
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-amber-300 font-bold w-6 text-sm">{index + 1}.</div>
                    <div className="font-semibold tracking-normal text-white text-sm truncate transition-transform duration-200 ease-in-out group-hover:translate-x-2">
                      {leader.username || `Player ${index + 1}`}
                    </div>
                  </div>
                  <div className="text-amber-300 font-semibold text-sm whitespace-nowrap">
                    {leader.resources} 💰
                  </div>
                </button>
              ))
            ) : (
              <div className="bg-white/[0.03] rounded-[16px] p-4 text-gray-400 text-center">
                No scores yet
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={onBack}
        className="w-full bg-white/[0.03] hover:bg-white/[0.05] active:bg-white/[0.06] transition-colors rounded-2xl py-4 text-white font-semibold mt-6"
      >
        Back
      </button>
    </div>
  );
};