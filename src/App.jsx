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
    if (!title || !coverFile || !audioFile) return;
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
        createdAt: new Date()
      });
      setUploading(false);
      setActiveTab('shop');
    } catch (e) { setUploading(false); }
  };

  const SocialLinks = () => (
    <div className="social-row">
      <a href="#">📸</a><a href="#">📺</a><a href="#" className="tg-icon">✈️</a><a href="#">🟦</a><a href="#">☁️</a>
    </div>
  );

  if (activeTab === 'admin') return (
    <div className="app-viewport">
      <div className="header-nav"><button onClick={() => setActiveTab('profile')}>←</button><span>ADMIN</span></div>
      <div className="scroll-content">
        <div className="upload-zone" onClick={() => document.getElementById('cInp').click()}>
          {coverPreview ? <img src={coverPreview} alt="prev" /> : "FOTO"}
          <input id="cInp" type="file" hidden onChange={e => {
            setCoverFile(e.target.files[0]);
            setCoverPreview(URL.createObjectURL(e.target.files[0]));
          }} />
        </div>
        <input className="fresso-input" placeholder="Title" onChange={e => setTitle(e.target.value)} />
        <button className="main-btn" onClick={handleUpload}>{uploading ? "..." : "PUBLISH"}</button>
      </div>
    </div>
  );

  return (
    <div className="app-viewport">
      {activeTab === 'shop' ? (
        <>
          <header className="shop-header">
            <h1 className="logo">FRESSO</h1>
            <img src={tg?.initDataUnsafe?.user?.photo_url || ""} className="avatar-small" onClick={() => setActiveTab('profile')} alt="p" />
          </header>
          <div className="beat-list">
            {beats.map(beat => (
              <div key={beat.id} className="beat-card" onClick={() => togglePlay(beat)}>
                <img src={beat.image} alt="b" />
                <div className="beat-info">
                  <span>{beat.title}</span>
                  <span>from ${beat.priceMp3 || beat.price || "0"}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="profile-screen">
          <button onClick={() => setActiveTab('shop')}>← BACK</button>
          <div className="profile-content">
            <h2>{tg?.initDataUnsafe?.user?.first_name || "PRODUCER"}</h2>
            <button className="main-btn" onClick={() => setActiveTab('admin')}>ADD BEAT</button>
            <SocialLinks />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;