"use client"

import React from 'react'

interface LoadingScreenProps {
  progress?: number;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress = 0 }) => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#0047ab',
      color: 'white',
      fontFamily: 'Satoshi, Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Museum wird geladen...</h1>
      <div style={{
        width: '80%',
        maxWidth: '500px',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 0 20px rgba(0, 0, 0, 0.3)',
        marginBottom: '2rem'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '20px',
          backgroundColor: '#66b3ff',
          borderRadius: '10px',
          transition: 'width 0.3s ease-in-out',
          boxShadow: '0 0 10px rgba(102, 179, 255, 0.7)'
        }} />
      </div>
      <p style={{ fontSize: '1.2rem' }}>{progress}% abgeschlossen</p>
      <div style={{ marginTop: '3rem', textAlign: 'center' }}>
        <p>Bereite dich auf ein einzigartiges Museumserlebnis vor...</p>
        <p>Entdecke Kunstwerke und finde deine große Liebe!</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
