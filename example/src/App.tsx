import { useState } from 'react';
import { StreamingPlayer, PlaylistPlayer, FeedPlayer } from 'react-vast-player';
import './App.css';

type Tab = 'streaming' | 'playlist' | 'feed';

const VAST =
    'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=';

const TABS: { id: Tab; label: string; desc: string }[] = [
    {
        id: 'streaming',
        label: 'Streaming',
        desc: 'Single video with pre / mid / post-roll VAST ads',
    },
    {
        id: 'playlist',
        label: 'Playlist',
        desc: 'Auto-advancing queue with per-item ad support',
    },
    {
        id: 'feed',
        label: 'Feed',
        desc: 'Swipeable feed with configurable ad intervals',
    },
];

const CODE: Record<Tab, string> = {
    streaming: `import { StreamingPlayer } from 'react-vast-player'

<StreamingPlayer
  src="https://example.com/video.mp4"
  prerollVastUrl={VAST_TAG_URL}
  autoplay muted
/>`,
    playlist: `import { PlaylistPlayer } from 'react-vast-player'

<PlaylistPlayer
  queue={[
    { id: '1', src: 'episode-1.mp4', title: 'Episode I' },
    { id: '2', src: 'episode-2.mp4', title: 'Episode II' },
  ]}
  autoAdvance autoplay muted
/>`,
    feed: `import { FeedPlayer } from 'react-vast-player'

<FeedPlayer
  items={contentItems}
  vastUrls={[VAST_TAG_URL]}
  adInterval={2}
  autoplay muted
/>`,
};

export default function App() {
    const [tab, setTab] = useState<Tab>('streaming');
    const active = TABS.find((t) => t.id === tab)!;

    return (
        <div className='app'>
            <div className='bg-grid' aria-hidden />

            <header className='header'>
                <div className='header-inner'>
                    <div className='logo'>
                        <div className='logo-mark' aria-hidden>
                            <svg
                                width='14'
                                height='14'
                                viewBox='0 0 14 14'
                                fill='none'
                            >
                                <polygon
                                    points='2,1 13,7 2,13'
                                    fill='currentColor'
                                />
                            </svg>
                        </div>
                        <div className='logo-text'>
                            <span className='logo-name'>react-vast-player</span>
                            <span className='logo-tag'>
                                VAST-powered video for React
                            </span>
                        </div>
                    </div>
                    <div className='pills'>
                        <span className='pill'>VAST 2–4</span>
                        <span className='pill'>React 18+</span>
                        <a
                            className='pill pill-cta'
                            href='https://npmjs.com/package/react-vast-player'
                            target='_blank'
                            rel='noreferrer'
                        >
                            npm ↗
                        </a>
                    </div>
                </div>
            </header>

            <main className='main'>
                <nav className='tabs' role='tablist' aria-label='Player modes'>
                    {TABS.map((t, i) => (
                        <button
                            key={t.id}
                            role='tab'
                            aria-selected={tab === t.id}
                            className={`tab-btn${tab === t.id ? ' active' : ''}`}
                            onClick={() => setTab(t.id)}
                        >
                            <span className='tab-num'>0{i + 1}</span>
                            {t.label}
                        </button>
                    ))}
                </nav>

                <section className='stage'>
                    <div className='player-frame'>
                        {tab === 'streaming' && (
                            <StreamingPlayer
                                key='streaming'
                                src='https://www.w3schools.com/html/movie.mp4'
                                prerollVastUrl={VAST}
                                muted
                                autoplay
                                style={{ width: '100%', height: '100%' }}
                                onPlay={(state, cfg) => console.log('[streaming] play', state, cfg)}
                                onPause={(state, cfg) => console.log('[streaming] pause', state, cfg)}
                                onStop={(state, cfg) => console.log('[streaming] stop', state, cfg)}
                                onSeek={(time, state) => console.log('[streaming] seek', time, state)}
                                onStateChange={(state, cfg) => console.log('[streaming] stateChange', state, cfg)}
                            />
                        )}
                        {tab === 'playlist' && (
                            <PlaylistPlayer
                                key='playlist'
                                queue={[
                                    {
                                        id: '1',
                                        src: 'https://www.w3schools.com/html/movie.mp4',
                                        title: 'Demo Reel',
                                    },
                                    {
                                        id: '2',
                                        src: 'https://www.w3schools.com/html/movie.mp4',
                                        title: 'Big Buck Bunny',
                                    },
                                ]}
                                autoAdvance
                                muted
                                
                                style={{ width: '100%', height: '100%' }}
                                onPlay={(state, cfg) => console.log('[playlist] play', state, cfg)}
                                onPause={(state, cfg) => console.log('[playlist] pause', state, cfg)}
                                onStop={(state, cfg) => console.log('[playlist] stop', state, cfg)}
                                onSeek={(time, state) => console.log('[playlist] seek', time, state)}
                                onStateChange={(state, cfg) => console.log('[playlist] stateChange', state, cfg)}
                            />
                        )}
                        {tab === 'feed' && (
                            <FeedPlayer
                                key='feed'
                                items={[
                                    {
                                        id: '1',
                                        src: 'https://www.w3schools.com/html/movie.mp4',
                                        title: 'Clip A',
                                    },
                                    {
                                        id: '2',
                                        src: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                                        title: 'Clip B',
                                    },
                                    {
                                        id: '3',
                                        src: 'https://www.w3schools.com/html/mov_bbb.mp4',
                                        title: 'Clip C',
                                    },
                                ]}
                                vastUrls={[VAST]}
                                adInterval={2}
                                muted
                                autoplay
                                style={{ width: '100%', height: '100%' }}
                                onPlay={(state, cfg) => console.log('[feed] play', state, cfg)}
                                onPause={(state, cfg) => console.log('[feed] pause', state, cfg)}
                                onStop={(state, cfg) => console.log('[feed] stop', state, cfg)}
                                onSeek={(time, state) => console.log('[feed] seek', time, state)}
                                onStateChange={(state, cfg) => console.log('[feed] stateChange', state, cfg)}
                            />
                        )}
                        <div className='frame-corner tl' aria-hidden />
                        <div className='frame-corner tr' aria-hidden />
                        <div className='frame-corner bl' aria-hidden />
                        <div className='frame-corner br' aria-hidden />
                    </div>

                    <div className='stage-meta'>
                        <span className='meta-mode'>{active.label}</span>
                        <span className='meta-sep'>—</span>
                        <span className='meta-desc'>{active.desc}</span>
                    </div>
                </section>

                <div className='code-panel'>
                    <div className='code-toolbar'>
                        <div className='code-dots' aria-hidden>
                            <span />
                            <span />
                            <span />
                        </div>
                        <span className='code-file'>usage.tsx</span>
                    </div>
                    <pre className='code-pre'>
                        <code className='code-content'>{CODE[tab]}</code>
                    </pre>
                </div>
            </main>

            <footer className='footer'>
                <span>MIT License</span>
                <span className='footer-dot'>·</span>
                <span>react-vast-player</span>
                <span className='footer-dot'>·</span>
                <a href='https://github.com' target='_blank' rel='noreferrer'>
                    GitHub ↗
                </a>
            </footer>
        </div>
    );
}
