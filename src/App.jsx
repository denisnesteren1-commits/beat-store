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
      <a href="https://instagram.com/твой_ник" target="_blank">📸</a>
      <a href="https://youtube.com/твой_канал" target="_blank">📺</a>
      <a href="https://t.me/твой_канал" target="_blank" className="tg-icon">✈️</a>
      <a href="https://vk.com/твой_ник" target="_blank">🟦</a>
      <a href="https://soundcloud.com/твой_ник" target="_blank">☁️</a>
    </div>
  );

  if (activeTab === 'admin') return (
    <div className="app-viewport">
      <div className="header-nav">
        <button className="back-arrow" onClick={() => setActiveTab('profile')}>←</button>
        <span className="nav-title">НОВЫЙ БИТ</span>
        <div style={{width: 24}}></div>
      </div>
      <div className="scroll-content admin-form">
        <div className="upload-zone" onClick={() => document.getElementById('cInp').click()}>
          {coverPreview ? <img src={coverPreview} alt="prev" /> : <span>ЗАГРУЗИТЬ ФОТО</span>}
          <input id="cInp" type="file" hidden onChange={e => {
            setCoverFile(e.target.files[0]);
            setCoverPreview(URL.createObjectURL(e.target.files[0]));
          }} />
        </div>
        
        <input className="fresso-input" placeholder="Название" onChange={e => setTitle(e.target.value)} />
        
        <div className="form-row">
          <input className="fresso-input" placeholder="BPM" onChange={e => setBpm(e.target.value)} />
          <select className="fresso-input" onChange={e => setKey(e.target.value)}>
            {allKeys.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>

        <input className="fresso-input" placeholder="Жанр (Trap, Drill...)" onChange={e => setGenre(e.target.value)} />

        <div className="price-grid">
          <input className="fresso-input" placeholder="MP3 $" onChange={e => setPrices({...prices, mp3: e.target.value})} />
          <input className="fresso-input" placeholder="WAV $" onChange={e => setPrices({...prices, wav: e.target.value})} />
          <input className="fresso-input" placeholder="Stems $" onChange={e => setPrices({...prices, stems: e.target.value})} />
          <input className="fresso-input" placeholder="Exclusive $" onChange={e => setPrices({...prices, excl: e.target.value})} />
        </div>

        <div className="file-select-btn" onClick={() => document.getElementById('aInp').click()}>
          {audioFile ? "АУДИО ВЫБРАНО" : "ВЫБРАТЬ ПРЕВЬЮ (MP3)"}
          <input id="aInp" type="file" hidden onChange={e => setAudioFile(e.target.files[0])} />
        </div>

        <button className="main-publish-btn" onClick={handleUpload} disabled={uploading}>
          {uploading ? "ЗАГРУЗКА..." : "ОПУБЛИКОВАТЬ"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-viewport">
      {activeTab === 'shop' ? (
        <>
          <header className="shop-header">
            <h1 className="logo">FRESSO</h1>
            <div className="header-right">
              <div className="cart-icon">🛒 {cart.length > 0 && <span className="badge">{cart.length}</span>}</div>
              <img 
                src={tg?.initDataUnsafe?.user?.photo_url || "https://via.placeholder.com/40"} 
                className="avatar-small" 
                onClick={() => setActiveTab('profile')} 
                alt="p" 
              />
            </div>
          </header>

          <button className="filter-toggle" onClick={() => setShowFilters(!showFilters)}>
             {showFilters ? "✕ ЗАКРЫТЬ" : "▽ ФИЛЬТРЫ"}
          </button>

          {showFilters && (
            <div className="filters-container">
              <p>ТОНАЛЬНОСТЬ</p>
              <div className="keys-grid">
                {allKeys.map(k => (
                  <div 
                    key={k} 
                    className={`key-chip ${selectedKeys.includes(k) ? 'active' : ''}`}
                    onClick={() => setSelectedKeys(prev => 
                      prev.includes(k) ? prev.filter(i => i !== k) : [...prev, k])}
                  >
                    {k} {selectedKeys.includes(k) && '✓'}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="beat-list">
            {beats.map(beat => (
              <div key={beat.id} className="beat-card">
                <div className="beat-img-box" onClick={() => togglePlay(beat)}>
                  <img src={beat.image} alt="b" />
                  <div className="play-btn-overlay">{currentBeatId === beat.id && isPlaying ? "⏸" : "▶"}</div>
                </div>
                <div className="beat-info">
                  <div className="beat-header-row">
                    <span className="beat-name">{beat.title}</span>
                    <span className="beat-price" onClick={() => setCart([...cart, beat.id])}>
                      от ${beat.priceMp3 || beat.price || "0"}
                    </span>
                  </div>
                  <div className="beat-meta">{beat.bpm} BPM • {beat.key} • {beat.genre}</div>
                  <div className="progress-container">
                     <div className="progress-line" style={{width: `${currentBeatId === beat.id ? progress : 0}%`}}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="profile-screen">
          <header className="profile-header-nav">
             <button className="back-arrow" onClick={() => setActiveTab('shop')}>←</button>
          </header>
          <div className="profile-content">
            <div className="avatar-huge">
               <img src={tg?.initDataUnsafe?.user?.photo_url || "https://via.placeholder.com/120"} alt="p" />
            </div>
            <h2 className="user-name">{tg?.initDataUnsafe?.user?.first_name || "PRODUCER"}</h2>
            <button className="add-beat-btn" onClick={() => setActiveTab('admin')}>ДОБАВИТЬ БИТ</button>
            <div className="profile-menu-list">
               <div className="menu-item">ЛЮБИМЫЕ</div>
               <div className="menu-item">КОРЗИНА</div>
            </div>
            <SocialLinks />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;