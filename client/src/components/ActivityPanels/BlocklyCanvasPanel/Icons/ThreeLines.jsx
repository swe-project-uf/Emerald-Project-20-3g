import React from 'react';
import LinesSVG from '../../../../assets/three-lines.svg'

const ThreeLines = ({ setHoverMenu, handleMenuCollapse }) => {
  
  return (
    <div>
      <img
        src={LinesSVG}
        alt='Three Lines'
        onMouseEnter={() => setHoverMenu(true)}
        onMouseLeave={() => setHoverMenu(false)}
        onClick={handleMenuCollapse}
        className='hvr-info'
      />
    </div>
  );
};

export default ThreeLines;