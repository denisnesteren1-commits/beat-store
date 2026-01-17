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
  
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [bpmRange, setBpmRange] = useState(140);

  // Состояния для админки
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

  const allKeys = ['C', 'Cm', 'C#', 'C#m', 'D', 'Dm', 'D#', 'D#m', 'E', 'Em', 'F', 'Fm', 'F#', 'F#m', 'G', 'Gm', 'G#', 'G#m', 'A', 'Am', 'A#', 'A#m', 'B', 'Bm'];
  const genresList = ['Trap', 'Drill', 'Jersey', 'Old School', 'R&B', 'Brazil Phonk', 'Phonk', 'Hoodtrap', 'Milancore', 'Angelcore', 'Dark Trap', 'Ambient'];

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

  if (activeTab === 'admin') return (
    <div className="app-viewport admin-mode">
      <header className="header-fixed">
        <button className="icon-btn" onClick={() => setActiveTab('profile')}>←</button>
        <h1 className="nav-title">НОВЫЙ БИТ</h1>
        <div style={{width: 40}}></div>
      </header>
      <div className="scroll-area">
        <div className="upload-box" onClick={() => document.getElementById('cInp').click()}>
          {coverPreview ? <img src={coverPreview} alt="prev" /> : <span>ФОТО 3000x3000px</span>}
          <input id="cInp" type="file" hidden onChange={e => {
            if(e.target.files[0]) {
              setCoverFile(e.target.files[0]);
              setCoverPreview(URL.createObjectURL(e.target.files[0]));
            }
          }} />
        </div>
        <input className="input-fresso" placeholder="Название" onChange={e => setTitle(e.target.value)} />
        <div className="input-row">
          <input className="input-fresso" placeholder="BPM" onChange={e => setBpm(e.target.value)} />
          <select className="input-fresso" onChange={e => setKey(e.target.value)}>
            {allKeys.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <select className="input-fresso" onChange={e => setGenre(e.target.value)}>
          <option value="">Выберите жанр</option>
          {genresList.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <div className="price-grid">
          <input className="input-fresso" placeholder="MP3 $" onChange={e => setPrices({...prices, mp3: e.target.value})} />
          <input className="input-fresso" placeholder="WAV $" onChange={e => setPrices({...prices, wav: e.target.value})} />
          <input className="input-fresso" placeholder="Stems $" onChange={e => setPrices({...prices, stems: e.target.value})} />
          <input className="input-fresso" placeholder="Excl $" onChange={e => setPrices({...prices, excl: e.target.value})} />
        </div>
        <button className="upload-audio-btn" onClick={() => document.getElementById('aInp').click()}>
          {audioFile ? "АУДИО ВЫБРАНО ✓" : "ВЫБРАТЬ ПРЕВЬЮ (MP3)"}
          <input id="aInp" type="file" hidden onChange={e => setAudioFile(e.target.files[0])} />
        </button>
        <button className="btn-main" onClick={handleUpload} disabled={uploading}>
          {uploading ? "ЗАГРУЗКА..." : "ОПУБЛИКОВАТЬ"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-viewport">
      {showSideMenu && (
        <div className="side-menu-overlay" onClick={() => setShowSideMenu(false)}>
          <div className="side-menu" onClick={e => e.stopPropagation()}>
            <div className="menu-label">НАВИГАЦИЯ</div>
            <div className="menu-link" onClick={() => {setActiveTab('shop'); setShowSideMenu(false)}}>МАГАЗИН</div>
            <div className="menu-link" onClick={() => {setActiveTab('profile'); setShowSideMenu(false)}}>ПРОФИЛЬ</div>
            <div className="menu-link">КОРЗИНА</div>
          </div>
        </div>
      )}

      {activeTab === 'shop' ? (
        <>
          <header className="header-fixed">
            <button className="icon-btn" onClick={() => setShowSideMenu(true)}>☰</button>
            <h1 className="logo">FRESSO</h1>
            <div className="header-right">
              <span className="cart-badge">🛒 {cart.length > 0 && <span className="num">{cart.length}</span>}</span>
              <img 
                src={tg?.initDataUnsafe?.user?.photo_url || "https://via.placeholder.com/40"} 
                className="avatar-small" 
                onClick={() => setActiveTab('profile')} 
                alt="p" 
              />
            </div>
          </header>

          <div className="content-pad">
            <button className={`filter-btn ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
              {showFilters ? "✕ ЗАКРЫТЬ" : "▽ ФИЛЬТРЫ И ПОИСК"}
            </button>

            {showFilters && (
              <div className="filters-card">
                <div className="f-section">
                  <label>BPM: {bpmRange}</label>
                  <input type="range" min="60" max="200" value={bpmRange} onChange={e => setBpmRange(e.target.value)} className="f-range" />
                </div>
                <div className="f-section">
                  <label>ТОНАЛЬНОСТЬ</label>
                  <div className="chip-row">
                    {allKeys.map(k => (
                      <span key={k} className={`chip ${selectedKeys.includes(k) ? 'on' : ''}`} 
                        onClick={() => setSelectedKeys(p => p.includes(k) ? p.filter(i => i!==k) : [...p, k])}>{k}</span>
                    ))}
                  </div>
                </div>
                <div className="f-section">
                  <label>ЖАНРЫ</label>
                  <div className="chip-row">
                    {genresList.map(g => (
                      <span key={g} className={`chip ${selectedGenres.includes(g) ? 'on' : ''}`}
                        onClick={() => setSelectedGenres(p => p.includes(g) ? p.filter(i => i!==g) : [...p, g])}>{g}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="beat-feed">
              {beats.map(beat => (
                <div key={beat.id} className="beat-card">
                  <div className="beat-cover" onClick={() => togglePlay(beat)}>
                    <img src={beat.image} alt="b" />
                    <div className="play-ico">{currentBeatId === beat.id && isPlaying ? "⏸" : "▶"}</div>
                  </div>
                  <div className="beat-info">
                    <div className="beat-top">
                      <span className="title">{beat.title}</span>
                      <span className="price" onClick={() => setCart([...cart, beat.id])}>${beat.priceMp3}</span>
                    </div>
                    <div className="meta">{beat.bpm} BPM • {beat.key} • {beat.genre}</div>
                    <div className="prog-container">
                      <div className="prog-bar" style={{width: `${currentBeatId === beat.id ? progress : 0}%`}}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="profile-screen">
          <header className="header-fixed transparent">
            <button className="icon-btn" onClick={() => setActiveTab('shop')}>←</button>
          </header>
          <div className="profile-center">
            <div className="avatar-huge" onClick={() => setActiveTab('admin')}>
              <img src={tg?.initDataUnsafe?.user?.photo_url || "https://via.placeholder.com/120"} alt="avatar" />
              <div className="plus-badge">+</div>
            </div>
            <h2 className="user-name">{tg?.initDataUnsafe?.user?.first_name || "Fresso Producer"}</h2>
            <p className="user-at">@{tg?.initDataUnsafe?.user?.username || "fr1sso"}</p>
            
            <button className="btn-main" onClick={() => setActiveTab('admin')}>ДОБАВИТЬ БИТ</button>
            
            <div className="menu-stack">
              <div className="menu-btn">ЛЮБИМЫЕ <span>❤️</span></div>
              <div className="menu-btn">КОРЗИНА <span>🛒</span></div>
              <div className="menu-btn">ПОДДЕРЖКА <span>💬</span></div>
            </div>

            <div className="socials">
              <a href="https://vk.ru/fr1sso" target="_blank" rel="noreferrer">🟦</a>
              <a href="https://www.instagram.com/fresso.beatzzz" target="_blank" rel="noreferrer">📸</a>
              <a href="https://soundcloud.com/de-nys-nes321" target="_blank" rel="noreferrer">☁️</a>
              <a href="https://youtube.com/@fressobeats3787" target="_blank" rel="noreferrer">🔴</a>
              <a href="https://t.me/fresso1" target="_blank" rel="noreferrer">✈️</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;