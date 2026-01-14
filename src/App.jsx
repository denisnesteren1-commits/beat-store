import React, { useState, useRef } from 'react';
import './App.css';
import inventory from './inventory';

function App() {
  const [selectedBeat, setSelectedBeat] = useState(null);
  const [currentPlaying, setCurrentPlaying] = useState(null);
  const audioRef = useRef(null);

  const openModal = (beat) => setSelectedBeat(beat);
  const closeModal = () => setSelectedBeat(null);

  // Функция проигрывания
  const togglePlay = (e, beat) => {
    e.stopPropagation(); // Чтобы не открывалось модальное окно при клике на плей
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

  return (
    <div className="shop-container">
      <h2>🔥 FRESSO BEATS</h2>
      
      {/* Скрытый элемент аудио */}
      <audio ref={audioRef} />

      <div className="beat-list">
        {inventory.map((beat) => (
          <div key={beat.id} className="beat-row" onClick={() => openModal(beat)}>
            <div 
              className="play-btn" 
              onClick={(e) => togglePlay(e, beat)}
              style={{ backgroundImage: `url(${beat.image})`, backgroundSize: 'cover' }}
            >
              <div className="play-overlay">
                {currentPlaying?.id === beat.id ? '⏸' : '▶'}
              </div>
            </div>

            <div className="beat-info">
              <div className="beat-title">{beat.title}</div>
              <div className="beat-meta">
                <span>{beat.bpm} BPM</span>
                <span>{beat.key}</span>
              </div>
            </div>

            <div className="price-tag">{beat.priceWav}₽</div>
          </div>
        ))}
      </div>

      {/* Модалка (остается прежней) */}
      {selectedBeat && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <img src={selectedBeat.image} alt="cover" className="modal-cover" />
              <div>
                <h3 style={{ margin: 0 }}>{selectedBeat.title}</h3>
                <p style={{ margin: 0, color: '#888', fontSize: '12px' }}>{selectedBeat.bpm} BPM</p>
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