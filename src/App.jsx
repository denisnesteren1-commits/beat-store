import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import inventory from './inventory';

function App() {
  const [activeTab, setActiveTab] = useState('shop'); // 'shop', 'profile', 'admin'
  const [selectedBeat, setSelectedBeat] = useState(null);
  const [currentPlaying, setCurrentPlaying] = useState(null);
  const [progress, setProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  const audioRef = useRef(null);
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;

  useEffect(() => {
    tg?.ready();
    tg?.expand();
  }, [tg]);

  // Обновление полосы прогресса
  const handleTimeUpdate = () => {
    const duration = audioRef.current.duration;
    const currentTime = audioRef.current.currentTime;
    if (duration) {
      setProgress((currentTime / duration) * 100);
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

  const filteredBeats = inventory.filter(beat => 
    beat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- ЭКРАН ПРОФИЛЯ ---
  if (activeTab === 'profile') {
    return (
      <div className="shop-container">
        <header className="app-header">
          <button className="back-btn" onClick={() => setActiveTab('shop')}>←</button>
          <h2>MY PROFILE</h2>
        </header>
        <div className="profile-card">
          <img src={user?.photo_url || "https://via.placeholder.com/100"} className="large-avatar" />
          <h3>{user?.first_name || "Producer"}</h3>
          <p>@{user?.username || "fresso_user"}</p>
          <button className="admin-entry-btn" onClick={() => setActiveTab('admin')}>UPLOAD NEW BEAT</button>
        </div>
      </div>
    );
  }

  // --- ЭКРАН ЗАГРУЗКИ ---
  if (activeTab === 'admin') {
    return (
      <div className="shop-container">
        <header className="app-header">
          <button className="back-btn" onClick={() => setActiveTab('profile')}>←</button>
          <h2>UPLOAD BEAT</h2>
        </header>
        <div className="admin-form">
           <input type="text" placeholder="Beat Title" />
           <div className="row-inputs">
             <input type="number" placeholder="BPM" />
             <input type="text" placeholder="Key" />
           </div>
           <input type="file" />
           <button className="buy-button">PUBLISH</button>
        </div>
      </div>
    );
  }

  // --- ГЛАВНЫЙ ЭКРАН ---
  return (
    <div className="shop-container">
      <header className="app-header">
        <div className="logo">FRESSO</div>
        <img 
          src={user?.photo_url || "https://via.placeholder.com/40"} 
          className="user-avatar" 
          onClick={() => setActiveTab('profile')}
        />
      </header>

      <div className="search-bar">
        <input type="text" placeholder="Search for beats..." onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      <audio 
        ref={audioRef} 
        onTimeUpdate={handleTimeUpdate} 
        onEnded={() => setCurrentPlaying(null)}
      />

      <div className="beat-list">
        {filteredBeats.map((beat) => (
          <div key={beat.id} className="beat-row" onClick={() => setSelectedBeat(beat)}>
            <div className="play-btn-wrapper" onClick={(e) => togglePlay(e, beat)}>
              <img src={beat.image} className="beat-img-small" />
              <div className="play-icon-overlay">
                {currentPlaying?.id === beat.id && !audioRef.current.paused ? (
                  <div className="icon-pause"></div>
                ) : (
                  <div className="icon-play"></div>
                )}
              </div>
            </div>

            <div className="beat-info">
              <span className="beat-title">{beat.title}</span>
              <div className="beat-meta">
                <span>{beat.bpm} BPM</span>
                <span>{beat.key}</span>
              </div>
              {/* Полоса прогресса только у играющего бита */}
              {currentPlaying?.id === beat.id && (
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                </div>
              )}
            </div>

            <div className="price-tag">{beat.priceWav}₽</div>
          </div>
        ))}
      </div>
      
      {/* Модалка покупки (оставляем твою логику) */}
    </div>
  );
}

export default App;