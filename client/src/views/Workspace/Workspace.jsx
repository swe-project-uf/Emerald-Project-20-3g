import React, { useEffect, useState } from 'react';
import { getActivityToolbox } from '../../Utils/requests.js';
import BlocklyCanvasPanel from '../../components/ActivityPanels/BlocklyCanvasPanel/BlocklyCanvasPanel';
import { message } from 'antd';
import NavBar from '../../components/NavBar/NavBar';
import { useNavigate } from 'react-router-dom';

async function getActivities() {
  try {
    const res = await getStudentClassroom();
    if (res.data) {
      if (res.data.lesson_module && res.data.lesson_module.activities) {
        return res.data.lesson_module.activities || [];
      }
    } else {
      message.error(res.err);
    }
  } catch (error) {
    console.error(error);
    return [];
  }
}

export default function Workspace({ handleLogout }) {
  const [activity, setActivity] = useState({});
  const [activities, setActivities] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      const activitiesData = await getActivities();
      setActivities(activitiesData);
    }

    fetchData();
  }, []);

  const localActivity = JSON.parse(localStorage.getItem('my-activity'));

  if (localActivity) {
    if (localActivity.toolbox) {
      setActivity(localActivity);
    } else {
      getActivityToolbox(localActivity.id).then((res) => {
        if (res.data) {
          let loadedActivity = { ...localActivity, toolbox: res.data.toolbox };

          localStorage.setItem('my-activity', JSON.stringify(loadedActivity));
          setActivity(loadedActivity);
        } else {
          message.error(res.err);
        }
      });
    }
  } else {
    navigate(-1);
  }

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
      <div className='container flex flex-row nav-padding'>
        <NavBar isStudent={true} />
        <BlocklyCanvasPanel
            activity={activity}
            lessonName={`${activity.lesson_module_name}, Activity ${activity.number}`}
            handleGoBack={handleGoBack}
            handleLogout={handleLogout}
            isStudent={true}
            activities={activities}
        />
      </div>
  );
}