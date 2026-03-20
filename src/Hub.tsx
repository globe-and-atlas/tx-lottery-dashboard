import './Hub.css';
import lotteryData from './data/lottery-data.json';

const VARIANTS = [
    {
        id: 'base',
        title: 'Original Core',
        icon: '💻',
        desc: 'The unstyled, data-dense original version designed for developers.',
        url: '/index-base.html',
        badge: 'Baseline'
    },
    {
        id: 'mass',
        title: 'Texas Proud',
        icon: '🤠',
        desc: 'A friendly, approachable mass-market design tailored for everyday Texans.',
        url: '/index-mass.html',
        badge: ''
    },
    {
        id: 'sports',
        title: 'Sports Betting',
        icon: '🏈',
        desc: 'A gamified, fast-paced layout mimicking popular sportsbook mobile apps.',
        url: '/index-sports.html',
        badge: 'New'
    },
    {
        id: 'alt',
        title: 'Cyberpunk',
        icon: '📟',
        desc: 'A grungy, glowing terminal interface for data-hungry hackers.',
        url: '/index-alt.html',
        badge: ''
    },
    {
        id: 'neo',
        title: 'Neo-Brutalist',
        icon: '🏗️',
        desc: 'Bold colors, thick borders, and stark typography. High contrast.',
        url: '/index-neo.html',
        badge: ''
    },
    {
        id: 'lux',
        title: 'Luxury Editorial',
        icon: '🍸',
        desc: 'Serif fonts, minimalist spacing, tailored for high-net-worth players.',
        url: '/index-lux.html',
        badge: ''
    },
    {
        id: 'tac',
        title: 'Tactical',
        icon: '🪖',
        desc: 'Militaristic, rugged UI for the prepper or outdoorsman.',
        url: '/index-tac.html',
        badge: ''
    },
    {
        id: 'mom',
        title: 'Treat Yourself',
        icon: '🍷',
        desc: 'Soft pastels and Pinterest aesthetics for a relaxed shopping feel.',
        url: '/index-mom.html',
        badge: ''
    },
    {
        id: 'genz',
        title: 'Bag Chaser',
        icon: '💸',
        desc: 'Hypebeast / Y2K energy. Acid greens, uppercase typography, unapologetic.',
        url: '/index-genz.html',
        badge: ''
    },
    {
        id: 'mystic',
        title: 'Cosmic Odds',
        icon: '🔮',
        desc: 'Consult the Oracle. An astrology and tarot-inspired aesthetic.',
        url: '/index-mystic.html',
        badge: ''
    },
    {
        id: 'alpha',
        title: 'W Rizz',
        icon: '💀',
        desc: 'Ultra-stimulated iPad kid energy. Fast, loud, and totally unhinged.',
        url: '/index-alpha.html',
        badge: 'New'
    },
    {
        id: 'vegas',
        title: 'High Roller',
        icon: '🎰',
        desc: 'Casino carpet aesthetics, deep mahogany, and flashing marquee lights.',
        url: '/index-vegas.html',
        badge: 'New'
    },
    {
        id: 'bit',
        title: 'Scratch Quest',
        icon: '👾',
        desc: '8-Bit MS-DOS pixel art. Equip your inventory and grind for EXP.',
        url: '/index-bit.html',
        badge: 'New'
    },
    {
        id: 'gibson',
        title: 'Gibson Matrix',
        icon: '📟',
        desc: 'Direct neural link to the state lottery grid. Green phosphor, high-risk, high-reward.',
        url: '/index-gibson.html',
        badge: 'Hot'
    }
];

export default function Hub() {
    return (
        <div className="hub-container">
            <header className="hub-header">
                <h1>Texas Lottery Toolkit</h1>
                <p>10 distinct architectural aesthetics. Same state-of-the-art math engine under the hood. Choose your flavor below.</p>
            </header>

            <div className="hub-grid">
                {VARIANTS.map(variant => (
                    <a key={variant.id} href={variant.url} className="hub-card">
                        {variant.badge && <span className="hub-card-badge">{variant.badge}</span>}
                        <div className="hub-card-icon">{variant.icon}</div>
                        <h2 className="hub-card-title">{variant.title}</h2>
                        <p className="hub-card-desc">{variant.desc}</p>
                    </a>
                ))}
            </div>

            <footer className="hub-footer">
                Data last updated: {new Date(lotteryData.generatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
            </footer>
        </div>
    );
}
