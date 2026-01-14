import { useEffect } from 'react'
import WebApp from '@twa-dev/sdk'
import './App.css'

function App() {
  useEffect(() => {
    WebApp.ready();
  }, []);

  // Функция для остановки других треков при включении нового
  const handlePlay = (e) => {
    const audios = document.getElementsByTagName('audio');
    for (let i = 0; i < audios.length; i++) {
      if (audios[i] !== e.target) {
        audios[i].pause();
        audios[i].currentTime = 0; // Сбрасывает трек в начало (по желанию)
      }
    }
  };

  const beats = [
    { id: 1, title: 'Ashes', genre: 'Rock', price: '1500', cover: '/assets/Ashes.png', audio: '/assets/Ashes.mp3' },
    { id: 2, title: 'One Road', genre: 'Chill', price: '2000', cover: '/assets/One_road.png', audio: '/assets/One_road.mp3' },
    { id: 3, title: 'Grey Entrance', genre: 'Atmospheric', price: '1200', cover: '/assets/Grey_entrance.png', audio: '/assets/Grey_entrance.mp3' },
  ];

  return (
    <div className="container">
      <header>
        <h1>BEAT STORE</h1>
        <p>Привет, {WebApp.initDataUnsafe?.user?.first_name || 'Музыкант'}!</p>
      </header>

      <div className="grid">
        {beats.map((beat) => (
          <div key={beat.id} className="card">
            <img src={beat.cover} alt={beat.title} className="cover" />
            <div className="info">
              <h3>{beat.title}</h3>
              <span className="genre">{beat.genre}</span>
              <audio 
                controls 
                src={beat.audio} 
                onPlay={handlePlay} // Вот эта магия отключает другие биты
              ></audio>
              <button className="buy-button" onClick={() => WebApp.showAlert(`Бит ${beat.title} выбран!`)}>
                Купить • {beat.price}₽
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App