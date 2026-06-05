import { useState } from 'react';
import { Heart, MessageCircle, Share2, Music2, Plus, Volume2, VolumeX } from 'lucide-react';
import { StreamingPlayer, PlaylistPlayer, FeedPlayer } from 'react-vast-player';
import type { FeedSlot } from 'react-vast-player';
import './App.css';

type Tab = 'streaming' | 'playlist' | 'feed';

const VAST =
    'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=';

const TABS: { id: Tab; label: string; desc: string }[] = [
    { id: 'streaming', label: 'Streaming', desc: 'Single video with pre / mid / post-roll VAST ads' },
    { id: 'playlist',  label: 'Playlist',  desc: 'Auto-advancing queue with per-item ad support' },
    { id: 'feed',      label: 'Feed',      desc: 'Swipeable feed with configurable ad intervals' },
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
  renderItem={(slot) => <MyOverlay slot={slot} />}
/>`,
};

const FEED_ITEMS = [
    { id: '1', src: '/videos/mixkit-portrait-of-a-woman-in-a-pool-1259-hd-ready.mp4', title: 'Relaxing pool vibes ✨ #summer #pool #chill' },
    { id: '2', src: '/videos/100797-video-720.mp4',  title: 'Beautiful moments 🌸 #lifestyle #aesthetic' },
    { id: '3', src: '/videos/101374-video-720.mp4',  title: 'Living my best life 🔥 #trending #foryou' },
    { id: '4', src: '/videos/101457-video-720.mp4',  title: 'Good vibes only ✌️ #viral #fyp' },
    { id: '5', src: '/videos/101576-video-720.mp4',  title: 'Every day is a blessing 🙏 #gratitude #life' },
    { id: '6', src: '/videos/101604-video-720.mp4',  title: 'This is the way 💫 #explore #discover' },
];

const FEED_META: Record<string, { username: string; music: string; likes: string; comments: string; shares: string }> = {
    '1': { username: '@mixkit.co',    music: 'Tropical House Mix · Summer Beats', likes: '2.4M', comments: '18.2K', shares: '98K'  },
    '2': { username: '@pexels.films', music: 'Original Sound · pexels.films',     likes: '1.1M', comments: '7.6K',  shares: '42K'  },
    '3': { username: '@studio.vid',   music: 'Aesthetic Vibes · lofi beats',       likes: '890K', comments: '5.2K',  shares: '31K'  },
    '4': { username: '@moments.co',   music: 'Viral Sound · trending',             likes: '3.2M', comments: '22.1K', shares: '145K' },
    '5': { username: '@daily.life',   music: 'Grateful · ambient',                 likes: '670K', comments: '4.8K',  shares: '19K'  },
    '6': { username: '@explore.vid',  music: 'Discovery · chill hop',              likes: '1.5M', comments: '11.3K', shares: '67K'  },
};

function ActionBtn({ icon, count }: { icon: React.ReactNode; count: string }): React.JSX.Element {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            {icon}
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                {count}
            </span>
        </div>
    );
}

interface FeedOverlayProps {
    slot: FeedSlot;
    muted: boolean;
    onToggleMute: () => void;
}

function FeedOverlay({ slot, muted, onToggleMute }: FeedOverlayProps): React.ReactNode {
    if (slot.type !== 'content') return null;
    const meta = FEED_META[slot.item.id];
    if (!meta) return null;

    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {/* Bottom gradient */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
                background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.78))',
            }} />

            {/* Mute button — top-right */}
            <button
                className="mute-btn"
                onClick={onToggleMute}
                style={{
                    position: 'absolute', top: 14, right: 14,
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.45)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', pointerEvents: 'auto',
                }}
            >
                {muted ? <VolumeX size={17} color="#fff" /> : <Volume2 size={17} color="#fff" />}
            </button>

            {/* Right action bar */}
            <div style={{
                position: 'absolute', right: 12, bottom: 90,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
                pointerEvents: 'auto',
            }}>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#666', border: '2px solid #fff' }} />
                    <div style={{
                        position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)',
                        width: 20, height: 20, borderRadius: '50%',
                        background: '#fe2c55', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Plus size={12} color="#fff" strokeWidth={3} />
                    </div>
                </div>
                <ActionBtn icon={<Heart size={28} color="#fff" />} count={meta.likes} />
                <ActionBtn icon={<MessageCircle size={28} color="#fff" />} count={meta.comments} />
                <ActionBtn icon={<Share2 size={28} color="#fff" />} count={meta.shares} />
            </div>

            {/* Bottom info */}
            <div style={{
                position: 'absolute', bottom: 24, left: 12, right: 72,
                display: 'flex', flexDirection: 'column', gap: 6,
            }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                    {meta.username}
                </span>
                <span style={{ color: '#fff', fontSize: 13, lineHeight: 1.4, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                    {slot.item.title}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Music2 size={13} color="#fff" />
                    <span style={{ color: '#fff', fontSize: 12, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                        {meta.music}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function App() {
    const [tab, setTab] = useState<Tab>('streaming');
    const [feedMuted, setFeedMuted] = useState(true);
    const active = TABS.find((t) => t.id === tab)!;

    return (
        <div className='app'>
            <div className='bg-grid' aria-hidden />

            <header className='header'>
                <div className='header-inner'>
                    <div className='logo'>
                        <div className='logo-mark' aria-hidden>
                            <svg width='14' height='14' viewBox='0 0 14 14' fill='none'>
                                <polygon points='2,1 13,7 2,13' fill='currentColor' />
                            </svg>
                        </div>
                        <div className='logo-text'>
                            <span className='logo-name'>react-vast-player</span>
                            <span className='logo-tag'>VAST-powered video for React</span>
                        </div>
                    </div>
                    <div className='pills'>
                        <span className='pill'>VAST 2–4</span>
                        <span className='pill'>React 19+</span>
                        <a className='pill pill-cta' href='https://www.npmjs.com/package/react-vast-player' target='_blank' rel='noreferrer'>
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
                    <div className={`player-frame${tab === 'feed' ? ' feed-frame' : ''}`}>
                        {tab === 'streaming' && (
                            <StreamingPlayer
                                key='streaming'
                                src='https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
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
                                    { id: '1', src: 'https://www.w3schools.com/html/movie.mp4', title: 'Demo Reel' },
                                    { id: '2', src: 'https://www.pexels.com/download/video/32091954/', title: 'Big Buck Bunny' },
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
                                items={FEED_ITEMS}
                                vastUrls={[VAST]}
                                adInterval={2}
                                muted={feedMuted}
                                autoplay
                                style={{ width: '100%', height: '100%' }}
                                renderItem={(slot) => (
                                    <FeedOverlay
                                        slot={slot}
                                        muted={feedMuted}
                                        onToggleMute={() => setFeedMuted(m => !m)}
                                    />
                                )}
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
                            <span /><span /><span />
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
                <a href='https://github.com/rwndy/react-vast-player' target='_blank' rel='noreferrer'>
                    GitHub ↗
                </a>
            </footer>
        </div>
    );
}
