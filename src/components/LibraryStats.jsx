import { useState, useEffect } from 'react';
import './LibraryStats.css';

const STEM_SERVER_URL = ''; // Use relative URLs for API calls
const POLL_INTERVAL = 5000; // Poll every 5 seconds to stay in sync with StemStatus

function LibraryStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Initial fetch
    fetchStats();

    // Set up polling
    const interval = setInterval(fetchStats, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${STEM_SERVER_URL}/api/stems/status`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      // Server not available, don't show anything
      setStats(null);
    }
  };

  if (!stats) return null;

  const coverage = Math.round((stats.processed / stats.total) * 100);

  return (
    <div className="library-stats-widget">
      <div className="library-stats-content">
        <div className="library-icon">📚</div>
        <div className="library-data">
          <div className="library-total">
            {stats.total} <span className="library-label">songs</span>
          </div>
          <div className="library-breakdown">
            <span className="stat-item stems">{stats.processed} stems</span>
            <span className="stat-divider">•</span>
            <span className="stat-item coverage">{coverage}%</span>
            {stats.storage && (
              <>
                <span className="stat-divider">•</span>
                <span className="stat-item storage">{stats.storage.totalFormatted}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LibraryStats;
