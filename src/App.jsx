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

  // --- СОСТОЯНИЯ ДЛЯ МАГАЗИНА ---
  const [showFilters, setShowFilters] = useState(false);
  const [cart, setCart] = useState([]);
  const [favorites, setFavorites] = useState([]);

  // --- СОСТОЯНИЯ ФОРМЫ (РАСШИРЕННЫЕ) ---
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState('');
  const [key, setKey] = useState('');
  const [genre, setGenre] = useState('Trap');
  const [tags, setTags] = useState('');
  const [price, setPrice] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [audioFile, setAudioFile] = useState(null); // MP3 Preview

  // --- СОСТОЯНИЯ ПЛЕЕРА ---
  const [currentBeatId, setCurrentBeatId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(new Audio());

  // Единый useEffect для инициализации
  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
    }
    const q = query(collection(db, "beats"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBeats(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Таймер прогресса
  useEffect(() => {
    const audio = audioRef.current;
    const updateProgress = () => setProgress((audio.currentTime / audio.duration) * 100 || 0);
    audio.addEventListener('timeupdate', updateProgress);
    return () => audio.removeEventListener('timeupdate', updateProgress);
  }, []);

  const togglePlay = (beat) => {
    const audio = audioRef.current;
    if (currentBeatId === beat.id) {
      isPlaying ? audio.pause() : audio.play().catch(e => console.log(e));
      setIsPlaying(!isPlaying);
    } else {
      audio.src = beat.audio;
      audio.play().catch(e => console.log(e));
      setCurrentBeatId(beat.id);
      setIsPlaying(true);
      setProgress(0);
    }
  };

  const handleSeek = (e, beatId) => {
    if (currentBeatId !== beatId || !audioRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    audioRef.current.currentTime = (x / rect.width) * audioRef.current.duration;
  };

  const handleUpload = async () => {
    if (!title || !coverFile || !audioFile) {
      tg?.showAlert("Заполни название и выбери файлы!");
      return;
    }
    setUploading(true);
    try {
      const coverRef = ref(storage, `covers/${Date.now()}_${coverFile.name}`);
      await uploadBytes(coverRef, coverFile);
      const coverUrl = await getDownloadURL(coverRef);

      const audioRefFB = ref(storage, `audio/${Date.now()}_${audioFile.name}`);
      await uploadBytes(audioRefFB, audioFile);
      const audioUrl = await getDownloadURL(audioRefFB);

      await addDoc(collection(db, "beats"), {
        title, bpm, key, genre, tags: tags.split(',').map(t => t.trim()),
        priceWav: price,
        image: coverUrl,
        audio: audioUrl,
        plays: 0,
        createdAt: new Date()
      });

      tg?.showAlert("Бит добавлен!");
      setActiveTab('shop');
    } catch (e) { tg?.showAlert("Ошибка!"); }
    finally { setUploading(false); }
  };

  // --- РЕНДЕР: АДМИНКА (ДОБАВИТЬ БИТ) ---
  if (activeTab === 'admin') return (
    <div className="app-viewport with-nav-offset">
      <div className="fixed-header-navigation">
        <button className="nav-icon-button" onClick={() => setActiveTab('profile')}>←</button>
        <span className="nav-display-title">ДОБАВИТЬ БИТ</span>
        <div className="nav-placeholder"></div>
      </div>
      <div className="scroll-content-container">
        <div className="cover-box-preview" style={{margin: '0 auto 20px'}}>
          <img src={coverPreview || "https://via.placeholder.com/200"} alt="" />
          <input type="file" accept="image/*" onChange={e => {
            setCoverFile(e.target.files[0]);
            setCoverPreview(URL.createObjectURL(e.target.files[0]));
          }} />
        </div>
        
        <input type="text" className="full-width-input" placeholder="Название" value={title} onChange={e=>setTitle(e.target.value)} />
        
        <div className="form-grid-two-cols">
          <input type="number" className="full-width-input" placeholder="BPM" value={bpm} onChange={e=>setBpm(e.target.value)} />
          <input type="text" className="full-width-input" placeholder="Key (e.g. Cm)" value={key} onChange={e=>setKey(e.target.value)} />
        </div>

        <select className="full-width-input" value={genre} onChange={e=>setGenre(e.target.value)} style={{background: '#1a1a1a', color: 'white', border: '1px solid #333'}}>
          <option value="Trap">Trap</option>
          <option value="Drill">Drill</option>
          <option value="Deep House">Deep House</option>
        </select>

        <input type="text" className="full-width-input" placeholder="Теги (через запятую)" value={tags} onChange={e=>setTags(e.target.value)} />
        <input type="number" className="full-width-input" placeholder="Цена ₽" value={price} onChange={e=>setPrice(e.target.value)} />

        <div className="file-upload-row">
           <span>MP3 PREVIEW</span>
           <input type="file" accept="audio/*" onChange={e=>setAudioFile(e.target.files[0])} />
        </div>

        <button className="primary-action-button" onClick={handleUpload} disabled={uploading}>
          {uploading ? "ЗАГРУЗКА..." : "ОПУБЛИКОВАТЬ"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-viewport">
      {activeTab === 'shop' ? (
        <>
          <header className="shop-top-header">
            <div style={{display:'flex', alignItems:'center', gap: '10px'}}>
              <button className="menu-burger" style={{background:'none', border:'none', color:'white', fontSize:'24px'}}>☰</button>
              <h1 className="main-logo-fresso">FRESSO</h1>
            </div>
            <div style={{display:'flex', alignItems:'center', gap: '15px'}}>
               <div className="cart-icon-container" style={{position:'relative'}}>
                  <span style={{fontSize:'20px'}}>🛒</span>
                  {cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
               </div>
               <img src={tg?.initDataUnsafe?.user?.photo_url || "https://via.placeholder.com/42"} className="top-nav-avatar" onClick={() => setActiveTab('profile')} alt="" />
            </div>
          </header>

          <div className="filter-bar-toggle" onClick={() => setShowFilters(!showFilters)} style={{padding: '10px 20px', color: '#888', fontSize:'12px'}}>
            {showFilters ? "✕ ЗАКРЫТЬ ФИЛЬТРЫ" : "▽ ФИЛЬТРЫ И ПОИСК"}
          </div>

          {showFilters && (
            <div className="filters-dropdown" style={{padding: '0 20px 20px'}}>
               <div className="filter-row">
                  <label>BPM: {bpm || 140}</label>
                  <input type="range" min="60" max="200" style={{width:'100%', accentColor: 'red'}} />
               </div>
            </div>
          )}

          <div className="beats-vertical-list">
            {loading ? <p style={{textAlign:'center'}}>Загрузка...</p> : 
              beats.map(beat => {
                const isThisCurrent = currentBeatId === beat.id;
                const isLiked = favorites.includes(beat.id);
                return (
                  <div key={beat.id} className="feed-beat-card">
                    <div className="beat-play-control" onClick={() => togglePlay(beat)}>
                      <img src={beat.image} className="beat-card-thumb" alt="" />
                      <div className="play-status-overlay">
                        {isThisCurrent && isPlaying ? "⏸" : "▶"}
                      </div>
                    </div>
                    <div className="beat-card-info">
                      <div className="beat-title-row">
                        <span className="beat-name-text">{beat.title}</span>
                        <div style={{display:'flex', gap:'10px'}}>
                           <span onClick={() => setFavorites(prev => isLiked ? prev.filter(id=>id!==beat.id) : [...prev, beat.id])}>
                             {isLiked ? "❤️" : "🤍"}
                           </span>
                           <span className="beat-card-price" onClick={() => setCart([...cart, beat.id])}>{beat.priceWav}₽</span>
                        </div>
                      </div>
                      <div className="beat-meta-text">{beat.bpm} BPM • {beat.key} • {beat.genre}</div>
                      <div className="beat-progress-bar" onClick={(e) => handleSeek(e, beat.id)}>
                        <div className="beat-progress-fill" style={{ width: `${isThisCurrent ? progress : 0}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </>
      ) : (
        <div className="profile-center-layout" style={{transform: 'scale(0.9)'}}>
            <div className="avatar-huge-wrapper">
                <img src={tg?.initDataUnsafe?.user?.photo_url || "https://via.placeholder.com/160"} className="avatar-image-circle" alt="" />
                <div className="avatar-edit-plus" onClick={() => setActiveTab('admin')}>+</div>
            </div>
            <h2 className="profile-user-name">{tg?.initDataUnsafe?.user?.first_name || "USER"}</h2>
            <button className="primary-action-button" onClick={() => setActiveTab('admin')}>ДОБАВИТЬ БИТ</button>
            <div style={{marginTop: '20px', display:'flex', flexDirection:'column', gap:'10px', width: '100%'}}>
               <button className="secondary-btn">❤️ ЛЮБИМЫЕ</button>
               <button className="secondary-btn">🛒 КОРЗИНА</button>
               <button className="secondary-btn">💳 СПОСОБ ОПЛАТЫ</button>
            </div>
            <button className="nav-icon-button" style={{marginTop:'40px'}} onClick={() => setActiveTab('shop')}>← НАЗАД</button>
        </div>
      )}
      <div className="bottom-safe-spacer"></div>
    </div>
  );
}

export default App;