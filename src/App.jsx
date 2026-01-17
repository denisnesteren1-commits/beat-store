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
  const [cart, setCart] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);

  // Поля для загрузки
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

  const allKeys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

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

  const handleUpload = async () => {
    if (!title || !coverFile || !audioFile) {
      tg?.showAlert("Заполни все поля!");
      return;
    }
    setUploading(true);
    try {
      const cRef = ref(storage, `covers/${Date.now()}`);
      await uploadBytes(cRef, coverFile);
      const cUrl = await getDownloadURL(cRef);
      const aRef = ref(storage, `audio/${Date.now()}`);
      await uploadBytes(aRef, audioFile);
      const aUrl = await getDownloadURL(aRef);
      
      await addDoc(collection(db, "beats"), {
        title, bpm, key, genre, image: cUrl, audio: aUrl,
        priceMp3: prices.mp3, priceWav: prices.wav, 
        priceStems: prices.stems, priceExcl: prices.excl,
        createdAt: new Date()
      });
      
      setUploading(false);
      setActiveTab('shop');
      tg?.showAlert("Бит опубликован!");
    } catch (e) { 
      setUploading(false);
      tg?.showAlert("Ошибка загрузки");
    }
  };

  const SocialLinks = () => (
    <div className="social-row">
      <a href="https://instagram.com/" target="_blank">📸</a>
      <a href="https://youtube.com/" target="_blank">📺</a>
      <a href="https://t.me/" target="_blank" className="tg-icon">✈️</a>
      <a href="https://vk.com/" target="_blank">🟦</a>
      <a href="https://soundcloud.com/" target="_blank">☁️</a>
    </div>
  );

  // --- ЭКРАН АДМИНКИ ---
  if (activeTab === 'admin') return (
    <div className="app-viewport with-nav-offset">
      <div className="fixed-header-navigation">
        <button className="nav-icon-button" onClick={() => setActiveTab('profile')}>←</button>
        <span className="nav-display-title">НОВЫЙ БИТ</span>
        <div className="nav-placeholder"></div>
      </div>
      
      <div className="scroll-content-container">
        <div className="cover-upload-wrapper">
          <div className="upload-zone" onClick={() => document.getElementById('cInp').click()}>
            {coverPreview ? <img src={coverPreview} alt="prev" /> : <span>ЗАГРУЗИТЬ ФОТО</span>}
            <input id="cInp" type="file" hidden onChange={e => {
              setCoverFile(e.target.files[0]);
              setCoverPreview(URL.createObjectURL(e.target.files[0]));
            }} />
          </div>
        </div>

        <div className="form-field-group">
          <label className="form-input-label">ОСНОВНАЯ ИНФОРМАЦИЯ</label>
          <input className="fresso-input" placeholder="Название бита" onChange={e => setTitle(e.target.value)} />
          <div className="form-grid-two-cols">
            <input className="fresso-input" placeholder="BPM" onChange={e => setBpm(e.target.value)} />
            <select className="fresso-input" onChange={e => setKey(e.target.value)}>
              {allKeys.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <input className="fresso-input" placeholder="Жанр (Trap, Drill...)" onChange={e => setGenre(e.target.value)} />
        </div>

        <div className="form-field-group">
          <label className="form-input-label">ЦЕНЫ ($)</label>
          <div className="price-grid" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
            <input className="fresso-input" placeholder="MP3" onChange={e => setPrices({...prices, mp3: e.target.value})} />
            <input className="fresso-input" placeholder="WAV" onChange={e => setPrices({...prices, wav: e.target.value})} />
            <input className="fresso-input" placeholder="Stems" onChange={e => setPrices({...prices, stems: e.target.value})} />
            <input className="fresso-input" placeholder="Excl" onChange={e => setPrices({...prices, excl: e.target.value})} />
          </div>
        </div>

        <div className="file-action-btn" style={{textAlign: 'center', marginBottom: '20px'}} onClick={() => document.getElementById('aInp').click()}>
          {audioFile ? "АУДИО ВЫБРАНО ✓" : "ВЫБРАТЬ ПРЕВЬЮ (MP3)"}
          <input id="aInp" type="file" hidden onChange={e => setAudioFile(e.target.files[0])} />
        </div>

        <button className="primary-action-button" onClick={handleUpload} disabled={uploading}>
          {uploading ? "ЗАГРУЗКА..." : "ОПУБЛИКОВАТЬ БИТ"}
        </button>
        <div className="bottom-safe-spacer"></div>
      </div>
    </div>
  );

  // --- МАГАЗИН И ПРОФИЛЬ ---
  return (
    <div className="app-viewport">
      {activeTab === 'shop' ? (
        <>
          <header className="shop-top-header">
            <h1 className="main-logo-fresso">FRESSO</h1>
            <div className="header-right-actions">
              <div className="cart-box">
                🛒 {cart.length > 0 && <span className="badge">{cart.length}</span>}
              </div>
              <img 
                src={tg?.initDataUnsafe?.user?.photo_url || "https://via.placeholder.com/44"} 
                className="top-nav-avatar" 
                onClick={() => setActiveTab('profile')} 
                alt="p" 
              />
            </div>
          </header>

          <button className={`filter-trigger-btn ${showFilters ? 'is-active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
             {showFilters ? "✕ ЗАКРЫТЬ" : "▽ ФИЛЬТРЫ"}
          </button>

          {showFilters && (
            <div className="filter-sheet-overlay" onClick={() => setShowFilters(false)}>
              <div className="filter-sheet-body" onClick={e => e.stopPropagation()}>
                <div className="filter-header-row">
                  <label>ТОНАЛЬНОСТЬ</label>
                  <span>{selectedKeys.length || 'ALL'}</span>
                </div>
                <div className="keys-grid">
                  {allKeys.map(k => (
                    <div 
                      key={k} 
                      className={`key-chip ${selectedKeys.includes(k) ? 'active' : ''}`}
                      onClick={() => setSelectedKeys(prev => 
                        prev.includes(k) ? prev.filter(i => i !== k) : [...prev, k])}
                    >
                      {k}
                    </div>
                  ))}
                </div>
                <button className="apply-filter-btn" onClick={() => setShowFilters(false)}>ПРИМЕНИТЬ</button>
              </div>
            </div>
          )}

          <div className="beats-vertical-list">
            {beats.map(beat => (
              <div key={beat.id} className="feed-beat-card">
                <div className="beat-play-control" onClick={() => togglePlay(beat)}>
                  <img src={beat.image} className="beat-card-thumb" alt="b" />
                  <div className="play-status-overlay">
                    {currentBeatId === beat.id && isPlaying ? <div className="pause-icon"></div> : <div className="play-icon"></div>}
                  </div>
                </div>
                
                <div className="beat-card-info">
                  <div className="beat-title-row">
                    <span className="beat-name-text">{beat.title}</span>
                    <span className="beat-card-price" onClick={() => setCart([...cart, beat.id])}>
                      ${beat.priceMp3 || "0"}
                    </span>
                  </div>
                  <div className="beat-meta-text">{beat.bpm} BPM • {beat.key} • {beat.genre}</div>
                  <div className="beat-progress-bar">
                     <div className="beat-progress-fill" style={{width: `${currentBeatId === beat.id ? progress : 0}%`}}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="bottom-safe-spacer"></div>
        </>
      ) : (
        <div className="profile-center-layout">
          <div className="fixed-header-navigation transparent-bg">
             <button className="nav-icon-button" onClick={() => setActiveTab('shop')}>←</button>
          </div>
          
          <div className="profile-main-content">
            <div className="avatar-huge-wrapper">
               <img src={tg?.initDataUnsafe?.user?.photo_url || "https://via.placeholder.com/160"} className="avatar-image-circle" alt="p" />
               <div className="avatar-edit-plus" onClick={() => setActiveTab('admin')}>+</div>
            </div>
            
            <h2 className="profile-user-name">{tg?.initDataUnsafe?.user?.first_name || "PRODUCER"}</h2>
            <p className="profile-user-handle">@{tg?.initDataUnsafe?.user?.username || "fresso_user"}</p>
            
            <button className="primary-action-button" style={{marginBottom: '15px'}} onClick={() => setActiveTab('admin')}>ДОБАВИТЬ БИТ</button>
            
            <div style={{width: '100%', display: 'flex', flexDirection: 'column', gap: '10px'}}>
               <div className="secondary-btn">ЛЮБИМЫЕ <span>❤️</span></div>
               <div className="secondary-btn">КОРЗИНА <span>🛒</span></div>
               <div className="secondary-btn">ИСТОРИЯ ЗАКАЗОВ <span>📦</span></div>
            </div>
            
            <SocialLinks />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;