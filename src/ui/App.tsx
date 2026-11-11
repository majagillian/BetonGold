import { useEffect, useRef, useState } from 'preact/hooks';
import { advanceMonth, checkLevel, clearSave, load, newGame, save } from '../game/engine';
import type { AvatarConfig, GameState } from '../game/types';
import { Creator } from './Creator';
import { Game, WinModal } from './Game';
import { Intro, Title } from './Intro';

type Screen = 'title' | 'intro' | 'creator' | 'game' | 'edit';

export function App() {
  const [game, setGame] = useState<GameState | null>(() => load());
  const [screen, setScreen] = useState<Screen>('title');
  const [toast, setToast] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const commit = (next: GameState) => {
    save(next);
    setGame(next);
  };

  const showToast = (t: string) => {
    setToast(t);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3800);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const act = (fn: (s: GameState) => string | void) => {
    if (!game) return;
    const next = structuredClone(game);
    const r = fn(next);
    checkLevel(next);
    commit(next);
    if (r) showToast(r);
  };

  const nextMonth = () => {
    if (!game) return;
    const next = structuredClone(game);
    advanceMonth(next);
    commit(next);
    setShowReport(true);
  };

  const dismiss = (k: 'levelup' | 'demotion' | 'report' | 'win') => {
    if (!game) return;
    if (k === 'report') {
      setShowReport(false);
      return;
    }
    const next = structuredClone(game);
    if (k === 'levelup') next.pendingLevelUp = null;
    if (k === 'demotion') next.pendingDemotion = null;
    if (k === 'win') next.flags.winShown = 1;
    commit(next);
    setShowReport(false);
  };

  const start = (name: string, avatar: AvatarConfig) => {
    const g = newGame(name, avatar);
    commit(g);
    setScreen('game');
  };

  let content;
  if (screen === 'title' || (screen === 'game' && !game)) {
    content = <Title hasSave={!!game} onNew={() => setScreen('intro')} onContinue={() => setScreen('game')} />;
  } else if (screen === 'intro') {
    content = <Intro onDone={() => setScreen('creator')} />;
  } else if (screen === 'creator') {
    content = <Creator onDone={start} />;
  } else if (screen === 'edit' && game) {
    content = (
      <Creator
        initial={game.avatar}
        initialName={game.playerName}
        onCancel={() => setScreen('game')}
        onDone={(name, a) => {
          act((s) => {
            s.playerName = name;
            s.avatar = a;
            return 'Figur gespeichert!';
          });
          setScreen('game');
        }}
      />
    );
  } else if (game) {
    content = (
      <>
        <Game
          s={game}
          act={act}
          nextMonth={nextMonth}
          onEditAvatar={() => setScreen('edit')}
          onQuit={() => setScreen('title')}
          onRestart={() => {
            clearSave();
            setGame(null);
            setScreen('intro');
          }}
          dismiss={dismiss}
          showReport={showReport}
          markRead={() => {
            if (game.messages.some((m) => !m.read)) {
              const next = structuredClone(game);
              next.messages.forEach((m) => (m.read = true));
              commit(next);
            }
          }}
        />
        {game.won && !game.flags.winShown && !game.pendingLevelUp && <WinModal s={game} onClose={() => dismiss('win')} />}
      </>
    );
  }

  return (
    <div class="app">
      {content}
      {toast && (
        <div class="toast" onClick={() => setToast(null)}>
          <span style={{ fontSize: '22px' }}>💬</span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
