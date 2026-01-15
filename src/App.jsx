import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import inventory from './inventory';

function App() {
  const [activeTab, setActiveTab] = useState('shop');
  const [currentPlaying, setCurrentPlaying] = useState(null);
  const [progress, setProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');
  
  const audioRef = useRef(null);
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;

  useEffect(() => {
    tg?.ready();
    tg?.expand();
  }, []);

  // Синхронизация прогресса
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  // Перемотка ползунком
  const onSeek = (e) => {
    const newTime = (e.target.value / 100) * audioRef.current.duration;
    audioRef.current.currentTime = newTime;
    setProgress(e.target.value);
  };

  const togglePlay = (e, beat) => {
    e.stopPropagation();
    if (currentPlaying?.id === beat.id) {
      audioRef.current.paused ? audioRef.current.play() : audioRef.current.pause();
    } else {
      setCurrentPlaying(beat);
      setProgress(0); // Сброс ползунка при переключении
      if (audioRef.current) {
        audioRef.current.src = beat.audio;
        audioRef.current.play();
      }
    }
  };

  const filteredBeats = inventory.filter(beat => {
    const matchesSearch = beat.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = activeGenre === 'All' || beat.tags.includes(activeGenre);
    return matchesSearch && matchesGenre;
  });

  // Получаем уникальные жанры из инвентаря для фильтров
  const availableGenres = ['All', ...new Set(inventory.flatMap(b => b.tags))];

  if (activeTab === 'profile') {
    return (
      <div className="app-viewport">
        <div className="nav-bar">
          <button className="back-icon" onClick={() => setActiveTab('shop')}>✕</button>
          <span className="nav-title">Profile</span>
          <div style={{width: 20}}></div>
        </div>
        <div className="profile-content">
          <img src={user?.photo_url || "https://via.placeholder.com/100"} className="avatar-big" />
          <h2>{user?.first_name || "Producer"}</h2>
          <p className="user-tag">@{user?.username || "fresso_beats"}</p>
          <button className="main-btn" onClick={() => setActiveTab('admin')}>UPLOAD BEAT</button>
        </div>
      </div>
    );
  }

  if (activeTab === 'admin') {
    return (
      <div className="app-viewport">
        <div className="nav-bar">
          <button className="back-icon" onClick={() => setActiveTab('profile')}>←</button>
          <span className="nav-title">New Beat</span>
          <div style={{width: 20}}></div>
        </div>
        <div className="form-container">
          <input type="text" className="st-input" placeholder="Title (without FRESSO)" />
          <div className="side-by-side">
            <input type="number" className="st-input" placeholder="BPM" />
            <select className="st-input">
              <option value="">Key (Scale)</option>
              <option value="Cm">C Minor</option>
              <option value="Am">A Minor</option>
              {/* Можно добавить больше */}
            </select>
          </div>
          <input type="text" className="st-input" placeholder="Tags (Trap, Dark...)" />
          <div className="file-zone">MP3 + WAV + Image</div>
          <button className="main-btn">PUBLISH</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-viewport">
      <header className="header-flex">
        <h1 className="logo-text">BEATS</h1>
        <img src={user?.photo_url || "https://via.placeholder.com/32"} className="avatar-sm" onClick={() => setActiveTab('profile')} />
      </header>

      <div className="controls-area">
        <input type="text" className="search-field" placeholder="Search..." onChange={(e) => setSearchQuery(e.target.value)} />
        <div className="genre-row">
          {availableGenres.map(g => (
            <button key={g} className={`tag-btn ${activeGenre === g ? 'active' : ''}`} onClick={() => setActiveGenre(g)}>{g}</button>
          ))}
        </div>
      </div>

      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={() => {setCurrentPlaying(null); setProgress(0);}} />

      <div className="beat-column">
        {filteredBeats.map((beat) => (
          <div key={beat.id} className="beat-card">
            <div className="cover-box" onClick={(e) => togglePlay(e, beat)}>
              <img src={beat.image} className="img-fit" />
              <div className="play-state">
                {currentPlaying?.id === beat.id && !audioRef.current?.paused ? (
                  <div className="pause-white"></div>
                ) : (
                  <div className="play-white"></div>
                )}
              </div>
            </div>
            
            <div className="beat-details">
              <div className="name-row">
                <span className="name-txt">{beat.title.replace('fresso - ', '')}</span>
                <button className="more-btn">•••</button>
              </div>
              <div className="info-tags">
                <span>{beat.bpm} BPM</span>
                <span>{beat.key}</span>
              </div>
              
              {currentPlaying?.id === beat.id && (
                <input 
                  type="range" 
                  className="seek-slider" 
                  value={progress} 
                  onChange={onSeek} 
                />
              )}
            </div>
            <div className="price-label">{beat.priceWav}₽</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;