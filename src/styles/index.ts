import './radioFinder.css';
import { rgba } from 'polished';

const colors = {
  matrix: {
    c1: "#003300",    // Dark green (borders, backgrounds)
    c2: "#00ff00",    // Bright green (text, highlights)
    c3: "#00aa00",    // Medium green (secondary text)
    c4: "#001100",    // Very dark green (dark backgrounds)
    c5: "#004400",    // Medium dark green (hover states)
    c6: "#00cc00",    // Light green (accent)
    c7: "#00dd00",    // Bright light green
    c8: "#003200",    // Dark green variant
    c9: "#005000",    // Medium green variant
    c11: "#ff6666",   // Red (errors)
    c12: "#ff0000",   // Bright red
    c13: "#330000",   // Dark red
    c14: "#ff3300",   // Orange-red
    c15: "#ff9999",   // Light red
    c16: "#ffaa00",   // Orange (highlights)
    c17: "#888",      // Gray
    c18: "#666",      // Dark gray
    c19: "#333",      // Very dark gray
    c20: "#00aaaa",   // Cyan
    c21: "#111",      // Very dark (near black)
    c22: "#000",      // Black
  }
}

// each key is the component name
export const globalStyles = {
  ChatInput: {
    matrix: {
      container:
        `px-4 py-3 bg-black/95 border-t border-[${colors.matrix.c1}] flex flex-col gap-2 font-mono text-[${colors.matrix.c2}]`,
      channelInfo: `text-[11px] text-[${colors.matrix.c17}] font-mono flex items-center gap-2`,
      channelPill:
        `text-[${colors.matrix.c2}] bg-[${rgba(colors.matrix.c2, 0.1)}] px-1.5 py-0.5 rounded border border-[${rgba(colors.matrix.c2, 0.3)}]`,
      username: `text-[${colors.matrix.c20}]`,
      error:
        `text-[${colors.matrix.c11}] bg-[${rgba(colors.matrix.c11, 0.1)}] px-2 py-1 rounded border border-[${rgba(colors.matrix.c11, 0.3)}]`,
      inputWrapper: "flex-1 relative flex flex-col",
      charCount: `absolute -bottom-4 right-0 text-[10px] font-mono text-[${colors.matrix.c17}]`,
      charCountExceeded: `text-[${colors.matrix.c11}]`,
      sendButton:
        `px-4 py-2 bg-[${colors.matrix.c1}] text-[${colors.matrix.c2}] border border-[${colors.matrix.c2}] rounded text-xs font-mono uppercase font-bold transition-colors`,
      sendButtonHover: `hover:bg-[${colors.matrix.c5}] hover:shadow-[0_0_8px_${rgba(colors.matrix.c2, 0.3)}]`,
      sendButtonDisabled: `bg-[${colors.matrix.c19}] text-[${colors.matrix.c18}] border-[${colors.matrix.c18}] cursor-not-allowed`,
      hint: `text-right text-[10px] text-[${colors.matrix.c18}] font-mono mt-1`,
      noProfileContainer:
        `p-4 bg-black/95 border-t border-[${colors.matrix.c1}] flex items-center justify-center`,
      noProfileButton:
        `text-[${colors.matrix.c2}] text-sm font-mono bg-[${colors.matrix.c4}] border-2 border-[${colors.matrix.c2}] rounded-lg px-5 py-3 cursor-pointer [text-shadow:0_0_10px_${rgba(colors.matrix.c2, 0.5)}] shadow-[0_0_15px_${rgba(colors.matrix.c2, 0.3)}] transition-all duration-200 hover:bg-[${colors.matrix.c1}] hover:shadow-[0_0_20px_${rgba(colors.matrix.c2, 0.5)}]`,
    },
    material: {
      container:
        "px-4 py-3 bg-white border-t border-gray-200 flex flex-col gap-2 font-sans text-gray-800",
      channelInfo: "text-[11px] text-gray-500 font-sans flex items-center gap-2",
      channelPill:
        "text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200",
      username: "text-blue-600",
      error: "text-red-600 bg-red-100 px-2 py-1 rounded border border-red-300",
      inputWrapper: "flex-1 relative flex flex-col",
      charCount: "absolute -bottom-4 right-0 text-[10px] text-gray-500",
      charCountExceeded: "text-red-600",
      sendButton:
        "px-4 py-2 bg-blue-600 text-white border border-blue-600 rounded text-xs uppercase font-bold transition-colors",
      sendButtonHover: "hover:bg-blue-700",
      sendButtonDisabled: "bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed",
      hint: "text-right text-[10px] text-gray-500 mt-1",
      noProfileContainer:
        "p-4 bg-white border-t border-gray-200 flex items-center justify-center",
      noProfileButton:
        "text-blue-600 text-sm font-sans bg-blue-50 border-2 border-blue-600 rounded-lg px-5 py-3 cursor-pointer transition-colors duration-200 hover:bg-blue-100",
    }
  },
  RecentEvents: {
    matrix: {
      container:
        "relative w-full h-full z-[1000] bg-black text-[14px] flex flex-col",
      noEvents:
        "flex items-center justify-center h-full text-green-600 font-mono text-sm text-center p-5",
      noEventsMessage: "mb-2",
      scrollButton:
        `absolute bottom-[32px] right-[30px] bg-green-500 text-black rounded-full w-[50px] h-[50px] cursor-pointer font-bold shadow-[0_4px_12px_${rgba(colors.matrix.c2, 0.3)}] transition-all duration-200 z-[1000] hover:bg-green-600 hover:scale-110 flex items-center justify-center`,
      scrollButtonWithCount:
        `absolute bottom-[32px] right-[30px] bg-green-500 text-black rounded-full min-w-[50px] h-[50px] px-2 cursor-pointer font-bold shadow-[0_4px_12px_${rgba(colors.matrix.c2, 0.3)}] transition-all duration-200 z-[1000] hover:bg-green-600 hover:scale-110 flex items-center justify-center`,
      messageCard: "mx-3 px-3 py-2 bg-black/30 rounded-lg transition-all",
      hashTag: "text-gray-500 text-[10px] font-mono",
      replyButton:
        "bg-transparent text-gray-500 rounded text-[10px] font-mono cursor-pointer transition-colors hover:bg-black/20 hover:text-gray-300",
    },
    material: {
      container:
        "relative w-full h-full z-[1000] bg-white text-gray-900 text-[14px] flex flex-col",
      noEvents:
        "flex items-center justify-center h-full text-gray-500 font-mono text-sm text-center p-5",
      noEventsMessage: "mb-2",
      scrollButton:
        "absolute bottom-[32px] right-[30px] bg-blue-500 text-white rounded-full w-[50px] h-[50px] cursor-pointer font-bold shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all duration-200 z-[1000] hover:bg-blue-600 hover:scale-110 flex items-center justify-center",
      scrollButtonWithCount:
        "absolute bottom-[32px] right-[30px] bg-blue-500 text-white rounded-full min-w-[50px] h-[50px] px-2 cursor-pointer font-bold shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all duration-200 z-[1000] hover:bg-blue-600 hover:scale-110 flex items-center justify-center",
      messageCard:
        "mx-3 px-3 py-2 rounded-lg transition-all hover:bg-gray-200 hover:shadow-sm",
      hashTag: "text-gray-500 text-[10px] font-mono",
      replyButton:
        "bg-transparent text-gray-500 rounded text-[10px] font-mono cursor-pointer transition-colors hover:bg-gray-200 hover:text-gray-700",
    },
  },
  ThemedProgressBar: {
    matrix: {
      outer: `bg-[${colors.matrix.c19}] h-2 rounded overflow-hidden mb-2`,
      inner: `bg-[${colors.matrix.c2}] h-full transition-[width] duration-300`,
    },
    material: {
      outer: "bg-gray-200 h-2 rounded overflow-hidden mb-2",
      inner: "bg-blue-600 h-full transition-[width] duration-300",
    },
  },
  CornerOverlay: {
    matrix: {
      base:
        `fixed z-[9999] opacity-70 hover:opacity-100 transition-opacity duration-200 font-mono text-[${colors.matrix.c3}] drop-shadow-[0_0_3px_${rgba(colors.matrix.c2, 0.3)}]`,
    },
    material: {
      base:
        "fixed z-[9999] opacity-70 hover:opacity-100 transition-opacity duration-200 font-sans text-blue-600",
    },
  },
  Modal: {
    matrix: {
      overlay: "fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[10000] p-5",
      container: `bg-[${colors.matrix.c21}] border-2 border-[${colors.matrix.c2}] rounded-lg shadow-[0_0_20px_${rgba(colors.matrix.c2, 0.3)}] font-mono text-[${colors.matrix.c2}]`,
      header: `p-4 border-b border-[${colors.matrix.c1}]`,
      title: `text-lg font-bold text-[${colors.matrix.c2}]`,
      closeButton: `p-2 rounded hover:bg-opacity-20 hover:bg-[${colors.matrix.c2}] text-[${colors.matrix.c2}] transition-colors`,
      tabContainer: "flex gap-1 mt-4",
      tabButton: "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
      tabButtonActive: `bg-[${colors.matrix.c2}] text-black`,
      tabButtonInactive: `bg-[${colors.matrix.c1}] text-[${colors.matrix.c2}] hover:bg-[${colors.matrix.c5}]`,
      body: "p-4",
      flowContainer: "space-y-4",
      flowTitle: `text-lg font-bold text-[${colors.matrix.c2}] mb-4`,
      flowActions: `flex gap-2 pt-4 border-t border-[${colors.matrix.c1}]`,
    },
    material: {
      overlay: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-5",
      container: "bg-white border-2 border-blue-600 rounded-lg shadow-xl font-sans text-gray-800",
      header: "p-4 border-b border-blue-200",
      title: "text-lg font-bold text-gray-800",
      closeButton: "p-2 rounded hover:bg-opacity-20 hover:bg-blue-100 text-blue-600 transition-colors",
      tabContainer: "flex gap-1 mt-4",
      tabButton: "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
      tabButtonActive: "bg-blue-600 text-white",
      tabButtonInactive: "bg-gray-200 text-gray-700 hover:bg-gray-300",
      body: "p-4",
      flowContainer: "space-y-4",
      flowTitle: "text-lg font-bold text-gray-800 mb-4",
      flowActions: "flex gap-2 pt-4 border-t border-gray-200",
    },
  },
  SectionHeader: {
    matrix: `bg-black/95 text-[${colors.matrix.c3}] px-3 py-2 border-b border-[${colors.matrix.c1}] text-xs uppercase tracking-wider font-mono`,
    material: "bg-gray-50 text-gray-600 px-3 py-2 border-b border-gray-200 text-xs uppercase tracking-wider font-medium",
  },
  ThemedButton: {
    matrix: {
      base: 'border font-mono font-bold uppercase transition-colors',
      active:
        `bg-[${colors.matrix.c2}] text-black shadow-[0_0_10px_${rgba(colors.matrix.c2, 0.5)}] border-[${colors.matrix.c2}]`,
      inactive:
        `bg-black/70 text-[${colors.matrix.c2}] border-[${colors.matrix.c2}] hover:bg-[${rgba(colors.matrix.c2, 0.1)}] hover:shadow-[0_0_5px_${rgba(colors.matrix.c2, 0.3)}]`,
    },
    material: {
      base: 'border font-sans font-bold uppercase transition-colors',
      active: 'bg-blue-600 text-white border-blue-600',
      inactive: 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50',
    },
  },
  ThemedInput: {
    matrix:
      `bg-black/80 text-[${colors.matrix.c2}] placeholder-[${colors.matrix.c2}]/50 border border-[${colors.matrix.c2}] rounded outline-none`,
    material:
      'bg-white text-gray-800 placeholder-gray-400 border border-blue-600 rounded outline-none',
  },
  MarqueeBanner: {
    matrix: {
      container: `bg-[${colors.matrix.c4}] border-[${colors.matrix.c3}] hover:bg-[${colors.matrix.c4}]`,
      text: `text-[${colors.matrix.c2}] [text-shadow:0_0_5px_${rgba(colors.matrix.c2, 0.5)}]`,
      highlight: `text-[${colors.matrix.c16}] [text-shadow:0_0_5px_${rgba(colors.matrix.c16, 0.5)}]`,
    },
    material: {
      container: "bg-blue-50 border-blue-300 hover:bg-blue-100",
      text: "text-blue-700",
      highlight: "text-indigo-600",
    },
  },
  MobileHeader: {
    matrix: {
      header:
        `bg-black/95 backdrop-blur flex flex-col items-center font-mono flex-shrink-0 p-2 text-[${colors.matrix.c2}] relative overflow-visible`,
      logoText:
        `text-[${colors.matrix.c2}] text-lg font-bold uppercase tracking-wider drop-shadow-[0_0_10px_${rgba(colors.matrix.c2, 0.5)}]`,
      searchIcon: `stroke-[${colors.matrix.c3}]`,
      clearButton:
        `px-3 py-3 bg-green-900/80 text-[${colors.matrix.c2}] border border-[${colors.matrix.c2}] rounded text-xs font-mono uppercase hover:bg-green-900`,
      separator:
        `w-full h-0.5 bg-gradient-to-r from-transparent via-[${colors.matrix.c2}] to-transparent shadow-[0_0_4px_${rgba(colors.matrix.c2, 0.5)}]`,
      subheader:
        `w-full bg-black/95 px-5 py-3 text-[${colors.matrix.c3}] font-bold backdrop-blur`,
      subheaderTitle:
        `mb-1 text-lg uppercase tracking-wider drop-shadow-[0_0_10px_${rgba(colors.matrix.c2, 0.5)}]`,
      statsBadge:
        `text-xs text-[${colors.matrix.c2}] bg-[${rgba(colors.matrix.c2, 0.1)}] px-1.5 py-1 rounded border border-[${rgba(colors.matrix.c2, 0.3)}]`,
    },
    material: {
      header:
        "bg-white text-gray-800 flex flex-col items-center font-sans flex-shrink-0 p-2 relative overflow-visible",
      logoText: "text-blue-600 text-lg font-bold text-lg font-bold uppercase tracking-wider",
      searchIcon: "stroke-blue-600",
      clearButton:
        "px-3 py-3 bg-blue-100 text-blue-600 border border-blue-600 rounded text-xs uppercase hover:bg-blue-200",
      separator: "w-full h-0.5 bg-blue-600",
      subheader: "w-full bg-white px-5 py-3 text-blue-600 font-bold",
      subheaderTitle: "mb-1 text-lg uppercase tracking-wider",
      statsBadge:
        "text-xs text-blue-600 bg-blue-50 px-1.5 py-1 rounded border border-blue-200",
    },
  },
  List: {
    matrix: {
      base: `w-48 min-w-[192px] bg-black/90 text-[${colors.matrix.c2}] flex flex-col overflow-hidden`,
      borderLeft: `border-l border-[${colors.matrix.c1}]`,
      borderRight: `border-r border-[${colors.matrix.c1}]`,
      header: `bg-black/98 text-[${colors.matrix.c3}] px-3 py-3 border-b border-[${colors.matrix.c1}] sticky top-0 z-20`,
      headerText: `text-[16px] uppercase tracking-wider font-mono drop-shadow-[0_0_10px_${rgba(colors.matrix.c2, 0.5)}]`,
      list: "overflow-y-auto px-2 py-2 flex-1",
      empty: "text-[10px] opacity-70 px-2 py-1",
    },
    material: {
      base: "w-48 min-w-[192px] bg-white text-gray-800 flex flex-col overflow-hidden",
      borderLeft: "border-l border-gray-300",
      borderRight: "border-r border-gray-300",
      header: "bg-white text-blue-600 px-4 py-3 border-b border-blue-200 sticky top-0 z-20",
      headerText: "text-base uppercase tracking-wider",
      list: "overflow-y-auto px-2 py-2 flex-1",
      empty: "text-xs text-gray-500 px-2 py-1",
    },
  },
  SearchPanel: {
    matrix: {
      container:
        "relative w-full max-w-[300px] md:ml-auto md:top-[10px] md:right-[10px] z-[1000] bg-black/90 border border-green-900 flex flex-col", // desktop baseline
      containerMobile: "max-w-full m-0 top-0 right-0 rounded-md backdrop-blur-md",
      header:
        "sticky top-0 bg-black/95 border border-green-900 border-b-green-500 p-2.5 -m-px text-green-600 font-bold z-10",
      current: "text-[10px] text-green-400",
      body: "p-2.5",
      inputWrapper: "relative flex items-center",
      icon: "absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none",
      input:
        `w-full pl-7 pr-2 py-1 bg-black text-green-400 border border-green-500 text-xs font-mono outline-none focus:border-green-500 focus:shadow-[0_0_5px_${rgba(colors.matrix.c2, 0.5)}]`,
      inputMobile: "pl-10 py-3 text-base rounded",
      button:
        "mt-2 w-full py-1 bg-green-900 text-green-400 border border-green-500 font-mono text-xs uppercase cursor-pointer",
      buttonMobile: "py-3 text-sm rounded",
      followButton:
        "mt-2 w-full py-1 bg-purple-900 text-purple-300 border border-purple-300 font-mono text-xs uppercase cursor-pointer transition-colors hover:bg-purple-800 hover:border-purple-200",
      followButtonMobile: "py-3 text-sm rounded",
    },
    material: {
      container:
        "relative w-full max-w-[300px] md:ml-auto md:top-[10px] md:right-[10px] z-[1000] bg-white border border-gray-200 rounded-md flex flex-col",
      containerMobile: "max-w-full m-0 top-0 right-0",
      header:
        "sticky top-0 bg-gray-100 border-b border-gray-300 p-2.5 -m-px text-gray-800 font-semibold z-10 rounded-t-md",
      current: "text-xs text-gray-600",
      body: "p-2.5",
      inputWrapper: "relative flex items-center",
      icon: "absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500",
      input:
        "w-full pl-7 pr-2 py-1 bg-white text-gray-800 border border-gray-300 text-xs rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
      inputMobile: "pl-10 py-3 text-base",
      button:
        "mt-2 w-full py-1 bg-gray-200 text-gray-800 border border-gray-300 rounded-md text-xs uppercase cursor-pointer",
      buttonMobile: "py-3 text-sm",
      followButton:
        "mt-2 w-full py-1 bg-blue-600 text-white border border-blue-700 rounded-md text-xs uppercase cursor-pointer transition-colors hover:bg-blue-700",
      followButtonMobile: "py-3 text-sm",
    },
  },
  Connections: {
    matrix: {
      container:
        "bg-black/90 text-green-500 border border-green-500/30 rounded-lg p-3 shadow-lg",
      title: `text-[${colors.matrix.c3}] text-xs mb-1 font-mono font-bold`,
      status: "text-xs font-mono text-green-400 text-center",
      statusConnected: "text-green-400",
      statusDisconnected: "text-red-400",
      statusConnecting: "text-yellow-400",
      relayButton:
        "w-full text-left px-2 py-1 text-xs font-mono border border-green-500/30 rounded hover:bg-green-500/20 transition-colors",
      relayButtonActive:
        "w-full text-left px-2 py-1 text-xs font-mono border border-green-500 rounded bg-green-500/20",
      actionButton:
        "w-full text-center px-3 py-2 text-xs font-bold",
      actionButtonDisabled:
        "w-full bg-gray-600 text-gray-400 px-3 py-2 rounded text-xs font-mono cursor-not-allowed font-bold",
      geoRelayButton:
        "w-full text-center px-3 py-2 text-xs font-bold",
      geoRelayButtonDisabled:
        "w-full bg-gray-400 text-gray-600 px-3 py-2 rounded text-xs font-mono cursor-not-allowed font-bold",
    },
    material: {
      container:
        "bg-white/95 text-gray-800 border border-gray-300 rounded-lg p-3 shadow-lg",
      title: "text-blue-600 text-xs mb-1 font-semibold",
      status: "text-xs text-gray-600 text-center",
      statusConnected: "text-green-600",
      statusDisconnected: "text-red-600",
      statusConnecting: "text-yellow-600",
      relayButton:
        "w-full text-left px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 transition-colors",
      relayButtonActive:
        "w-full text-left px-2 py-1 text-xs border border-blue-500 rounded bg-blue-50",
      actionButton:
        "w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-xs font-medium transition-colors font-bold",
      actionButtonDisabled:
        "w-full bg-gray-400 text-gray-600 px-3 py-2 rounded text-xs font-medium cursor-not-allowed font-bold",
      geoRelayButton:
        "w-full bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-xs font-medium transition-colors font-bold",
      geoRelayButtonDisabled:
        "w-full bg-gray-400 text-gray-600 px-3 py-2 rounded text-xs font-medium cursor-not-allowed font-bold",
    },
  },
  GeohashLayer: {
    matrix: {
      base: "0,255,0",
      text: `font-mono font-bold fill-[${colors.matrix.c2}]`,
      count: `fill-[${colors.matrix.c3}]`,
    },
    material: {
      base: "59,130,246",
      text: "font-sans font-bold fill-blue-600",
      count: "fill-blue-700",
    },
  },
  Map: {
    matrix: {
      svg: "absolute top-0 left-0",
      rectFill: "url(#matrixLines)",
      pathFill: `#${colors.matrix.c4.slice(1)}`,
      timezoneStroke: `${rgba(colors.matrix.c2, 0.05)}`,
      regionStroke: `${rgba(colors.matrix.c2, 0.1)}`,
    },
    material: {
      svg: "absolute top-0 left-0",
      rectFill: "#f1f5f9",
      pathFill: "#e5e7eb",
      timezoneStroke: "rgba(59,130,246,0.2)",
      regionStroke: "rgba(59,130,246,0.3)",
    },
  },
  ProjectionSelector: {
    matrix: {
      label: `text-[${colors.matrix.c3}] text-xs mb-1`,
    },
    material: {
      label: "text-blue-600 text-xs mb-1",
    },
  },
  ProfileInputPage: {
    matrix: {
      historyButton: `px-2 py-1 bg-black text-[${colors.matrix.c2}] border border-[${colors.matrix.c2}] rounded text-xs font-mono`,
      error: `bg-[${colors.matrix.c13}] border border-[${colors.matrix.c12}] text-[${colors.matrix.c11}] p-2 rounded mb-5 text-sm`,
      progressText: `text-center text-xs text-[${colors.matrix.c17}]`,
    },
    material: {
      historyButton: "px-2 py-1 bg-white text-blue-600 border border-blue-600 rounded text-xs",
      error: "bg-red-50 border border-red-400 text-red-600 p-2 rounded mb-5 text-sm",
      progressText: "text-center text-xs text-gray-500",
    },
  },
  ProfileSelectionPage: {
    matrix: {
      progressText: `text-center text-xs text-[${colors.matrix.c17}]`,
      profileOption: `border-[${colors.matrix.c2}]`,
    },
    material: {
      progressText: "text-center text-xs text-gray-500",
      profileOption: "border-blue-600",
    },
  },
  ChannelList: {
    matrix: {
      buttonBase:
        "w-full text-left rounded px-2 py-2 text-sm mb-2 flex items-center justify-between gap-2 transition",
      selected:
        `border bg-[${colors.matrix.c2}]/10 border-[${colors.matrix.c2}] text-[${colors.matrix.c2}] font-bold shadow-inner shadow-[${colors.matrix.c2}]/15`,
      pinned: "bg-yellow-400/5 border-yellow-400 text-yellow-300",
      geohash: "bg-blue-400/5 border-blue-400 text-blue-300",
      standard: "bg-gray-400/5 border-gray-400 text-gray-300",
      hover: `hover:bg-[${colors.matrix.c2}]/10 hover:border-[${colors.matrix.c2}]`,
      unreadContainer: "flex items-center gap-1",
      unreadDot:
        `w-2 h-2 rounded-full bg-red-600 shadow-[0_0_6px_${rgba(colors.matrix.c11, 0.6)}]`,
      unreadCount: "text-xs text-red-500",
      heartButton: "w-5 h-5 flex items-center justify-center transition-all hover:scale-110",
      heartIcon: "text-red-500",
      heartIconPinned: "text-red-400",
      channelInfo: "flex-1",
      channelName: "break-words",
      eventKind: "text-[10px] opacity-60 font-mono",
    },
    material: {
      buttonBase:
        "w-full text-left border rounded px-2 py-2 text-sm mb-2 flex items-center justify-between gap-2 transition",
      selected: "bg-blue-100 border-blue-500 text-blue-700 font-bold",
      pinned: "bg-yellow-100 border-yellow-400 text-yellow-800",
      geohash: "bg-blue-100 border-blue-400 text-blue-700",
      standard: "bg-gray-100 border-gray-400 text-gray-700",
      hover: "hover:bg-blue-50 hover:border-blue-500",
      unreadContainer: "flex items-center gap-1",
      unreadDot: "w-2 h-2 rounded-full bg-red-600",
      unreadCount: "text-xs text-red-600",
      heartButton: "w-5 h-5 flex items-center justify-center transition-all hover:scale-110",
      heartIcon: "text-red-500",
      heartIconPinned: "text-red-400",
      channelInfo: "flex-1",
      channelName: "break-words",
      eventKind: "text-[10px] opacity-60 font-mono",
    },
  },
  UserList: {
    matrix: {
      buttonBase:
        "w-full text-left rounded px-2 py-2 text-sm mb-2 flex items-center justify-between gap-2 transition",
      selected:
        `border bg-[${colors.matrix.c2}]/10 border-[${colors.matrix.c2}] text-[${colors.matrix.c2}] font-bold shadow-inner shadow-[${colors.matrix.c2}]/15`,
      hover: `hover:bg-[${colors.matrix.c2}]/10 hover:border-[${colors.matrix.c2}]`,
      userInfo: "flex-1",
      userName: "break-words font-medium",
      userDetails: "text-[10px] opacity-60 font-mono",
      messageCount: "text-xs text-blue-400",
      lastSeen: "text-[10px] opacity-50",

    },
    material: {
      buttonBase:
        "w-full text-left border rounded px-2 py-2 text-sm mb-2 flex items-center justify-between gap-2 transition",
      selected: "bg-blue-100 border-blue-500 text-blue-700 font-bold",
      hover: "hover:bg-blue-50 hover:border-blue-500",
      userInfo: "flex-1",
      userName: "break-words font-medium",
      userDetails: "text-[10px] opacity-60 font-mono",
      messageCount: "text-xs text-blue-600",
      lastSeen: "text-[10px] opacity-50",
    },
  },
  LinkRenderer: {
    matrix: `text-[${colors.matrix.c2}] underline cursor-pointer break-all`,
    material: "text-blue-600 underline cursor-pointer break-all",
  },
  HierarchyItem: {
    matrix: {
      container:
        `mb-3 p-4 cursor-pointer font-mono bg-gradient-to-br from-[${colors.matrix.c8}]/40 to-[${colors.matrix.c4}]/20 border border-[${colors.matrix.c6}]/30 border-l-4 border-[${colors.matrix.c2}] rounded hover:from-[${colors.matrix.c9}]/50 hover:to-[${colors.matrix.c1}]/30 hover:border-[${colors.matrix.c6}]/60 hover:-translate-y-px transition-all shadow`, // using transition
      tag: `text-[${colors.matrix.c2}] font-bold bg-[${colors.matrix.c2}]/10 px-1 rounded text-sm`,
      count: `text-[${colors.matrix.c3}] bg-black/50 px-1 rounded text-xs`,
      location: `text-[${colors.matrix.c7}] font-sans text-sm`,
    },
    material: {
      container:
        "mb-3 p-4 cursor-pointer font-sans bg-white border border-blue-200 border-l-4 border-blue-600 rounded hover:bg-blue-50 hover:border-blue-400 transition-all shadow",
      tag: "text-blue-600 font-bold bg-blue-100 px-1 rounded text-sm",
      count: "text-blue-600 bg-gray-100 px-1 rounded text-xs",
      location: "text-gray-700 font-sans text-sm",
    },
  },
  EventHierarchy: {
    matrix: {
      container:
        `relative top-0 left-0 w-full h-full z-[1000] bg-black text-[${colors.matrix.c2}] font-mono flex flex-col overflow-x-hidden`,
      list: "flex-1 overflow-y-auto p-5 pt-5",
      section: `text-xs text-[${colors.matrix.c3}] mb-2 font-bold border-b border-[${colors.matrix.c3}]/30 pb-1`,
    },
    material: {
      container:
        "relative top-0 left-0 w-full h-full z-[1000] bg-white text-gray-800 font-sans flex flex-col overflow-x-hidden",
      list: "flex-1 overflow-y-auto p-5 pt-5",
      section: "text-xs text-blue-600 mb-2 font-bold border-b border-blue-200 pb-1",
    },
  },
  ProfilePreviewPage: {
    matrix: {
      previewCard: `bg-[${colors.matrix.c4}] border-2 border-[${colors.matrix.c2}] rounded-[15px] p-6 mb-5 shadow-[0_0_20px_${rgba(colors.matrix.c2, 0.2)}]`,
      previewUsername: `text-[${colors.matrix.c2}] text-[20px] font-bold`,
      previewHighlight: "bg-yellow-300 text-black px-1 rounded",
      privateContainer: `bg-[${colors.matrix.c13}] border border-[${colors.matrix.c14}] rounded mb-5`,
      privateToggle: `p-3 cursor-pointer flex items-center justify-between hover:bg-[${colors.matrix.c13}]`,
      privateToggleOpen: `border-b border-[${colors.matrix.c14}]`,
      privateToggleText: `text-[12px] text-[${colors.matrix.c11}] uppercase font-bold flex items-center gap-2`,
      privateToggleIcon: `text-[${colors.matrix.c11}] transition-transform`,
      privateContent: "p-4",
      privateItem: "mb-4",
      privateLabel: `text-[11px] text-[${colors.matrix.c15}] mb-1`,
      privateValue: `bg-black p-2 rounded text-[11px] break-all flex justify-between items-center gap-2 border border-[${colors.matrix.c13}]`,
      privateValueText: `text-[${colors.matrix.c15}]`,
      copyButton: `bg-[${colors.matrix.c13}] text-[${colors.matrix.c11}] border border-[${colors.matrix.c14}] px-2 py-1 text-[10px] rounded cursor-pointer flex-shrink-0`,
    },
    material: {
      previewCard: "bg-white border-2 border-blue-600 rounded-[15px] p-6 mb-5 shadow-md",
      previewUsername: "text-blue-600 text-[20px] font-bold",
      previewHighlight: "bg-yellow-200 text-black px-1 rounded",
      privateContainer: "bg-red-50 border border-red-400 rounded mb-5",
      privateToggle: "p-3 cursor-pointer flex items-center justify-between hover:bg-red-100",
      privateToggleOpen: "border-b border-red-400",
      privateToggleText: "text-[12px] text-red-600 uppercase font-bold flex items-center gap-2",
      privateToggleIcon: "text-red-600 transition-transform",
      privateContent: "p-4",
      privateItem: "mb-4",
      privateLabel: "text-[11px] text-red-500 mb-1",
      privateValue: "bg-white p-2 rounded text-[11px] break-all flex justify-between items-center gap-2 border border-red-200",
      privateValueText: "text-red-500",
      copyButton: "bg-red-200 text-red-700 border border-red-400 px-2 py-1 text-[10px] rounded cursor-pointer flex-shrink-0",
    },
  },
  DiscoverPage: {
    matrix: {
      container: "space-y-4",
      searchContainer: "space-y-4 mb-6",
      topicLabel: `text-sm font-medium text-[${colors.matrix.c2}]`,
      topicButton: "px-3 py-1 text-xs rounded-full transition-all duration-200",
      topicButtonActive:
        `bg-[${colors.matrix.c2}] text-black shadow-[0_0_8px_${rgba(colors.matrix.c2, 0.5)}]`,
      topicButtonInactive:
        `bg-[${colors.matrix.c1}] text-[${colors.matrix.c3}] hover:bg-[${colors.matrix.c5}] border border-[${colors.matrix.c2}]/20`,
      searchInput:
        `w-full px-4 py-2 rounded border bg-black border-[${colors.matrix.c1}] text-[${colors.matrix.c2}] placeholder-[${colors.matrix.c3}] focus:border-[${colors.matrix.c2}] focus:outline-none focus:shadow-[0_0_8px_${rgba(colors.matrix.c2, 0.3)}]`,
      errorContainer:
        "text-center py-4 text-red-400 bg-red-900/20 rounded border border-red-500/20",
      noResultsContainer: `text-center py-8 text-[${colors.matrix.c3}]`,
      imageGrid: "grid grid-cols-3 gap-4 auto-rows-max",
      imageButton:
        "w-full rounded-lg border-none cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all duration-200 overflow-hidden",
      loadMoreButton:
        `w-full px-6 py-3 rounded-lg font-medium transition-all bg-[${colors.matrix.c1}] text-[${colors.matrix.c2}] border border-[${colors.matrix.c2}] hover:bg-[${colors.matrix.c5}] hover:shadow-[0_0_8px_${rgba(colors.matrix.c2, 0.3)}] disabled:opacity-50 disabled:cursor-not-allowed`,
    },
    material: {
      container: "space-y-4",
      searchContainer: "space-y-4 mb-6",
      topicLabel: "text-sm font-medium text-gray-700",
      topicButton: "px-3 py-1 text-xs rounded-full transition-all duration-200",
      topicButtonActive: "bg-blue-600 text-white shadow-lg",
      topicButtonInactive:
        "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300",
      searchInput:
        "w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white",
      errorContainer:
        "text-center py-4 text-red-600 bg-red-50 rounded-lg border border-red-200",
      noResultsContainer: "text-center py-8 text-gray-500",
      imageGrid: "grid grid-cols-3 gap-4 auto-rows-max",
      imageButton:
        "w-full rounded-lg border-none cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all duration-200 overflow-hidden",
      loadMoreButton:
        "w-full px-6 py-3 rounded-lg font-medium transition-all bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed",
    },
  },
  App: {
    matrix: {
      appContainer:
        `flex flex-col w-screen h-screen overflow-hidden bg-black text-[${colors.matrix.c2}] font-mono`,
      mainArea: "flex-1 relative w-full overflow-hidden",
      chatViewContainer:
        "absolute inset-0 w-full h-full bg-black flex flex-row overflow-hidden",
      chatColumn: "flex-1 flex flex-col",
      subHeader: `bg-black/95 text-[${colors.matrix.c3}] px-4 py-3 border-b border-[${colors.matrix.c1}]`,
      subHeaderTitle:
        `text-base uppercase tracking-wider [text-shadow:0_0_10px_${rgba(colors.matrix.c2, 0.5)}]`,
    },
    material: {
      appContainer:
        "flex flex-col w-screen h-screen overflow-hidden bg-white text-gray-800 font-sans",
      mainArea: "flex-1 relative w-full overflow-hidden",
      chatViewContainer:
        "absolute inset-0 w-full h-full bg-white flex flex-row overflow-hidden",
      chatColumn: "flex-1 flex flex-col",
      subHeader: "bg-white text-blue-600 px-4 py-3 border-b border-blue-200",
      subHeaderTitle: "text-base uppercase tracking-wider",
    },
  }
}
