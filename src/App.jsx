import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy, addDoc } from "firebase/firestore";

const tg = window.Telegram ? window.Telegram.WebApp : null;

// НАСТРОЙКИ ОБЛАКА
const CLOUD_NAME = "djp9xjfek"; 
const UPLOAD_PRESET = "Beats and images"; 

function App() {
  // 1. ВСЕ СОСТОЯНИЯ (STATES)
  const [activeTab, setActiveTab] = useState('shop');
  const [beats, setBeats] = useState([]);
  const [favorites, setFavorites] = useState(JSON.parse(localStorage.getItem('fresso_favs')) || []);
  const [uploading, setUploading] = useState(false);
  const [userAvatar, setUserAvatar] = useState(tg?.initDataUnsafe?.user?.photo_url || "https://via.placeholder.com/150");
  
  // Данные для админки
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState('');
  const [key, setKey] = useState('C');
  const [prices, setPrices] = useState({ mp3: '', wav: '', stems: '' });
  
  // Файлы для загрузки
  const [coverFile, setCoverFile] = useState(null);
  const [mp3File, setMp3File] = useState(null);
  const [wavFile, setWavFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  // Плеер
  const [currentBeatId, setCurrentBeatId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(new Audio());

  // 2. ЭФФЕКТЫ (EFFECTS)
  useEffect(() => {
    if (tg) { tg.ready(); tg.expand(); }
    const q = query(collection(db, "beats"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setBeats(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('fresso_favs', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    const audio = audioRef.current;
    const updateProgress = () => setProgress((audio.currentTime / audio.duration) * 100 || 0);
    audio.addEventListener('timeupdate', updateProgress);
    return () => audio.removeEventListener('timeupdate', updateProgress);
  }, []);

  // 3. ВСЕ ФУНКЦИИ (FUNCTIONS)
  
  // Универсальная загрузка в Cloudinary
  const uploadFile = async (file, type) => {
    if (!file) return "";
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    const resType = type === 'image' ? 'image' : 'video';
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resType}/upload`, {
      method: 'POST', body: formData
    });
    const data = await res.json();
    return data.secure_url;
  };

  // Смена аватара профиля
  const changeAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await uploadFile(file, 'image');
      setUserAvatar(url);
      if(tg) tg.showAlert("Фото профиля обновлено!");
    } catch (err) { alert("Ошибка загрузки фото"); }
  };

  const toggleFav = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const playBeat = (beat) => {
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

  const handlePublish = async () => {
    if (!title || !coverFile || !mp3File) return alert("Заполни: Название, Фото и MP3!");
    setUploading(true);
    try {
      const [img, mp3, wav, zip] = await Promise.all([
        uploadFile(coverFile, 'image'),
        uploadFile(mp3File, 'audio'),
        uploadFile(wavFile, 'audio'),
        uploadFile(zipFile, 'audio')
      ]);
      await addDoc(collection(db, "beats"), {
        title, bpm, key, image: img, audio: mp3, wavUrl: wav, zipUrl: zip,
        priceMp3: prices.mp3, priceWav: prices.wav, createdAt: new Date()
      });
      setUploading(false); setActiveTab('shop');
    } catch (e) { alert(e.message); setUploading(false); }
  };

  // 4. ОТОБРАЖЕНИЕ (RENDER)
  if (activeTab === 'admin') return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="back-clickable" onClick={() => setActiveTab('profile')}>←</div>
        <div className="admin-title">НОВЫЙ БИТ</div>
        <div style={{width: 44}}></div>
      </div>
      <div className="admin-form">
        <div className="upload-square" onClick={() => document.getElementById('cInp').click()}>
          {coverPreview ? <img src={coverPreview} /> : <span>ОБЛОЖКА</span>}
          <input id="cInp" type="file" hidden onChange={e => {
            setCoverFile(e.target.files[0]);
            setCoverPreview(URL.createObjectURL(e.target.files[0]));
          }} />
        </div>
        <input className="fresso-input" placeholder="Название" onChange={e => setTitle(e.target.value)} />
        <div className="fresso-row">
          <input className="fresso-input" placeholder="BPM" onChange={e => setBpm(e.target.value)} />
          <input className="fresso-input" placeholder="Key" onChange={e => setKey(e.target.value)} />
        </div>
        <div className="price-grid">
           <input className="fresso-input" placeholder="MP3 $" onChange={e => setPrices({...prices, mp3: e.target.value})} />
           <input className="fresso-input" placeholder="WAV $" onChange={e => setPrices({...prices, wav: e.target.value})} />
        </div>
        <div className="file-selectors">
          <div className={`file-row ${mp3File ? 'ready' : ''}`} onClick={() => document.getElementById('f1').click()}>
            {mp3File ? "MP3 С ТЭГОМ ✓" : "ВЫБРАТЬ MP3 (TAG)"}
            <input id="f1" type="file" accept="audio/*" hidden onChange={e => setMp3File(e.target.files[0])} />
          </div>
          <div className={`file-row ${wavFile ? 'ready' : ''}`} onClick={() => document.getElementById('f2').click()}>
            {wavFile ? "WAV БЕЗ ТЭГА ✓" : "ВЫБРАТЬ WAV (FULL)"}
            <input id="f2" type="file" accept="audio/*" hidden onChange={e => setWavFile(e.target.files[0])} />
          </div>
          <div className={`file-row ${zipFile ? 'ready' : ''}`} onClick={() => document.getElementById('f3').click()}>
            {zipFile ? "ZIP STEMS ✓" : "ВЫБРАТЬ ZIP (TRACKOUT)"}
            <input id="f3" type="file" hidden onChange={e => setZipFile(e.target.files[0])} />
          </div>
        </div>
        <button className="fresso-submit" onClick={handlePublish} disabled={uploading}>
          {uploading ? "ЗАГРУЗКА..." : "ОПУБЛИКОВАТЬ"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <header className="main-header">
        <div className="logo">FRESSO</div>
        <img src={userAvatar} className="header-avatar" onClick={() => setActiveTab('profile')} />
      </header>

      {(activeTab === 'shop' || activeTab === 'favs') && (
        <div className="page-content">
          <div className="tab-menu">
            <span className={activeTab === 'shop' ? 'active' : ''} onClick={() => setActiveTab('shop')}>МАГАЗИН</span>
            <span className={activeTab === 'favs' ? 'active' : ''} onClick={() => setActiveTab('favs')}>ЛЮБИМЫЕ ({favorites.length})</span>
          </div>
          <div className="beat-list">
            {beats.filter(b => activeTab === 'favs' ? favorites.includes(b.id) : true).map(beat => (
              <div key={beat.id} className="beat-card">
                <div className="beat-cover" onClick={() => playBeat(beat)}>
                  <img src={beat.image} />
                  <div className="play-ico">{currentBeatId === beat.id && isPlaying ? "⏸" : "▶"}</div>
                </div>
                <div className="beat-body">
                  <div className="beat-name-row">
                    <span>{beat.title}</span>
                    <span onClick={() => toggleFav(beat.id)}>{favorites.includes(beat.id) ? "❤️" : "🤍"}</span>
                  </div>
                  <div className="beat-meta-row">{beat.bpm} BPM • {beat.key}</div>
                  <div className="prog-bar">
                    <div className="prog-fill" style={{width: currentBeatId === beat.id ? `${progress}%` : '0%'}}></div>
                  </div>
                </div>
                <div className="beat-buy-btn">${beat.priceMp3}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="profile-view">
          <div className="avatar-circle" onClick={() => document.getElementById('avaInp').click()}>
            <img src={userAvatar} />
            <input id="avaInp" type="file" hidden onChange={changeAvatar} />
          </div>
          <h1 className="profile-name">{tg?.initDataUnsafe?.user?.first_name || "Fresso Producer"}</h1>
          <p className="profile-handle">@{tg?.initDataUnsafe?.user?.username || "fresso"}</p>
          
          <button className="add-btn-main" onClick={() => setActiveTab('admin')}>ДОБАВИТЬ БИТ</button>
          
          <div className="p-menu-list">
            <button className="p-menu-item" onClick={() => setActiveTab('favs')}>ЛЮБИМЫЕ БИТЫ <span>❤️</span></button>
            <button className="p-menu-item">ИСТОРИЯ ЗАКАЗОВ <span>📦</span></button>
            <button className="p-menu-item" onClick={() => window.open('https://t.me/Fr1sso')}>ПОДДЕРЖКА <span>💬</span></button>
          </div>
          <button className="p-back-btn" onClick={() => setActiveTab('shop')}>НАЗАД В МАГАЗИН</button>
        </div>
      )}
    </div>
  );
}

export default App;