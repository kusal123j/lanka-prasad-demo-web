import React from "react";
import Lottie from "lottie-react";
import stickerAnimation from "../../assets/animated_sticker.json";

const AnimatedSticker = () => {
  return (
    <div className="w-48 h-48 transition-transform duration-300 ease-in-out hover:scale-120">
      <Lottie animationData={stickerAnimation} loop={true} />
    </div>
  );
};

export default AnimatedSticker;
