import React, { useEffect, useState } from 'react';
import PublicCanvas from './canvas/PublicCanvas';
import StudentCanvas from './canvas/StudentCanvas';
import MentorCanvas from './canvas/MentorCanvas';
import ContentCreatorCanvas from './canvas/ContentCreatorCanvas';
import { useGlobalState } from '../../../Utils/userState';

const BlocklyCanvasPanel = ({ activity, isSandbox, setActivity, activities, learningStandard, index, setIndex }) => {

  const [value] = useGlobalState('currUser');

  const userRole = value.role;

  switch (userRole) {
    case 'DefaultUser':
      return <PublicCanvas activity={activity} isSandbox={isSandbox} />;
    case 'Student':
      return <StudentCanvas 
      activities={activities} 
      index={index} 
      setIndex={setIndex} 
      learningStandard={learningStandard}
      />;
    case 'Mentor':
      return <MentorCanvas
      activity={activity}
      setActivity={setActivity}
      isSandbox={isSandbox}
      isMentorActivity={!activity.selectedToolbox && !isSandbox}
      />;
    case 'ContentCreator':
      return <ContentCreatorCanvas
      activity={activity}
      setActivity={setActivity}
      isSandbox={isSandbox}
      isMentorActivity={!activity.selectedToolbox && !isSandbox}
      />;
    default:
      return <div></div>;
  }
};

export default BlocklyCanvasPanel;
