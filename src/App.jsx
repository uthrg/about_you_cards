import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  BookOpen,
  Compass,
  Swords,
  MessageCircle,
  HelpCircle,
  Shuffle,
  ChevronDown,
  ChevronUp,
  Eye,
  CheckCircle2,
  Moon,
  Stars,
  RefreshCw,
  Info,
  X,
  LayoutGrid,
  Search
} from 'lucide-react';

// 匯入你的 JSON 題庫
import storyCards from './data/storyCards.json';
import choiceCards from './data/choiceCards.json';
import scenarioCards from './data/scenarioCards.json';
import followupCards from './data/followupCards.json';
import guessCards from './data/guessCards.json';

// 若未來想換成自己找的卡背圖片，只需將圖片放進 public 資料夾，並把下方改為例如 '/card-back.jpg' 即可
const CUSTOM_CARD_BACK_IMAGE = null;

// 卡牌類型設定（對應深夜星空配色與專屬卡背光暈）
// 注意：延伸卡作為「話題追問工具牌」，不放入主牌堆直接抽取
const CARD_TYPES = {
  all: {
    label: '全部隨機',
    icon: Sparkles,
    color: 'text-amber-300',
    border: 'border-amber-400/30',
    bg: 'bg-amber-500/10',
    deckAccent: 'from-amber-500/20 via-indigo-950/90 to-slate-950',
    foilColor: 'border-amber-300/35 text-amber-200/80',
    subtitle: 'DESTINY & STORIES'
  },
  story: {
    label: '故事卡',
    icon: BookOpen,
    color: 'text-rose-300',
    border: 'border-rose-400/30',
    bg: 'bg-rose-500/10',
    deckAccent: 'from-rose-500/20 via-slate-900 to-slate-950',
    foilColor: 'border-rose-300/35 text-rose-200/80',
    subtitle: 'MEMORIES & MOMENTS'
  },
  choice: {
    label: '選擇卡',
    icon: Compass,
    color: 'text-sky-300',
    border: 'border-sky-400/30',
    bg: 'bg-sky-500/10',
    deckAccent: 'from-sky-500/20 via-slate-900 to-slate-950',
    foilColor: 'border-sky-300/35 text-sky-200/80',
    subtitle: 'CROSSROADS & VALUES'
  },
  scenario: {
    label: '情境卡',
    icon: Swords,
    color: 'text-amber-400',
    border: 'border-amber-400/35',
    bg: 'bg-amber-500/10',
    deckAccent: 'from-amber-500/25 via-stone-900 to-slate-950',
    foilColor: 'border-amber-300/40 text-amber-200/90',
    subtitle: 'DILEMMAS & CHOICES'
  },
  guess: {
    label: '猜猜卡',
    icon: HelpCircle,
    color: 'text-violet-300',
    border: 'border-violet-400/30',
    bg: 'bg-violet-500/10',
    deckAccent: 'from-violet-500/20 via-slate-900 to-slate-950',
    foilColor: 'border-violet-300/35 text-violet-200/80',
    subtitle: 'INTUITION & MIRRORS'
  },
};

// 深度設定 (Depth 1~3)
const DEPTH_CONFIG = {
  1: {
    label: '微光・輕鬆聊',
    stars: 1,
    bgGradient: 'from-slate-900 via-indigo-950/80 to-slate-950',
    badge: 'text-amber-200/90 bg-amber-500/10 border-amber-400/20'
  },
  2: {
    label: '夜色・慢慢聊',
    stars: 2,
    bgGradient: 'from-slate-950 via-slate-900 to-indigo-950/90',
    badge: 'text-sky-200/90 bg-sky-500/10 border-sky-400/20'
  },
  3: {
    label: '星空・深入聊',
    stars: 3,
    bgGradient: 'from-[#05070b] via-[#0c1021] to-[#130f26]',
    badge: 'text-purple-200/90 bg-purple-500/10 border-purple-400/20'
  }
};

export default function App() {
  // 主牌池：故事卡 35 + 選擇卡 21 + 情境卡 9 + 猜猜卡 9 = 74 張題目卡
  // 延伸卡（12 張）作為專屬追問牌庫，由玩家聊完當前題目後隨時點擊調用
  const allCards = useMemo(() => [
    ...storyCards,
    ...choiceCards,
    ...scenarioCards,
    ...guessCards
  ], []);

  const [activeFilter, setActiveFilter] = useState('all');
  const [currentCard, setCurrentCard] = useState(() => allCards[0]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [dealKey, setDealKey] = useState(0);

  // 延伸卡互動狀態
  const [activeFollowUpCard, setActiveFollowUpCard] = useState(null);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);

  // 題目總覽彈窗狀態
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [overviewFilter, setOverviewFilter] = useState('all');
  const [overviewSearch, setOverviewSearch] = useState('');

  // 各類卡牌的內部互動狀態
  const [showGuidance, setShowGuidance] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showMotivations, setShowMotivations] = useState(false);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [pairedChoiceCard, setPairedChoiceCard] = useState(null);

  // 延伸卡索引查表
  const followupMap = useMemo(() => {
    const map = {};
    followupCards.forEach(fc => { map[fc.id] = fc; });
    return map;
  }, []);

  // 針對當前題目的推薦延伸卡（智能配對）
  const currentMatchedFollowUps = useMemo(() => {
    if (!currentCard) return [];
    if (currentCard.recommendedFollowUps && currentCard.recommendedFollowUps.length > 0) {
      return currentCard.recommendedFollowUps.map(id => followupMap[id]).filter(Boolean);
    }
    // 依卡片類型與情境智能推薦
    if (currentCard.type === 'scenario') {
      return [followupMap[40], followupMap[42], followupMap[49]].filter(Boolean);
    }
    if (currentCard.type === 'choice') {
      return [followupMap[40], followupMap[41], followupMap[48]].filter(Boolean);
    }
    if (currentCard.type === 'story') {
      return [followupMap[43], followupMap[44], followupMap[47]].filter(Boolean);
    }
    return [followupMap[45], followupMap[50], followupMap[51]].filter(Boolean);
  }, [currentCard, followupMap]);

  // 開啟延伸卡彈窗
  const openFollowUp = (targetCard = null) => {
    if (targetCard) {
      setActiveFollowUpCard(targetCard);
    } else {
      const pool = currentMatchedFollowUps.length > 0 ? currentMatchedFollowUps : followupCards;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setActiveFollowUpCard(pick);
    }
    setIsFollowUpModalOpen(true);
  };

  // 抽換另一張延伸卡
  const drawNextFollowUp = () => {
    if (followupCards.length <= 1) return;
    setActiveFollowUpCard(prev => {
      const others = followupCards.filter(c => c.id !== prev?.id);
      return others[Math.floor(Math.random() * others.length)];
    });
  };

  // 根據目前分類篩選卡池
  const filteredPool = useMemo(() => {
    if (activeFilter === 'all') return allCards;
    return allCards.filter(card => card.type === activeFilter);
  }, [activeFilter, allCards]);

  // 重置卡片內部狀態
  const resetCardStates = () => {
    setShowGuidance(false);
    setShowFollowUp(false);
    setSelectedOption(null);
    setShowMotivations(false);
    setCompletedSteps([]);
    setPairedChoiceCard(null);
  };

  // 抽下一張卡（預設先蓋牌放在牌堆頂端，等待點擊翻開；若 autoReveal=true 則直接翻開）
  const drawCard = (targetType = activeFilter, autoReveal = false) => {
    setIsTransitioning(true);
    setIsRevealed(false);

    setTimeout(() => {
      const pool = targetType === 'all'
        ? allCards
        : allCards.filter(c => c.type === targetType);

      if (pool.length === 0) {
        setIsTransitioning(false);
        return;
      }

      setCurrentCard(prevCard => {
        // 確保抽到跟目前不同張的卡（若池子大於 1 張）
        if (pool.length > 1 && prevCard) {
          const otherCards = pool.filter(
            c => !(c.id === prevCard.id && c.type === prevCard.type)
          );
          if (otherCards.length > 0) {
            return otherCards[Math.floor(Math.random() * otherCards.length)];
          }
        }
        return pool[Math.floor(Math.random() * pool.length)];
      });

      resetCardStates();
      setDealKey(prev => prev + 1);
      setIsTransitioning(false);

      if (autoReveal) {
        setTimeout(() => setIsRevealed(true), 120);
      }
    }, 220);
  };

  // 切換分類 Tab
  const handleFilterChange = (type, event) => {
    setActiveFilter(type);
    drawCard(type, false);
    if (event?.currentTarget) {
      event.currentTarget.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  };

  // 猜猜卡專用：隨機搭配一張「選擇卡」的情境
  const drawPairedScenario = () => {
    if (choiceCards.length === 0) return;
    setPairedChoiceCard(prev => {
      if (choiceCards.length > 1 && prev) {
        const others = choiceCards.filter(c => c.id !== prev.id);
        return others[Math.floor(Math.random() * others.length)];
      }
      return choiceCards[Math.floor(Math.random() * choiceCards.length)];
    });
  };

  // 切換猜猜卡的步驟完成狀態
  const toggleStep = (index) => {
    setCompletedSteps(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  // 從題目總覽快速跳轉到指定卡片並直接翻開
  const jumpToCard = (card) => {
    setIsOverviewOpen(false);
    setCurrentCard(card);
    resetCardStates();
    setDealKey(prev => prev + 1);
    setIsRevealed(true);
  };

  // 題目總覽篩選與關鍵字搜尋清單
  const overviewCards = useMemo(() => {
    const basePool = overviewFilter === 'all'
      ? allCards
      : overviewFilter === 'followup'
        ? followupCards
        : allCards.filter(c => c.type === overviewFilter);

    const q = overviewSearch.trim().toLowerCase();
    if (!q) return basePool;

    return basePool.filter(c => {
      const idStr = String(c.id).padStart(2, '0');
      const textBody = c.question || c.scenario || c.task || '';
      return (
        idStr.includes(q) ||
        String(c.id) === q ||
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q)) ||
        textBody.toLowerCase().includes(q)
      );
    });
  }, [overviewFilter, overviewSearch, allCards]);

  const depthInfo = DEPTH_CONFIG[currentCard?.depth || 1];
  const typeInfo = CARD_TYPES[currentCard?.type || 'story'];
  const deckInfo = CARD_TYPES[activeFilter] || CARD_TYPES.all;
  const TypeIcon = typeInfo.icon;
  const DeckIcon = deckInfo.icon;

  return (
    <div className={`h-dvh bg-gradient-to-b ${depthInfo.bgGradient} text-slate-100 flex flex-col justify-between transition-colors duration-700 relative overflow-hidden`}>
      
      {/* 背景星空光暈裝飾 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="animate-star absolute -top-20 -left-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="animate-star absolute top-1/3 -right-24 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" style={{ animationDelay: '2s' }} />
        <div className="animate-star absolute -bottom-24 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" style={{ animationDelay: '4s' }} />
      </div>

      {/* 頂部標題與分類導覽（固定高度不隨卡牌內容擠壓） */}
      <header className="relative z-10 shrink-0 pt-3.5 pb-1.5 px-4 max-w-md mx-auto w-full">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Moon className="w-4 h-4 text-amber-300/90 shrink-0" />
            <h1 className="font-serif-tc text-base sm:text-lg font-bold tracking-wider text-slate-100 truncate">
              關於你，我還不知道的事
            </h1>
          </div>
          <button
            onClick={() => setIsOverviewOpen(true)}
            className="text-xs text-amber-200/90 hover:text-amber-100 bg-amber-400/10 hover:bg-amber-400/20 px-2.5 py-1 rounded-full border border-amber-300/30 flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-sm"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>題目總覽 ({allCards.length})</span>
          </button>
        </div>

        {/* 橫向可滑動分類標籤 */}
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar scroll-smooth">
          {Object.entries(CARD_TYPES).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const isActive = activeFilter === key;
            return (
              <button
                key={key}
                onClick={(e) => handleFilterChange(key, e)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-400/20 text-amber-200 border border-amber-300/40 shadow-sm shadow-amber-500/10'
                    : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* 中央主卡牌區（固定外框高度 + 正背面同尺寸絕對定位 + 卡片內部獨立捲動，徹底解決翻牌整頁跳動） */}
      <main className="relative z-10 flex-1 min-h-0 flex flex-col justify-center px-4 py-2 max-w-md mx-auto w-full">
        {currentCard && (
          <div className="relative w-full h-full max-h-[550px] perspective-1200">
            {/* 底部實體牌堆疊層（營造桌上放著一疊卡牌的立體厚度感） */}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 rounded-3xl bg-slate-900/90 border border-amber-200/15 shadow-xl transition-all duration-500 ${
                isRevealed
                  ? 'translate-y-2.5 scale-[0.96] rotate-[-1.2deg] opacity-35'
                  : 'translate-y-3.5 translate-x-1.5 scale-[0.96] rotate-[2.5deg] opacity-75'
              }`}
            />
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 rounded-3xl bg-slate-900/95 border border-amber-200/20 shadow-xl transition-all duration-500 ${
                isRevealed
                  ? 'translate-y-1.5 scale-[0.98] rotate-[0.8deg] opacity-50'
                  : 'translate-y-2 -translate-x-1 scale-[0.98] rotate-[-1.8deg] opacity-85'
              }`}
            />
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 rounded-3xl bg-slate-800/90 border border-amber-300/25 shadow-2xl transition-all duration-500 ${
                isRevealed
                  ? 'translate-y-0.5 scale-[0.99] opacity-65'
                  : 'translate-y-1 translate-x-0.5 scale-[0.99] rotate-[0.6deg] opacity-95'
              }`}
            />

            {/* 最上方可翻轉的主卡牌容器（鎖定 h-full，正反面獨立旋轉 + 透明度切換，完美相容手機瀏覽器） */}
            <div
              key={dealKey}
              className={`relative w-full h-full transition-all duration-300 animate-deck-deal ${
                isTransitioning ? 'opacity-0 scale-95 translate-y-3' : 'opacity-100 scale-100 translate-y-0'
              }`}
            >
              <div className="relative w-full h-full perspective-1200">
                {/* ================= 卡牌背面（未翻開時顯示，點擊即可翻牌） ================= */}
                <div
                  onClick={() => !isRevealed && setIsRevealed(true)}
                  role="button"
                  tabIndex={isRevealed ? -1 : 0}
                  onKeyDown={(e) => {
                    if (!isRevealed && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      setIsRevealed(true);
                    }
                  }}
                  className={`absolute inset-0 w-full h-full ${
                    isRevealed
                      ? 'rotate-y-180 opacity-0 invisible z-0 pointer-events-none'
                      : 'rotate-y-0 opacity-100 visible z-20 pointer-events-auto'
                  } rounded-3xl bg-gradient-to-b ${deckInfo.deckAccent} border-2 border-amber-300/35 shadow-[0_20px_50px_rgba(0,0,0,0.75)] p-4 flex flex-col justify-between cursor-pointer select-none overflow-hidden group hover:border-amber-300/60 hover:shadow-amber-500/15 transition-all duration-500 ease-in-out backface-hidden`}
                >
                  {CUSTOM_CARD_BACK_IMAGE ? (
                    <img
                      src={CUSTOM_CARD_BACK_IMAGE}
                      alt="卡牌背面"
                      className="absolute inset-0 w-full h-full object-cover rounded-3xl"
                    />
                  ) : (
                    <>
                      {/* 斜向流金微光掃過效果 */}
                      <div className="pointer-events-none absolute -inset-20 bg-gradient-to-tr from-transparent via-amber-200/10 to-transparent animate-shimmer" />

                      {/* 雙層燙金復古幾何內框 */}
                      <div className="relative z-10 flex-1 w-full rounded-2xl border border-amber-300/30 p-2 flex flex-col justify-between bg-slate-950/60">
                        <div className="flex-1 w-full rounded-xl border border-amber-200/15 p-4 flex flex-col items-center justify-between relative overflow-hidden">
                          
                          {/* 四角星芒雕花裝飾 */}
                          <span className="absolute top-2.5 left-3 text-amber-300/50 text-xs">✦</span>
                          <span className="absolute top-2.5 right-3 text-amber-300/50 text-xs">✦</span>
                          <span className="absolute bottom-2.5 left-3 text-amber-300/50 text-xs">✦</span>
                          <span className="absolute bottom-2.5 right-3 text-amber-300/50 text-xs">✦</span>

                          {/* 頂部牌堆類型徽章 */}
                          <div className="flex flex-col items-center gap-1 pt-1">
                            <span className="text-[10px] font-mono tracking-[0.25em] text-amber-200/50 uppercase">
                              {deckInfo.subtitle}
                            </span>
                            <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs border ${deckInfo.foilColor} bg-white/[0.03]`}>
                              <DeckIcon className="w-3 h-3" />
                              <span>{deckInfo.label}牌堆</span>
                            </div>
                          </div>

                          {/* 中央深夜星盤與彎月幾何圖騰 (純 SVG 繪製，免外部圖片) */}
                          <div className="relative my-1 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                            <div className="absolute w-32 h-32 rounded-full bg-amber-400/10 blur-2xl group-hover:bg-amber-400/20 transition-all" />
                            <svg
                              viewBox="0 0 200 200"
                              className="w-36 h-36 sm:w-40 sm:h-40 text-amber-200/75 drop-shadow-[0_0_12px_rgba(251,191,36,0.25)]"
                            >
                              {/* 外圈星軌虛線環 */}
                              <circle cx="100" cy="100" r="86" fill="none" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 4" opacity="0.5" />
                              <circle cx="100" cy="100" r="76" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                              
                              {/* 八角星芒幾何線條 */}
                              <rect x="46" y="46" width="108" height="108" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.35" />
                              <rect x="46" y="46" width="108" height="108" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.35" transform="rotate(45 100 100)" />
                              
                              {/* 內環與羅盤刻度 */}
                              <circle cx="100" cy="100" r="52" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.65" />
                              <circle cx="100" cy="100" r="44" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.5" />
                              
                              {/* 上下左右星芒指針 */}
                              <path d="M100 10 L104 26 L100 22 L96 26 Z" fill="currentColor" opacity="0.7" />
                              <path d="M100 190 L104 174 L100 178 L96 174 Z" fill="currentColor" opacity="0.7" />
                              <path d="M10 100 L26 104 L22 100 L26 96 Z" fill="currentColor" opacity="0.7" />
                              <path d="M190 100 L174 104 L178 100 L174 96 Z" fill="currentColor" opacity="0.7" />

                              {/* 中央精緻四芒星與月相 */}
                              <path
                                d="M100 58 C103 85, 115 97, 142 100 C115 103, 103 115, 100 142 C97 115, 85 103, 58 100 C85 97, 97 85, 100 58 Z"
                                fill="currentColor"
                                fillOpacity="0.18"
                                stroke="currentColor"
                                strokeWidth="1.3"
                              />
                              <circle cx="100" cy="100" r="6" fill="currentColor" opacity="0.9" />
                              <circle cx="100" cy="34" r="2.5" fill="currentColor" opacity="0.6" />
                              <circle cx="100" cy="166" r="2.5" fill="currentColor" opacity="0.6" />
                              <circle cx="34" cy="100" r="2.5" fill="currentColor" opacity="0.6" />
                              <circle cx="166" cy="100" r="2.5" fill="currentColor" opacity="0.6" />
                            </svg>
                          </div>

                          {/* 底部引導點擊提示 */}
                          <div className="flex flex-col items-center gap-1.5 pb-1">
                            <p className="font-serif-tc text-xs sm:text-sm tracking-widest text-amber-100/90">
                              關於你，我還不知道的事
                            </p>
                            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-400/15 border border-amber-300/40 text-amber-200 text-xs font-medium shadow-inner group-hover:bg-amber-400/25 transition">
                              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                              點擊卡牌翻開題目
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* ================= 卡牌正面（固定外框高度，內容過長時於卡片內滑動） ================= */}
                <div
                  className={`absolute inset-0 w-full h-full ${
                    isRevealed
                      ? 'rotate-y-0 opacity-100 z-20 pointer-events-auto'
                      : '-rotate-y-180 opacity-0 z-0 pointer-events-none'
                  } rounded-3xl bg-slate-900 border border-amber-200/25 shadow-[0_20px_50px_rgba(0,0,0,0.75)] p-4 sm:p-5 flex flex-col overflow-hidden transition-all duration-500 ease-in-out backface-hidden`}
                >
                  {/* 卡片固定頂部列：類型、編號、標題、蓋回牌背按鈕 */}
                  <div className="shrink-0 pb-2.5 border-b border-white/10">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border shrink-0 ${typeInfo.bg} ${typeInfo.color} ${typeInfo.border}`}>
                          <TypeIcon className="w-3 h-3" />
                          {typeInfo.label}
                        </span>
                        {currentCard.category && (
                          <span className="text-[11px] text-slate-400 truncate">
                            ・ {currentCard.category}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setIsRevealed(false)}
                        title="將卡牌蓋回背面"
                        className="text-[11px] text-slate-400 hover:text-amber-200 bg-white/5 hover:bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10 transition cursor-pointer shrink-0"
                      >
                        蓋回牌面
                      </button>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] font-mono tracking-widest text-amber-300/60 uppercase shrink-0">
                        NO. {String(currentCard.id).padStart(2, '0')}
                      </span>
                      <h2 className="font-serif-tc text-lg sm:text-xl font-bold text-white tracking-wide truncate">
                        {currentCard.title}
                      </h2>
                    </div>
                  </div>

                  {/* 卡片內部可捲動內容區 */}
                  <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 pt-3 space-y-3">
                    {/* ================= 1. 故事卡 (story) 內容 ================= */}
                    {currentCard.type === 'story' && (
                      <div className="space-y-3">
                        <p className="text-sm sm:text-[15px] leading-relaxed text-slate-100 font-normal bg-white/[0.04] p-3.5 rounded-2xl border border-white/10">
                          {currentCard.question}
                        </p>
                      </div>
                    )}

                    {/* ================= 2. 選擇卡 (choice) 與 情境卡 (scenario) 內容 ================= */}
                    {(currentCard.type === 'choice' || currentCard.type === 'scenario') && (
                      <div className="space-y-2.5">
                        <div className="bg-white/[0.04] p-3 rounded-2xl border border-white/10 space-y-1.5">
                          {currentCard.type === 'scenario' && (
                            <span className="inline-block text-[10px] font-semibold text-amber-300/80 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-400/25">
                              ⚡ 情境抉擇
                            </span>
                          )}
                          <p className="text-xs sm:text-sm leading-relaxed text-slate-100">
                            {currentCard.scenario}
                          </p>
                        </div>

                        {/* A~D 四個選項（縮小字級與內距，單畫面即可完整瀏覽） */}
                        <div className="space-y-1.5">
                          {currentCard.options.map((opt) => {
                            const isSelected = selectedOption?.id === opt.id;
                            const isScenario = currentCard.type === 'scenario';
                            return (
                              <button
                                key={opt.id}
                                onClick={() => {
                                  setSelectedOption(opt);
                                  setShowMotivations(false);
                                }}
                                className={`w-full text-left py-2 px-3 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                                  isSelected
                                    ? isScenario
                                      ? 'bg-amber-500/20 border-amber-400/60 text-white shadow-md shadow-amber-950/40'
                                      : 'bg-sky-500/20 border-sky-400/60 text-white shadow-md shadow-sky-950/40'
                                    : 'bg-white/[0.03] border-white/10 text-slate-200 hover:bg-white/[0.07]'
                                }`}
                              >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${
                                  isSelected
                                    ? isScenario ? 'bg-amber-400 text-slate-950' : 'bg-sky-400 text-slate-950'
                                    : 'bg-white/10 text-slate-300'
                                }`}>
                                  {opt.id}
                                </span>
                                <span className="text-xs leading-snug">{opt.text}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* 選中後的兩階段引導：先分享原因 -> 再自選是否看動機解析 */}
                        {selectedOption && (
                          <div className={`p-3 rounded-2xl border space-y-2 animate-fadeIn ${
                            currentCard.type === 'scenario'
                              ? 'bg-amber-950/40 border-amber-400/25'
                              : 'bg-sky-950/40 border-sky-400/25'
                          }`}>
                            <p className={`text-[11px] leading-relaxed ${
                              currentCard.type === 'scenario' ? 'text-amber-200' : 'text-sky-200'
                            }`}>
                              ✨ 你選擇了 <strong>({selectedOption.id}) {selectedOption.text}</strong>。
                              <br />
                              請先跟大家分享你為什麼這樣選！分享完後可查看動機參考：
                            </p>

                            {!showMotivations ? (
                              <button
                                onClick={() => setShowMotivations(true)}
                                className={`w-full py-1.5 px-3 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                                  currentCard.type === 'scenario'
                                    ? 'bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border-amber-300/30'
                                    : 'bg-sky-400/20 hover:bg-sky-400/30 text-sky-200 border-sky-300/30'
                                }`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                查看可能的動機解析（僅供參考）
                              </button>
                            ) : (
                              <div className={`space-y-1 pt-1.5 border-t ${
                                currentCard.type === 'scenario' ? 'border-amber-400/20' : 'border-sky-400/20'
                              }`}>
                                <div className={`text-[11px] font-medium ${
                                  currentCard.type === 'scenario' ? 'text-amber-300/80' : 'text-sky-300/80'
                                }`}>
                                  可能的背後動機參考：
                                </div>
                                <ul className="space-y-1">
                                  {selectedOption.possibleMotivations.map((m, idx) => (
                                    <li key={idx} className="text-[11px] text-slate-200 flex items-start gap-1.5 leading-relaxed">
                                      <span className={currentCard.type === 'scenario' ? 'text-amber-400 mt-0.5' : 'text-sky-400 mt-0.5'}>•</span>
                                      <span>{m}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ================= 4. 猜猜卡 (guess) 內容 ================= */}
                    {currentCard.type === 'guess' && (
                      <div className="space-y-3">
                        <p className="text-xs sm:text-sm leading-relaxed text-slate-100 bg-violet-950/30 p-3 rounded-2xl border border-violet-400/25">
                          {currentCard.task}
                        </p>

                        {/* 支援一鍵抽取選擇卡情境來搭配遊玩 */}
                        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-violet-200 font-medium">🎲 需要一個情境題嗎？</span>
                            <button
                              onClick={drawPairedScenario}
                              className="text-[11px] bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 px-2.5 py-1 rounded-full border border-violet-400/30 flex items-center gap-1 transition cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" />
                              {pairedChoiceCard ? '換一個情境' : '隨機抽情境'}
                            </button>
                          </div>

                          {pairedChoiceCard && (
                            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10 space-y-1.5">
                              <div className="text-xs text-amber-300/90 font-medium">
                                搭配情境：{pairedChoiceCard.title}
                              </div>
                              <p className="text-xs text-slate-200 leading-relaxed">
                                {pairedChoiceCard.scenario}
                              </p>
                              <div className="grid grid-cols-1 gap-1 pt-1">
                                {pairedChoiceCard.options.map(o => (
                                  <div key={o.id} className="text-[11px] text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg">
                                    <strong className="text-violet-300 mr-1.5">{o.id}.</strong>
                                    {o.text}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 互動式步驟清單 */}
                        <div className="space-y-1.5">
                          <div className="text-[11px] text-slate-400">進行步驟（點擊可標記完成）：</div>
                          {currentCard.steps.map((step, idx) => {
                            const isDone = completedSteps.includes(idx);
                            return (
                              <button
                                key={idx}
                                onClick={() => toggleStep(idx)}
                                className={`w-full text-left px-3 py-2 rounded-xl border text-xs flex items-center justify-between transition cursor-pointer ${
                                  isDone
                                    ? 'bg-violet-500/15 border-violet-400/40 text-violet-200 line-through opacity-75'
                                    : 'bg-white/[0.03] border-white/10 text-slate-200'
                                }`}
                              >
                                <span>{idx + 1}. {step}</span>
                                <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isDone ? 'text-violet-300' : 'text-slate-600'}`} />
                              </button>
                            );
                          })}
                        </div>

                        {currentCard.revealMethod && (
                          <div className="text-[11px] text-slate-300 bg-white/[0.03] p-2.5 rounded-xl border border-white/10">
                            🔔 <strong>揭曉方式：</strong>{currentCard.revealMethod}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 共通：這張卡的核心思考 */}
                    {currentCard.coreTheme && (
                      <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-300/20 text-[11px] text-amber-200/90 leading-relaxed flex items-start gap-2">
                        <span className="shrink-0">🎯</span>
                        <div>
                          <strong className="text-amber-100 font-medium mr-1">這張卡的核心：</strong>
                          <span>{currentCard.coreTheme}</span>
                        </div>
                      </div>
                    )}

                    {/* 共通：回答方向提示 (answerGuidance) 折疊區 */}
                    {currentCard.answerGuidance && currentCard.answerGuidance.length > 0 && (
                      <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-hidden">
                        <button
                          onClick={() => setShowGuidance(!showGuidance)}
                          className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-medium text-amber-200/90 hover:bg-white/5 transition cursor-pointer"
                        >
                          <span>💡 回答方向提示</span>
                          {showGuidance ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {showGuidance && (
                          <div className="px-3 pb-3 pt-1 space-y-2 border-t border-white/5">
                            {currentCard.answerGuidance.map((group, i) => (
                              <div key={i}>
                                <div className="text-[11px] font-semibold text-slate-300 mb-1">
                                  ▸ {group.title}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {group.examples.map((ex, j) => (
                                    <span
                                      key={j}
                                      className="text-[11px] bg-white/5 text-slate-300 px-2 py-0.5 rounded-md border border-white/10"
                                    >
                                      {ex}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 共通：延伸問題 (followUpQuestions) 折疊區 */}
                    {currentCard.followUpQuestions && currentCard.followUpQuestions.length > 0 && (
                      <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-hidden">
                        <button
                          onClick={() => setShowFollowUp(!showFollowUp)}
                          className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-medium text-slate-300 hover:bg-white/5 transition cursor-pointer"
                        >
                          <span>💬 延伸問題 ({currentCard.followUpQuestions.length})</span>
                          {showFollowUp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {showFollowUp && (
                          <ul className="px-3 pb-3 pt-1 space-y-1.5 border-t border-white/5">
                            {currentCard.followUpQuestions.map((q, idx) => (
                              <li key={idx} className="text-[11px] text-slate-200 leading-relaxed flex items-start gap-1.5">
                                <span className="text-amber-300/80">•</span>
                                <span>{q}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* 共通：搭配延伸卡繼續聊（以這題為基礎，換個視角追問） */}
                    <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-400/30 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 text-[11px] text-emerald-200 font-medium">
                          <MessageCircle className="w-3 h-3 text-emerald-300 shrink-0" />
                          <span>搭配延伸卡換視角：</span>
                        </div>
                        <button
                          onClick={() => openFollowUp()}
                          className="text-[10px] text-emerald-200 hover:text-white bg-emerald-500/20 hover:bg-emerald-500/30 px-2 py-0.5 rounded-full border border-emerald-400/35 transition cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          隨機抽
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {currentMatchedFollowUps.map(fc => (
                          <button
                            key={fc.id}
                            onClick={() => openFollowUp(fc)}
                            className="text-[11px] bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-400/25 transition cursor-pointer flex items-center gap-1 group"
                          >
                            <span className="text-emerald-400 font-mono text-[10px]">#{fc.id}</span>
                            <span>{fc.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 底部手機單手操作列（固定高度） */}
      <footer className="relative z-10 shrink-0 px-4 pb-4 pt-1.5 max-w-md mx-auto w-full">
        <div className="flex gap-2">
          {/* 快捷抽延伸卡（搭配當前題目換個視角） */}
          {isRevealed && (
            <button
              onClick={() => openFollowUp()}
              className="px-3.5 py-3 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-200 text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
            >
              <MessageCircle className="w-4 h-4" />
              抽延伸卡
            </button>
          )}

          {/* 主抽卡 / 翻牌 / 換一張按鈕 */}
          {!isRevealed ? (
            <>
              <button
                onClick={() => drawCard(activeFilter, false)}
                className="px-3.5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
              >
                <Shuffle className="w-4 h-4" />
                洗牌換一張
              </button>
              <button
                onClick={() => setIsRevealed(true)}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-400 hover:from-amber-200 hover:to-amber-300 text-slate-950 font-semibold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                翻開這張卡
              </button>
            </>
          ) : (
            <button
              onClick={() => drawCard(activeFilter, false)}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-400 hover:from-amber-200 hover:to-amber-300 text-slate-950 font-semibold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <Shuffle className="w-4 h-4" />
              抽下一張卡 / 跳過
            </button>
          )}
        </div>
      </footer>

      {/* 題目總覽彈窗 (Question Overview / Card Directory Modal) */}
      {isOverviewOpen && (
        <div
          onClick={() => setIsOverviewOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-[88dvh] rounded-3xl bg-slate-900/95 border border-amber-300/30 shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden"
          >
            {/* 總覽頂部標題與關閉 */}
            <div className="shrink-0 p-4 border-b border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-amber-300" />
                  <h2 className="font-serif-tc text-base font-bold text-white">
                    題目總覽與快速跳轉
                  </h2>
                  <span className="text-xs text-slate-400">
                    ({overviewCards.length} 張)
                  </span>
                </div>
                <button
                  onClick={() => setIsOverviewOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 搜尋框 */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={overviewSearch}
                  onChange={(e) => setOverviewSearch(e.target.value)}
                  placeholder="搜尋題號 (如 22)、標題或題目關鍵字..."
                  className="w-full bg-slate-950/80 border border-white/15 focus:border-amber-300/50 rounded-xl pl-8 pr-8 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition"
                />
                {overviewSearch && (
                  <button
                    onClick={() => setOverviewSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* 分類篩選膠囊 */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                {[
                  { key: 'all', label: `全部題目 (${allCards.length})` },
                  { key: 'story', label: `故事卡 (${storyCards.length})` },
                  { key: 'choice', label: `選擇卡 (${choiceCards.length})` },
                  { key: 'scenario', label: `情境卡 (${scenarioCards.length})` },
                  { key: 'guess', label: `猜猜卡 (${guessCards.length})` },
                  { key: 'followup', label: `延伸卡 (${followupCards.length})` }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setOverviewFilter(tab.key)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition cursor-pointer ${
                      overviewFilter === tab.key
                        ? 'bg-amber-400/20 text-amber-200 border border-amber-300/40'
                        : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 題目列表（點擊即跳轉） */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-2">
              {overviewCards.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500">
                  找不到符合「{overviewSearch}」的題目
                </div>
              ) : (
                overviewCards.map(card => {
                  const isCurrent = currentCard?.id === card.id && currentCard?.type === card.type;
                  const cType = CARD_TYPES[card.type] || {
                    label: '延伸卡',
                    color: 'text-emerald-300',
                    bg: 'bg-emerald-500/10',
                    border: 'border-emerald-400/30'
                  };
                  const previewText = card.question || card.scenario || card.task || '';

                  return (
                    <button
                      key={`${card.type}-${card.id}`}
                      onClick={() => {
                        if (card.type === 'followup') {
                          setIsOverviewOpen(false);
                          openFollowUp(card);
                        } else {
                          jumpToCard(card);
                        }
                      }}
                      className={`w-full text-left p-3 rounded-2xl border transition flex flex-col gap-1 cursor-pointer group ${
                        isCurrent
                          ? 'bg-amber-400/15 border-amber-300/50 shadow-sm'
                          : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[11px] text-amber-300/80 font-semibold shrink-0">
                            NO.{String(card.id).padStart(2, '0')}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${cType.bg} ${cType.color} ${cType.border}`}>
                            {cType.label}
                          </span>
                          <span className="font-serif-tc text-sm font-bold text-slate-100 truncate">
                            {card.title}
                          </span>
                        </div>
                        <span className="text-[11px] text-amber-300/70 group-hover:translate-x-0.5 transition-transform shrink-0">
                          {isCurrent ? '目前題目' : '前往 →'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {previewText}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 延伸卡專屬互動彈窗 (Follow-up Card Companion Modal) */}
      {isFollowUpModalOpen && activeFollowUpCard && (
        <div
          onClick={() => setIsFollowUpModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-slate-900/95 border-2 border-emerald-400/40 shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-5 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            {/* 頂部標題列與關閉按鈕 */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-emerald-500/15 text-emerald-300 border-emerald-400/40">
                  <MessageCircle className="w-3.5 h-3.5" />
                  延伸卡・{activeFollowUpCard.category}
                </span>
                <span className="text-xs font-mono text-emerald-300/60 uppercase">
                  NO. {String(activeFollowUpCard.id).padStart(2, '0')}
                </span>
              </div>
              <button
                onClick={() => setIsFollowUpModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 延伸卡大標題與問題 */}
            <div className="text-center space-y-2 py-1">
              <h3 className="text-xs font-medium text-emerald-300/80 tracking-wider">
                {activeFollowUpCard.title}
              </h3>
              <p className="text-xl font-serif-tc text-emerald-100 leading-relaxed bg-emerald-950/40 p-4 rounded-2xl border border-emerald-400/30 shadow-inner">
                「{activeFollowUpCard.question}」
              </p>
            </div>

            {/* 適用時機 */}
            {activeFollowUpCard.useWhen && (
              <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/10 space-y-1.5">
                <div className="text-[11px] text-slate-400 font-medium">📌 適合使用的時機：</div>
                <div className="flex flex-wrap gap-1.5">
                  {activeFollowUpCard.useWhen.map((w, idx) => (
                    <span key={idx} className="text-xs bg-emerald-500/10 text-emerald-200 px-2.5 py-1 rounded-lg border border-emerald-400/20">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 換個方式問 */}
            {activeFollowUpCard.alternativePrompts && activeFollowUpCard.alternativePrompts.length > 0 && (
              <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/10 space-y-1.5">
                <div className="text-[11px] text-slate-400 font-medium">💬 你也可以換個方式問：</div>
                <ul className="space-y-1">
                  {activeFollowUpCard.alternativePrompts.map((alt, idx) => (
                    <li key={idx} className="text-xs text-slate-200 pl-2 border-l-2 border-emerald-400/40">
                      {alt}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 回答方向提示 */}
            {activeFollowUpCard.answerGuidance && activeFollowUpCard.answerGuidance.length > 0 && (
              <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/10 space-y-1.5">
                <div className="text-[11px] text-amber-300/80 font-medium">💡 回答思考方向：</div>
                {activeFollowUpCard.answerGuidance.map((g, idx) => (
                  <div key={idx} className="space-y-1">
                    <span className="text-[11px] text-slate-400 font-medium">▸ {g.title}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {g.examples.map((ex, j) => (
                        <span key={j} className="text-[11px] bg-white/5 text-slate-300 px-2 py-0.5 rounded border border-white/10">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 底部操作按鈕 */}
            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                onClick={drawNextFollowUp}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" />
                換一張延伸卡
              </button>
              <button
                onClick={() => setIsFollowUpModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                返回目前題目
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}