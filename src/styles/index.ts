import './radioFinder.css';

// each key is the component name
export const globalStyles = {
  ChatInput: {
    matrix: {
      container:
        'px-4 py-3 bg-gray-900/95 border-t border-green-900 flex flex-col gap-2 font-mono text-green-400',
      channelInfo: 'text-[11px] text-gray-500 font-mono flex items-center gap-2',
      channelPill:
        'text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded border border-green-400/30',
      username: 'text-cyan-500',
      error:
        'text-red-400 bg-red-400/10 px-2 py-1 rounded border border-red-400/30',
      inputWrapper: "flex-1 relative flex flex-col",
      charCount: 'absolute -bottom-4 right-0 text-[10px] font-mono text-gray-500',
      charCountExceeded: 'text-red-400',
      sendButton:
        'px-4 py-2 bg-green-900 text-green-400 border border-green-400 rounded text-xs font-mono uppercase font-bold transition-colors',
      sendButtonHover: 'hover:bg-green-800 hover:shadow-[0_0_8px_rgba(74,222,128,0.3)]',
      sendButtonDisabled: 'bg-gray-800 text-gray-500 border-gray-500 cursor-not-allowed',
      hint: 'text-right text-[10px] text-gray-500 font-mono mt-1',
      noProfileContainer:
        'p-4 bg-gray-900/95 border-t border-green-900 flex items-center justify-center',
      noProfileButton:
        'text-green-400 text-sm font-mono bg-green-950 border-2 border-green-400 rounded-lg px-5 py-3 cursor-pointer [text-shadow:0_0_10px_rgba(74,222,128,0.5)] shadow-[0_0_15px_rgba(74,222,128,0.3)] transition-all duration-200 hover:bg-green-900 hover:shadow-[0_0_20px_rgba(74,222,128,0.5)]',
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
        "relative w-full h-full z-[1000] bg-gray-900 text-[14px] flex flex-col",
      noEvents:
        "flex items-center justify-center h-full text-green-600 font-mono text-sm text-center p-5",
      noEventsMessage: "mb-2",
      scrollButton:
        'absolute bottom-[32px] right-[30px] bg-green-500 text-gray-900 rounded-full w-[50px] h-[50px] cursor-pointer font-bold shadow-[0_4px_12px_rgba(34,197,94,0.3)] transition-all duration-200 z-[1000] hover:bg-green-600 hover:scale-110 flex items-center justify-center',
      scrollButtonWithCount:
        'absolute bottom-[32px] right-[30px] bg-green-500 text-gray-900 rounded-full min-w-[50px] h-[50px] px-2 cursor-pointer font-bold shadow-[0_4px_12px_rgba(34,197,94,0.3)] transition-all duration-200 z-[1000] hover:bg-green-600 hover:scale-110 flex items-center justify-center',
      messageCard: "mx-3 px-3 py-2 bg-gray-900/30 rounded-lg transition-all",
      hashTag: "text-gray-500 text-[10px] font-mono",
      replyButton:
        "bg-transparent text-gray-500 rounded text-[10px] font-mono cursor-pointer transition-colors hover:bg-gray-900/20 hover:text-gray-300",
      title: 'text-green-400 font-mono',
      subtitle: 'text-green-600 font-mono',
      countryCard: 'bg-green-950 border-green-900 hover:border-green-400 hover:bg-green-900',
      countryCode: 'text-green-400',
      countryName: 'text-green-600',
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
      title: "text-gray-800 font-sans",
      subtitle: "text-gray-600 font-sans",
      countryCard: "bg-white border border-gray-200 hover:border-blue-500 hover:bg-blue-50",
      countryCode: "text-blue-600",
      countryName: "text-gray-600",
    },
  },
  ThemedProgressBar: {
    matrix: {
      outer: 'bg-gray-800 h-2 rounded overflow-hidden mb-2',
      inner: 'bg-green-400 h-full transition-[width] duration-300',
    },
    material: {
      outer: "bg-gray-200 h-2 rounded overflow-hidden mb-2",
      inner: "bg-blue-600 h-full transition-[width] duration-300",
    },
  },
  CornerOverlay: {
    matrix: {
      base:
        'fixed z-[9999] opacity-70 hover:opacity-100 transition-opacity duration-200 font-mono text-green-600 drop-shadow-[0_0_3px_rgba(74,222,128,0.3)]',
    },
    material: {
      base:
        "fixed z-[9999] opacity-70 hover:opacity-100 transition-opacity duration-200 font-sans text-blue-600",
    },
  },
  Modal: {
    matrix: {
      overlay: "fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-[10000] p-5",
      container: 'bg-gray-900 border-2 border-green-400 rounded-lg shadow-[0_0_20px_rgba(74,222,128,0.3)] font-mono text-green-400',
      header: 'p-4 border-b border-green-900',
      title: 'text-lg font-bold text-green-400',
      closeButton: 'p-2 rounded hover:bg-opacity-20 hover:bg-green-400 text-green-400 transition-colors',
      tabContainer: "flex gap-1 mt-4",
      tabButton: "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
      tabButtonActive: 'bg-green-400 text-gray-900',
      tabButtonInactive: 'bg-green-900 text-green-400 hover:bg-green-800',
      body: "p-4",
      flowContainer: "space-y-4",
      flowTitle: 'text-lg font-bold text-green-400 mb-4',
      flowActions: 'flex gap-2 pt-4 border-t border-green-900',
    },
    material: {
      overlay: "fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-5",
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
    matrix: 'bg-gray-900/95 text-green-600 px-3 py-2 border-b border-green-900 text-xs uppercase tracking-wider font-mono',
    material: "bg-gray-50 text-gray-600 px-3 py-2 border-b border-gray-200 text-xs uppercase tracking-wider font-medium",
  },
  ThemedButton: {
    matrix: {
      base: 'border font-mono font-bold uppercase transition-colors',
              active:
          'bg-green-400 text-gray-900 shadow-[0_0_10px_rgba(74,222,128,0.5)] border-green-400',
      inactive:
        'bg-gray-900/70 text-green-400 border-green-400 hover:bg-green-400/10 hover:shadow-[0_0_5px_rgba(74,222,128,0.3)]',
    },
    material: {
      base: 'border font-sans font-bold uppercase transition-colors',
      active: 'bg-blue-600 text-white border-blue-600',
      inactive: 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50',
    },
  },
  ThemedInput: {
          matrix:
        'bg-gray-900/80 text-green-400 placeholder-green-400/50 border border-green-400 rounded outline-none',
    material:
      'bg-white text-gray-800 placeholder-gray-400 border border-blue-600 rounded outline-none',
  },
  MarqueeBanner: {
    matrix: {
      container: 'bg-green-950 border-green-600 hover:bg-green-950',
      text: 'text-green-400 [text-shadow:0_0_5px_rgba(74,222,128,0.5)]',
      highlight: 'text-orange-400 [text-shadow:0_0_5px_rgba(251,146,60,0.5)]',
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
          'bg-gray-900/95 backdrop-blur flex flex-col items-center font-mono flex-shrink-0 p-2 text-green-400 relative overflow-visible',
      logoText:
        'text-green-400 text-lg font-bold uppercase tracking-wider drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]',
      searchIcon: 'stroke-green-600',
      clearButton:
        'px-3 py-3 bg-green-900/80 text-green-400 border border-green-400 rounded text-xs font-mono uppercase hover:bg-green-900',
      separator:
        'w-full h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent shadow-[0_0_4px_rgba(74,222,128,0.5)]',
              subheader:
          'w-full bg-gray-900/95 px-5 py-3 text-green-600 font-bold backdrop-blur',
      subheaderTitle:
        'mb-1 text-lg uppercase tracking-wider drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]',
      statsBadge:
        'text-xs text-green-400 bg-green-400/10 px-1.5 py-1 rounded border border-green-400/30',
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
      base: 'w-48 min-w-[192px] bg-gray-900/90 text-green-400 flex flex-col overflow-hidden',
      borderLeft: 'border-l border-green-900',
      borderRight: 'border-r border-green-900',
              header: 'bg-gray-900/98 text-green-600 px-3 py-3 border-b border-green-900 sticky top-0 z-20',
      headerText: 'text-[16px] uppercase tracking-wider font-mono drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]',
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
          "relative w-full max-w-[300px] md:ml-auto md:top-[10px] md:right-[10px] z-[1000] bg-gray-900/90 border border-green-900 flex flex-col", // desktop baseline
      containerMobile: "max-w-full m-0 top-0 right-0 rounded-md backdrop-blur-md",
              header:
          "sticky top-0 bg-gray-900/95 border border-green-900 border-b-green-500 p-2.5 -m-px text-green-600 font-bold z-10",
      current: "text-[10px] text-green-400",
      body: "p-2.5",
      inputWrapper: "relative flex items-center",
      icon: "absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none",
              input:
          'w-full pl-7 pr-2 py-1 bg-gray-900 text-green-400 border border-green-500 text-xs font-mono outline-none focus:border-green-500 focus:shadow-[0_0_5px_rgba(74,222,128,0.5)]',
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
          "bg-gray-900/90 text-green-500 border border-green-500/30 rounded-lg p-3 shadow-lg",
      title: 'text-green-600 text-xs mb-1 font-mono font-bold',
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
      base: "34,197,94", // green-500 RGB values
      text: 'font-mono font-bold fill-green-400',
      count: 'fill-green-600',
    },
    material: {
      base: "59,130,246", // blue-500 RGB values (already correct)
      text: "font-sans font-bold fill-blue-600",
      count: "fill-blue-700",
    },
  },
  Map: {
    matrix: {
      svg: "absolute top-0 left-0",
      rectFill: "url(#matrixLines)",
      pathFill: 'rgb(6 78 59)', // green-950 equivalent
      timezoneStroke: 'rgb(34 197 94 / 0.05)', // green-500 with 5% opacity
      regionStroke: 'rgb(34 197 94 / 0.1)', // green-500 with 10% opacity
    },
    material: {
      svg: "absolute top-0 left-0",
      rectFill: "rgb(241 245 249)", // slate-100 equivalent
      pathFill: "rgb(229 231 235)", // gray-200 equivalent
      timezoneStroke: "rgb(59 130 246 / 0.2)", // blue-500 with 20% opacity
      regionStroke: "rgb(59 130 246 / 0.3)", // blue-500 with 30% opacity
    },
  },
  ProjectionSelector: {
    matrix: {
      label: 'text-green-600 text-xs mb-1',
    },
    material: {
      label: "text-blue-600 text-xs mb-1",
    },
  },
  ProfileInputPage: {
    matrix: {
      historyButton: 'px-2 py-1 bg-gray-900 text-green-400 border border-green-400 rounded text-xs font-mono',
      error: 'bg-red-950 border border-red-600 text-red-400 p-2 rounded mb-5 text-sm',
      progressText: 'text-center text-xs text-gray-500',
    },
    material: {
      historyButton: "px-2 py-1 bg-white text-blue-600 border border-blue-600 rounded text-xs",
      error: "bg-red-50 border border-red-400 text-red-600 p-2 rounded mb-5 text-sm",
      progressText: "text-center text-xs text-gray-500",
    },
  },
  ProfileSelectionPage: {
    matrix: {
      progressText: 'text-center text-xs text-gray-500',
      profileOption: 'border-green-400',
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
        'border bg-green-400/10 border-green-400 text-green-400 font-bold shadow-inner shadow-green-400/15',
      pinned: "bg-yellow-400/5 border-yellow-400 text-yellow-300",
      geohash: "bg-blue-400/5 border-blue-400 text-blue-300",
      standard: "bg-gray-400/5 border-gray-400 text-gray-300",
      hover: 'hover:bg-green-400/10 hover:border-green-400',
      unreadContainer: "flex items-center gap-1",
      unreadDot:
        'w-2 h-2 rounded-full bg-red-600 shadow-[0_0_6px_rgba(239,68,68,0.6)]',
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
        'border bg-green-400/10 border-green-400 text-green-400 font-bold shadow-inner shadow-green-400/15',
      hover: 'hover:bg-green-400/10 hover:border-green-400',
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
    matrix: 'text-green-400 underline cursor-pointer break-all',
    material: "text-blue-600 underline cursor-pointer break-all",
  },
  HierarchyItem: {
    matrix: {
      container:
        'mb-3 p-4 cursor-pointer font-mono bg-gradient-to-br from-green-800/40 to-green-950/20 border border-green-500/30 border-l-4 border-green-400 rounded hover:from-green-700/50 hover:to-green-900/30 hover:border-green-500/60 hover:-translate-y-px transition-all shadow',
      tag: 'text-green-400 font-bold bg-green-400/10 px-1 rounded text-sm',
              count: 'text-green-600 bg-gray-900/50 px-1 rounded text-xs',
      location: 'text-green-500 font-sans text-sm',
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
          'relative top-0 left-0 w-full h-full z-[1000] bg-gray-900 text-green-400 font-mono flex flex-col overflow-x-hidden',
      list: "flex-1 overflow-y-auto p-5 pt-5",
      section: 'text-xs text-green-600 mb-2 font-bold border-b border-green-600/30 pb-1',
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
      previewCard: 'bg-green-950 border-2 border-green-400 rounded-[15px] p-6 mb-5 shadow-[0_0_20px_rgba(74,222,128,0.2)]',
      previewUsername: 'text-green-400 text-[20px] font-bold',
              previewHighlight: "bg-yellow-300 text-gray-900 px-1 rounded",
      privateContainer: 'bg-red-950 border border-red-600 rounded mb-5',
      privateToggle: 'p-3 cursor-pointer flex items-center justify-between hover:bg-red-950',
      privateToggleOpen: 'border-b border-red-600',
      privateToggleText: 'text-[12px] text-red-400 uppercase font-bold flex items-center gap-2',
      privateToggleIcon: 'text-red-400 transition-transform',
      privateContent: "p-4",
      privateItem: "mb-4",
      privateLabel: 'text-[11px] text-red-300 mb-1',
              privateValue: 'bg-gray-900 p-2 rounded text-[11px] break-all flex justify-between items-center gap-2 border border-red-950',
      privateValueText: 'text-red-300',
      copyButton: 'bg-red-950 text-red-400 border border-red-600 px-2 py-1 text-[10px] rounded cursor-pointer flex-shrink-0',
    },
    material: {
      previewCard: "bg-white border-2 border-blue-600 rounded-[15px] p-6 mb-5 shadow-md",
      previewUsername: "text-blue-600 text-[20px] font-bold",
              previewHighlight: "bg-yellow-200 text-gray-900 px-1 rounded",
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
      topicLabel: 'text-sm font-medium text-green-400',
      topicButton: "px-3 py-1 text-xs rounded-full transition-all duration-200",
              topicButtonActive:
          'bg-green-400 text-gray-900 shadow-[0_0_8px_rgba(74,222,128,0.5)]',
      topicButtonInactive:
        'bg-green-900 text-green-600 hover:bg-green-800 border border-green-400/20',
              searchInput:
          'w-full px-4 py-2 rounded border bg-gray-900 border-green-900 text-green-400 placeholder-green-600 focus:border-green-400 focus:outline-none focus:shadow-[0_0_8px_rgba(74,222,128,0.3)]',
      errorContainer:
        "text-center py-4 text-red-400 bg-red-900/20 rounded border border-red-500/20",
      noResultsContainer: 'text-center py-8 text-green-600',
      imageGrid: "grid grid-cols-3 gap-4 auto-rows-max",
      imageButton:
        "w-full rounded-lg border-none cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all duration-200 overflow-hidden",
      loadMoreButton:
        'w-full px-6 py-3 rounded-lg font-medium transition-all bg-green-900 text-green-400 border border-green-400 hover:bg-green-800 hover:shadow-[0_0_8px_rgba(74,222,128,0.3)] disabled:opacity-50 disabled:cursor-not-allowed',
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
          'flex flex-col w-screen h-screen overflow-hidden bg-gray-900 text-green-400 font-mono',
      mainArea: "flex-1 relative w-full overflow-hidden",
              chatViewContainer:
          "absolute inset-0 w-full h-full bg-gray-900 flex flex-row overflow-hidden",
      chatColumn: "flex-1 flex flex-col",
              subHeader: 'bg-gray-900/95 text-green-600 px-4 py-3 border-b border-green-900',
      subHeaderTitle:
        'text-base uppercase tracking-wider [text-shadow:0_0_10px_rgba(74,222,128,0.5)]',
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
