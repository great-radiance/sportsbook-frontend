import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";
import React from "react";
import { HorizontalTabs } from "../HorizontalTabs";

const data = [
  {
    title: "Draw - Match Result",
    match: "Crystal Palace FC - West Ham United",
    date: "20/04 20:00",
    odd: "3.47",
  },
  {
    title: "Draw - Match Result",
    match: "US Lecce - ACF Fiorentina",
    date: "20/04 19:45",
    odd: "3.25",
  },
  {
    title: "Deportivo La Coruna - Match Result",
    match: "Deportivo La Coruna - CD Mirandes",
    date: "20/04 19:30",
    odd: "1.55",
  },
  {
    title: "Draw - Match Result",
    match: "Moreirense FC - GD Estoril Praia",
    date: "20/04 20:15",
    odd: "3.45",
  },
  {
    title: "Draw - Match Result",
    match: "USL Dunkerque - Stade Lavallois MFC",
    date: "20/04 19:45",
    odd: "3.30",
  },
];

const TrendingAccas = () => {
  return (
    <div>
      <div className="flex align-items w-full  my-5 gap-2 text-[20px] items-center">
        <img
          src={`${BASE_ASSET_PUBLIC_URL}/icons/star.png`}
          alt="Star Players"
          className="w-5 h-5"
        />
        <div className="text-[20px] uppercase text-[var(--text-basic-color)] font-semibold">
          trending accas
        </div>
      </div>
      <HorizontalTabs>
        {[1, 2, 3].map((_, i) => (
          <div className="w-[300px] border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--background-element)]">
            {/* Header (PRIMARY BASED) */}
            <div
              className="flex justify-between items-center px-4 py-1 bg-[var(--primary-soft-bg)]"
              style={{ borderColor: "var(--primary-color)" }}
            >
              <span className="font-semibold text-sm text-[var(--text-basic-color)]">
                Trending Combos
              </span>

              <span
                className="px-3 py-1 rounded-md text-sm font-bold text-white"
                style={{ backgroundColor: "var(--primary-color)" }}
              >
                199.01
              </span>
            </div>

            {/* Wrapper to show rounded top */}
            <div className="bg-[var(--primary-soft-bg)]">
              {/* List (rounded top only) */}
              <div className="bg-[var(--sub-element-secondary)] rounded-t-xl overflow-hidden">
                {data.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 border-b border-dashed last:border-none"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                    {/* Left */}
                    <div className="flex gap-2 min-w-0 flex-1">
                      <img
                        src="/sportsicons/Soccer.png"
                        alt="icon"
                        className="w-4 h-4 mt-1"
                      />

                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-semibold text-[var(--text-basic-color)] break-words whitespace-normal">
                          {item.title}
                        </span>
                        <span className="text-xs text-[var(--text-sub-color)] break-words whitespace-normal">
                          {item.match}
                        </span>
                        <span className="text-[10px] text-[var(--text-sub-color)]">
                          {item.date}
                        </span>
                      </div>
                    </div>

                    {/* Odds */}
                    <div
                      className="px-3 py-1 rounded-md text-sm font-semibold shrink-0"
                      style={{
                        color: "var(--text-primary-color)",
                        backgroundColor: "var(--primary-soft-bg)",
                      }}
                    >
                      {item.odd}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div
                className="p-3 text-center border-t border-dashed"
                style={{ borderColor: "var(--border-color)" }}
              >
                <div className="text-xs text-[var(--text-sub-color)] mb-2">
                  🔥 100+ bet on this
                </div>

                <button
                  className="w-full py-2 rounded-md font-semibold text-sm"
                  style={{
                    backgroundColor: "var(--primary-strong-bg)",
                    color: "var(--text-basic-color)",
                  }}
                >
                  ADD TO BETSLIP »{" "}
                  <span style={{ color: "var(--primary-color)" }}>199.01</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </HorizontalTabs>
    </div>
  );
};

export default TrendingAccas;
