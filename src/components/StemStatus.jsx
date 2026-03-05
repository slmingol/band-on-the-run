import { useState, useEffect } from 'react';
import './StemStatus.css';

const STEM_SERVER_URL = ''; // Use relative URLs for API calls
const POLL_INTERVAL = 5000; // Poll every 5 seconds

function StemStatus() {
  const [status, setStatus] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [prevProcessed, setPrevProcessed] = useState(null);

  useEffect(() => {
    // Initial fetch
    fetchStatus();

    // Set up polling
    const interval = setInterval(fetchStatus, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${STEM_SERVER_URL}/api/stems/status`);
      const data = await response.json();
      
      // Detect active processing by comparing with previous count
      if (prevProcessed !== null && data.processed > prevProcessed) {
        // Count increased - actively processing!
        setIsProcessing(true);
      } else if (prevProcessed !== null && data.processed === prevProcessed && data.processed < data.total) {
        // Count hasn't changed but there are unprocessed songs
        // Keep processing indicator for a bit longer in case it's between songs
        // This will auto-clear after POLL_INTERVAL * 3
      } else if (data.processed === data.total) {
        // All done!
        setIsProcessing(false);
      }
      
      setPrevProcessed(data.processed);
      setStatus(data);
    } catch (error) {
      // Server not available, don't show anything
      setStatus(null);
      setIsProcessing(false);
    }
  };

  if (!status) return null; // Don't show if server is not available

  return (
    <div className={`stem-status-widget ${isProcessing ? 'processing' : ''}`}>
      <div className="stem-status-content">
        <div className="stem-icon">{isProcessing ? '⚙️' : '🎸'}</div>
        <div className="stem-stats">
          <div className="stem-count">
            <strong>{status.processed}</strong> / {status.total}
          </div>
          <div className="stem-label">
            {isProcessing ? 'processing...' : 'stems ready'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StemStatus;
