import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy, addDoc } from "firebase/firestore";

const tg = window.Telegram ? window.Telegram.WebApp : null;
const ADMIN_ID = 856199923;

// НАСТРОЙКИ ОБЛАКА
const CLOUD_NAME = "djp9xjfek";
const UPLOAD_PRESET = "Beats and images";

function App() {
  // 1. ВСЕ СОСТОЯНИЯ (STATES)
  const [activeTab, setActiveTab] = useState('shop');
  const [beats, setBeats] = useState([]);
  const [favorites, setFavorites] = useState(JSON.parse(localStorage.getItem('fresso_favs')) || []);
  const [myPurchases, setMyPurchases] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [userAvatar, setUserAvatar] = useState(
    localStorage.getItem('user_ava') || tg?.initDataUnsafe?.user?.photo_url || "https://via.placeholder.com/150"
  );

  // Данные для админки
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState('');
  const [key, setKey] = useState('C');
  const [genre, setGenre] = useState('');
  const [tags, setTags] = useState(''); 
  const [prices, setPrices] = useState({ mp3: '', wav: '', stems: '', excl: '' });

  // Файлы
  const [coverFile, setCoverFile] = useState(null);
  const [mp3File, setMp3File] = useState(null);
  const [wavFile, setWavFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [exclFile, setExclFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Плеер
  const [currentBeatId, setCurrentBeatId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false); // Добавлено сюда для стабильности
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(new Audio());

  // --- ЛОГИКА ФИЛЬТРАЦИИ ---
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    bpmMin: 60,
    bpmMax: 200,
    genre: 'All',
    key: 'All'
  });

  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Списки для выбора
  const availableGenres = ['All', ...new Set(beats.map(b => b.genre).filter(Boolean))];
  const availableKeys = ['All', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'];

  // Вычисляем отфильтрованные биты
  const filteredBeats = beats.filter(beat => {
    const matchesSearch = 
      beat.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      beat.tags?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesBPM = Number(beat.bpm) >= filters.bpmMin && Number(beat.bpm) <= filters.bpmMax;
    const matchesGenre = filters.genre === 'All' || beat.genre === filters.genre;
    const matchesKey = filters.key === 'All' || beat.key === filters.key;

    return matchesSearch && matchesBPM && matchesGenre && matchesKey;
  });

  // 2. ЭФФЕКТЫ (EFFECTS)

  // Инициализация Telegram и загрузка основного списка битов
  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
    }
    const q = query(collection(db, "beats"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setBeats(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // ГЛАВНЫЙ ЭФФЕКТ ПЛЕЕРА: Управляет проигрыванием/паузой
  useEffect(() => {
    if (!audioRef.current.src && currentBeatId) return; // Защита от пустого источника

    if (isPlaying) {
      audioRef.current.play().catch(err => console.log("Ошибка воспроизведения:", err));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentBeatId]);

  // Синхронизация "Любимых" с памятью телефона
  useEffect(() => {
    localStorage.setItem('fresso_favs', JSON.stringify(favorites));
  }, [favorites]);

  // Логика работы прогресс-бара и автопереключения
  useEffect(() => {
    const audio = audioRef.current;
    
    const updateProgress = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        const val = (audio.currentTime / audio.duration) * 100;
        setProgress(val);
      }
    };

    const handleTrackEnd = () => {
      if (isLooping) {
        audio.currentTime = 0;
        audio.play();
      } else {
        // Вызываем функцию переключения (она будет в следующем блоке)
        if (typeof playNext === 'function') playNext();
      }
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleTrackEnd);
    
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleTrackEnd);
    };
  }, [isLooping, currentBeatId, beats]); 

  // ЗАГРУЗКА: Черновик и Покупки
  useEffect(() => {
    const savedDraft = localStorage.getItem('fresso_draft');
    if (savedDraft) {
      const d = JSON.parse(savedDraft);
      setTitle(d.title || '');
      setBpm(d.bpm || '');
      setKey(d.key || 'C');
      setGenre(d.genre || '');
      setTags(d.tags || '');
      setPrices(d.prices || { mp3: '', wav: '', stems: '', excl: '' });
    }

    const currentUserId = tg?.initDataUnsafe?.user?.id || 856199923;
    const q = query(collection(db, "purchases"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const allPurchases = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const userPurchases = allPurchases.filter(p => Number(p.userId) === Number(currentUserId));
      setMyPurchases(userPurchases);
    });
    return () => unsub();
  }, []);

  // АВТОСОХРАНЕНИЕ: Черновик
  useEffect(() => {
    const draft = { title, bpm, key, genre, tags, prices };
    localStorage.setItem('fresso_draft', JSON.stringify(draft));
  }, [title, bpm, key, genre, tags, prices]);

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
      localStorage.setItem('user_ava', url);
      if (tg) tg.showAlert("Фото профиля сохранено!");
    } catch (err) {
      alert("Ошибка загрузки фото");
    }
  };

  const toggleFav = (id) => {
    setFavorites(prev => {
      const isFav = prev.includes(id);
      const updated = isFav
        ? prev.filter(i => i !== id)
        : [...prev, id];
      localStorage.setItem('fresso_favs', JSON.stringify(updated));
      if (tg && !isFav) {
        tg.HapticFeedback.impactOccurred('light');
      }
      return updated;
    });
  };

  const playBeat = (beat) => {
    if (currentBeatId === beat.id) {
      setIsPlaying(!isPlaying);
    } else {
      audioRef.current.src = beat.audio;
      setCurrentBeatId(beat.id);
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    if (audioRef.current.duration) {
      const seekTime = (e.target.value / 100) * audioRef.current.duration;
      audioRef.current.currentTime = seekTime;
      setProgress(e.target.value);
    }
  };

  const simulateProgress = (start, end, duration) => {
    let current = start;
    const step = (end - start) / (duration / 50);
    const interval = setInterval(() => {
      current += step;
      if (current >= end) {
        setUploadProgress(Math.floor(end));
        clearInterval(interval);
      } else {
        setUploadProgress(Math.floor(current));
      }
    }, 50);
    return interval;
  };

  const resetForm = () => {
    setTitle('');
    setBpm('');
    setKey('C');
    setGenre('');
    setTags('');
    setPrices({ mp3: '', wav: '', stems: '', excl: '' });
    setCoverFile(null);
    setMp3File(null);
    setWavFile(null);
    setZipFile(null);
    setExclFile(null);
    setCoverPreview(null);
    document.querySelectorAll('input[type="file"]').forEach(input => input.value = '');
    localStorage.removeItem('fresso_draft');
  };

  const handlePublish = async () => {
    if (!title || !coverFile || !mp3File) return alert("Заполни базу: Название, Фото и MP3!");
    setUploading(true);
    const progressInterval = simulateProgress(0, 85, 5000);

    try {
      const [img, mp3, wav, zip, excl] = await Promise.all([
        uploadFile(coverFile, 'image'),
        uploadFile(mp3File, 'video'),
        uploadFile(wavFile, 'video'),
        uploadFile(zipFile, 'video'),
        uploadFile(exclFile, 'video')
      ]);

      clearInterval(progressInterval);
      setUploadProgress(90);

      await addDoc(collection(db, "beats"), {
        title, bpm: Number(bpm), key, genre, tags,
        image: img, audio: mp3, wavUrl: wav, zipUrl: zip, exclUrl: excl,
        priceMp3: prices.mp3, priceWav: prices.wav,
        priceStems: prices.stems, priceExcl: prices.excl,
        createdAt: new Date()
      });

      setUploadProgress(100);
      setTimeout(() => {
        setUploading(false);
        setActiveTab('shop');
        setUploadProgress(0);
        resetForm();
        if (tg) tg.HapticFeedback.notificationOccurred('success');
      }, 600);
    } catch (e) {
      clearInterval(progressInterval);
      alert("Ошибка: " + e.message);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const toggleLoop = (e) => {
    if (e) e.stopPropagation();
    const newLoop = !isLooping;
    setIsLooping(newLoop);
    if (audioRef.current) {
      audioRef.current.loop = newLoop;
    }
    if (tg) tg.HapticFeedback.impactOccurred('light');
  };

  const playNext = (e) => {
    if (e) e.stopPropagation();
    if (beats.length === 0) return;
    const currentIndex = beats.findIndex(b => b.id === currentBeatId);
    const nextIndex = (currentIndex + 1) % beats.length;
    playBeat(beats[nextIndex]);
    if (tg) tg.HapticFeedback.impactOccurred('medium');
  };

  const playPrev = (e) => {
    if (e) e.stopPropagation();
    if (beats.length === 0) return;
    const currentIndex = beats.findIndex(b => b.id === currentBeatId);
    const prevIndex = (currentIndex - 1 + beats.length) % beats.length;
    playBeat(beats[prevIndex]);
    if (tg) tg.HapticFeedback.impactOccurred('medium');
  };

  // 4. ОТОБРАЖЕНИЕ (RENDER)
  if (activeTab === 'admin') {
    if (tg?.initDataUnsafe?.user?.id !== ADMIN_ID) {
      setActiveTab('shop');
      return null;
    }

    return (
      <div className="admin-container">
        <div className="admin-header">
          <div className="back-area" onClick={() => setActiveTab('profile')}>
            <span className="back-arrow">←</span>
          </div>
          <h2 className="admin-title">НОВЫЙ БИТ</h2>
          <div style={{ width: 44 }}></div>
        </div>

        <div className="admin-form">
          <div className="upload-square" onClick={() => document.getElementById('cInp').click()}>
            {coverPreview ? <img src={coverPreview} alt="preview" /> : <span>ОБЛОЖКА</span>}
            <input id="cInp" type="file" hidden onChange={e => {
              if (e.target.files[0]) {
                setCoverFile(e.target.files[0]);
                setCoverPreview(URL.createObjectURL(e.target.files[0]));
              }
            }} />
          </div>

          <input
            className="fresso-input"
            placeholder="Название"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <input
            className="fresso-input"
            placeholder="Жанр (например, Trap)"
            value={genre}
            onChange={e => setGenre(e.target.value)}
          />
          <input
            className="fresso-input"
            placeholder="Тэги (через запятую)"
            value={tags}
            onChange={e => setTags(e.target.value)}
          />
          <div className="fresso-row">
            <input className="fresso-input" placeholder="BPM" value={bpm} onChange={e => setBpm(e.target.value)} />
            <input className="fresso-input" placeholder="Key" value={key} onChange={e => setKey(e.target.value)} />
          </div>

          <div className="price-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input className="fresso-input" placeholder="MP3 $" value={prices.mp3} onChange={e => setPrices({ ...prices, mp3: e.target.value })} />
            <input className="fresso-input" placeholder="WAV $" value={prices.wav} onChange={e => setPrices({ ...prices, wav: e.target.value })} />
            <input className="fresso-input" placeholder="STEMS $" value={prices.stems} onChange={e => setPrices({ ...prices, stems: e.target.value })} />
            <input className="fresso-input" placeholder="EXCL $" value={prices.excl} onChange={e => setPrices({ ...prices, excl: e.target.value })} />
          </div>

          <div className="file-selectors">
            {[
              { id: 'f1', label: 'MP3 С ТЭГОМ', file: mp3File, set: setMp3File, accept: "audio/*" },
              { id: 'f2', label: 'WAV БЕЗ ТЭГА', file: wavFile, set: setWavFile, accept: "audio/*" },
              { id: 'f3', label: 'ZIP TRACKOUT', file: zipFile, set: setZipFile, accept: "*" },
              { id: 'f4', label: 'ZIP EXCLUSIVE', file: exclFile, set: setExclFile, accept: "*" },
            ].map((item) => (
              <div key={item.id} className={`file-row ${item.file ? 'ready' : ''}`}>
                <div
                  style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }}
                  onClick={() => !item.file && document.getElementById(item.id).click()}
                >
                  <span className="file-status">{item.file ? "✅" : "📁"}</span>
                  <span className="file-name" style={{ fontSize: '12px' }}>
                    {item.file ? item.file.name.substring(0, 15) + '...' : item.label}
                  </span>
                </div>

                {item.file && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div onClick={() => item.set(null)} className="file-action-btn delete">🗑</div>
                    <div onClick={() => document.getElementById(item.id).click()} className="file-action-btn replace">🔄</div>
                  </div>
                )}

                <input
                  id={item.id}
                  type="file"
                  accept={item.accept}
                  hidden
                  onChange={e => e.target.files[0] && item.set(e.target.files[0])}
                />
              </div>
            ))}
          </div>

          {uploading && (
            <div style={{ marginBottom: 20 }}>
              <div className="prog-bar" style={{ background: '#222', height: '6px' }}>
                <div className="prog-fill" style={{ width: `${uploadProgress}%`, transition: '0.3s' }}></div>
              </div>
              <p style={{ textAlign: 'center', fontSize: '12px', marginTop: '8px', color: 'var(--accent)' }}>
                Загрузка: {uploadProgress}%
              </p>
            </div>
          )}

          <button className="fresso-submit" onClick={handlePublish} disabled={uploading}>
            {uploading ? "ПОДОЖДИТЕ..." : "ОПУБЛИКОВАТЬ БИТ"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* 1. ШАПКА */}
      {activeTab !== 'profile' && activeTab !== 'admin' && activeTab !== 'my_purchases' && (
        <header className="main-header">
          <div className="logo">FRESSO</div>
          <img src={userAvatar} className="header-avatar" onClick={() => setActiveTab('profile')} alt="avatar" />
        </header>
      )}

      {/* 2. МАГАЗИН И ЛЮБИМЫЕ */}
      {(activeTab === 'shop' || activeTab === 'favs') && (
        <div className="page-content">
          <div className="tab-menu">
            <span 
              className={activeTab === 'shop' ? 'active' : ''} 
              onClick={() => setActiveTab('shop')}
            >
              МАГАЗИН
            </span>
            <span 
              className={activeTab === 'favs' ? 'active' : ''} 
              onClick={() => setActiveTab('favs')}
            >
              ЛЮБИМЫЕ ({favorites.length})
            </span>
          </div>

          <div className="search-container">
            {/* СТРОКА ПОИСКА */}
            <div className="search-bar">
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input 
                  type="text" 
                  placeholder="Search title, tags..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button 
                className={`filter-toggle-btn ${isFilterOpen ? 'active' : ''}`}
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M4 6h16M4 12h10M4 18h16" />
                </svg>
              </button>
            </div>

            {/* БЫСТРЫЕ ТЕГИ */}
            <div className="quick-tags">
              {availableGenres.map(g => (
                <button 
                  key={g} 
                  className={`tag-btn ${filters.genre === g ? 'active' : ''}`}
                  onClick={() => setFilters({...filters, genre: g})}
                >
                  {g}
                </button>
              ))}
            </div>

            {/* ВЫПАДАЮЩЕЕ ОКНО ФИЛЬТРОВ */}
            {isFilterOpen && (
              <div className="filter-dropdown">
                <div className="filter-group">
                  <div className="filter-label-row">
                    <label>BPM RANGE</label>
                    <span className="range-value">{filters.bpmMin} — {filters.bpmMax}</span>
                  </div>
                  <div className="range-slider-container">
                    <input 
                      type="range" min="60" max="200" step="1"
                      value={filters.bpmMin} 
                      onChange={(e) => setFilters({...filters, bpmMin: Number(e.target.value)})} 
                    />
                    <input 
                      type="range" min="60" max="200" step="1"
                      value={filters.bpmMax} 
                      onChange={(e) => setFilters({...filters, bpmMax: Number(e.target.value)})} 
                    />
                  </div>
                </div>

                <div className="filter-row">
                  <div className="filter-group">
                    <label>GENRE</label>
                    <select value={filters.genre} onChange={(e) => setFilters({...filters, genre: e.target.value})}>
                      {availableGenres.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>KEY</label>
                    <select value={filters.key} onChange={(e) => setFilters({...filters, key: e.target.value})}>
                      {availableKeys.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                </div>

                <div className="filter-actions">
                  <button className="reset-btn" onClick={() => setFilters({bpmMin: 60, bpmMax: 200, genre: 'All', key: 'All'})}>RESET</button>
                  <button className="apply-btn" onClick={() => setIsFilterOpen(false)}>DONE</button>
                </div>
              </div>
            )}
          </div>

          <div className="beat-list">
            {(activeTab === 'favs' ? filteredBeats.filter(b => favorites.includes(b.id)) : filteredBeats).map(beat => (
              <div key={beat.id} className="beat-card" onClick={() => playBeat(beat)}>
                
                <div className="beat-cover">
                  <img src={beat.image} alt="cover" />
                  {currentBeatId === beat.id && isPlaying && (
                    <div className="play-ico">
                      <div className="center-dot"></div>
                    </div>
                  )}
                </div>

                <div className="beat-body">
                  <div className="beat-name-row">{beat.title}</div>
                  
                  {/* Если бит играет — показываем ползунок, если нет — мета-данные */}
                  {currentBeatId === beat.id ? (
                    <div className="card-seek-container" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="range" 
                        className="card-seek-bar" 
                        value={progress} 
                        onChange={handleSeek} 
                      />
                    </div>
                  ) : (
                    <div className="beat-meta-row">
                      {beat.bpm} BPM • {beat.key} • {beat.tags || 'PROD BY FRESSO'}
                    </div>
                  )}
                </div>

                <div 
                  className="beat-buy-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Buy:', beat.title);
                  }}
                >
                  ${beat.priceMp3}
                </div>
              </div>
            ))}
          </div> {/* Конец beat-list */}
        </div> /* Конец page-content */
      )} {/* Конец условия (activeTab === 'shop' || activeTab === 'favs') */}

      {/* 3. ПРОФИЛЬ */}
      {activeTab === 'profile' && (
        <div className="profile-view">
          <div className="admin-header" style={{ width: '100%' }}>
            <div className="back-area" onClick={() => setActiveTab('shop')}>
              <span className="back-arrow">←</span>
            </div>
            <div className="admin-title">ПРОФИЛЬ</div>
            <div style={{ width: 44 }}></div>
          </div>

          <div className="avatar-circle" onClick={() => document.getElementById('avaInp').click()}>
            <img src={userAvatar} alt="avatar" />
            <input id="avaInp" type="file" hidden onChange={changeAvatar} />
          </div>

          <h1 className="profile-name">{tg?.initDataUnsafe?.user?.first_name || "Fresso Producer"}</h1>
          <p className="profile-handle">@{tg?.initDataUnsafe?.user?.username || "fresso"}</p>

          {Number(tg?.initDataUnsafe?.user?.id) === 856199923 && (
            <button className="add-btn-main" onClick={() => setActiveTab('admin')}>
              ДОБАВИТЬ БИТ
            </button>
          )}

          <div className="p-menu-list">
            <button className="p-menu-item" onClick={() => setActiveTab('my_purchases')}>
              МОИ ПОКУПКИ <span>🎹</span>
            </button>
            <button className="p-menu-item" onClick={() => tg?.showAlert("Настройка оплаты появится в ближайшем обновлении!")}>
              СПОСОБЫ ОПЛАТЫ <span>💳</span>
            </button>
            <button className="p-menu-item" onClick={() => window.open('https://t.me/Fr1sso')}>
              ПОДДЕРЖКА <span>💬</span>
            </button>
          </div>

          <div className="social-container-main">
            <div className="social-grid">
              <div className="social-item tiktok" onClick={() => window.open('https://www.tiktok.com/@fresso10')}>
                <i className="fa-brands fa-tiktok"></i>
              </div>
              <div className="social-item youtube" onClick={() => window.open('https://youtube.com/@fressobeats3787')}>
                <i className="fa-brands fa-youtube"></i>
              </div>
              <div className="social-item instagram" onClick={() => window.open('https://www.instagram.com/fresso.beatzzz')}>
                <i className="fa-brands fa-instagram"></i>
              </div>
            </div>
            <div className="social-grid">
              <div className="social-item soundcloud" onClick={() => window.open('https://soundcloud.com/de-nys-nes321')}>
                <i className="fa-brands fa-soundcloud"></i>
              </div>
              <div className="social-item telegram" onClick={() => window.open('https://t.me/fresso1')}>
                <i className="fa-brands fa-telegram"></i>
              </div>
              <div className="social-item vk" onClick={() => window.open('https://vk.com/fr1sso')}>
                <i className="fa-brands fa-vk"></i>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. МОИ ПОКУПКИ */}
      {activeTab === 'my_purchases' && (
        <div className="purchases-view">
          <div className="admin-header" style={{ width: '100%' }}>
            <div className="back-area" onClick={() => setActiveTab('profile')}>
              <span className="back-arrow">←</span>
            </div>
            <div className="admin-title">МОИ ПОКУПКИ</div>
            <div style={{ width: 44 }}></div>
          </div>

          {myPurchases.length === 0 ? (
            <div className="empty-state">
              <p className="no-purchases-msg">У вас пока нет купленных битов 🎶</p>
              <button className="shop-now-btn" onClick={() => setActiveTab('shop')}>
                ВЫБРАТЬ БИТ
              </button>
            </div>
          ) : (
            <div className="purchases-list" style={{ marginTop: '20px', width: '100%' }}>
              {myPurchases.map((pur) => (
                <div key={pur.id} className="purchase-card">
                  <div className="pur-main-info">
                    <div className="pur-cover-mini">
                      <img src={pur.image || 'https://via.placeholder.com/150'} alt="cover" />
                    </div>
                    <div className="pur-text-content">
                      <div className="pur-header-row">
                        <span className="pur-title">{pur.beatTitle}</span>
                        <span className="pur-license">{pur.licenseName}</span>
                      </div>
                      <div className="pur-meta">
                        {pur.bpm} BPM • {pur.key}
                      </div>
                    </div>
                  </div>
                  <button 
                    className="download-btn" 
                    onClick={() => pur.fileUrl && window.open(pur.fileUrl)}
                  >
                    СКАЧАТЬ ФАЙЛ ⬇️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. НИЖНИЙ МИНИ-ПЛЕЕР */}
      {currentBeatId && (
        <div className="mini-player" onClick={() => setIsPlayerExpanded(true)}>
          <div className="player-progress-fill" style={{ width: `${progress}%` }}></div>
          <div className="mini-player-content">
            <img src={beats.find(b => b.id === currentBeatId)?.image} alt="cover" className="mini-cover" />
            <div className="mini-info">
              <div className="mini-title">{beats.find(b => b.id === currentBeatId)?.title}</div>
              <div className="mini-author">FRESSO</div>
            </div>
            <div className="mini-controls">
              <button className="mini-btn mini-fav-btn" onClick={(e) => { e.stopPropagation(); toggleFav(currentBeatId); }}>
                {favorites.includes(currentBeatId) ? "❤️" : "🤍"}
              </button>
              <button className="mini-btn mini-play-btn" onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}>
                {isPlaying ? "||" : "▶"}
              </button>
              <button className="mini-btn mini-close-btn" onClick={(e) => {
                e.stopPropagation();
                if (audioRef.current) audioRef.current.pause();
                setCurrentBeatId(null);
                setIsPlaying(false);
              }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* 6. РАЗВЕРНУТАЯ КАРТОЧКА БИТА (FULL PLAYER) */}
      <div className={`full-player ${isPlayerExpanded ? 'open' : ''}`}>
        <button className="close-player" onClick={(e) => { 
          e.stopPropagation(); 
          setIsPlayerExpanded(false); 
          setIsEditing(false); 
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {beats.find(b => b.id === currentBeatId) && (
          <div className="full-player-content">
            <img 
              src={beats.find(b => b.id === currentBeatId).image} 
              alt="cover" 
              className="full-cover" 
            />
            
            {!isEditing ? (
              <div className="beat-info-full">
                <div className="full-main-info">
                  <h1>{beats.find(b => b.id === currentBeatId)?.title}</h1>
                  <p className="full-genre">{beats.find(b => b.id === currentBeatId)?.genre}</p>
                </div>

                <div className="full-progress-container">
                  <input type="range" className="full-seek-bar" value={progress} onChange={handleSeek} />
                  <div className="time-info">
                    <span>
                      {Math.floor((audioRef.current?.currentTime || 0) / 60)}:
                      {('0' + Math.floor((audioRef.current?.currentTime || 0) % 60)).slice(-2)}
                    </span>
                    <span>
                      {Math.floor((audioRef.current?.duration || 0) / 60)}:
                      {('0' + Math.floor((audioRef.current?.duration || 0) % 60)).slice(-2)}
                    </span>
                  </div>
                </div>

                <div className="full-controls">
                  <div className="side-controls">
                    <button className={`control-btn secondary ${isLooping ? 'active' : ''}`} onClick={toggleLoop}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
                    </button>
                  </div>

                  <div className="main-controls">
                    <button className="control-btn main-skip" onClick={playPrev}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"></path></svg>
                    </button>
                    <button className="control-btn play-pause-circle" onClick={() => setIsPlaying(!isPlaying)}>
                      {isPlaying ? 
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg> : 
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" style={{marginLeft: '4px'}}><path d="M8 5v14l11-7z"></path></svg>
                      }
                    </button>
                    <button className="control-btn main-skip" onClick={playNext}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"></path></svg>
                    </button>
                  </div>

                  <div className="side-controls">
                    <button className="control-btn secondary" onClick={() => toggleFav(currentBeatId)}>
                      {favorites.includes(currentBeatId) ? 
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="#ff4d4d"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg> : 
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                      }
                    </button>
                  </div>
                </div>

                <div className="full-stats-grid">
                  <div className="stat-box"><span>BPM</span><strong>{beats.find(b => b.id === currentBeatId)?.bpm}</strong></div>
                  <div className="stat-box"><span>KEY</span><strong>{beats.find(b => b.id === currentBeatId)?.key}</strong></div>
                </div>

                <div className="full-description">
                  <label>DESCRIPTION</label>
                  <p>{beats.find(b => b.id === currentBeatId)?.description || "High quality production by FRESSO."}</p>
                </div>

                {Number(tg?.initDataUnsafe?.user?.id) === ADMIN_ID && (
                  <button className="edit-beat-btn" onClick={() => setIsEditing(true)}>EDIT BEAT DATA</button>
                )}
              </div>
            ) : (
              <div className="edit-form-full">
                <h2 style={{color: 'var(--accent)', marginBottom: '20px'}}>Edit Mode</h2>
                <p style={{color: '#666'}}>Форма редактирования скоро будет готова...</p>
                <button className="apply-btn" style={{marginTop: '20px'}} onClick={() => setIsEditing(false)}>Back</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;