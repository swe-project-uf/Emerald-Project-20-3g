import React, { useEffect, useState } from 'react';
import PublicCanvas from './canvas/PublicCanvas';
import StudentCanvas from './canvas/StudentCanvas';
import MentorCanvas from './canvas/MentorCanvas';
import ContentCreatorCanvas from './canvas/ContentCreatorCanvas';
import { useGlobalState } from '../../../Utils/userState';
import { getStudentClassroom } from '../../../Utils/requests';

// const BlocklyCanvasPanel = ({ activity, isSandbox, setActivity, activities}) => {
const BlocklyCanvasPanel = ({ activity, isSandbox, setActivity, activities }) => {
  console.log("hello bcp");
  let index = 0;

  if (activities && activities.length > 0) {
    for (let i = 0; i < activities.length; i++) {
      if (activities[i].id == activity.id) {
        index = i;
        break;
      }
    }
  }

  const [value] = useGlobalState('currUser');

  const userRole = value.role;

  switch (userRole) {
    case 'DefaultUser':
      return <PublicCanvas activity={activity} isSandbox={isSandbox} />;
    case 'Student':
      return <StudentCanvas activities={activities} index={index} />;
      // return <StudentCanvas activity={activity} />;
    case 'Mentor':
      return <MentorCanvas
      activity={activity}
      setActivity={setActivity}
      isSandbox={isSandbox}
      isMentorActivity={!activity.selectedToolbox && !isSandbox}
      />;
    case 'ContentCreator':
      return (
        <ContentCreatorCanvas
          activity={activity}
          setActivity={setActivity}
          isSandbox={isSandbox}
          isMentorActivity={!activity.selectedToolbox && !isSandbox}
        />
      );
    default:
      return <div></div>;
  }
};

export default BlocklyCanvasPanel;
