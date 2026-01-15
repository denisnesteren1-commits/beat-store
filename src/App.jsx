import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import inventory from './inventory';

function App() {
  const [activeTab, setActiveTab] = useState('shop');
  const [selectedBeat, setSelectedBeat] = useState(null);
  const [currentPlaying, setCurrentPlaying] = useState(null);
  const [progress, setProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');
  
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;

  useEffect(() => {
    tg?.ready();
    tg?.expand();
  }, [tg]);

  const handleTimeUpdate = () => {
    const duration = audioRef.current.duration;
    const currentTime = audioRef.current.currentTime;
    if (duration) setProgress((currentTime / duration) * 100);
  };

  // Перемотка бита
  const handleSeek = (e) => {
    if (!currentPlaying) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percent = x / width;
    audioRef.current.currentTime = percent * audioRef.current.duration;
  };

  const togglePlay = (e, beat) => {
    e.stopPropagation();
    if (currentPlaying?.id === beat.id) {
      audioRef.current.paused ? audioRef.current.play() : audioRef.current.pause();
    } else {
      setCurrentPlaying(beat);
      if (audioRef.current) {
        audioRef.current.src = beat.audio;
        audioRef.current.play();
      }
    }
  };

  // Фильтрация
  const filteredBeats = inventory.filter(beat => {
    const matchesSearch = beat.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = activeGenre === 'All' || beat.tags.includes(activeGenre);
    return matchesSearch && matchesGenre;
  });

  const genres = ['All', 'Dark', 'Trap', 'Melodic', 'Hard'];

  // ЭКРАН ПРОФИЛЯ
  if (activeTab === 'profile') {
    return (
      <div className="container">
        <div className="nav-header">
          <button className="icon-btn" onClick={() => setActiveTab('shop')}>✕</button>
          <span className="nav-title">Profile</span>
          <div style={{width: 24}}></div>
        </div>
        <div className="profile-section">
          <img src={user?.photo_url || "https://via.placeholder.com/100"} className="avatar-lg" alt="" />
          <h2>{user?.first_name || "Producer"}</h2>
          <p className="username">@{user?.username || "fresso_user"}</p>
          <button className="btn-primary" onClick={() => setActiveTab('admin')}>UPLOAD NEW BEAT</button>
        </div>
      </div>
    );
  }

  // ЭКРАН АДМИНКИ
  if (activeTab === 'admin') {
    return (
      <div className="container">
        <div className="nav-header">
          <button className="icon-btn" onClick={() => setActiveTab('profile')}>←</button>
          <span className="nav-title">Upload Beat</span>
          <div style={{width: 24}}></div>
        </div>
        <div className="form-group">
          <input type="text" placeholder="Beat Title" className="input-dark" />
          <div className="input-row">
            <input type="number" placeholder="BPM" className="input-dark" />
            <input type="text" placeholder="Key" className="input-dark" />
          </div>
          <input type="text" placeholder="Genre (e.g. Trap, Dark)" className="input-dark" />
          <div className="file-upload">
            <span>MP3 Tagged</span>
            <input type="file" />
          </div>
          <button className="btn-primary">PUBLISH</button>
        </div>
      </div>
    );
  }

  // ГЛАВНЫЙ ЭКРАН
  return (
    <div className="container">
      <header className="main-header">
        <h1 className="brand">BEATS</h1>
        <img src={user?.photo_url || "https://via.placeholder.com/40"} className="avatar-sm" onClick={() => setActiveTab('profile')} />
      </header>

      <div className="filter-section">
        <input type="text" placeholder="Search..." className="search-input" onChange={(e) => setSearchQuery(e.target.value)} />
        <div className="genre-chips">
          {genres.map(g => (
            <button key={g} className={`chip ${activeGenre === g ? 'active' : ''}`} onClick={() => setActiveGenre(g)}>{g}</button>
          ))}
        </div>
      </div>

      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={() => setCurrentPlaying(null)} />

      <div className="list">
        {filteredBeats.map((beat) => (
          <div key={beat.id} className="item-card" onClick={() => setSelectedBeat(beat)}>
            <div className="play-zone" onClick={(e) => togglePlay(e, beat)}>
              <img src={beat.image} className="thumb" alt="" />
              <div className="overlay">
                {currentPlaying?.id === beat.id && !audioRef.current?.paused ? "⏸" : "▶"}
              </div>
            </div>
            
            <div className="item-info">
              <div className="title-row">
                <span className="title">{beat.title.replace('fresso - ', '')}</span>
                <button className="dots-btn" onClick={(e) => { e.stopPropagation(); alert('Edit beat'); }}>•••</button>
              </div>
              <div className="meta-row">
                <span>{beat.bpm} BPM</span>
                <span>{beat.key}</span>
              </div>
              {currentPlaying?.id === beat.id && (
                <div className="seek-bar-bg" ref={progressRef} onClick={(e) => { e.stopPropagation(); handleSeek(e); }}>
                  <div className="seek-bar-fill" style={{ width: `${progress}%` }}></div>
                </div>
              )}
            </div>
            <div className="price">{beat.priceWav}₽</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;