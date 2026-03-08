import { useState, useEffect } from 'react';
import './StemStatus.css';

const STEM_SERVER_URL = ''; // Use relative URLs for API calls
const POLL_INTERVAL = 5000; // Poll every 5 seconds

function StemStatus({ effectiveTheme = 'dark' }) {
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

  const isDark = effectiveTheme === 'dark';
  const backgroundColor = isDark ? '#1e3a5f' : '#e3f2fd';
  const borderColor = isDark ? '#2196f3' : '#90caf9';
  const textColor = isDark ? '#ffffff' : '#000000';
  const labelColor = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
  const primaryColor = isDark ? '#90caf9' : '#1565c0';
  const tooltipBg = isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)';
  const tooltipBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  return (
    <div 
      className={`stem-status-widget ${isProcessing ? 'processing' : ''}`}
      style={{
        background: backgroundColor,
        borderColor: borderColor,
        color: textColor,
        '--tooltip-bg': tooltipBg,
        '--tooltip-border': tooltipBorder
      }}
    >
      <div className="stem-status-content">
        <div className="stem-icon">{isProcessing ? '⚙️' : '🎸'}</div>
        <div className="stem-stats">
          <div className="stem-count" style={{ color: textColor }}>
            <strong style={{ color: primaryColor }}>{status.processed}</strong> / {status.total}
          </div>
          <div className="stem-label" style={{ color: labelColor }}>
            {isProcessing ? 'processing...' : 'stems ready'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StemStatus;
