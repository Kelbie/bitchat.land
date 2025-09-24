
# 🌍 BitChat - Decentralized Geospatial Communication Platform

A React-based decentralized communication platform that combines geospatial mapping, radio discovery, and Nostr protocol integration for location-based social interaction.

## 🏗️ Project Reorganization Plan

### Current Issues Identified
1. **Mixed Responsibilities in `common/`**: Contains both truly reusable UI components and domain-specific components
2. **Inconsistent Modal Organization**: WalletModal is in `/wallet` instead of `/modals`, inconsistent folder structure
3. **Naming Inconsistencies**: Mixed naming patterns across the project
4. **Unclear Component Boundaries**: Some components could be better categorized by domain

### Proposed New Structure

```
src/
├── components/
│   ├── ui/                          # Pure UI components (formerly common)
│   │   ├── base/                    # Fundamental UI building blocks
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── ToggleButton.tsx
│   │   │   └── index.ts
│   │   ├── layout/                  # Layout and positioning
│   │   │   ├── Layout.tsx           # HStack, VStack, etc.
│   │   │   ├── Modal.tsx
│   │   │   ├── CornerOverlay.tsx
│   │   │   └── index.ts
│   │   ├── data/                    # Data display components
│   │   │   ├── List.tsx
│   │   │   ├── MasonryGrid.tsx
│   │   │   ├── PowDistributionGraph.tsx
│   │   │   ├── Slider.tsx
│   │   │   └── index.ts
│   │   ├── content/                 # Content display
│   │   │   ├── Image.tsx
│   │   │   ├── RichContentDisplay.tsx
│   │   │   ├── SectionHeader.tsx
│   │   │   └── index.ts
│   │   └── index.ts                 # Re-export all UI components
│   │
│   ├── features/                    # Feature-specific components
│   │   ├── chat/
│   │   │   ├── components/
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   ├── RecentEvents.tsx
│   │   │   │   ├── CommandSuggestions.tsx
│   │   │   │   ├── ThemedProgressBar.tsx
│   │   │   │   └── VirtualizedScroller.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useChatFeatures.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── map/
│   │   │   ├── components/
│   │   │   │   ├── Map.tsx
│   │   │   │   ├── GeohashLayer.tsx
│   │   │   │   ├── Connections.tsx
│   │   │   │   └── ProjectionSelector.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useDrag.ts
│   │   │   │   └── useZoom.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── radio/
│   │   │   ├── components/
│   │   │   │   ├── RadioPage.tsx
│   │   │   │   ├── FilterSection.tsx
│   │   │   │   ├── PlayerBar.tsx
│   │   │   │   ├── StationCard.tsx
│   │   │   │   └── StationList.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useRadioStations.ts
│   │   │   │   ├── useRadioFilters.ts
│   │   │   │   ├── useRadioPlayer.ts
│   │   │   │   └── useAudioPlayer.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── channels/
│   │   │   ├── components/
│   │   │   │   ├── ChannelList.tsx
│   │   │   │   ├── ChannelItem.tsx
│   │   │   │   └── ChannelToggle.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useChannelCategorization.ts
│   │   │   │   └── useChannelPinning.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── users/
│   │   │   ├── components/
│   │   │   │   ├── UserList.tsx
│   │   │   │   └── UserItem.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useUserFiltering.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── wallet/
│   │   │   ├── components/
│   │   │   │   ├── FloatingWalletIcon.tsx
│   │   │   │   └── CashuToken.tsx
│   │   │   └── index.ts
│   ├── layout/                      # App-level layout components
│   │   ├── MobileHeader.tsx
│   │   ├── MarqueeBanner.tsx
│   │   └── SearchPanel.tsx
│   │
│   └── modals/                      # All modal components
│       ├── auth/                    # Authentication modals
│       │   ├── ProfileGenerationModal.tsx    # Renamed from login/index.tsx
│       │   ├── ProfileInputPage.tsx
│       │   ├── ProfilePreviewPage.tsx
│       │   ├── ProfileSelectionPage.tsx
│       │   ├── useProfileGenerationState.ts
│       │   ├── types.ts
│       │   └── index.ts
│       │
│       ├── settings/
│       │   ├── SettingsModal.tsx     # Renamed from index.tsx
│       │   ├── SettingsPage.tsx
│       │   ├── useSettingsState.ts
│       │   └── index.ts
│       │
│       ├── wallet/                  # Moved from features/wallet
│       │   ├── WalletModal.tsx
│       │   └── index.ts
│       │
│       ├── media/                   # Renamed from image
│       │   ├── FavoritesModal.tsx
│       │   ├── DiscoverPage.tsx
│       │   ├── FavoritesPage.tsx
│       │   ├── useImageModalState.ts
│       │   ├── types.ts
│       │   └── index.ts
│       │
│       └── index.ts                 # Re-export all modals
│
├── pages/                           # Top-level page components
│   ├── MapPage.tsx
│   ├── ChatPage.tsx
│   ├── RadioPage.tsx
│   ├── PanelPage.tsx
│   ├── AdminPage.tsx
│   └── index.ts
│
├── hooks/                           # Global/shared hooks
│   ├── useNostr.ts
│   └── index.ts
│
├── services/                        # External service integrations
│   ├── cashuService.ts
│   ├── countryService.ts
│   ├── geohashService.ts
│   ├── radioService.ts
│   └── index.ts
│
├── utils/                          # Pure utility functions
│   ├── channelCategorization.ts
│   ├── channelJoinTracker.ts
│   ├── commands.ts
│   ├── contentParsers.ts
│   ├── favorites.ts
│   ├── geocoder.ts
│   ├── geohash.ts
│   ├── geohashUtils.ts
│   ├── geoRelayDirectory.ts
│   ├── pinnedChannels.ts
│   ├── pinnedUsers.ts
│   ├── searchParser.ts
│   ├── stringUtils.ts
│   ├── systemMessageSender.ts
│   ├── userCategorization.ts
│   ├── userColor.ts
│   └── index.ts
│
├── types/                          # TypeScript type definitions
│   ├── app.ts                      # Renamed from filter.ts for clarity
│   ├── index.ts
│   └── nostr.ts                    # Domain-specific types
│
├── constants/
│   ├── eventKinds.ts
│   ├── projections.ts
│   └── index.ts
│
├── styles/
│   ├── globals.ts                  # Renamed from index.ts
│   ├── radioFinder.css
│   └── index.ts
│
├── data/
│   ├── time.json
│   ├── us-topo.json
│   └── world-topo.json
│
├── workers/
│   ├── powWorker.js
│   └── profileGenerationWorker.js
│
├── lib/
│   └── utils.ts
│
├── App.tsx
├── main.tsx
├── index.css
└── vite-env.d.ts
```

## 🎯 Reorganization Benefits

### 1. **Clear Separation of Concerns**
- **UI Components** (`/ui`): Pure, reusable UI building blocks
- **Feature Components** (`/features`): Domain-specific business logic components
- **Layout Components** (`/layout`): App-level layout and navigation
- **Modal Components** (`/modals`): All modal dialogs in one place

### 2. **Consistent Naming Conventions**
- **PascalCase** for component files: `ComponentName.tsx`
- **camelCase** for hooks: `useHookName.ts`
- **camelCase** for utilities: `utilityName.ts`
- **PascalCase** for services: `ServiceName.ts`
- **Descriptive folder names**: `auth` instead of `login`, `media` instead of `image`

### 3. **Feature-Based Organization**
- Each feature has its own folder with `components/`, `hooks/`, and `index.ts`
- Related functionality is co-located
- Easy to find and modify feature-specific code

### 4. **Improved Import Paths**
```typescript
// Before
import { Button } from '../common/Button';
import { ChannelItem } from '../common/ChannelItem';

// After
import { Button } from '@/components/ui';
import { ChannelItem } from '@/components/features/channels';
```

### 5. **Better Scalability**
- New features can be added without cluttering existing folders
- Clear boundaries between different types of components
- Easier onboarding for new developers

## 📋 Migration Checklist

### Phase 1: UI Components Reorganization
- [ ] Create `/ui` folder structure
- [ ] Move and categorize components from `/common`
- [ ] Update import paths
- [ ] Update index files

### Phase 2: Feature Components Organization  
- [ ] Create feature-specific folders
- [ ] Move domain-specific components
- [ ] Reorganize related hooks
- [ ] Update imports

### Phase 3: Modal Consolidation
- [ ] Move WalletModal to `/modals/wallet`
- [ ] Rename folders for consistency (`image` → `media`, `login` → `auth`)
- [ ] Standardize modal naming
- [ ] Update imports

### Phase 4: Global Cleanup
- [ ] Rename type files for clarity
- [ ] Add index files for better imports
- [ ] Update path aliases in tsconfig
- [ ] Update documentation

## 🚀 Key Features

### 🗺️ **Geospatial Mapping**
- Interactive world map with geohash-based location system
- Real-time event visualization by geographic regions
- Multiple map projections and zoom levels

### 📻 **Radio Discovery**
- Find radio stations by geohash regions
- Music-focused filtering and distance-based sorting
- Integrated audio player with volume controls

### 💬 **Decentralized Chat**
- Nostr protocol integration for censorship-resistant messaging
- Channel-based communication with geohash targeting
- Proof-of-work spam protection

### 👛 **Cashu Wallet Integration**
- Lightning-based ecash wallet functionality
- Send and receive payments within the app
- Privacy-focused transaction handling

### 🔐 **Profile Management**
- Secure key generation and management
- Profile customization and privacy controls
- Local storage with backup options

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + CVA (Class Variance Authority)
- **State Management**: React hooks + Custom hooks
- **Protocol**: Nostr for decentralized messaging
- **Maps**: D3.js for geospatial visualization
- **Audio**: Web Audio API for radio playback
- **Payments**: Cashu for Lightning-based ecash

## 🏃‍♂️ Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📁 Current vs Proposed Structure

| Current Issue | Proposed Solution |
|---------------|-------------------|
| Mixed responsibilities in `/common` | Split into `/ui` (reusable) and `/features` (domain-specific) |
| WalletModal not in `/modals` | Move to `/modals/wallet/` |
| Inconsistent folder naming | Standardize: `auth`, `media`, `wallet` |
| Scattered feature code | Co-locate components, hooks, and types by feature |
| Deep import paths | Add index files and path aliases |
| Generic type file names | Descriptive names: `app.ts`, `nostr.ts` |

This reorganization will make the codebase more maintainable, scalable, and easier to navigate while maintaining all existing functionality.

