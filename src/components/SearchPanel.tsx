// import React from "react"; // Not needed for JSX

interface SearchPanelProps {
  searchText: string;
  onSearch: (value: string) => void;
  zoomedGeohash: string | null;
  isMobileView?: boolean;
  theme?: "matrix" | "material";
}

const styles = {
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
      "w-full pl-7 pr-2 py-1 bg-black text-green-400 border border-green-500 text-xs font-mono outline-none focus:border-green-500 focus:shadow-[0_0_5px_rgba(0,255,0,0.5)]",
    inputMobile: "pl-10 py-3 text-base rounded",
    button:
      "mt-2 w-full py-1 bg-green-900 text-green-400 border border-green-500 font-mono text-xs uppercase cursor-pointer",
    buttonMobile: "py-3 text-sm rounded",
    followButton:
      "mt-2 w-full py-1 bg-purple-900 text-purple-300 border border-purple-300 font-mono text-xs uppercase cursor-pointer transition-colors hover:bg-purple-800 hover:border-purple-200",
    followButtonMobile: "py-3 text-sm rounded"
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
    followButtonMobile: "py-3 text-sm"
  }
} as const;

export function SearchPanel({
  searchText,
  onSearch,
  zoomedGeohash,
  isMobileView = false,
  theme = "matrix"
}: SearchPanelProps) {
  const t = styles[theme];

  return (
    <div className={`${t.container} ${isMobileView ? t.containerMobile : ""}`}>
      <div className={t.header}>
        <div className="mb-1">SEARCH MESSAGES:</div>
        {zoomedGeohash && (
          <div className={t.current}>CURRENT: "{zoomedGeohash.toUpperCase()}"</div>
        )}
      </div>
      <div className={t.body}>
        <div className={t.inputWrapper}>
          <div className={t.icon}>
            <svg
              width={isMobileView ? 16 : 14}
              height={isMobileView ? 16 : 14}
              viewBox="0 0 24 24"
              fill="none"
              stroke={theme === "matrix" ? "#00aa00" : "#4b5563"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>

          <input
            type="text"
            value={searchText}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="hello in:nyc from:@jack"
            className={`${t.input} ${isMobileView ? t.inputMobile : ""}`}
          />
        </div>
        <button
          onClick={() => onSearch("")}
          className={`${t.button} ${isMobileView ? t.buttonMobile : ""}`}
        >
          RESET
        </button>
        <button
          onClick={() => {
            window.open(
              "https://primal.net/p/nprofile1qqsvvullpd0j9rltp2a3qqvgy9udf3vgh389p7zhzu65fd258dz5lqg9ryan5",
              "_blank"
            );
          }}
          id="follow-nostr-btn"
          className={`${t.followButton} ${isMobileView ? t.followButtonMobile : ""}`}
        >
          FOLLOW ME ON NOSTR
        </button>
      </div>
    </div>
  );
}

