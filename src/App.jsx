import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { db, storage } from './firebase';
import { collection, onSnapshot, query, orderBy, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const tg = window.Telegram ? window.Telegram.WebApp : null;

function App() {
  const [activeTab, setActiveTab] = useState('shop');
  const [beats, setBeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [cart, setCart] = useState([]);
  
  // Расширенные фильтры
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [bpmRange, setBpmRange] = useState(140);

  // Поля загрузки
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState('');
  const [key, setKey] = useState('C');
  const [genre, setGenre] = useState('');
  const [prices, setPrices] = useState({ mp3: '', wav: '', stems: '', excl: '' });
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [audioFile, setAudioFile] = useState(null);

  const [currentBeatId, setCurrentBeatId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(new Audio());

  // Тональности с минором
  const allKeys = ['C', 'Cm', 'C#', 'C#m', 'D', 'Dm', 'D#', 'D#m', 'E', 'Em', 'F', 'Fm', 'F#', 'F#m', 'G', 'Gm', 'G#', 'G#m', 'A', 'Am', 'A#', 'A#m', 'B', 'Bm'];
  const genres = ['Trap', 'Drill', 'Jersey', 'Old School', 'R&B'];

  useEffect(() => {
    if (tg) { tg.ready(); tg.expand(); }
    const q = query(collection(db, "beats"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBeats(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    const up = () => setProgress((audio.currentTime / audio.duration) * 100 || 0);
    audio.addEventListener('timeupdate', up);
    return () => audio.removeEventListener('timeupdate', up);
  }, []);

  const togglePlay = (beat) => {
    if (currentBeatId === beat.id) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
      setIsPlaying(!isPlaying);
    } else {
      audioRef.current.src = beat.audio;
      audioRef.current.play();
      setCurrentBeatId(beat.id);
      setIsPlaying(true);
    }
  };

  const SocialLinks = () => (
    <div className="social-row">
      <a href="https://vk.ru/fr1sso" target="_blank">🟦</a>
      <a href="https://www.instagram.com/fresso.beatzzz" target="_blank">📸</a>
      <a href="https://soundcloud.com/de-nys-nes321" target="_blank">☁️</a>
      <a href="https://youtube.com/@fressobeats3787" target="_blank">🔴</a>
      <a href="https://t.me/fresso1" target="_blank">✈️</a>
    </div>
  );

  return (
    <div className="app-viewport">
      {/* Боковое меню */}
      {showSideMenu && (
        <div className="side-menu-overlay" onClick={() => setShowSideMenu(false)}>
          <div className="side-menu-content" onClick={e => e.stopPropagation()}>
            <div className="menu-header">MENU</div>
            <div className="menu-item" onClick={() => {setActiveTab('shop'); setShowSideMenu(false)}}>МАГАЗИН</div>
            <div className="menu-item" onClick={() => {setActiveTab('profile'); setShowSideMenu(false)}}>ПРОФИЛЬ</div>
            <div className="menu-item">КОРЗИНА ({cart.length})</div>
          </div>
        </div>
      )}

      {activeTab === 'shop' ? (
        <>
          <header className="shop-header">
            <button className="burger-btn" onClick={() => setShowSideMenu(true)}>☰</button>
            <h1 className="logo-text">FRESSO</h1>
            <div className="header-right">
              <div className="cart-icon">🛒 {cart.length > 0 && <span className="badge">{cart.length}</span>}</div>
              <img 
                src={tg?.initDataUnsafe?.user?.photo_url || "https://via.placeholder.com/40"} 
                className="avatar-mini" 
                onClick={() => setActiveTab('profile')} 
                alt="p" 
              />
            </div>
          </header>

          <button className="filter-pill" onClick={() => setShowFilters(!showFilters)}>
             ▽ ФИЛЬТРЫ И ПОИСК
          </button>

          {showFilters && (
            <div className="filters-area">
              <div className="filter-section">
                <label>BPM: {bpmRange}</label>
                <input type="range" min="60" max="200" value={bpmRange} onChange={(e) => setBpmRange(e.target.value)} className="fresso-range" />
              </div>
              
              <div className="filter-section">
                <label>ТОНАЛЬНОСТЬ</label>
                <div className="tags-container">
                  {allKeys.map(k => (
                    <span key={k} className={`tag ${selectedKeys.includes(k) ? 'active' : ''}`} onClick={() => setSelectedKeys(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])}>
                      {k}
                    </span>
                  ))}
                </div>
              </div>

              <div className="filter-section">
                <label>ЖАНРЫ</label>
                <div className="tags-container">
                  {genres.map(g => (
                    <span key={g} className={`tag ${selectedGenres.includes(g) ? 'active' : ''}`} onClick={() => setSelectedGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}>
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="beat-list-main">
            {beats.map(beat => (
              <div key={beat.id} className="beat-card-new">
                <div className="beat-img-container" onClick={() => togglePlay(beat)}>
                  <img src={beat.image} alt="cover" />
                  <div className="play-overlay">{currentBeatId === beat.id && isPlaying ? "⏸" : "▶"}</div>
                </div>
                <div className="beat-details">
                  <div className="beat-row">
                    <span className="title">{beat.title}</span>
                    <span className="price" onClick={() => setCart([...cart, beat.id])}>${beat.priceMp3 || '0'}</span>
                  </div>
                  <div className="meta">{beat.bpm} BPM • {beat.key} • {beat.genre}</div>
                  <div className="progress-bg">
                    <div className="progress-bar" style={{width: `${currentBeatId === beat.id ? progress : 0}%`}}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* ЭКРАН ПРОФИЛЯ */
        <div className="profile-page">
          <button className="back-btn-top" onClick={() => setActiveTab('shop')}>← НАЗАД</button>
          <div className="profile-hero">
            <div className="avatar-wrapper">
               <img src={tg?.initDataUnsafe?.user?.photo_url || "https://via.placeholder.com/100"} alt="avatar" />
               <div className="add-badge" onClick={() => setActiveTab('admin')}>+</div>
            </div>
            <h2 className="name">{tg?.initDataUnsafe?.user?.first_name || "Fresso"}</h2>
            <p className="handle">@{tg?.initDataUnsafe?.user?.username || "Fr1sso"}</p>
          </div>

          <div className="profile-actions">
            <button className="main-action-btn" onClick={() => setActiveTab('admin')}>ДОБАВИТЬ БИТ</button>
            <div className="menu-list">
              <div className="list-item">❤️ ЛЮБИМЫЕ</div>
              <div className="list-item">🛒 КОРЗИНА</div>
              <div className="list-item">💳 СПОСОБ ОПЛАТЫ</div>
            </div>
          </div>
          <SocialLinks />
        </div>
      )}
    </div>
  );
}

export default App;