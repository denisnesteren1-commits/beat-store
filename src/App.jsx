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

  // Компонент стильной кнопки файла
  const FileUpload = ({ label, subtext }) => (
    <div className="file-upload-wrapper">
      <div className="file-info">
        <span className="file-name">{label}</span>
        <span className="file-status">{subtext}</span>
      </div>
      <label className="custom-file-btn">
        CHOOSE FILE
        <input type="file" style={{display: 'none'}} />
      </label>
    </div>
  );

  const RenderForm = ({ title, beatToEdit }) => (
    <div className="app-viewport with-nav">
      <div className="nav-bar-fixed">
        <button className="back-icon" onClick={() => setActiveTab(beatToEdit ? 'shop' : 'profile')}>←</button>
        <span className="nav-title">{title}</span>
        <div style={{width: 30}}></div>
      </div>
      
      <div className="form-scroll-content">
        <div className="upload-cover-section">
          <div className="cover-preview-wrapper">
            <img src={beatToEdit?.image || "https://via.placeholder.com/150"} className="preview-img" alt="cover" />
            <label className="edit-cover-overlay">
              <span>CHANGE COVER</span>
              <input type="file" style={{display: 'none'}} />
            </label>
          </div>
        </div>

        <div className="input-group">
          <label>BEAT TITLE</label>
          <input type="text" className="st-input" placeholder="Title" defaultValue={beatToEdit?.title?.replace('fresso - ', '')} />
        </div>

        <div className="side-by-side">
          <div className="input-group">
            <label>BPM</label>
            <input type="number" className="st-input" placeholder="140" defaultValue={beatToEdit?.bpm} />
          </div>
          <div className="input-group">
            <label>KEY</label>
            <input type="text" className="st-input" placeholder="Cm" defaultValue={beatToEdit?.key} />
          </div>
        </div>

        <div className="input-group">
          <label>GENRE / TAGS (Type your own)</label>
          <input type="text" className="st-input" placeholder="Dark, Trap, Sad..." defaultValue={beatToEdit?.tags?.join(', ')} />
        </div>

        <div className="file-section-box">
          <FileUpload label="MP3 Tagged" subtext="Public preview file" />
          <FileUpload label="WAV File" subtext="High-quality master" />
          <FileUpload label="Trackout" subtext="ZIP / Stems archive" />
        </div>

        <button className="main-btn" style={{marginTop: 20}}>SAVE CHANGES</button>
        <div style={{height: 100}}></div>
      </div>
    </div>
  );

  if (activeTab === 'profile') return (
    <div className="app-viewport profile-centered">
      <div className="nav-bar-fixed">
        <button className="back-icon" onClick={() => setActiveTab('shop')}>✕</button>
      </div>
      <div className="profile-edit-zone">
        <div className="profile-img-container">
          <img src={user?.photo_url || "https://via.placeholder.com/120"} className="avatar-huge" alt="user" />
          <label className="avatar-edit-btn">
            +
            <input type="file" style={{display: 'none'}} />
          </label>
        </div>
        <h2 className="user-name">{user?.first_name || "Producer"}</h2>
        <p className="user-handle">@{user?.username || "fresso_beats"}</p>
        <button className="main-btn" onClick={() => setActiveTab('admin')}>UPLOAD NEW BEAT</button>
      </div>
    </div>
  );

  if (activeTab === 'admin') return <RenderForm title="Upload Beat" />;
  if (activeTab === 'edit') return <RenderForm title="Settings" beatToEdit={selectedBeat} />;

  if (activeTab === 'beatPage' && selectedBeat) return (
    <div className="app-viewport with-nav">
      <div className="nav-bar-fixed">
        <button className="back-icon" onClick={() => setActiveTab('shop')}>←</button>
        <span className="nav-title">Beat Info</span>
        <div style={{width: 30}}></div>
      </div>
      <div className="beat-details-screen">
        <img src={selectedBeat.image} className="full-cover" alt="beat" />
        <h1 className="beat-name-big">{selectedBeat.title.replace('fresso - ', '')}</h1>
        <div className="beat-meta-line">
          <span>{selectedBeat.bpm} BPM</span> • <span>{selectedBeat.key}</span>
        </div>
        <div className="license-container">
          <div className="license-item">
            <div className="lic-text"><h4>MP3 LEASE</h4><p>High Quality, Tagged</p></div>
            <button className="price-btn">{selectedBeat.priceWav / 2}₽</button>
          </div>
          <div className="license-item">
            <div className="lic-text"><h4>WAV LICENSE</h4><p>Un-Tagged Master</p></div>
            <button className="price-btn">{selectedBeat.priceWav}₽</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-viewport main-shop">
      <header className="main-header">
        <h1 className="brand-logo">FRESSO</h1>
        <div className="header-right">
          <button className={`filter-btn ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? '✕' : 'Filter'}
          </button>
          <img src={user?.photo_url || "https://via.placeholder.com/36"} className="avatar-top" onClick={() => setActiveTab('profile')} alt="me" />
        </div>
      </header>

      {showFilters && (
        <div className="filter-panel-overlay">
          <div className="filter-panel">
            <div className="filter-section">
              <div className="label-row"><label>MAX BPM</label><span>{filterBpm}</span></div>
              <input type="range" min="60" max="220" value={filterBpm} onChange={(e) => setFilterBpm(e.target.value)} className="range-input" />
            </div>
            <div className="filter-section">
              <label>SEARCH TAGS</label>
              <input type="text" className="st-input" placeholder="Type tag..." />
              <div className="tag-selector">
                {allExistingTags.map(tag => (
                  <button 
                    key={tag} 
                    className={`tag-chip ${selectedTags.includes(tag) ? 'selected' : ''}`}
                    onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <button className="apply-btn" onClick={() => setShowFilters(false)}>APPLY FILTERS</button>
          </div>
        </div>
      )}

      <div className="search-box">
        <input type="text" className="search-input-field" placeholder="Search beats..." onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={() => setCurrentPlaying(null)} />

      <div className="beat-list">
        {filteredBeats.map((beat) => (
          <div key={beat.id} className="beat-item-card" onClick={() => { setSelectedBeat(beat); setActiveTab('beatPage'); }}>
            <div className="play-trigger" onClick={(e) => togglePlay(e, beat)}>
              <img src={beat.image} className="card-thumb" alt="beat" />
              <div className="play-overlay">
                {currentPlaying?.id === beat.id && !audioRef.current?.paused ? <div className="icon-pause-white"></div> : <div className="icon-play-white"></div>}
              </div>
            </div>
            <div className="card-info">
              <div className="card-top-row">
                <span className="card-name">{beat.title.replace('fresso - ', '')}</span>
                <button className="edit-dots" onClick={(e) => { e.stopPropagation(); setSelectedBeat(beat); setActiveTab('edit'); }}>•••</button>
              </div>
              <div className="card-meta"><span>{beat.bpm} BPM</span> • <span>{beat.key}</span></div>
              {currentPlaying?.id === beat.id && <input type="range" className="player-seek" value={progress} readOnly />}
            </div>
            <div className="card-price">{beat.priceWav}₽</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;