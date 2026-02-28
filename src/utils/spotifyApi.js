// iTunes Search API Integration (No Authentication Required!)
// Reliable, supports CORS, and provides 30-second music previews

/**
 * Fetch with timeout
 * @param {string} url - URL to fetch
 * @param {number} timeout - Timeout in milliseconds (default 8000)
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, timeout = 8000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('Request timeout')
    }
    throw error
  }
}

/**
 * Search for a track on iTunes
 * @param {string} trackName - The name of the track
 * @param {string} artistName - The name of the artist
 * @returns {Promise<Object|null>} Track data
 */
async function searchTrack(trackName, artistName) {
  const query = `${trackName} ${artistName}`
  
  try {
    // iTunes Search API - reliable and supports CORS
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=5`
    console.log('🔍 Searching iTunes API for:', query)
    
    const response = await fetchWithTimeout(url)
    
    if (!response.ok) {
      throw new Error('iTunes search failed')
    }
    
    const data = await response.json()
    
    // Try to find best match - prioritize exact artist name match
    let bestTrack = null
    const artistLower = artistName.toLowerCase()
    const titleLower = trackName.toLowerCase()
    
    for (const track of data.results || []) {
      if (!track.previewUrl) continue
      
      const trackArtistLower = track.artistName.toLowerCase()
      const trackTitleLower = track.trackName.toLowerCase()
      
      // Exact or close match on both artist and title
      if (trackArtistLower.includes(artistLower) && trackTitleLower.includes(titleLower)) {
        bestTrack = track
        break
      }
      
      // If no exact match yet, keep first result with preview
      if (!bestTrack) {
        bestTrack = track
      }
    }
    
    if (bestTrack && bestTrack.previewUrl) {
      console.log('✅ iTunes found preview:', bestTrack.trackName, 'by', bestTrack.artistName)
      return {
        audioUrl: bestTrack.previewUrl,
        id: bestTrack.trackId,
        trackUrl: bestTrack.trackViewUrl,
        popularity: bestTrack.trackPrice || 0
      }
    }
    
    console.warn('⚠️ No preview found on iTunes for', query)
    return null
  } catch (error) {
    console.error('❌ iTunes search error:', error)
    return null
  }
}

/**
 * Enrich a song object with iTunes preview data
 * @param {Object} song - Base song object with title and artist
 * @returns {Promise<Object>} Enriched song object
 */
export async function enrichSongWithSpotify(song) {
  try {
    const trackData = await searchTrack(song.title, song.artist)
    
    if (!trackData || !trackData.audioUrl) {
      console.warn(`⚠️ No preview found for ${song.title} by ${song.artist}`)
      return song
    }
    
    return {
      ...song,
      audioUrl: trackData.audioUrl,
      id: trackData.id,
      trackUrl: trackData.trackUrl,
      popularity: trackData.popularity
    }
  } catch (error) {
    console.error(`❌ Error enriching song ${song.title}:`, error)
    // Always return the base song object so the game can continue
    return song
  }
}
