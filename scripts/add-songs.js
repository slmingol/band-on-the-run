import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration
const configPath = path.join(__dirname, '..', 'config', 'song-library-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Load existing songs from writable directory
const songsPath = path.join(__dirname, '..', 'server', 'data', 'top-songs.json');
const existingSongs = JSON.parse(fs.readFileSync(songsPath, 'utf8'));

console.log(`📚 Current library: ${existingSongs.length} songs`);
console.log(`🎯 Target: ${config.targetSongCount} songs`);
console.log(`📦 Batch size: ${config.batchSize} songs`);

// Calculate how many songs to add
const songsToAdd = Math.min(
  config.batchSize,
  config.targetSongCount - existingSongs.length
);

if (songsToAdd <= 0) {
  console.log(`✅ Already at or above target! Current: ${existingSongs.length}, Target: ${config.targetSongCount}`);
  process.exit(0);
}

console.log(`➕ Adding ${songsToAdd} new songs...`);

// Build set of existing songs for duplicate checking
const existingKeys = new Set(
  existingSongs.map(s => `${s.title.toLowerCase()}|||${s.artist.toLowerCase()}`)
);

// Keep fetching candidates until we have enough unique songs
const newSongs = [];
let searchOffset = existingSongs.length;
const batchSize = 500; // Fetch in batches

while (newSongs.length < songsToAdd) {
  const candidateBatch = generateNextBatch(searchOffset, batchSize);
  
  if (candidateBatch.length === 0) {
    console.log(`⚠️  Reached end of song database. Only ${newSongs.length} unique songs available.`);
    break;
  }
  
  // Filter duplicates from this batch
  const uniqueFromBatch = candidateBatch.filter(s => {
    const key = `${s.title.toLowerCase()}|||${s.artist.toLowerCase()}`;
    if (existingKeys.has(key)) return false;
    existingKeys.add(key); // Add to set so we don't add it again
    return true;
  });
  
  newSongs.push(...uniqueFromBatch);
  searchOffset += batchSize;
  
  // Stop if we have enough
  if (newSongs.length >= songsToAdd) {
    break;
  }
}

// Trim to exact count requested
const finalSongs = newSongs.slice(0, songsToAdd);

if (finalSongs.length < songsToAdd) {
  console.log(`⚠️  Only found ${finalSongs.length} unique songs (${songsToAdd - finalSongs.length} short of target)`);
}

// Append new songs to existing library
const updatedLibrary = [...existingSongs, ...finalSongs];

// Write updated library
fs.writeFileSync(songsPath, JSON.stringify(updatedLibrary, null, 2));

// Also copy to public directory for frontend access
const publicSongsPath = path.join(__dirname, '..', 'public', 'top-songs.json');
fs.writeFileSync(publicSongsPath, JSON.stringify(updatedLibrary, null, 2));

// Update config
config.currentSongCount = updatedLibrary.length;
config.lastUpdated = new Date().toISOString().split('T')[0];
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

// Also update the public copy for browser access
const publicConfigPath = path.join(__dirname, '..', 'public', 'config', 'song-library-config.json');
fs.mkdirSync(path.dirname(publicConfigPath), { recursive: true });
fs.writeFileSync(publicConfigPath, JSON.stringify(config, null, 2));

console.log(`✅ Added ${finalSongs.length} songs`);
console.log(`📊 Total library size: ${updatedLibrary.length} songs`);
console.log(`📊 Total library size: ${updatedLibrary.length} songs`);
console.log(`🎯 Progress: ${Math.round((updatedLibrary.length / config.targetSongCount) * 100)}%`);

function generateNextBatch(startIndex, count) {
  // Comprehensive song database organized by genre and era
  // This allows us to add songs incrementally while maintaining diversity
  const allSongs = [
    // Classic Rock - Beatles & British Invasion (493-520)
    { "title": "Twist and Shout", "artist": "The Beatles" },
    { "title": "Help!", "artist": "The Beatles" },
    { "title": "Ticket to Ride", "artist": "The Beatles" },
    { "title": "I Saw Her Standing There", "artist": "The Beatles" },
    { "title": "Get Back", "artist": "The Beatles" },
    { "title": "Revolution", "artist": "The Beatles" },
    { "title": "She Loves You", "artist": "The Beatles" },
    { "title": "I Want to Hold Your Hand", "artist": "The Beatles" },
    { "title": "Can't Buy Me Love", "artist": "The Beatles" },
    { "title": "Eleanor Rigby", "artist": "The Beatles" },
    { "title": "Penny Lane", "artist": "The Beatles" },
    { "title": "All You Need Is Love", "artist": "The Beatles" },
    { "title": "Back in the U.S.S.R.", "artist": "The Beatles" },
    { "title": "Something", "artist": "The Beatles" },
    { "title": "Ob-La-Di, Ob-La-Da", "artist": "The Beatles" },
    { "title": "Eight Days a Week", "artist": "The Beatles" },
    { "title": "Hard Day's Night", "artist": "The Beatles" },
    { "title": "Sgt. Pepper's Lonely Hearts Club Band", "artist": "The Beatles" },
    { "title": "With a Little Help from My Friends", "artist": "The Beatles" },
    { "title": "Across the Universe", "artist": "The Beatles" },
    { "title": "The Long and Winding Road", "artist": "The Beatles" },
    { "title": "Blackbird", "artist": "The Beatles" },
    { "title": "Maxwell's Silver Hammer", "artist": "The Beatles" },
    { "title": "You Can't Always Get What You Want", "artist": "The Rolling Stones" },
    { "title": "Brown Sugar", "artist": "The Rolling Stones" },
    { "title": "Beast of Burden", "artist": "The Rolling Stones" },
    { "title": "Miss You", "artist": "The Rolling Stones" },
    { "title": "Wild Horses", "artist": "The Rolling Stones" },

    // Classic Rock - Led Zeppelin & Deep Cuts (521-550)
    { "title": "Ramble On", "artist": "Led Zeppelin" },
    { "title": "Going to California", "artist": "Led Zeppelin" },
    { "title": "Bron-Y-Aur Stomp", "artist": "Led Zeppelin" },
    { "title": "Over the Hills and Far Away", "artist": "Led Zeppelin" },
    { "title": "The Song Remains the Same", "artist": "Led Zeppelin" },
    { "title": "No Quarter", "artist": "Led Zeppelin" },
    { "title": "D'yer Mak'er", "artist": "Led Zeppelin" },
    { "title": "Trampled Under Foot", "artist": "Led Zeppelin" },
    { "title": "When the Levee Breaks", "artist": "Led Zeppelin" },
    { "title": "Dazed and Confused", "artist": "Led Zeppelin" },
    { "title": "Since I've Been Loving You", "artist": "Led Zeppelin" },
    { "title": "The Ocean", "artist": "Led Zeppelin" },
    { "title": "Houses of the Holy", "artist": "Led Zeppelin" },
    { "title": "Black Country Woman", "artist": "Led Zeppelin" },
    { "title": "In My Time of Dying", "artist": "Led Zeppelin" },
    { "title": "Ten Years Gone", "artist": "Led Zeppelin" },
    { "title": "Achilles Last Stand", "artist": "Led Zeppelin" },
    { "title": "Nobody's Fault but Mine", "artist": "Led Zeppelin" },
    { "title": "In the Evening", "artist": "Led Zeppelin" },
    { "title": "All My Love", "artist": "Led Zeppelin" },
    { "title": "Highway Star", "artist": "Deep Purple" },
    { "title": "Child in Time", "artist": "Deep Purple" },
    { "title": "Lazy", "artist": "Deep Purple" },
    { "title": "Space Truckin'", "artist": "Deep Purple" },
    { "title": "Perfect Strangers", "artist": "Deep Purple" },
    { "title": "Hush", "artist": "Deep Purple" },
    { "title": "Woman from Tokyo", "artist": "Deep Purple" },
    { "title": "Burn", "artist": "Deep Purple" },
    { "title": "Stormbringer", "artist": "Deep Purple" },
    { "title": "Into the Fire", "artist": "Deep Purple" },

    // Progressive Rock (551-580)
    { "title": "Roundabout", "artist": "Yes" },
    { "title": "Owner of a Lonely Heart", "artist": "Yes" },
    { "title": "Close to the Edge", "artist": "Yes" },
    { "title": "Starship Trooper", "artist": "Yes" },
    { "title": "I've Seen All Good People", "artist": "Yes" },
    { "title": "Heart of the Sunrise", "artist": "Yes" },
    { "title": "Karn Evil 9", "artist": "Emerson, Lake & Palmer" },
    { "title": "Lucky Man", "artist": "Emerson, Lake & Palmer" },
    { "title": "Still... You Turn Me On", "artist": "Emerson, Lake & Palmer" },
    { "title": "From the Beginning", "artist": "Emerson, Lake & Palmer" },
    { "title": "In the Court of the Crimson King", "artist": "King Crimson" },
    { "title": "21st Century Schizoid Man", "artist": "King Crimson" },
    { "title": "Epitaph", "artist": "King Crimson" },
    { "title": "Starless", "artist": "King Crimson" },
    { "title": "Supper's Ready", "artist": "Genesis" },
    { "title": "I Know What I Like", "artist": "Genesis" },
    { "title": "The Lamb Lies Down on Broadway", "artist": "Genesis" },
    { "title": "Firth of Fifth", "artist": "Genesis" },
    { "title": "Dancing with the Moonlit Knight", "artist": "Genesis" },
    { "title": "Follow You Follow Me", "artist": "Genesis" },
    { "title": "Turn It On Again", "artist": "Genesis" },
    { "title": "Invisible Touch", "artist": "Genesis" },
    { "title": "Land of Confusion", "artist": "Genesis" },
    { "title": "I Can't Dance", "artist": "Genesis" },
    { "title": "In the Air Tonight", "artist": "Phil Collins" },
    { "title": "Against All Odds", "artist": "Phil Collins" },
    { "title": "One More Night", "artist": "Phil Collins" },
    { "title": "Sussudio", "artist": "Phil Collins" },
    { "title": "Easy Lover", "artist": "Phil Collins & Philip Bailey" },
    { "title": "Another Day in Paradise", "artist": "Phil Collins" },

    // 70s Soul & Funk (581-610)
    { "title": "Le Freak", "artist": "Chic" },
    { "title": "Good Times", "artist": "Chic" },
    { "title": "I Want Your Love", "artist": "Chic" },
    { "title": "Everybody Dance", "artist": "Chic" },
    { "title": "Play That Funky Music", "artist": "Wild Cherry" },
    { "title": "Brick House", "artist": "Commodores" },
    { "title": "Easy", "artist": "Commodores" },
    { "title": "Three Times a Lady", "artist": "Commodores" },
    { "title": "Nightshift", "artist": "Commodores" },
    { "title": "Machine Gun", "artist": "Commodores" },
    { "title": "Give It to Me Baby", "artist": "Rick James" },
    { "title": "Super Freak", "artist": "Rick James" },
    { "title": "Mary Jane", "artist": "Rick James" },
    { "title": "Fire and Desire", "artist": "Rick James" },
    { "title": "Flash Light", "artist": "Parliament" },
    { "title": "Give Up the Funk (Tear the Roof off the Sucker)", "artist": "Parliament" },
    { "title": "Atomic Dog", "artist": "George Clinton" },
    { "title": "One Nation Under a Groove", "artist": "Funkadelic" },
    { "title": "Maggot Brain", "artist": "Funkadelic" },
    { "title": "Cosmic Slop", "artist": "Funkadelic" },
    { "title": "Shining Star", "artist": "Earth, Wind & Fire" },
    { "title": "Let's Groove", "artist": "Earth, Wind & Fire" },
    { "title": "Boogie Wonderland", "artist": "Earth, Wind & Fire" },
    { "title": "Fantasy", "artist": "Earth, Wind & Fire" },
    { "title": "After the Love Has Gone", "artist": "Earth, Wind & Fire" },
    { "title": "Reasons", "artist": "Earth, Wind & Fire" },
    { "title": "Getaway", "artist": "Earth, Wind & Fire" },
    { "title": "Sing a Song", "artist": "Earth, Wind & Fire" },
    { "title": "That's the Way (I Like It)", "artist": "KC and the Sunshine Band" },
    { "title": "Get Down Tonight", "artist": "KC and the Sunshine Band" },

    // Motown Classics (611-640)
    { "title": "My Girl", "artist": "The Temptations" },
    { "title": "Ain't Too Proud to Beg", "artist": "The Temptations" },
    { "title": "Papa Was a Rollin' Stone", "artist": "The Temptations" },
    { "title": "Just My Imagination", "artist": "The Temptations" },
    { "title": "I Can't Help Myself", "artist": "Four Tops" },
    { "title": "Reach Out I'll Be There", "artist": "Four Tops" },
    { "title": "Bernadette", "artist": "Four Tops" },
    { "title": "It's the Same Old Song", "artist": "Four Tops" },
    { "title": "Superstition", "artist": "Stevie Wonder" },
    { "title": "Sir Duke", "artist": "Stevie Wonder" },
    { "title": "Isn't She Lovely", "artist": "Stevie Wonder" },
    { "title": "I Wish", "artist": "Stevie Wonder" },
    { "title": "You Are the Sunshine of My Life", "artist": "Stevie Wonder" },
    { "title": "Higher Ground", "artist": "Stevie Wonder" },
    { "title": "Living for the City", "artist": "Stevie Wonder" },
    { "title": "Signed, Sealed, Delivered I'm Yours", "artist": "Stevie Wonder" },
    { "title": "For Once in My Life", "artist": "Stevie Wonder" },
    { "title": "Part-Time Lover", "artist": "Stevie Wonder" },
    { "title": "I Just Called to Say I Love You", "artist": "Stevie Wonder" },
    { "title": "Master Blaster (Jammin')", "artist": "Stevie Wonder" },
    { "title": "Uptight (Everything's Alright)", "artist": "Stevie Wonder" },
    { "title": "I Heard It Through the Grapevine", "artist": "Marvin Gaye" },
    { "title": "Let's Get It On", "artist": "Marvin Gaye" },
    { "title": "Sexual Healing", "artist": "Marvin Gaye" },
    { "title": "Ain't No Mountain High Enough", "artist": "Marvin Gaye & Tammi Terrell" },
    { "title": "Inner City Blues", "artist": "Marvin Gaye" },
    { "title": "Mercy Mercy Me", "artist": "Marvin Gaye" },
    { "title": "Got to Give It Up", "artist": "Marvin Gaye" },
    { "title": "Ain't That Peculiar", "artist": "Marvin Gaye" },
    { "title": "How Sweet It Is", "artist": "Marvin Gaye" },

    // 80s New Wave & Synth Pop (641-670)
    { "title": "Don't You (Forget About Me)", "artist": "Simple Minds" },
    { "title": "Alive and Kicking", "artist": "Simple Minds" },
    { "title": "Sanctify Yourself", "artist": "Simple Minds" },
    { "title": "Come On Eileen", "artist": "Dexys Midnight Runners" },
    { "title": "Rio", "artist": "Duran Duran" },
    { "title": "Hungry Like the Wolf", "artist": "Duran Duran" },
    { "title": "The Reflex", "artist": "Duran Duran" },
    { "title": "Girls on Film", "artist": "Duran Duran" },
    { "title": "Ordinary World", "artist": "Duran Duran" },
    { "title": "Save a Prayer", "artist": "Duran Duran" },
    { "title": "Is There Something I Should Know?", "artist": "Duran Duran" },
    { "title": "A View to a Kill", "artist": "Duran Duran" },
    { "title": "Notorious", "artist": "Duran Duran" },
    { "title": "New Moon on Monday", "artist": "Duran Duran" },
    { "title": "True", "artist": "Spandau Ballet" },
    { "title": "Gold", "artist": "Spandau Ballet" },
    { "title": "Through the Barricades", "artist": "Spandau Ballet" },
    { "title": "Burning Down the House", "artist": "Talking Heads" },
    { "title": "Once in a Lifetime", "artist": "Talking Heads" },
    { "title": "Psycho Killer", "artist": "Talking Heads" },
    { "title": "Road to Nowhere", "artist": "Talking Heads" },
    { "title": "And She Was", "artist": "Talking Heads" },
    { "title": "This Must Be the Place", "artist": "Talking Heads" },
    { "title": "Just Like Heaven", "artist": "The Cure" },
    { "title": "Friday I'm in Love", "artist": "The Cure" },
    { "title": "Lovesong", "artist": "The Cure" },
    { "title": "Pictures of You", "artist": "The Cure" },
    { "title": "Boys Don't Cry", "artist": "The Cure" },
    { "title": "Close to Me", "artist": "The Cure" },
    { "title": "In Between Days", "artist": "The Cure" },

    // More 80s Rock (671-700)
    { "title": "Welcome to the Jungle", "artist": "Guns N' Roses" },
    { "title": "Patience", "artist": "Guns N' Roses" },
    { "title": "Don't Cry", "artist": "Guns N' Roses" },
    { "title": "Knockin' on Heaven's Door", "artist": "Guns N' Roses" },
    { "title": "Civil War", "artist": "Guns N' Roses" },
    { "title": "Estranged", "artist": "Guns N' Roses" },
    { "title": "Mr. Brownstone", "artist": "Guns N' Roses" },
    { "title": "Nightrain", "artist": "Guns N' Roses" },
    { "title": "Rocket Queen", "artist": "Guns N' Roses" },
    { "title": "You Could Be Mine", "artist": "Guns N' Roses" },
    { "title": "Master of Puppets", "artist": "Metallica" },
    { "title": "Fade to Black", "artist": "Metallica" },
    { "title": "For Whom the Bell Tolls", "artist": "Metallica" },
    { "title": "Seek & Destroy", "artist": "Metallica" },
    { "title": "Creeping Death", "artist": "Metallica" },
    { "title": "Battery", "artist": "Metallica" },
    { "title": "Welcome Home (Sanitarium)", "artist": "Metallica" },
    { "title": "The Unforgiven", "artist": "Metallica" },
    { "title": "Wherever I May Roam", "artist": "Metallica" },
    { "title": "Sad but True", "artist": "Metallica" },
    { "title": "Harvester of Sorrow", "artist": "Metallica" },
    { "title": "...And Justice for All", "artist": "Metallica" },
    { "title": "Blackened", "artist": "Metallica" },
    { "title": "The Memory Remains", "artist": "Metallica" },
    { "title": "Fuel", "artist": "Metallica" },
    { "title": "Turn the Page", "artist": "Metallica" },
    { "title": "Whiskey in the Jar", "artist": "Metallica" },
    { "title": "St. Anger", "artist": "Metallica" },
    { "title": "Some Kind of Monster", "artist": "Metallica" },
    { "title": "The Day That Never Comes", "artist": "Metallica" },

    // Add more genres and eras to reach 5000 total...
    // This structure allows continuing indefinitely
  ];

  // Return only the songs we need for this batch, starting from the appropriate index
  return allSongs.slice(startIndex, startIndex + count);
}
