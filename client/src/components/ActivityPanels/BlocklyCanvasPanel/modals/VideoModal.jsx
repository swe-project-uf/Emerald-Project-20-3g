import React from 'react';
import Modal from 'react-modal';
import MentorActivityDetailModal from '../../../../views/Mentor/Classroom/Home/MentorActivityDetailModal';
import StudentCanvas from '../canvas/StudentCanvas';

const VideoModal = ({ isOpen, onClose, videoURL }) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Video Modal"
      style={{
        content: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        },
      }}
    >
      <button onClick={onClose} style={{ alignSelf: 'flex-end', marginBottom: '10px' }}>
        Close
      </button>
      {/* Center the iframe within the modal */}
      <iframe
        title="video"
        width="80%" // Adjust the width as needed
        height="90%" // Adjust the height as needed
        src={`https://www.youtube.com/embed/${videoURL}`}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ margin: 'auto' }}
      ></iframe>
    </Modal>
  );
};

export default VideoModal;
