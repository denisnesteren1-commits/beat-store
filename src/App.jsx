import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import inventory from './inventory';

function App() {
  // Состояния навигации и данных
  const [activeTab, setActiveTab] = useState('shop'); 
  const [selectedBeat, setSelectedBeat] = useState(null);
  const [currentPlaying, setCurrentPlaying] = useState(null);
  const [progress, setProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Состояния фильтрации
  const [showFilters, setShowFilters] = useState(false);
  const [filterBpm, setFilterBpm] = useState(200);
  const [selectedTags, setSelectedTags] = useState([]);

  const audioRef = useRef(null);
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;

  // Инициализация Telegram WebApp
  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      tg.headerColor = '#000000';
    }
  }, [tg]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      setProgress((current / duration) * 100 || 0);
    }
  };

  const togglePlay = (e, beat) => {
    e.stopPropagation();
    if (currentPlaying?.id === beat.id) {
      if (audioRef.current.paused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
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
    const matchesTags = selectedTags.length === 0 || selectedTags.every(t => beat.tags.includes(t));
    return matchesSearch && matchesBpm && matchesTags;
  });

  const allExistingTags = [...new Set(inventory.flatMap(b => b.tags))];

  // Вспомогательный компонент для выбора файлов (MP3, WAV, ZIP)
  const FileUploadRow = ({ label, description }) => (
    <div className="file-upload-row">
      <div className="file-info-block">
        <span className="file-main-label">{label}</span>
        <span className="file-sub-label">{description}</span>
      </div>
      <label className="file-action-btn">
        CHOOSE
        <input type="file" className="hidden-input-element" />
      </label>
    </div>
  );

  // Универсальная форма (Загрузка и Редактирование)
  const RenderEditorForm = ({ pageTitle, editingTarget }) => (
    <div className="app-viewport with-nav-offset">
      <div className="fixed-header-navigation">
        <button className="nav-icon-button" onClick={() => setActiveTab(editingTarget ? 'shop' : 'profile')}>←</button>
        <span className="nav-display-title">{pageTitle}</span>
        <div className="nav-placeholder"></div>
      </div>
      
      <div className="scroll-content-container">
        <div className="cover-upload-wrapper">
          <div className="cover-box-preview">
            <img src={editingTarget?.image || "https://via.placeholder.com/400"} className="preview-image-source" alt="beat cover" />
            <label className="cover-change-overlay">
              <span className="overlay-text">CHANGE COVER</span>
              <input type="file" className="hidden-input-element" />
            </label>
          </div>
        </div>

        <div className="form-field-group">
          <label className="form-input-label">BEAT TITLE</label>
          <input type="text" className="full-width-input" placeholder="Enter beat name..." defaultValue={editingTarget?.title?.replace('fresso - ', '')} />
        </div>

        <div className="form-grid-two-cols">
          <div className="form-field-group">
            <label className="form-input-label">BPM</label>
            <input type="number" className="full-width-input" placeholder="140" defaultValue={editingTarget?.bpm} />
          </div>
          <div className="form-field-group">
            <label className="form-input-label">KEY</label>
            <input type="text" className="full-width-input" placeholder="C# Min" defaultValue={editingTarget?.key} />
          </div>
        </div>

        <div className="form-field-group">
          <label className="form-input-label">GENRE / TAGS (Custom)</label>
          <input type="text" className="full-width-input" placeholder="Dark Trap, Melodic, Sad..." defaultValue={editingTarget?.tags?.join(', ')} />
        </div>

        <div className="files-container-box">
          <FileUploadRow label="MP3 PREVIEW" description="Tagged file for the player" />
          <FileUploadRow label="WAV MASTER" description="High quality un-tagged file" />
          <FileUploadRow label="TRACKOUTS" description="ZIP archive with stems" />
        </div>

        <button className="primary-action-button" style={{marginTop: '15px'}}>SAVE ALL CHANGES</button>
        <div className="bottom-safe-spacer"></div>
      </div>
    </div>
  );

  // Страница профиля
  if (activeTab === 'profile') return (
    <div className="app-viewport profile-center-layout">
      <div className="fixed-header-navigation transparent-bg">
        <button className="nav-icon-button" onClick={() => setActiveTab('shop')}>✕</button>
      </div>
      <div className="profile-main-content">
        <div className="avatar-huge-wrapper">
          <img src={user?.photo_url || "https://via.placeholder.com/150"} className="avatar-image-circle" alt="user" />
          <label className="avatar-edit-plus">
            <span>+</span>
            <input type="file" className="hidden-input-element" />
          </label>
        </div>
        <h2 className="profile-user-name">{user?.first_name || "New Producer"}</h2>
        <p className="profile-user-handle">@{user?.username || "fresso_beats"}</p>
        <button className="primary-action-button" onClick={() => setActiveTab('admin')}>UPLOAD NEW BEAT</button>
      </div>
    </div>
  );

  if (activeTab === 'admin') return <RenderEditorForm pageTitle="Upload" />;
  if (activeTab === 'edit') return <RenderEditorForm pageTitle="Settings" editingTarget={selectedBeat} />;

  // Страница покупки бита
  if (activeTab === 'beatPage' && selectedBeat) return (
    <div className="app-viewport with-nav-offset">
      <div className="fixed-header-navigation">
        <button className="nav-icon-button" onClick={() => setActiveTab('shop')}>←</button>
        <span className="nav-display-title">Store</span>
        <div className="nav-placeholder"></div>
      </div>
      <div className="beat-details-view">
        <div className="details-cover-box">
          <img src={selectedBeat.image} className="details-img" alt="beat" />
        </div>
        <h1 className="details-title">{selectedBeat.title.replace('fresso - ', '')}</h1>
        <div className="details-meta-row">
          <span className="meta-tag">{selectedBeat.bpm} BPM</span>
          <span className="meta-tag">{selectedBeat.key}</span>
        </div>
        <div className="license-list-stack">
          <div className="license-card-item">
            <div className="license-info">
              <h3>BASIC MP3</h3>
              <p>Tagged Preview License</p>
            </div>
            <button className="buy-price-tag">{selectedBeat.priceWav / 2}₽</button>
          </div>
          <div className="license-card-item">
            <div className="license-info">
              <h3>PRO WAV</h3>
              <p>Untagged High-Quality Master</p>
            </div>
            <button className="buy-price-tag">{selectedBeat.priceWav}₽</button>
          </div>
        </div>
        <div className="bottom-safe-spacer"></div>
      </div>
    </div>
  );

  // Главная страница (Shop)
  return (
    <div className="app-viewport">
      <header className="shop-top-header">
        <h1 className="main-logo-fresso">FRESSO</h1>
        <div className="header-right-actions">
          <button className={`filter-trigger-btn ${showFilters ? 'is-active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? '✕' : 'Filter'}
          </button>
          <img src={user?.photo_url || "https://via.placeholder.com/42"} className="top-nav-avatar" onClick={() => setActiveTab('profile')} alt="me" />
        </div>
      </header>

      {showFilters && (
        <div className="filter-sheet-overlay">
          <div className="filter-sheet-body">
            <div className="filter-item-group">
              <div className="filter-header-row"><label>MAX BPM</label><span>{filterBpm}</span></div>
              <input type="range" min="60" max="220" value={filterBpm} onChange={(e) => setFilterBpm(e.target.value)} className="custom-range-input" />
            </div>
            <div className="filter-item-group">
              <label className="form-input-label">FILTER BY TAGS</label>
              <div className="tags-cloud-wrap">
                {allExistingTags.map(tag => (
                  <button 
                    key={tag} 
                    className={`tag-pill-btn ${selectedTags.includes(tag) ? 'selected' : ''}`}
                    onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <button className="apply-filter-btn" onClick={() => setShowFilters(false)}>APPLY FILTERS</button>
          </div>
        </div>
      )}

      <div className="search-bar-wrap">
        <input type="text" className="global-search-input" placeholder="Find your vibe..." onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={() => setCurrentPlaying(null)} />

      <div className="beats-vertical-list">
        {filteredBeats.map((beat) => (
          <div key={beat.id} className="feed-beat-card" onClick={() => { setSelectedBeat(beat); setActiveTab('beatPage'); }}>
            <div className="beat-play-control" onClick={(e) => togglePlay(e, beat)}>
              <img src={beat.image} className="beat-card-thumb" alt="beat" />
              <div className="play-status-overlay">
                {currentPlaying?.id === beat.id && !audioRef.current?.paused ? <div className="pause-icon"></div> : <div className="play-icon"></div>}
              </div>
            </div>
            <div className="beat-card-info">
              <div className="beat-title-row">
                <span className="beat-name-text">{beat.title.replace('fresso - ', '')}</span>
                <button className="beat-options-dots" onClick={(e) => { e.stopPropagation(); setSelectedBeat(beat); setActiveTab('edit'); }}>•••</button>
              </div>
              <div className="beat-meta-text">{beat.bpm} BPM • {beat.key}</div>
              {currentPlaying?.id === beat.id && (
                <div className="beat-progress-bar">
                   <div className="beat-progress-fill" style={{width: `${progress}%`}}></div>
                </div>
              )}
            </div>
            <div className="beat-card-price">{beat.priceWav}₽</div>
          </div>
        ))}
        <div className="bottom-safe-spacer"></div>
      </div>
    </div>
  );
}

export default App;