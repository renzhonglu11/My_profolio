import React from "react";
import {video} from '../styles/project-video.module.css' 

const Video = ({ videoSrcURL, videoTitle, ...props }) => (
  <div className={video}>
    <iframe
      width="455"
      height="809"
    //   src="https://www.youtube.com/embed/HrIaxUHXfxk"
      src = {videoSrcURL}
      title= {videoTitle}
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      rel="0"
    ></iframe>
  </div>
);
export default Video;
