import React from 'react';

const Spinner = ({ className = "w-5 h-5", size }) => {
 const inlineStyle = size ? { width: size, height: size } : {width: '25px', height: '25px'};

 return (
 <div 
 className={`animate-spin inline-block bg-current shrink-0 ${className}`}
 style={{
 ...inlineStyle,
 maskImage: 'url(/loading/loadingV4.svg)',
 WebkitMaskImage: 'url(/loading/loadingV4.svg)',
 maskSize: 'contain',
 WebkitMaskSize: 'contain',
 maskRepeat: 'no-repeat',
 WebkitMaskRepeat: 'no-repeat',
 maskPosition: 'center',
 WebkitMaskPosition: 'center',
 }}
 />
 );
};

export default Spinner;
