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
  const [tags, setTags] = useState(''); // НОВОЕ ПОЛЕ
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
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(new Audio());

  // 2. ЭФФЕКТЫ (EFFECTS)
  
  // Инициализация Telegram и загрузка основного списка битов
  useEffect(() => {
    if (tg) { 
      tg.ready(); 
      tg.expand(); 
    }
    const q = query(collection(db, "beats"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setBeats(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  // Синхронизация "Любимых" с памятью телефона
  useEffect(() => {
    localStorage.setItem('fresso_favs', JSON.stringify(favorites));
  }, [favorites]);

  // Логика работы прогресс-бара плеера
  useEffect(() => {
    const audio = audioRef.current;
    const updateProgress = () => setProgress((audio.currentTime / audio.duration) * 100 || 0);
    audio.addEventListener('timeupdate', updateProgress);
    return () => audio.removeEventListener('timeupdate', updateProgress);
  }, []);

  // ЗАГРУЗКА: Черновик и Покупки
  useEffect(() => {
    // 1. Восстанавливаем черновик админки
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

    // 2. Подписываемся на покупки пользователя
  useEffect(() => {
    // Определяем ID текущего пользователя (твой или клиента из Telegram)
    const currentUserId = tg?.initDataUnsafe?.user?.id || 856199923; 

    const q = query(collection(db, "purchases"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const allPurchases = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Теперь фильтрация идет по ID того, кто открыл приложение
      const userPurchases = allPurchases.filter(p => Number(p.userId) === Number(currentUserId));
      
      setMyPurchases(userPurchases);
    });

    return () => unsub();
  }, []);

  // АВТОСОХРАНЕНИЕ: Черновик при каждом изменении полей
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

  // Смена аватара профиля с сохранением в память
  const changeAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await uploadFile(file, 'image'); // Загружаем в облако
      setUserAvatar(url); // Меняем в текущем окне
      localStorage.setItem('user_ava', url); // СОХРАНЯЕМ В ПАМЯТЬ ТЕЛЕФОНА
      if(tg) tg.showAlert("Фото профиля сохранено!");
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
      
      // 1. Сохраняем в память телефона
      localStorage.setItem('fresso_favs', JSON.stringify(updated));

      // 2. Добавляем вибрацию для Telegram (приятный отклик)
      if (tg && !isFav) {
        tg.HapticFeedback.impactOccurred('light');
      }

      return updated;
    });
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
  // Функция для плавной анимации процентов
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
    // Сбрасываем сами инпуты (чтобы визуально очистить выбор файлов)
    document.querySelectorAll('input[type="file"]').forEach(input => input.value = '');
    localStorage.removeItem('fresso_draft'); 
  };

  const handlePublish = async () => {
    if (!title || !coverFile || !mp3File) return alert("Заполни базу: Название, Фото и MP3!");
    setUploading(true);
    
    // Запускаем плавное движение до 85% (пока грузятся файлы)
    const progressInterval = simulateProgress(0, 85, 5000); 

    try {
      const [img, mp3, wav, zip, excl] = await Promise.all([
        uploadFile(coverFile, 'image'),
        uploadFile(mp3File, 'video'),
        uploadFile(wavFile, 'video'),
        uploadFile(zipFile, 'video'),
        uploadFile(exclFile, 'video')
      ]);
      
      clearInterval(progressInterval); // Останавливаем имитацию
      setUploadProgress(90); // Файлы загружены

      // ... внутри handlePublish в блоке try ...
      await addDoc(collection(db, "beats"), {
        title, bpm, key, genre, tags, // Добавили tags
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
        resetForm(); // <--- ВОТ ЭТО ОЧИСТИТ ФОРМУ
        if(tg) tg.HapticFeedback.notificationOccurred('success');
      }, 600);

    } catch (e) { 
      clearInterval(progressInterval);
      alert("Ошибка: " + e.message); 
      setUploading(false); 
      setUploadProgress(0);
    }
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
              setCoverFile(e.target.files[0]);
              setCoverPreview(URL.createObjectURL(e.target.files[0]));
            }} />
          </div>

          {/* Секция текстовых полей */}
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
            <input className="fresso-input" placeholder="Key" value={key} onChange={e => setKey(e.target.value)} />          </div>

          <div className="price-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input className="fresso-input" placeholder="MP3 $" value={prices.mp3} onChange={e => setPrices({...prices, mp3: e.target.value})} />
            <input className="fresso-input" placeholder="WAV $" value={prices.wav} onChange={e => setPrices({...prices, wav: e.target.value})} />
            <input className="fresso-input" placeholder="STEMS $" value={prices.stems} onChange={e => setPrices({...prices, stems: e.target.value})} />
            <input className="fresso-input" placeholder="EXCL $" value={prices.excl} onChange={e => setPrices({...prices, excl: e.target.value})} />
          </div>

          <div className="file-selectors">
  {[
    { id: 'f1', label: 'MP3 С ТЭГОМ', file: mp3File, set: setMp3File, accept: "audio/*" },
    { id: 'f2', label: 'WAV БЕЗ ТЭГА', file: wavFile, set: setWavFile, accept: "audio/*" },
    { id: 'f3', label: 'ZIP TRACKOUT', file: zipFile, set: setZipFile, accept: "*" },
    { id: 'f4', label: 'ZIP EXCLUSIVE', file: exclFile, set: setExclFile, accept: "*" },
  ].map((item) => (
    <div key={item.id} className={`file-row ${item.file ? 'ready' : ''}`}>
      
      {/* Клик по этой части откроет выбор, только если файл еще НЕ выбран */}
      <div 
        style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }}
        onClick={() => !item.file && document.getElementById(item.id).click()}
      >
        <span className="file-status">{item.file ? "✅" : "📁"}</span>
        <span className="file-name" style={{ fontSize: '12px' }}>
           {item.file ? item.file.name.substring(0, 15) + '...' : item.label}
        </span>
      </div>

      {/* Кнопка удаления и замены появляются только если файл уже есть */}
{item.file && (
  <div style={{ display: 'flex', gap: '8px' }}>
    {/* Кнопка УДАЛИТЬ */}
    <div 
      onClick={() => item.set(null)} 
      className="file-action-btn delete"
      title="Удалить"
    >
      🗑
    </div>
    
    {/* Кнопка ЗАМЕНИТЬ */}
    <div 
      onClick={() => document.getElementById(item.id).click()}
      className="file-action-btn replace"
      title="Заменить"
    >
      🔄
    </div>
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
            <span className={activeTab === 'shop' ? 'active' : ''} onClick={() => setActiveTab('shop')}>МАГАЗИН</span>
            <span className={activeTab === 'favs' ? 'active' : ''} onClick={() => setActiveTab('favs')}>ЛЮБИМЫЕ ({favorites.length})</span>
          </div>
          <div className="beat-list">
            {beats.filter(b => activeTab === 'favs' ? favorites.includes(b.id) : true).map(beat => (
              <div key={beat.id} className="beat-card">
                <div className="beat-cover" onClick={() => playBeat(beat)}>
                  <img src={beat.image} alt="cover" />
                  <div className="play-ico">{currentBeatId === beat.id && isPlaying ? "⏸" : "▶"}</div>
                </div>
                <div className="beat-body">
                  <div className="beat-name-row">
                    <span>{beat.title}</span>
                    <span onClick={() => toggleFav(beat.id)} className="fav-heart">
                      {favorites.includes(beat.id) ? "❤️" : "🤍"}
                    </span>
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
          
          {tg?.initDataUnsafe?.user?.id === 856199923 && (
            <button className="add-btn-main" onClick={() => setActiveTab('admin')}>
              ДОБАВИТЬ БИТ
            </button>
          )}
          
          <div className="p-menu-list">
            <button className="p-menu-item" onClick={() => setActiveTab('my_purchases')}>
              МОИ ПОКУПКИ <span>🎹</span>
            </button>
            <button className="p-menu-item" onClick={() => window.open('https://t.me/Fr1sso')}>ПОДДЕРЖКА <span>💬</span></button>
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
              <p>У вас пока нет купленных битов 🎶</p>
              <button className="shop-now-btn" onClick={() => setActiveTab('shop')}>
                ВЫБРАТЬ БИТ
              </button>
            </div>
          ) : (
            <div className="purchases-list" style={{ marginTop: '20px' }}>
              {myPurchases.map((pur) => (
                <div key={pur.id} className="purchase-card">
                  <div className="pur-header">
                    <span className="pur-title">{pur.beatTitle}</span>
                    <span className="pur-license">{pur.licenseName}</span>
                  </div>
                  <div className="pur-meta">
                    BPM: {pur.bpm} • KEY: {pur.key}
                  </div>
                  <button className="download-btn" onClick={() => window.open(pur.fileUrl)}>
                    СКАЧАТЬ ФАЙЛ ⬇️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} // <--- Эта скобка закрывает функцию App

export default App; // <--- Экспорт всегда идет в самом конце, снаружи функции
