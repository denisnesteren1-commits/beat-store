import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import inventory from './inventory';

function App() {
  const [selectedBeat, setSelectedBeat] = useState(null);
  const [currentPlaying, setCurrentPlaying] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');
  const [isAdmin, setIsAdmin] = useState(false); // Для перехода в режим загрузки
  const audioRef = useRef(null);

  // Получаем данные из Telegram
  const tg = window.Telegram?.WebApp;
  const userAvatar = tg?.initDataUnsafe?.user?.photo_url || "https://via.placeholder.com/40";

  useEffect(() => {
    tg?.ready();
    tg?.expand(); // Разворачиваем на весь экран
  }, [tg]);

  const openModal = (beat) => setSelectedBeat(beat);
  const closeModal = () => setSelectedBeat(null);

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

  const buyBeat = (licenseType, price) => {
    const message = `Привет! Хочу купить бит "${selectedBeat.title}"\nЛицензия: ${licenseType}\nЦена: ${price}₽`;
    const tgUrl = `https://t.me/Fr1sso?text=${encodeURIComponent(message)}`;
    window.open(tgUrl, '_blank');
  };

  // Логика фильтрации
  const filteredBeats = inventory.filter(beat => {
    const matchesSearch = beat.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = activeGenre === 'All' || beat.tags.includes(activeGenre);
    return matchesSearch && matchesGenre;
  });

  const genres = ['All', 'Dark', 'Trap', 'Melodic', 'Hard'];

  return (
    <div className="shop-container">
      {/* HEADER С ПРОФИЛЕМ */}
      <header className="app-header">
        <div className="logo">FRESSO BEATS</div>
        <div className="profile-section" onClick={() => alert('Здесь будет вход в админку')}>
          <img src={userAvatar} alt="Profile" className="user-avatar" />
        </div>
      </header>

      {/* ПОИСК И ФИЛЬТРЫ */}
      <div className="search-bar">
        <input 
          type="text" 
          placeholder="Search beats..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="genre-scroll">
        {genres.map(genre => (
          <button 
            key={genre} 
            className={`genre-btn ${activeGenre === genre ? 'active' : ''}`}
            onClick={() => setActiveGenre(genre)}
          >
            {genre}
          </button>
        ))}
      </div>

      <audio ref={audioRef} />

      <div className="beat-list">
        {filteredBeats.map((beat) => (
          <div key={beat.id} className="beat-row" onClick={() => openModal(beat)}>
            <div 
              className="play-btn" 
              onClick={(e) => togglePlay(e, beat)}
              style={{ backgroundImage: `url(${beat.image})` }}
            >
              <div className="play-overlay">
                {currentPlaying?.id === beat.id ? '⏸' : '▶'}
              </div>
            </div>

            <div className="beat-info">
              <div className="beat-title">{beat.title}</div>
              <div className="beat-meta">
                <span className="tag-bpm">{beat.bpm} BPM</span>
                <span className="tag-key">{beat.key}</span>
                <span className="tag-genre">{beat.tags[0]}</span>
              </div>
            </div>

            <div className="price-tag">{beat.priceWav}₽</div>
          </div>
        ))}
      </div>

      {/* ТВОЯ МОДАЛКА КУПИТЬ */}
      {selectedBeat && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <img src={selectedBeat.image} alt="cover" className="modal-cover" />
              <div>
                <h3>{selectedBeat.title}</h3>
                <p>{selectedBeat.bpm} BPM • {selectedBeat.key}</p>
              </div>
              <button className="close-btn" onClick={closeModal}>✕</button>
            </div>
            <div className="license-list">
              <div className="license-option">
                <div className="license-info"><strong>WAV LEASE</strong><span>High Quality WAV</span></div>
                <button className="buy-button" onClick={() => buyBeat('WAV', selectedBeat.priceWav)}>{selectedBeat.priceWav}₽</button>
              </div>
              <div className="license-option">
                <div className="license-info"><strong>TRACKOUT</strong><span>WAV + STEMS</span></div>
                <button className="buy-button" onClick={() => buyBeat('TRACKOUT', selectedBeat.priceStems)}>{selectedBeat.priceStems}₽</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;