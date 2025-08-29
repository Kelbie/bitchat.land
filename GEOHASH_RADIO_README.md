# 🌍 Geohash Radio Station Finder

A React application that finds radio stations within geohash regions using the Radio Browser API. Enter a geohash, discover countries in that region, and find the closest music-focused radio stations with distance calculations.

## ✨ Features

- **Geohash Input**: Enter any valid geohash to explore radio stations in that region
- **Country Detection**: Automatically detects countries within the geohash boundaries using coordinate-based intersection
- **Radio Station Discovery**: Fetches radio stations from detected countries using Radio Browser API
- **Music Filtering**: Intelligently filters for music-focused stations
- **Distance Calculation**: Shows stations sorted by distance from geohash center
- **Audio Player**: Built-in audio player with play/stop controls and volume adjustment
- **Debug Information**: Detailed geohash analysis and station statistics

## 🚀 Quick Start

1. **Navigate to the Radio Finder**: In the GeoRelayTest component, click the "🌍 Geohash Radio Finder" tab
2. **Enter a Geohash**: Type a valid geohash (e.g., `dr5r`, `gbsuv`, `u000`)
3. **Discover Stations**: The app will find countries and fetch nearby radio stations
4. **Play Music**: Click "Play" on any station to start streaming

## 📍 Example Geohashes

| Geohash | Region | Description |
|----------|--------|-------------|
| `9` | North America | Large North American region |
| `dr5r` | New York City | NYC metropolitan area |
| `gbsuv` | London, UK | London and surrounding areas |
| `u000` | France | France region |
| `wecz` | San Francisco | San Francisco Bay Area |

## 🏗️ Architecture

### Core Services

- **GeohashService**: Converts geohash strings to coordinates and bounding boxes
- **CountryService**: Detects countries within geohash regions using coordinate-based intersection
- **RadioService**: Integrates with Radio Browser API to fetch stations

### Components

- **GeohashInput**: Input field with geohash validation
- **StationList**: Displays radio stations with play controls
- **DebugInfo**: Shows geohash details and statistics
- **RadioHeader**: Header with player controls and geohash info

### Hooks

- **useAudioPlayer**: Manages audio playback state and controls

## 🔧 Technology Stack

- **React 18** with TypeScript
- **Radio Browser API** for station data
- **Coordinate-based country detection** (browser-compatible)
- **Tailwind CSS** for styling
- **Vite** for build tooling

## 📊 How It Works

1. **Geohash Decoding**: Converts geohash to latitude/longitude coordinates and bounding box
2. **Country Detection**: Uses coordinate-based intersection to detect countries within geohash boundaries
3. **Station Fetching**: Queries Radio Browser API for stations in detected countries
4. **Music Filtering**: Analyzes station tags and names to identify music-focused stations
5. **Distance Sorting**: Calculates distances from geohash center and sorts stations accordingly
6. **Audio Playback**: Provides integrated audio player for streaming stations

## 🎵 Music Station Detection

The app uses intelligent filtering to identify music stations:

**Music Indicators:**
- Rock, pop, jazz, classical, electronic, dance, hip-hop, country, folk, reggae, blues, metal, punk, indie, alternative, R&B, soul, funk, house, techno, ambient, world music

**Non-Music Indicators:**
- Talk, news, sports, comedy, podcast, religion, education, politics, business, weather

## 🚨 Error Handling

- **Invalid Geohash**: Shows validation error for malformed input
- **Network Failures**: Gracefully handles API failures with user-friendly messages
- **Audio Errors**: Displays playback errors and allows retry
- **Empty Results**: Shows appropriate messages when no stations are found

## 🔮 Future Enhancements

- **Map Visualization**: Show geohash region and station locations on an interactive map
- **Genre Filtering**: Filter by specific music genres
- **Favorites System**: Save and manage favorite stations
- **Playback History**: Track recently played stations
- **Share Functionality**: Generate shareable links for geohash + station combinations
- **Progressive Web App**: Enable offline functionality and mobile installation

## 📚 API References

- [Radio Browser API](https://api.radio-browser.info/)
- [Geohash Algorithm](https://en.wikipedia.org/wiki/Geohash)
- [Coordinate-based country detection](https://en.wikipedia.org/wiki/Geographic_coordinate_system)

## 🐛 Troubleshooting

**No stations found?**
- Check if the geohash covers populated areas
- Verify internet connection for API calls
- Try a different geohash with higher precision

**Audio not playing?**
- Ensure browser supports audio streaming
- Check if the station stream is currently available
- Try refreshing the page

**Slow performance?**
- Large geohashes (low precision) may take longer to process
- Consider using higher precision geohashes for faster results

## 📝 Development Notes

This application follows the repository's rule about avoiding bare booleans by using:
- **Enums/State machines** for player states instead of simple boolean flags
- **Rich result types** for station filtering results
- **Structured data** for geohash information instead of boolean presence indicators

The codebase leverages existing geohash utilities and distance calculation functions from the GeoRelay project for consistency and code reuse.
