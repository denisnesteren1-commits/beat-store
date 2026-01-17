import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Firebase imports
import { db, storage } from './firebase'; 
import { collection, onSnapshot, query, orderBy, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const tg = window.Telegram.WebApp;

function App() {
  const [activeTab, setActiveTab] = useState('shop'); 
  const [beats, setBeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // --- СОСТОЯНИЯ ФОРМЫ АДМИНА ---
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState('');
  const [key, setKey] = useState('');
  const [price, setPrice] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [audioFile, setAudioFile] = useState(null);

  // --- СОСТОЯНИЯ ПЛЕЕРА ---
  const [currentBeatId, setCurrentBeatId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(new Audio());

  useEffect(() => {
    tg.ready();
    tg.expand();
    const q = query(collection(db, "beats"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBeats(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- ЛОГИКА ПЛЕЕРА ---
  useEffect(() => {
    const audio = audioRef.current;
    const updateProgress = () => {
      const p = (audio.currentTime / audio.duration) * 100;
      setProgress(p || 0);
    };
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', () => { setIsPlaying(false); setProgress(0); });
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
    const clickedPercent = x / rect.width;
    audioRef.current.currentTime = clickedPercent * audioRef.current.duration;
  };

  // --- ЛОГИКА ЗАГРУЗКИ ---
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!title || !coverFile || !audioFile) {
      tg.showAlert("Заполни название и выбери оба файла!");
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
        title, bpm, key, priceWav: price,
        image: coverUrl,
        audio: audioUrl,
        createdAt: new Date()
      });

      tg.showAlert("Бит опубликован!");
      setActiveTab('shop');
      setTitle(''); setCoverFile(null); setCoverPreview(null); setAudioFile(null);
    } catch (error) {
      tg.showAlert("Ошибка Firebase!");
    } finally {
      setUploading(false);
    }
  };

  // --- РЕНДЕР ЭКРАНОВ ---

  if (activeTab === 'admin') return (
    <div className="app-viewport with-nav-offset">
      <div className="fixed-header-navigation">
        <button className="nav-icon-button" onClick={() => setActiveTab('profile')}>←</button>
        <span className="nav-display-title">НОВЫЙ БИТ</span>
        <div className="nav-placeholder"></div>
      </div>
      <div className="scroll-content-container">
        <div className="cover-upload-wrapper">
          <div className="cover-box-preview">
            <img src={coverPreview || "https://via.placeholder.com/200"} className="preview-image-source" alt="" />
            <label className="cover-change-overlay">
              <span className="overlay-text">{coverFile ? "ИЗМЕНИТЬ" : "ДОБАВИТЬ ОБЛОЖКУ"}</span>
              <input type="file" className="hidden-input-element" accept="image/*" onChange={handlePhotoChange} />
            </label>
          </div>
        </div>
        <div className="form-field-group">
          <label className="form-input-label">НАЗВАНИЕ</label>
          <input type="text" className="full-width-input" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="form-grid-two-cols">
          <div className="form-field-group">
            <label className="form-input-label">BPM</label>
            <input type="number" className="full-width-input" value={bpm} onChange={e => setBpm(e.target.value)} />
          </div>
          <div className="form-field-group">
            <label className="form-input-label">KEY</label>
            <input type="text" className="full-width-input" value={key} onChange={e => setKey(e.target.value)} />
          </div>
        </div>
        <div className="form-field-group">
          <label className="form-input-label">ЦЕНА (₽)</label>
          <input type="number" className="full-width-input" value={price} onChange={e => setPrice(e.target.value)} />
        </div>
        <div className="files-container-box">
          <div className="file-upload-row">
            <div className="file-info-block">
              <span className="file-main-label">MP3 PREVIEW</span>
              <span className="file-sub-label">{audioFile ? audioFile.name : "Не выбран"}</span>
            </div>
            <label className="file-action-btn">
              ВЫБРАТЬ
              <input type="file" className="hidden-input-element" accept="audio/*" onChange={e => setAudioFile(e.target.files[0])} />
            </label>
          </div>
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
            <h1 className="main-logo-fresso">FRESSO</h1>
            <img 
              src={tg.initDataUnsafe?.user?.photo_url || "https://via.placeholder.com/42"} 
              className="top-nav-avatar" 
              onClick={() => setActiveTab('profile')} 
            />
          </header>
          <div className="beats-vertical-list">
            {loading ? <p style={{textAlign:'center', color:'#888'}}>Загрузка...</p> : 
              beats.map(beat => {
                const isThisCurrent = currentBeatId === beat.id;
                return (
                  <div key={beat.id} className="feed-beat-card">
                    <div className="beat-play-control" onClick={() => togglePlay(beat)}>
                      <img src={beat.image} className="beat-card-thumb" alt="" />
                      <div className="play-status-overlay">
                        {isThisCurrent && isPlaying ? <div className="pause-icon"></div> : <div className="play-icon"></div>}
                      </div>
                    </div>
                    <div className="beat-card-info">
                      <div className="beat-title-row">
                        <span className="beat-name-text">{beat.title}</span>
                        <span className="beat-card-price">{beat.priceWav}₽</span>
                      </div>
                      <div className="beat-meta-text">{beat.bpm} BPM • {beat.key}</div>
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
        <div className="profile-center-layout">
            <div className="avatar-huge-wrapper">
                <img src={tg.initDataUnsafe?.user?.photo_url || "https://via.placeholder.com/160"} className="avatar-image-circle" alt="" />
                <div className="avatar-edit-plus" onClick={() => setActiveTab('admin')}>+</div>
            </div>
            <h2 className="profile-user-name">{tg.initDataUnsafe?.user?.first_name || "USER"}</h2>
            <p className="profile-user-handle">@{tg.initDataUnsafe?.user?.username || "fresso_user"}</p>
            <button className="primary-action-button" onClick={() => setActiveTab('admin')}>УПРАВЛЕНИЕ БИТАМИ</button>
            <button className="nav-icon-button" style={{marginTop:'30px', opacity: 0.5}} onClick={() => setActiveTab('shop')}>ВЕРНУТЬСЯ</button>
        </div>
      )}
      <div className="bottom-safe-spacer"></div>
    </div>
  );
}

export default App;