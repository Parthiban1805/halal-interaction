import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
 const [theme, setTheme] = useState(() => {
 const savedTheme = localStorage.getItem('theme');
 // If no theme is saved, check system preference, default to light
 if (savedTheme) {
 return savedTheme;
 }
 if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
 return 'dark';
 }
 return 'light';
 });

 useEffect(() => {
 localStorage.setItem('theme', theme);
 const root = window.document.documentElement;
 if (theme === 'dark') {
 root.classList.add('dark');
 } else {
 root.classList.remove('dark');
 }
 }, [theme]);

 const toggleTheme = () => {
 setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
 };

 return (
 <ThemeContext.Provider value={{ theme, toggleTheme }}>
 {children}
 </ThemeContext.Provider>
 );
};

export const useTheme = () => useContext(ThemeContext);
