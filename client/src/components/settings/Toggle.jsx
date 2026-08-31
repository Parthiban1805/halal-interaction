import React from 'react';

const Toggle = ({ enabled, onChange, disabled = false }) => {
 return (
 <label className={`pro-toggle ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
 <input
 type="checkbox"
 checked={enabled}
 disabled={disabled}
 onChange={e => {
   if (!disabled) onChange(e.target.checked);
 }}
 />
 <span className="pro-toggle-track" />
 </label>
 );
};

export default Toggle;
