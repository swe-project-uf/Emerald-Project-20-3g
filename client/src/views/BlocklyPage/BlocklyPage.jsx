import { message } from "antd"
import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import BlocklyCanvasPanel from "../../components/ActivityPanels/BlocklyCanvasPanel/BlocklyCanvasPanel"
import NavBar from "../../components/NavBar/NavBar"
import {
  getAuthorizedWorkspaceToolbox,
  getActivityToolbox,
  getActivityToolboxAll,
} from "../../Utils/requests"
import { useGlobalState } from "../../Utils/userState"
import { getStudentClassroom } from "../../Utils/requests"

export default function BlocklyPage({ isSandbox }) {
  const [value] = useGlobalState("currUser")
  const [activity, setActivity] = useState({})
  const [activities, setActivities] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [learningStandard, setLearningStandard] = useState({});
  const [index, setIndex] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getStudentClassroom();
        if (res.data) {
          if (res.data.lesson_module && res.data.lesson_module.activities) {
            const fetchedActivities = res.data.lesson_module.activities || [];
            setActivities(fetchedActivities);
            setLearningStandard(res.data.lesson_module.name);

            const currentIndex = fetchedActivities.findIndex(a => a.number === activity.number);
            setIndex(currentIndex >= 0 ? currentIndex : 0);
          }
        } else {
          message.error(res.err);
        }
      } catch (error) {
        console.error("Error in getActivities: ", error);
        setActivities([]);
      }
    };


    const setup = async () => {
      await fetchData();
      setIsReady(true);

      // if we are in sandbox mode show all toolbox
      const sandboxActivity = JSON.parse(localStorage.getItem("sandbox-activity"))
      if (isSandbox) {
        const AllToolboxRes = await getActivityToolboxAll()
        if (!sandboxActivity?.id || value.role === "Mentor") {
          if (AllToolboxRes.data) {
            let loadedActivity = {
              ...sandboxActivity,
              toolbox: AllToolboxRes.data.toolbox,
            }
            localStorage.setItem("sandbox-activity", JSON.stringify(loadedActivity))
            setActivity(loadedActivity)
          } else {
            message.error(AllToolboxRes.err)
          }
        } else if (value.role === "ContentCreator") {
          const res = await getAuthorizedWorkspaceToolbox(sandboxActivity.id)
          if (res.data) {
            let loadedActivity = { ...sandboxActivity, selectedToolbox: res.data.toolbox }
            loadedActivity = { ...loadedActivity, toolbox: AllToolboxRes.data.toolbox }

            localStorage.setItem("sandbox-activity", JSON.stringify(loadedActivity))
            setActivity(loadedActivity)
          } else {
            message.error(res.err)
          }
        }
      }
      // else show toolbox based on the activity we are viewing
      else {
        const localActivity = JSON.parse(localStorage.getItem("my-activity"))

        if (localActivity) {
          if (localActivity.toolbox) {
            setActivity(localActivity)
          } else {
            const res = await getActivityToolbox(localActivity.id)
            if (res.data) {
              let loadedActivity = { ...localActivity, toolbox: res.data.toolbox }

              localStorage.setItem("my-activity", JSON.stringify(loadedActivity))
              setActivity(loadedActivity)
            } else {
              message.error(res.err)
            }
          }
        } else {
          navigate(-1)
        }
      }
    };

    setup();
  }, [isSandbox, navigate, value.role]);

  return (
    <div className="container nav-padding">
      <NavBar />
      <div className="flex flex-row">
        {isReady && (
          <BlocklyCanvasPanel 
            activity={activity}
            setActivity={setActivity} 
            isSandbox={isSandbox} 
            activities={activities} 
            learningStandard={learningStandard}
            index={index}
            setIndex={setIndex}
          />
        )}
      </div>
    </div>
  )
}
