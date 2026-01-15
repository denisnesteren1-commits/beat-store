import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import inventory from './inventory';

function App() {
  const [activeTab, setActiveTab] = useState('shop'); 
  const [selectedBeat, setSelectedBeat] = useState(null);
  const [currentPlaying, setCurrentPlaying] = useState(null);
  const [progress, setProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showFilters, setShowFilters] = useState(false);
  const [filterBpm, setFilterBpm] = useState(200);
  const [selectedTags, setSelectedTags] = useState([]);
  const [filterKey, setFilterKey] = useState('');

  const audioRef = useRef(null);
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;

  useEffect(() => {
    tg?.ready();
    tg?.expand();
  }, []);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0);
    }
  };

  const togglePlay = (e, beat) => {
    e.stopPropagation();
    if (currentPlaying?.id === beat.id) {
      audioRef.current.paused ? audioRef.current.play() : audioRef.current.pause();
    } else {
      setCurrentPlaying(beat);
      setProgress(0);
      if (audioRef.current) {
        audioRef.current.src = beat.audio;
        audioRef.current.play();
      }
    }
  };

  const filteredBeats = inventory.filter(beat => {
    const matchesSearch = beat.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBpm = parseInt(beat.bpm) <= filterBpm;
    const matchesKey = filterKey === '' || beat.key === filterKey;
    const matchesTags = selectedTags.length === 0 || selectedTags.every(t => beat.tags.includes(t));
    return matchesSearch && matchesBpm && matchesKey && matchesTags;
  });

  const allExistingTags = [...new Set(inventory.flatMap(b => b.tags))];

  // Специфический рендер строки файла
  const FileRow = ({ label, subtext }) => (
    <div className="custom-file-row">
      <div className="file-texts">
        <span className="file-label">{label}</span>
        <span className="file-subtext">{subtext}</span>
      </div>
      <label className="file-select-trigger">
        CHOOSE
        <input type="file" className="hidden-input" />
      </label>
    </div>
  );

  // Страница добавления/редактирования
  const RenderForm = ({ title, beatToEdit }) => (
    <div className="app-viewport with-fixed-nav">
      <div className="top-navigation-bar">
        <button className="nav-back-btn" onClick={() => setActiveTab(beatToEdit ? 'shop' : 'profile')}>←</button>
        <span className="nav-page-title">{title}</span>
        <div style={{width: 44}}></div>
      </div>
      
      <div className="scrollable-form-container">
        <div className="edit-cover-section">
          <div className="cover-frame">
            <img src={beatToEdit?.image || "https://via.placeholder.com/300"} className="image-preview" alt="cover" />
            <label className="upload-overlay-label">
              <span>CHANGE IMAGE</span>
              <input type="file" className="hidden-input" />
            </label>
          </div>
        </div>

        <div className="form-input-group">
          <label className="field-caption">BEAT NAME</label>
          <input type="text" className="premium-input" placeholder="Enter title..." defaultValue={beatToEdit?.title?.replace('fresso - ', '')} />
        </div>

        <div className="form-row-split">
          <div className="form-input-group">
            <label className="field-caption">BPM</label>
            <input type="number" className="premium-input" placeholder="140" defaultValue={beatToEdit?.bpm} />
          </div>
          <div className="form-input-group">
            <label className="field-caption">KEY</label>
            <input type="text" className="premium-input" placeholder="Cm" defaultValue={beatToEdit?.key} />
          </div>
        </div>

        <div className="form-input-group">
          <label className="field-caption">TAGS (Manual Input)</label>
          <input type="text" className="premium-input" placeholder="Dark, Trap, Sad..." defaultValue={beatToEdit?.tags?.join(', ')} />
        </div>

        <div className="file-management-card">
          <FileRow label="MP3 PREVIEW" subtext="Required for playback" />
          <FileRow label="WAV MASTER" subtext="High-quality license" />
          <FileRow label="STEMS (ZIP)" subtext="Trackouts archive" />
        </div>

        <button className="action-main-button" style={{marginTop: '10px'}}>SAVE MASTERPIECE</button>
        <div className="spacer-bottom"></div>
      </div>
    </div>
  );

  if (activeTab === 'profile') return (
    <div className="app-viewport centered-profile-layout">
      <div className="top-navigation-bar transparent">
        <button className="nav-back-btn" onClick={() => setActiveTab('shop')}>✕</button>
      </div>
      <div className="profile-hero-section">
        <div className="profile-avatar-wrapper">
          <img src={user?.photo_url || "https://via.placeholder.com/150"} className="main-avatar-img" alt="user" />
          <label className="avatar-upload-icon">
            <span className="plus-sym">+</span>
            <input type="file" className="hidden-input" />
          </label>
        </div>
        <h2 className="display-name">{user?.first_name || "Producer"}</h2>
        <p className="display-handle">@{user?.username || "fresso_beats"}</p>
        <button className="action-main-button" onClick={() => setActiveTab('admin')}>UPLOAD NEW BEAT</button>
      </div>
    </div>
  );

  if (activeTab === 'admin') return <RenderForm title="Upload" />;
  if (activeTab === 'edit') return <RenderForm title="Edit Beat" beatToEdit={selectedBeat} />;

  if (activeTab === 'beatPage' && selectedBeat) return (
    <div className="app-viewport with-fixed-nav">
      <div className="top-navigation-bar">
        <button className="nav-back-btn" onClick={() => setActiveTab('shop')}>←</button>
        <span className="nav-page-title">Store</span>
        <div style={{width: 44}}></div>
      </div>
      <div className="beat-landing-page">
        <div className="landing-cover-box">
          <img src={selectedBeat.image} className="landing-img" alt="beat" />
        </div>
        <h1 className="landing-title">{selectedBeat.title.replace('fresso - ', '')}</h1>
        <div className="landing-meta">
          <span className="meta-pill">{selectedBeat.bpm} BPM</span>
          <span className="meta-pill">{selectedBeat.key}</span>
        </div>
        <div className="license-tiers-list">
          <div className="tier-card">
            <div className="tier-info">
              <h3>MP3 LICENSE</h3>
              <p>High Quality, Tagged</p>
            </div>
            <button className="tier-buy-btn">{selectedBeat.priceWav / 2}₽</button>
          </div>
          <div className="tier-card">
            <div className="tier-info">
              <h3>WAV LICENSE</h3>
              <p>Pro Quality, Untagged</p>
            </div>
            <button className="tier-buy-btn">{selectedBeat.priceWav}₽</button>
          </div>
        </div>
        <div className="spacer-bottom"></div>
      </div>
    </div>
  );

  return (
    <div className="app-viewport">
      <header className="home-header-area">
        <h1 className="brand-logo-text">FRESSO</h1>
        <div className="header-controls">
          <button className={`filter-toggle-btn ${showFilters ? 'is-active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? '✕' : 'Filter'}
          </button>
          <img src={user?.photo_url || "https://via.placeholder.com/40"} className="header-user-avatar" onClick={() => setActiveTab('profile')} alt="me" />
        </div>
      </header>

      {showFilters && (
        <div className="filters-overlay-container">
          <div className="filters-content-sheet">
            <div className="filter-group">
              <div className="filter-label-row">
                <label className="field-caption">BPM LIMIT</label>
                <span className="value-highlight">{filterBpm}</span>
              </div>
              <input type="range" min="60" max="220" value={filterBpm} onChange={(e) => setFilterBpm(e.target.value)} className="modern-range-slider" />
            </div>
            <div className="filter-group">
              <label className="field-caption">TAGS</label>
              <div className="tag-cloud-container">
                {allExistingTags.map(tag => (
                  <button key={tag} className={`tag-selection-chip ${selectedTags.includes(tag) ? 'is-selected' : ''}`} onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <button className="apply-filters-btn" onClick={() => setShowFilters(false)}>APPLY</button>
          </div>
        </div>
      )}

      <div className="main-search-container">
        <input type="text" className="global-search-input" placeholder="Search for beats..." onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={() => setCurrentPlaying(null)} />

      <div className="vertical-beat-feed">
        {filteredBeats.map((beat) => (
          <div key={beat.id} className="feed-item-card" onClick={() => { setSelectedBeat(beat); setActiveTab('beatPage'); }}>
            <div className="feed-play-box" onClick={(e) => togglePlay(e, beat)}>
              <img src={beat.image} className="feed-thumb-img" alt="beat" />
              <div className="feed-play-icon-overlay">
                {currentPlaying?.id === beat.id && !audioRef.current?.paused ? <div className="pause-icon-svg"></div> : <div className="play-icon-svg"></div>}
              </div>
            </div>
            <div className="feed-item-info">
              <div className="feed-item-header">
                <span className="feed-item-title">{beat.title.replace('fresso - ', '')}</span>
                <button className="feed-more-options" onClick={(e) => { e.stopPropagation(); setSelectedBeat(beat); setActiveTab('edit'); }}>•••</button>
              </div>
              <div className="feed-item-stats">{beat.bpm} BPM • {beat.key}</div>
              {currentPlaying?.id === beat.id && (
                <div className="mini-player-track">
                   <div className="mini-player-fill" style={{width: `${progress}%`}}></div>
                </div>
              )}
            </div>
            <div className="feed-item-price">{beat.priceWav}₽</div>
          </div>
        ))}
        <div className="spacer-bottom"></div>
      </div>
    </div>
  );
}

export default App;