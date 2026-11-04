import { useCallback, useLayoutEffect, useState } from 'react';
import { ThemeContext } from './theme';
const THEME_STORAGE_KEY = 'hms-theme';

function readPreference() {
    try {
        const preference = window.localStorage.getItem(THEME_STORAGE_KEY);
        return preference === 'light' || preference === 'dark' ? preference : 'system';
    } catch (error) {
        console.error('Unable to read the saved theme preference.', error);
        return 'system';
    }
}

export function ThemeProvider({ children }) {
    const [preference, setPreference] = useState(readPreference);
    const [systemTheme, setSystemTheme] = useState(() => (
        window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    ));
    const theme = preference === 'system' ? systemTheme : preference;

    useLayoutEffect(() => {
        const root = document.documentElement;
        root.dataset.theme = theme;
        root.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    useLayoutEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const updateSystemTheme = (event) => {
            setSystemTheme(event.matches ? 'dark' : 'light');
        };

        mediaQuery.addEventListener('change', updateSystemTheme);
        return () => mediaQuery.removeEventListener('change', updateSystemTheme);
    }, []);

    const toggleTheme = useCallback(() => {
        const nextPreference = theme === 'dark' ? 'light' : 'dark';
        setPreference(nextPreference);
        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
        } catch (error) {
            console.error('Unable to save the theme preference.', error);
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
