import React, { useState, useEffect } from 'react';
import { GenerationData } from '../types';

interface HomeScreenProps {
  onGenerate: (data: GenerationData) => void;
  language: string;
  onLanguageChange: (lang: string) => void;
}

const uiStrings = {
  tr: {
    title: "Boyama Kitabı Oluşturucu",
    step: "1/3 Ana Ekran",
    mainHeading: "Kişisel Boyama Kitabını Saniyeler İçinde Oluştur",
    subHeading: "Çocuğunun adını ve hayalindeki temayı gir, sihirli bir şekilde boyama sayfalarını hazırlayalım.",
    childsName: "Çocuğun Adı",
    namePlaceholder: "Örn: Ayşe",
    nameError: "İsim alanı boş bırakılamaz.",
    childsAge: "Çocuğun Yaşı",
    canWrite: "Okuma yazma biliyor mu?",
    pageCount: "Sayfa Sayısı",
    pageCountHint: "En az 1, en fazla 10 sayfa seçilebilir.",
    theme: "Boyama Teması",
    themePlaceholder: "Hayalindeki temayı yaz (örn: uzaydaki sevimli kediler)",
    popularThemes: "Veya Popüler Temalardan Seç:",
    generateButton: "Boyama Kitabı Oluştur",
    themes: [
      { name: 'Dinozorlar', icon: 'egg_alt' },
      { name: 'Prensesler', icon: 'castle' },
      { name: 'Arabalar', icon: 'directions_car' },
      { name: 'Süper Kahramanlar', icon: 'shield' },
      { name: 'Hayvanlar', icon: 'pets' },
      { name: 'Uzay', icon: 'rocket_launch' },
    ]
  },
  en: {
    title: "Coloring Book Creator",
    step: "1/3 Home Screen",
    mainHeading: "Create a Personal Coloring Book in Seconds",
    subHeading: "Enter your child's name and a theme you can dream of, and we'll magically prepare the coloring pages.",
    childsName: "Child's Name",
    namePlaceholder: "e.g., Alice",
    nameError: "Name field cannot be empty.",
    childsAge: "Child's Age",
    canWrite: "Can they read and write?",
    pageCount: "Number of Pages",
    pageCountHint: "Select a minimum of 1 and a maximum of 10 pages.",
    theme: "Coloring Theme",
    themePlaceholder: "Enter your dream theme (e.g., cute cats in space)",
    popularThemes: "Or Choose From Popular Themes:",
    generateButton: "Create Coloring Book",
    themes: [
      { name: 'Dinosaurs', icon: 'egg_alt' },
      { name: 'Princesses', icon: 'castle' },
      { name: 'Cars', icon: 'directions_car' },
      { name: 'Superheroes', icon: 'shield' },
      { name: 'Animals', icon: 'pets' },
      { name: 'Space', icon: 'rocket_launch' },
    ]
  }
};

const LanguageSwitcher: React.FC<{ language: string; onLanguageChange: (lang: string) => void; }> = ({ language, onLanguageChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-200/80 dark:bg-slate-800/80 text-text-light dark:text-text-dark transition-colors hover:bg-slate-300/80 dark:hover:bg-slate-700/80">
                 <img src={`https://flagcdn.com/w20/${language === 'tr' ? 'tr' : 'gb'}.png`} alt={language} className="w-5 h-auto rounded-sm" />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-32 origin-top-right rounded-md bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                    <div className="py-1">
                        <button onClick={() => { onLanguageChange('tr'); setIsOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
                             <img src="https://flagcdn.com/w20/tr.png" alt="Turkish" className="w-5 h-auto rounded-sm" />
                             <span>Türkçe</span>
                        </button>
                        <button onClick={() => { onLanguageChange('en'); setIsOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
                           <img src="https://flagcdn.com/w20/gb.png" alt="English" className="w-5 h-auto rounded-sm" />
                           <span>English</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const HomeScreen: React.FC<HomeScreenProps> = ({ onGenerate, language, onLanguageChange }) => {
  const [name, setName] = useState('');
  const [pageCount, setPageCount] = useState(5);
  const [theme, setTheme] = useState('');
  const [age, setAge] = useState(6);
  const [canWrite, setCanWrite] = useState(false);
  const [nameError, setNameError] = useState('');
  const s = uiStrings[language as keyof typeof uiStrings] || uiStrings.tr;

  const handlePageCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Math.min(10, Number(e.target.value)));
    setPageCount(value);
  };
  
  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAge(Number(e.target.value));
  };

  const handleThemeButtonClick = (themeName: string) => {
    if (theme === themeName) {
      setTheme(''); // Deselect
    } else {
      setTheme(themeName);
    }
  };

  const handleThemeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTheme(e.target.value);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setNameError(s.nameError);
      return;
    }
    setNameError('');
    onGenerate({ name: name.trim(), pageCount, theme: theme.trim() || 'General', age, canWrite });
  };
  
  const toggleDarkMode = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  };

  return (
    <>
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800 px-4 sm:px-10 py-4">
        <div className="flex items-center gap-4 text-slate-800 dark:text-white">
          <div className="size-7 text-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 42.4379C4 42.4379 14.0962 36.0744 24 41.1692C35.0664 46.8624 44 42.2078 44 42.2078L44 7.01134C44 7.01134 35.068 11.6577 24.0031 5.96913C14.0971 0.876274 4 7.27094 4 7.27094L4 42.4379Z" fill="currentColor"></path>
            </svg>
          </div>
          <h2 className="font-display text-text-light dark:text-text-dark text-lg font-bold leading-tight tracking-[-0.015em]">{s.title}</h2>
        </div>
        <div className="flex flex-1 justify-end gap-2 sm:gap-4">
          <button onClick={toggleDarkMode} aria-label="Toggle high contrast mode" className="flex min-w-0 sm:min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 sm:w-auto sm:px-4 bg-slate-200/80 dark:bg-slate-800/80 text-text-light dark:text-text-dark text-sm font-bold leading-normal tracking-[0.015em] transition-colors hover:bg-slate-300/80 dark:hover:bg-slate-700/80">
            <span className="material-symbols-outlined text-xl">contrast</span>
          </button>
          <LanguageSwitcher language={language} onLanguageChange={onLanguageChange} />
        </div>
      </header>
      <main className="flex flex-1 justify-center py-8 sm:py-12 px-4 sm:px-6">
        <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
          <div className="flex flex-col items-center gap-8 sm:gap-10">
            <div className="flex flex-col gap-4 text-center px-4">
              <p aria-live="polite" className="font-bold text-sm text-primary">{s.step}</p>
              <h1 className="font-display text-slate-900 dark:text-white text-4xl sm:text-5xl font-black leading-tight tracking-[-0.03em]">{s.mainHeading}</h1>
              <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                {s.subHeading}
              </p>
            </div>
            <div className="w-full max-w-xl mx-auto flex flex-col gap-6 sm:gap-8">
              <div className="flex flex-col">
                <label className="flex flex-col w-full">
                  <p className="text-slate-800 dark:text-slate-200 text-base font-medium leading-normal pb-2">{s.childsName}</p>
                  <input value={name} onChange={(e) => { setName(e.target.value); if (e.target.value) setNameError(''); }} aria-describedby="name-error" aria-label={s.childsName} className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded text-slate-800 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary h-14 placeholder:text-slate-400 dark:placeholder-slate-500 p-[15px] text-base font-normal leading-normal ring-2 ring-transparent" placeholder={s.namePlaceholder} />
                </label>
                {nameError && <p aria-live="assertive" className="text-red-500 text-sm font-medium pt-1.5" id="name-error" role="alert">{nameError}</p>}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="w-full">
                    <div className="relative flex w-full flex-col items-start justify-between gap-3">
                    <div className="flex w-full shrink-[3] items-center justify-between">
                        <p className="text-slate-800 dark:text-slate-200 text-base font-medium leading-normal">{s.childsAge}</p>
                        <p className="text-slate-800 dark:text-slate-200 text-base font-bold">{age}</p>
                    </div>
                    <div className="flex h-4 w-full items-center gap-4">
                        <input value={age} onChange={handleAgeChange} aria-label="Yaş Seçici" className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-primary" max="9" min="3" type="range" />
                    </div>
                    </div>
                </div>
                 <div className="w-full flex items-center justify-center">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <p className="text-slate-800 dark:text-slate-200 text-base font-medium">{s.canWrite}</p>
                        <div className="relative">
                            <input type="checkbox" checked={canWrite} onChange={(e) => setCanWrite(e.target.checked)} className="sr-only peer" />
                            <div className="w-14 h-8 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-slate-600 peer-checked:bg-primary"></div>
                        </div>
                    </label>
                 </div>
              </div>

              <div className="w-full">
                <div className="relative flex w-full flex-col items-start justify-between gap-3">
                  <div className="flex w-full shrink-[3] items-center justify-between">
                    <p className="text-slate-800 dark:text-slate-200 text-base font-medium leading-normal">{s.pageCount}</p>
                    <div className="flex items-center gap-2">
                      <input value={pageCount} onChange={handlePageCountChange} aria-label="Sayfa Sayısı Girişi" className="form-input w-16 text-center rounded text-slate-800 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary h-10 placeholder:text-slate-500 dark:placeholder-slate-400 p-2 text-base font-normal leading-normal" max="10" min="1" type="number" />
                    </div>
                  </div>
                  <div className="flex h-4 w-full items-center gap-4">
                    <input value={pageCount} onChange={handlePageCountChange} aria-label="Sayfa Sayısı Seçici" className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-primary" max="10" min="1" type="range" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-normal pt-1">{s.pageCountHint}</p>
                </div>
              </div>
              <div className="flex flex-col gap-6 p-4 sm:p-6 bg-slate-100 dark:bg-slate-900/50 rounded-lg">
                <label className="flex flex-col w-full">
                  <p className="text-slate-800 dark:text-slate-200 text-base font-medium leading-normal pb-2">{s.theme}</p>
                  <input value={theme} onChange={handleThemeInputChange} aria-label={s.theme} className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded text-slate-800 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary h-14 placeholder:text-slate-400 dark:placeholder-slate-500 p-[15px] text-base font-normal leading-normal" placeholder={s.themePlaceholder} />
                </label>
              </div>
              <div className="flex flex-col gap-4">
                <p className="text-slate-800 dark:text-slate-200 text-base font-medium leading-normal text-center">{s.popularThemes}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {s.themes.map((t) => (
                    <button key={t.name} onClick={() => handleThemeButtonClick(t.name)} aria-pressed={theme === t.name} className={`group relative flex flex-col items-center justify-center gap-2 p-4 h-28 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary dark:hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background-light dark:focus:ring-offset-background-dark ${theme === t.name ? 'ring-2 ring-primary border-primary bg-primary/10 dark:bg-primary/20' : ''}`}>
                      <span className="material-symbols-outlined text-4xl text-accent transition-transform duration-200 ease-in-out group-hover:scale-110">{t.icon}</span>
                      <span className={`text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary dark:group-hover:text-primary ${theme === t.name ? 'text-primary' : ''}`}>{t.name}</span>
                      {theme === t.name && <span className="material-symbols-outlined text-xl text-primary absolute top-2 right-2">check_circle</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleSubmit} aria-label="Boyama Kitabı Oluştur ve Sonraki Adıma Geç" className="group flex min-w-[84px] w-full max-w-xl cursor-pointer items-center justify-center overflow-hidden rounded-lg h-14 px-6 bg-accent text-white text-base font-bold leading-normal tracking-[0.015em] shadow-lg shadow-accent/30 hover:bg-opacity-90 transition-all duration-300 ease-in-out transform hover:scale-105">
              <span className="truncate">{s.generateButton}</span>
              <span className="material-symbols-outlined ml-2 transition-transform duration-300 ease-in-out group-hover:translate-x-1">arrow_forward</span>
            </button>
          </div>
        </div>
      </main>
    </>
  );
};

export default HomeScreen;