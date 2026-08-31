import { API_URL } from '../config';
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
 const [user, setUser] = useState(null);
 const [token, setToken] = useState(localStorage.getItem('crm_access_token') || null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const initAuth = async () => {
 const storedToken = localStorage.getItem('crm_access_token');
 if (storedToken) {
 try {
 const res = await fetch(`${API_URL}/api/auth/crm/me`, {
 headers: {
 'Authorization': `Bearer ${storedToken}`
 }
 });
 const data = await res.json();
 if (res.ok) {
 setUser(data);
 setToken(storedToken);
 } else {
 // Token might be expired, try refreshing
 await handleRefresh();
 }
 } catch (err) {
 console.error('Failed to authenticate on load:', err);
 logout();
 }
 }
 setLoading(false);
 };

 initAuth();
 }, []);

 const handleRefresh = async () => {
 const refreshToken = localStorage.getItem('crm_refresh_token');
 if (!refreshToken) {
 logout();
 return;
 }

 try {
 const res = await fetch(`${API_URL}/api/auth/crm/refresh`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ refreshToken })
 });
 const data = await res.json();
 if (res.ok && data.accessToken) {
 localStorage.setItem('crm_access_token', data.accessToken);
 setToken(data.accessToken);
 
 // Fetch user info again
 const meRes = await fetch(`${API_URL}/api/auth/crm/me`, {
 headers: { 'Authorization': `Bearer ${data.accessToken}` }
 });
 const meData = await meRes.json();
 if (meRes.ok) {
 setUser(meData);
 } else {
 logout();
 }
 } else {
 logout();
 }
 } catch (err) {
 console.error('Token refresh failed:', err);
 logout();
 }
 };

 const login = async (email, password) => {
 const res = await fetch(`${API_URL}/api/auth/crm/login`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ email, password })
 });
 const data = await res.json();
 if (!res.ok) {
 throw new Error(data.error || 'Failed to login');
 }

 localStorage.setItem('crm_access_token', data.accessToken);
 localStorage.setItem('crm_refresh_token', data.refreshToken);
 setToken(data.accessToken);
 setUser(data.user);
 return data.user;
 };

 const register = async (name, email, password, role) => {
 const res = await fetch(`${API_URL}/api/auth/crm/register`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ name, email, password, role })
 });
 const data = await res.json();
 if (!res.ok) {
 throw new Error(data.error || 'Failed to register');
 }

 localStorage.setItem('crm_access_token', data.accessToken);
 localStorage.setItem('crm_refresh_token', data.refreshToken);
 setToken(data.accessToken);
 setUser(data.user);
 return data.user;
 };

 const logout = async () => {
 const refreshToken = localStorage.getItem('crm_refresh_token');
 if (refreshToken) {
 try {
 await fetch(`${API_URL}/api/auth/crm/logout`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ refreshToken })
 });
 } catch (e) {
 console.error(e);
 }
 }
 localStorage.removeItem('crm_access_token');
 localStorage.removeItem('crm_refresh_token');
 setToken(null);
 setUser(null);
 };

 return (
 <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAuthenticated: !!user }}>
 {children}
 </AuthContext.Provider>
 );
};

export const useAuth = () => useContext(AuthContext);
