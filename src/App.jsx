import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy, addDoc } from "firebase/firestore";

const tg = window.Telegram ? window.Telegram.WebApp : null;

// --- ТВОИ ОБНОВЛЕННЫЕ НАСТРОЙКИ ---
const CLOUD_NAME = "djp9xjfek"; 
const UPLOAD_PRESET = "Beats and images"; 

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
  const [bpmMin, setBpmMin] = useState(60);
  const [bpmMax, setBpmMax] = useState(200);

  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState('');
  const [key, setKey] = useState('C');
  const [customGenre, setCustomGenre] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Trap');
  const [prices, setPrices] = useState({ mp3: '', wav: '', stems: '', excl: '' });
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [audioFile, setAudioFile] = useState(null);

  const [currentBeatId, setCurrentBeatId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(new Audio());

  const allKeys = ['C', 'Cm', 'C#', 'C#m', 'D', 'Dm', 'D#', 'D#m', 'E', 'Em', 'F', 'Fm', 'F#', 'F#m', 'G', 'Gm', 'G#', 'G#m', 'A', 'Am', 'A#', 'A#m', 'B', 'Bm'];
  const genresList = ['Trap', 'Drill', 'Brazil Phonk', 'Phonk', 'Hoodtrap', 'Milancore', 'Angelcore', 'Dark Trap', 'Ambient', 'Hyperpop', 'Glo', 'Scenecore', 'Pluggnb', 'Rage', 'Detroit', 'Techno', 'Jersey Club'];

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

  const uploadToCloud = async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    const resType = type === 'image' ? 'image' : 'video';
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resType}/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.secure_url;
  };

  const handlePublish = async () => {
    if (!title || !coverFile || !audioFile) {
      alert("Заполни название и выбери файлы!");
      return;
    }
    setUploading(true);
    try {
      const imageUrl = await uploadToCloud(coverFile, 'image');
      const audioUrl = await uploadToCloud(audioFile, 'audio');
      
      await addDoc(collection(db, "beats"), {
        title, bpm: Number(bpm), key, 
        genre: customGenre || selectedGenre, 
        image: imageUrl, audio: audioUrl,
        priceMp3: prices.mp3, priceWav: prices.wav, 
        priceStems: prices.stems, priceExcl: prices.excl,
        createdAt: new Date()
      });
      
      setUploading(false);
      setActiveTab('shop');
      if(tg) tg.showAlert("Бит опубликован!");
    } catch (e) { 
      setUploading(false);
      alert("Ошибка: " + e.message);
    }
  };

  if (activeTab === 'admin') return (
    <div className="admin-container">
      <div className="admin-header">
        <button className="back-btn" onClick={() => setActiveTab('profile')}>←</button>
        <h2 className="admin-title">НОВЫЙ БИТ</h2>
        <div style={{width: 30}}></div>
      </div>
      <div className="admin-form">
        <div className="upload-square" onClick={() => document.getElementById('cInp').click()}>
          {coverPreview ? <img src={coverPreview} alt="prev" /> : <span>ВЫБРАТЬ ФОТО</span>}
          <input id="cInp" type="file" accept="image/*" hidden onChange={e => {
            if(e.target.files[0]) {
              setCoverFile(e.target.files[0]);
              setCoverPreview(URL.createObjectURL(e.target.files[0]));
            }
          }} />
        </div>
        <input className="fresso-input" placeholder="Название" value={title} onChange={e => setTitle(e.target.value)} />
        <div className="fresso-row">
          <input className="fresso-input" placeholder="BPM" type="number" onChange={e => setBpm(e.target.value)} />
          <select className="fresso-input" onChange={e => setKey(e.target.value)}>
            {allKeys.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="genre-selection">
           <select className="fresso-input" onChange={e => setSelectedGenre(e.target.value)}>
             {genresList.map(g => <option key={g} value={g}>{g}</option>)}
           </select>
           <input className="fresso-input" placeholder="Свой жанр..." onChange={e => setCustomGenre(e.target.value)} />
        </div>
        <div className="fresso-grid">
          <input className="fresso-input" placeholder="MP3 $" onChange={e => setPrices({...prices, mp3: e.target.value})} />
          <input className="fresso-input" placeholder="WAV $" onChange={e => setPrices({...prices, wav: e.target.value})} />
          <input className="fresso-input" placeholder="Stems $" onChange={e => setPrices({...prices, stems: e.target.value})} />
          <input className="fresso-input" placeholder="Excl $" onChange={e => setPrices({...prices, excl: e.target.value})} />
        </div>
        <button className="fresso-audio-btn" onClick={() => document.getElementById('aInp').click()}>
          {audioFile ? "АУДИО ВЫБРАНО ✓" : "ВЫБРАТЬ MP3"}
          <input id="aInp" type="file" accept="audio/*" hidden onChange={e => setAudioFile(e.target.files[0])} />
        </button>
        <button className="fresso-submit" onClick={handlePublish} disabled={uploading}>
          {uploading ? "ЗАГРУЗКА В ОБЛАКО..." : "ОПУБЛИКОВАТЬ"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      {showSideMenu && (
        <div className="side-menu-overlay" onClick={() => setShowSideMenu(false)}>
          <div className="side-menu-content" onClick={e => e.stopPropagation()}>
            <div className="menu-header">FRESSO</div>
            <div className="menu-nav-item" onClick={() => {setActiveTab('shop'); setShowSideMenu(false)}}>МАГАЗИН</div>
            <div className="menu-nav-item" onClick={() => {setActiveTab('profile'); setShowSideMenu(false)}}>ПРОФИЛЬ</div>
          </div>
        </div>
      )}

      {activeTab === 'shop' ? (
        <>
          <header className="main-header">
            <button className="menu-btn" onClick={() => setShowSideMenu(true)}>☰</button>
            <h1 className="logo">FRESSO</h1>
            <div className="header-right">
              <span className="cart-icon">🛒 {cart.length > 0 && <span className="cart-num">{cart.length}</span>}</span>
              <img 
                src={tg?.initDataUnsafe?.user?.photo_url || "https://via.placeholder.com/40"} 
                className="header-avatar" 
                onClick={() => setActiveTab('profile')}
                alt="ava"
              />
            </div>
          </header>

          <div className="page-content">
            <button className="filter-pill" onClick={() => setShowFilters(!showFilters)}>
              {showFilters ? "ЗАКРЫТЬ" : "▽ ФИЛЬТРЫ И ПОИСК"}
            </button>

            {showFilters && (
              <div className="filter-box">
                <div className="filter-group">
                  <label>BPM: {bpmMin} - {bpmMax}</label>
                  <div className="dual-range">
                    <input type="range" min="60" max="200" value={bpmMin} onChange={e => setBpmMin(e.target.value)} />
                    <input type="range" min="60" max="200" value={bpmMax} onChange={e => setBpmMax(e.target.value)} />
                  </div>
                </div>
                <div className="filter-group">
                  <label>ЖАНРЫ</label>
                  <div className="chips">
                    {genresList.slice(0, 12).map(g => (
                      <div key={g} className={`chip ${selectedGenres.includes(g) ? 'active' : ''}`}
                        onClick={() => setSelectedGenres(p => p.includes(g) ? p.filter(i => i!==g) : [...p, g])}>{g}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="beat-list">
              {beats.map(beat => (
                <div key={beat.id} className="beat-card">
                  <div className="beat-cover" onClick={() => togglePlay(beat)}>
                    <img src={beat.image} alt="beat" />
                    <div className="play-btn">{currentBeatId === beat.id && isPlaying ? "⏸" : "▶"}</div>
                  </div>
                  <div className="beat-details">
                    <div className="beat-row">
                      <span className="beat-title">{beat.title}</span>
                      <span className="beat-price" onClick={() => setCart([...cart, beat.id])}>${beat.priceMp3}</span>
                    </div>
                    <div className="beat-meta">{beat.bpm} BPM • {beat.key} • {beat.genre}</div>
                    <div className="beat-progress-bg">
                      <div className="beat-progress-fill" style={{width: `${currentBeatId === beat.id ? progress : 0}%`}}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="profile-view">
          <header className="profile-top-nav">
            <button className="back-arrow" onClick={() => setActiveTab('shop')}>←</button>
          </header>
          <div className="profile-header-content">
            <div className="avatar-circle">
              <img src={tg?.initDataUnsafe?.user?.photo_url || "https://via.placeholder.com/150"} alt="p" />
            </div>
            <h1 className="profile-name">{tg?.initDataUnsafe?.user?.first_name || "Fresso Producer"}</h1>
            <p className="profile-handle">@{tg?.initDataUnsafe?.user?.username || "fr1sso"}</p>
            
            <button className="add-beat-btn" onClick={() => setActiveTab('admin')}>ДОБАВИТЬ БИТ</button>
            
            <div className="profile-menu">
              <div className="p-item">ИСТОРИЯ ЗАКАЗОВ <span>📦</span></div>
              <div className="p-item" onClick={() => window.open('https://t.me/Fr1sso', '_blank')}>ПОДДЕРЖКА <span>💬</span></div>
            </div>

            <div className="social-footer">
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