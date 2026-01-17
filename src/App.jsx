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

  // --- МАГАЗИН И ФИЛЬТРЫ ---
  const [showFilters, setShowFilters] = useState(false);
  const [cart, setCart] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);

  const allKeys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // --- АДМИНКА (ДАННЫЕ) ---
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState('');
  const [key, setKey] = useState('C');
  const [genre, setGenre] = useState('');
  const [prices, setPrices] = useState({ mp3: '', wav: '', stems: '', excl: '' });
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [audioFile, setAudioFile] = useState(null);

  // --- ПЛЕЕР ---
  const [currentBeatId, setCurrentBeatId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(new Audio());

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
      tg?.showAlert("Заполни название и загрузи файлы!");
      return;
    }
    setUploading(true);
    try {
      const cRef = ref(storage, `covers/${Date.now()}_${coverFile.name}`);
      await uploadBytes(cRef, coverFile);
      const cUrl = await getDownloadURL(cRef);

      const aRef = ref(storage, `audio/${Date.now()}_${audioFile.name}`);
      await uploadBytes(aRef, audioFile);
      const aUrl = await getDownloadURL(aRef);

      await addDoc(collection(db, "beats"), {
        title, bpm, key, genre,
        priceMp3: prices.mp3, priceWav: prices.wav, priceStems: prices.stems, priceExcl: prices.excl,
        image: cUrl, audio: aUrl,
        createdAt: new Date()
      });

      setUploading(false);
      setActiveTab('shop');
      tg?.showAlert("Бит опубликован!");
    } catch (e) {
      setUploading(false);
      tg?.showAlert("Ошибка загрузки!");
    }
  };

  const SocialLinks = () => (
    <div className="social-row">
      <a href="https://instagram.com/your_nick">📸</a>
      <a href="https://youtube.com/your_channel">📺</a>
      <a href="https://t.me/your_channel" className="tg-icon">✈️</a>
      <a href="https://vk.com/your_nick">🟦</a>
      <a href="https://soundcloud.com/your_nick">☁️</a>
    </div>
  );

  // ЭКРАН АДМИНКИ
  if (activeTab === 'admin') return (
    <div className="app-viewport">
      <div className="header-nav">
        <button onClick={() => setActiveTab('profile')}>←</button>
        <span>ДОБАВИТЬ БИТ</span>
        <div style={{ width: 20 }}></div>
      </div>
      <div className="scroll-content" style={{ padding: 20 }}>
        <div className="upload-zone" onClick={() => document.getElementById('coverInp').click()}>
          {coverPreview ? <img src={coverPreview} alt="" /> : <span>ЗАГРУЗИТЬ ОБЛОЖКУ</span>}
          <input id="coverInp" type="file" hidden onChange={e => {
            if (e.target.files[0]) {
              setCoverFile(e.target.files[0]);
              setCoverPreview(URL.createObjectURL(e.target.files[0]));
            }
          }} />
        </div>

        <input className="fresso-input" placeholder="Название" onChange={e => setTitle(e.target.value)} />
        <div className="form-grid">
          <input className="fresso-input" placeholder="BPM" onChange={e => setBpm(e.target.value)} />
          <select className="fresso-input" onChange={e => setKey(e.target.value)}>
            {allKeys.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <input className="fresso-input" placeholder="Жанр (например Trap, Drill)" onChange={e => setGenre(e.target.value)} />

        <div className="price-grid">
          <input className="fresso-input" placeholder="MP3 $" onChange={e => setPrices({ ...prices, mp3: e.target.value })} />
          <input className="fresso-input" placeholder="WAV $" onChange={e => setPrices({ ...prices, wav: e.target.value })} />
        </div>

        <div className="file-btn" onClick={() => document.getElementById('audInp').click()}>
          {audioFile ? audioFile.name : "ВЫБРАТЬ MP3 PREVIEW"}
          <input id="audInp" type="file" hidden onChange={e => setAudioFile(e.target.files[0])} />
        </div>

        <button className="main-btn" onClick={handleUpload} disabled={uploading}>
          {uploading ? "ЗАГРУЗКА..." : "ОПУБЛИКОВАТЬ"}
        </button>
      </div>
    </div>
  );

  // ОСНОВНОЙ ЭКРАН (МАГАЗИН ИЛИ ПРОФИЛЬ)
  return (
    <div className="app-viewport">
      {activeTab === 'shop' ? (
        <>
          <header className="shop-header">
            <div className="header-left">
              <button className="burger">☰</button>
              <h1 className="logo">FRESSO</h1>
            </div>
            <div className="header-right">
              <div className="cart-box">
                🛒 {cart.length > 0 && <span className="badge">{cart.length}</span>}
              </div>
              <img src={tg?.initDataUnsafe?.user?.photo_url || "https://via.placeholder.com/40"}
                className="avatar-small" onClick={() => setActiveTab('profile')} alt="avatar" />
            </div>
          </header>

          <div className="filter-toggle" onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? "✕ ЗАКРЫТЬ" : "▽ ФИЛЬТРЫ"}
          </div>

          {showFilters && (
            <div className="filters-area">
              <p>ТОНАЛЬНОСТЬ:</p>
              <div className="keys-grid">
                {allKeys.map(k => (
                  <div key={k}
                    className={`key-chip ${selectedKeys.includes(k) ? 'active' : ''}`}
                    onClick={() => setSelectedKeys(prev =>
                      prev.includes(k) ? prev.filter(i => i !== k) : [...prev, k])}>
                    {k} {selectedKeys.includes(k) && '✓'}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="beat-list">
            {beats.map(beat => (
              <div key={beat.id} className="beat-card">
                <div className="beat-img" onClick={() => togglePlay(beat)}>
                  <img src={beat.image} alt="" />
                  <div className="play-overlay">{currentBeatId === beat.id && isPlaying ? "⏸" : "▶"}</div>
                </div>
                <div className="beat-info">
                  <div className="beat-row">
                    <span className="b-name">{beat.title}</span>
                    <span className="b-price" onClick={() => setCart([...cart, beat.id])}>
                      от ${beat.priceMp3 || beat.price || "0"}
                    </span>
                  </div>
                  <div className="b-meta">{beat.bpm} BPM • {beat.key} • {beat.genre}</div>
                  <div className="progress-bg" onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * audioRef.current.duration;
                  }}>
                    <div className="progress-bar" style={{ width: `${currentBeatId === beat.id ? progress : 0}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="profile-screen">
          <div className="profile-header">
            <button className="back-btn" onClick={() => setActiveTab('shop')}>←</button>
          </div>
          <div className="profile-content">
            <div className="avatar-big">
              <img src={tg?.initDataUnsafe?.user?.photo_url || "https://via.placeholder.com/120"} alt="avatar-large" />
            </div>
            <h2>{tg?.initDataUnsafe?.user?.first_name || "PRODUCER"}</h2>
            <button className="main-btn" onClick={() => setActiveTab('admin')}>ДОБАВИТЬ БИТ</button>
            <div className="profile-menu">
              <button className="menu-item">❤️ ЛЮБИМЫЕ</button>
              <button className="menu-item">🛒 КОРЗИНА</button>
              <button className="menu-item">💳 СПОСОБ ОПЛАТЫ</button>
            </div>
            <SocialLinks />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;