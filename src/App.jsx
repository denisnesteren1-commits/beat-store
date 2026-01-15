import React, { useState, useRef, useEffect } from 'react';
import './App.css';

// Импортируем нашу настройку базы
import { db, storage } from './firebase'; 
import { collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

function App() {
  const [activeTab, setActiveTab] = useState('shop'); 
  const [beats, setBeats] = useState([]); // Сюда будут приходить биты из базы
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Состояния для полей формы
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState('');
  const [key, setKey] = useState('');
  const [price, setPrice] = useState('');
  const [tags, setTags] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);

  // 1. ПОЛУЧЕНИЕ БИТОВ ИЗ БАЗЫ (В РЕАЛЬНОМ ВРЕМЕНИ)
  useEffect(() => {
    const q = query(collection(db, "beats"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBeats(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. ФУНКЦИЯ ЗАГРУЗКИ В FIREBASE
  const handleUpload = async () => {
    if (!title || !coverFile || !audioFile) {
      alert("Please fill Title and select both files!");
      return;
    }

    setUploading(true);
    try {
      // Загрузка обложки
      const coverRef = ref(storage, `covers/${Date.now()}_${coverFile.name}`);
      await uploadBytes(coverRef, coverFile);
      const coverUrl = await getDownloadURL(coverRef);

      // Загрузка MP3
      const audioRef = ref(storage, `audio/${Date.now()}_${audioFile.name}`);
      await uploadBytes(audioRef, audioFile);
      const audioUrl = await getDownloadURL(audioRef);

      // Запись данных в Firestore
      await addDoc(collection(db, "beats"), {
        title: title,
        bpm: bpm,
        key: key,
        priceWav: price,
        tags: tags.split(',').map(t => t.trim()),
        image: coverUrl,
        audio: audioUrl,
        createdAt: new Date()
      });

      alert("Beat published successfully!");
      setActiveTab('shop');
      // Сброс формы
      setTitle(''); setCoverFile(null); setAudioFile(null);
    } catch (error) {
      console.error(error);
      alert("Upload failed. Check Firebase Rules!");
    } finally {
      setUploading(false);
    }
  };

  // --- РЕНДЕР (ИНТЕРФЕЙС) ---

  if (activeTab === 'admin') return (
    <div className="app-viewport with-nav-offset">
      <div className="fixed-header-navigation">
        <button className="nav-icon-button" onClick={() => setActiveTab('profile')}>←</button>
        <span className="nav-display-title">Upload New Beat</span>
        <div className="nav-placeholder"></div>
      </div>
      
      <div className="scroll-content-container">
        <div className="form-field-group">
          <label className="form-input-label">BEAT TITLE</label>
          <input type="text" className="full-width-input" placeholder="Enter name..." value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div className="form-grid-two-cols">
          <div className="form-field-group">
            <label className="form-input-label">BPM</label>
            <input type="number" className="full-width-input" placeholder="140" value={bpm} onChange={e => setBpm(e.target.value)} />
          </div>
          <div className="form-field-group">
            <label className="form-input-label">KEY</label>
            <input type="text" className="full-width-input" placeholder="Cm" value={key} onChange={e => setKey(e.target.value)} />
          </div>
        </div>

        <div className="files-container-box">
          <div className="file-upload-row">
            <div className="file-info-block">
              <span className="file-main-label">COVER IMAGE</span>
              <span className="file-sub-label">{coverFile ? coverFile.name : "Not selected"}</span>
            </div>
            <label className="file-action-btn">
              {coverFile ? "CHANGE" : "CHOOSE"}
              <input type="file" className="hidden-input-element" accept="image/*" onChange={e => setCoverFile(e.target.files[0])} />
            </label>
          </div>

          <div className="file-upload-row">
            <div className="file-info-block">
              <span className="file-main-label">MP3 PREVIEW</span>
              <span className="file-sub-label">{audioFile ? audioFile.name : "Not selected"}</span>
            </div>
            <label className="file-action-btn">
              {audioFile ? "CHANGE" : "CHOOSE"}
              <input type="file" className="hidden-input-element" accept="audio/*" onChange={e => setAudioFile(e.target.files[0])} />
            </label>
          </div>
        </div>

        <button className="primary-action-button" onClick={handleUpload} disabled={uploading}>
          {uploading ? "UPLOADING TO CLOUD..." : "PUBLISH BEAT"}
        </button>
        <div className="bottom-safe-spacer"></div>
      </div>
    </div>
  );

  // ... остальной интерфейс Profile и Shop (сокращено для ясности, но оставь свой старый код)
  // В Shop вместо inventory.map используй beats.map
  return (
    <div className="app-viewport">
      <header className="shop-top-header">
        <h1 className="main-logo-fresso">FRESSO</h1>
        <img src="https://via.placeholder.com/42" className="top-nav-avatar" onClick={() => setActiveTab('profile')} />
      </header>
      
      <div className="beats-vertical-list">
        {loading ? <p style={{textAlign:'center', marginTop: '20px'}}>Loading beats...</p> : 
          beats.map(beat => (
            <div key={beat.id} className="feed-beat-card">
              <div className="beat-play-control">
                <img src={beat.image} className="beat-card-thumb" />
              </div>
              <div className="beat-card-info">
                <span className="beat-name-text">{beat.title}</span>
                <div className="beat-meta-text">{beat.bpm} BPM • {beat.key}</div>
              </div>
              <div className="beat-card-price">{beat.priceWav}₽</div>
            </div>
          ))
        }
      </div>
      
      {activeTab === 'profile' && (
        <div className="profile-center-layout">
           <button className="primary-action-button" onClick={() => setActiveTab('admin')}>UPLOAD PAGE</button>
           <button className="nav-icon-button" style={{marginTop:'20px'}} onClick={() => setActiveTab('shop')}>BACK</button>
        </div>
      )}
      <div className="bottom-safe-spacer"></div>
    </div>
  );
}

export default App;