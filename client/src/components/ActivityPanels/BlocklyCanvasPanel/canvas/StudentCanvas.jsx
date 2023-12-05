import React, { useEffect, useRef, useState, useReducer } from 'react';
import '../../ActivityLevels.less';
import { compileArduinoCode, handleSave } from '../../Utils/helpers';
import { message, Spin, Row, Col, Alert, Dropdown, Menu } from 'antd';
import {getActivityToolbox, getSaves} from '../../../../Utils/requests';
import CodeModal from '../modals/CodeModal';
import ConsoleModal from '../modals/ConsoleModal';
import PlotterModal from '../modals/PlotterModal';
import DisplayDiagramModal from '../modals/DisplayDiagramModal';
import VersionHistoryModal from '../modals/VersionHistoryModal';
import {
  connectToPort,
  handleCloseConnection,
  handleOpenConnection,
} from '../../Utils/consoleHelpers';
import ArduinoLogo from '../Icons/ArduinoLogo';
import PlotterLogo from '../Icons/PlotterLogo';
import { useNavigate } from 'react-router-dom';
import Lesson from '../../../Lesson/Lesson';
import { Link } from 'react-router-dom';
import ThreeLines from '../Icons/ThreeLines';

let plotId = 1;

export default function StudentCanvas({ activities, index, setIndex, learningStandard }) {

  const [hoverSave, setHoverSave] = useState(false);
  const [hoverUndo, setHoverUndo] = useState(false);
  const [hoverRedo, setHoverRedo] = useState(false);
  const [hoverCompile, setHoverCompile] = useState(false);
  const [hoverImage, setHoverImage] = useState(false);
  const [hoverConsole, setHoverConsole] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [showPlotter, setShowPlotter] = useState(false);
  const [plotData, setPlotData] = useState([]);
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [selectedCompile, setSelectedCompile] = useState(false);
  const [compileError, setCompileError] = useState('');
  const [saves, setSaves] = useState({});
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [lastAutoSave, setLastAutoSave] = useState(null);
  const [activity, setActivity] = useState(activities[index]);

  {/*new for menu collpase*/ }
  const [hoverMenu, setHoverMenu] = useState(false);
  const [showMenuIcons, setShowMenuIcons] = useState(false);

  const [forceUpdate] = useReducer((x) => x + 1, 0);
  const navigate = useNavigate();
  const workspaceRef = useRef(null);
  const activityRef = useRef(null);

  const replayRef = useRef([]);
  const clicks = useRef(0);

  const setWorkspace = () => {
    if (workspaceRef.current) {
      workspaceRef.current.dispose();
    }

    workspaceRef.current = window.Blockly.inject('blockly-canvas', {
      toolbox: document.getElementById('toolbox'),
    });
    window.Blockly.addChangeListener(blocklyEvent);
  };

  const loadSave = (selectedSave) => {
    try {
      let toLoad = activity.template;
      if (selectedSave !== -1) {
        if (lastAutoSave && selectedSave === -2) {
          toLoad = lastAutoSave.workspace;
          setLastSavedTime(getFormattedDate(lastAutoSave.updated_at));
        } else if (saves.current && saves.current.id === selectedSave) {
          toLoad = saves.current.workspace;
          setLastSavedTime(getFormattedDate(saves.current.updated_at));
        } else {
          const s = saves.past.find((save) => save.id === selectedSave);
          if (s) {
            toLoad = s.workspace;
            setLastSavedTime(getFormattedDate(s.updated_at));
          } else {
            message.error('Failed to restore save.');
            return;
          }
        }
      } else {
        setLastSavedTime(null);
      }
      let xml = window.Blockly.Xml.textToDom(toLoad);
      if (workspaceRef.current) workspaceRef.current.clear();
      window.Blockly.Xml.domToWorkspace(xml, workspaceRef.current);
      workspaceRef.current.clearUndo();
    } catch (e) {
      message.error('Failed to load save.');
    }
  };

  const pushEvent = (type, blockId = '') => {
    let blockType = '';
    if (blockId !== '') {
      let type = window.Blockly.mainWorkspace.getBlockById(blockId)?.type;
      type ? blockType = type : blockType = '';
    }

    let xml = window.Blockly.Xml.workspaceToDom(workspaceRef.current);
    let xml_text = window.Blockly.Xml.domToText(xml);
    replayRef.current.push({
      xml: xml_text,
      action: type,
      blockId: blockId,
      blockType: blockType,
      timestamp: Date.now(),
      clicks: clicks.current,
    });
  };

  let blocked = false;
  const blocklyEvent = (event) => {
    // if it is a click event, add click
    if (
        (event.type === 'ui' && event.element === 'click') ||
        event.element === 'selected'
    ) {
      clicks.current++;
    }

    // if it is other ui events or create events or is [undo, redo], return
    if (event.type === 'ui' || !event.recordUndo) {
      return;
    }

    // if event is in timeout, return
    if (event.type === 'change' && blocked) {
      return;
    }

    // if the event is change field value, only accept the latest change
    if (
      event.type === 'change' &&
      event.element === 'field' &&
      replayRef.current.length > 1 &&
      replayRef.current[replayRef.current.length - 1].action ===
      'change field' &&
      replayRef.current[replayRef.current.length - 1].blockId === event.blockId
    ) {
      replayRef.current.pop();
    }

    // event delete always comes after a move, ignore the move
    if (event.type === 'delete') {
      if (replayRef.current[replayRef.current.length - 1].action === 'move') {
        replayRef.current.pop();
      }
    }

    // if event is change, add the detail action type
    if (event.type === 'change' && event.element) {
      pushEvent(`${event.type} ${event.element}`, event.blockId);
    } else {
      pushEvent(event.type, event.blockId);
    }

    // timeout for half a second
    blocked = true;
    setTimeout(() => {
      blocked = false;
    }, 500);
  };

  useEffect(() => {
    // automatically save workspace every min
    let autosaveInterval = setInterval(async () => {
      if (workspaceRef.current && activityRef.current) {
        const res = await handleSave(
            activityRef.current.id,
            workspaceRef,
            replayRef.current
        );
        if (res.data) {
          setLastAutoSave(res.data[0]);
          setLastSavedTime(getFormattedDate(res.data[0].updated_at));
        }
      }
    }, 60000);

    // clean up - saves workspace and removes blockly div from DOM
    return async () => {
      clearInterval(autosaveInterval);
    };
  }, []);

  useEffect(() => { // WORKED WITH TA
    // once the activity state is set, set the workspace and save
    const setUp = async () => {
      console.log("TEST");
    //  console.log(!workspaceRef.current);
      console.log(activity);
      console.log(Object.keys(activity).length !== 0);
      activityRef.current = activity;
      if (activity && Object.keys(activity).length !== 0) {
        setWorkspace();

        let onLoadSave = null;
        const res = await getSaves(activity.id);
        console.log("id:" + activity.id);
        if (res.data) {
          if (res.data.current) onLoadSave = res.data.current;
          setSaves(res.data);
        } else {
          console.log(res.err);
        }

        if (onLoadSave) {
          let xml = window.Blockly.Xml.textToDom(onLoadSave.workspace);
          window.Blockly.Xml.domToWorkspace(xml, workspaceRef.current);
          replayRef.current = onLoadSave.replay;
          setLastSavedTime(getFormattedDate(onLoadSave.updated_at));
        } else if (activity.template) {
          let xml = window.Blockly.Xml.textToDom(activity.template);
          window.Blockly.Xml.domToWorkspace(xml, workspaceRef.current);
        }

        pushEvent('load workspace');
        workspaceRef.current.clearUndo();
      }
    };
    console.log("setting workspace on activity update");
    setUp();
  }, [activity, index]);

  const handleManualSave = async () => {
    // save workspace then update load save options
    pushEvent('save');
    const res = await handleSave(activity.id, workspaceRef, replayRef.current);
    if (res.err) {
      message.error(res.err);
    } else {
      setLastSavedTime(getFormattedDate(res.data[0].updated_at));
      message.success('Workspace saved successfully.');
    }

    const savesRes = await getSaves(activity.id);
    if (savesRes.data) setSaves(savesRes.data);
  };

  const handleUndo = () => {
    if (workspaceRef.current.undoStack_.length > 0) {
      workspaceRef.current.undo(false);
      pushEvent('undo');
    }
  };

  const handleRedo = () => {
    if (workspaceRef.current.redoStack_.length > 0) {
      workspaceRef.current.undo(true);
      pushEvent('redo');
    }
  };

  const handleConsole = async () => {
    if (showPlotter) {
      message.warning('Close serial plotter before openning serial monitor');
      return;
    }
    // if serial monitor is not shown
    if (!showConsole) {
      // connect to port
      await handleOpenConnection(9600, 'newLine');
      // if fail to connect to port, return
      if (typeof window['port'] === 'undefined') {
        message.error('Fail to select serial device');
        return;
      }
      setConnectionOpen(true);
      setShowConsole(true);
      pushEvent('show serial monitor');
    }
    // if serial monitor is shown, close the connection
    else {
      if (connectionOpen) {
        await handleCloseConnection();
        setConnectionOpen(false);
      }
      setShowConsole(false);
    }
  };

  const handlePlotter = async () => {
    if (showConsole) {
      message.warning('Close serial monitor before openning serial plotter');
      return;
    }

    if (!showPlotter) {
      await handleOpenConnection(
          9600,
          'plot',
          plotData,
          setPlotData,
          plotId,
          forceUpdate
      );
      if (typeof window['port'] === 'undefined') {
        message.error('Fail to select serial device');
        return;
      }
      setConnectionOpen(true);
      setShowPlotter(true);
      pushEvent('show serial plotter');
    } else {
      plotId = 1;
      if (connectionOpen) {
        await handleCloseConnection();
        setConnectionOpen(false);
      }
      setShowPlotter(false);
    }
  };
  const handleCompile = async () => {
    if (showConsole || showPlotter) {
      message.warning(
          'Close Serial Monitor and Serial Plotter before uploading your code'
      );
    } else {
      if (typeof window['port'] === 'undefined') {
        await connectToPort();
      }
      if (typeof window['port'] === 'undefined') {
        message.error('Fail to select serial device');
        return;
      }
      setCompileError('');
      await compileArduinoCode(
          workspaceRef.current,
          setSelectedCompile,
          setCompileError,
          activity,
          true
      );
      pushEvent('compile');
    }
  };

  const handleGoBack = () => {
    if (
        window.confirm(
            'All unsaved progress will be lost. Do you still want to go back?'
        )
    )
      navigate(-1);
  };



  {/*new code for menu collapse*/ }
  const handleMenuCollapse = async () => {
    setShowMenuIcons(prevState => !prevState);
  };



  const getFormattedDate = (value, locale = 'en-US') => {
    let output = new Date(value).toLocaleDateString(locale);
    return output + ' ' + new Date(value).toLocaleTimeString(locale);
  };

  const menu = (
      <Menu>
        <Menu.Item onClick={handlePlotter}>
          <PlotterLogo />
          &nbsp; Show Serial Plotter
        </Menu.Item>
        <Menu.Item>
          <CodeModal title={'Arduino Code'} workspaceRef={workspaceRef.current} />
        </Menu.Item>
      </Menu>
  );

  const AssignmentButtons = () => {
    return (
        <div className='flex flex-row'>
          <div style={assignmentButtonStyle} onClick={() => handleActivitySelection('previous')}>
            <p>Previous</p>
          </div>
          <div style={assignmentButtonStyle} onClick={() => handleActivitySelection('next')}>
            <p>Next</p>
          </div>
        {/* Add more buttons for other assignments as needed */}
      </div>
    );
  };

  // button selection handler
  const handleActivitySelection = (selection) => {
    if (selection === 'next') {
      // set current activity to the next one if it exists
      const nextIndex = index + 1;
      if (nextIndex < activities.length) {
        setIndex(nextIndex);
        activities[nextIndex].lesson_module_name = learningStandard;
        setActivity(activities[nextIndex]);
        localStorage.setItem('my-activity', JSON.stringify(activity));
        navigate('/workspace');
      }
    } else if (selection === 'previous') { 
      // set current activity to the previous one if it exists
      const prevIndex = index - 1;
      if (prevIndex >= 0) {
        setIndex(prevIndex);
        activities[prevIndex].lesson_module_name = learningStandard;
        setActivity(activities[prevIndex]);
        localStorage.setItem('my-activity', JSON.stringify(activity));
        navigate('/workspace');
      }
    }
    console.log("StudentCanvas", activities, index);
  };


  const assignmentButtonStyle = {
    color: '#FFFFFF',
    backgroundColor: '#5BABDE',
    border: 'none',
    padding: '10px 20px',
    margin: '5px',
    borderRadius: '80px',
    cursor: 'pointer',
    width: '40%',
    height: '70%',
    marginLeft: '5%',
    marginRight: '5%'
  }

  return (
    <div id='horizontal-container' className='flex flex-column'>
      <style>
        {`
              .assignment-button:hover {
                background-color: #0056b3;
              }
              .assignment-button:focus {
                outline: none;
              }
            `}
      </style>


      <div className='flex flex-column'>
        <div className='flex flex-row'>
          <div className='flex flex-column'>
            <AssignmentButtons /> {/*  buttons */}
            <Lesson
              lesson_title={"Activity " + activities[index].number}
              lesson_contents={activities[index].description}
            />
          </div>
          <div
            id='bottom-container'
            className='flex flex-column vertical-container overflow-visible'
          >
            <Spin
              tip='Compiling Code Please Wait... It may take up to 20 seconds to compile your code.'
              className='compilePop'
              size='large'
              spinning={selectedCompile}
            >
              <Row id='icon-control-panel'>
                <Col flex='none' id='section-header'>
                  {activity.lesson_module_name}
                </Col>
                <Col flex='auto'>
                  <Row align='middle' justify='end' id='description-container'>

                    {/* show or dont show */}
                    <div>
                      {showMenuIcons && (
                        <div
                          className="menu"
                          style={{
                            position: 'absolute',
                            zIndex: 100,
                            top: '100%',
                            right: 0,
                            backgroundColor: 'white',
                            border: '1px solid #3D5C82',
                            padding: '5px',
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <div style={{alignItems:'center'}} className='flex flex-column'>
                            <Col flex={'30px'}>
                              <button
                                onClick={handleGoBack}
                                id='link'
                                className='flex flex-column'
                              >
                                <i id='icon-btn' className='fa fa-arrow-left' />
                              </button>
                            </Col>
                            <Col flex='auto'/>

                            <Col flex={'25px'}>
                              {lastSavedTime ? `Last changes saved ${lastSavedTime}` : ''}
                            </Col>
                            <Col flex={'50px'} >
                              <Row>
                                <Col className='flex flex-row' id='icon-align'>
                                  <VersionHistoryModal
                                    saves={saves}
                                    lastAutoSave={lastAutoSave}
                                    defaultTemplate={activity}
                                    getFormattedDate={getFormattedDate}
                                    loadSave={loadSave}
                                    pushEvent={pushEvent}
                                  />
                                  <button
                                    onClick={handleManualSave}
                                    id='link'
                                    className='flex flex-column'
                                  >
                                    <i
                                      id='icon-btn'
                                      className='fa fa-save'
                                      onMouseEnter={() => setHoverSave(true)}
                                      onMouseLeave={() => setHoverSave(false)}
                                    />
                                    {hoverSave && (
                                      <div className='popup ModalCompile4'>Save</div>
                                    )}
                                  </button>
                                </Col>
                              </Row>
                            </Col>
                            <Col flex={'30px'}>
                              <div
                                id='action-btn-container'
                                className='flex space-around'
                              >
                                <Col className='flex flex-row' id='icon-align'>
                                  <button
                                    onClick={handleUndo}
                                    id='link'
                                    className='flex flex-column'
                                  >
                                    <i
                                      id='icon-btn'
                                      className='fa fa-undo-alt'
                                      style={
                                        workspaceRef.current
                                          ? workspaceRef.current.undoStack_.length < 1
                                            ? { color: 'grey', cursor: 'default' }
                                            : null
                                          : null
                                      }
                                      onMouseEnter={() => setHoverUndo(true)}
                                      onMouseLeave={() => setHoverUndo(false)}
                                    />
                                    {hoverUndo && (
                                      <div className='popup ModalCompile4'>Undo</div>
                                    )}
                                  </button>
                                  <button
                                    onClick={handleRedo}
                                    id='link'
                                    className='flex flex-column'
                                  >
                                    <i
                                      id='icon-btn'
                                      className='fa fa-redo-alt'
                                      style={
                                        workspaceRef.current
                                          ? workspaceRef.current.redoStack_.length < 1
                                            ? { color: 'grey', cursor: 'default' }
                                            : null
                                          : null
                                      }
                                      onMouseEnter={() => setHoverRedo(true)}
                                      onMouseLeave={() => setHoverRedo(false)}
                                    />
                                    {hoverRedo && (
                                      <div className='popup ModalCompile4'>Redo</div>
                                    )}
                                  </button>
                                </Col>
                                <ArduinoLogo
                                  setHoverCompile={setHoverCompile}
                                  handleCompile={handleCompile}
                                  showMenuI={showMenuIcons}
                                />
                                {hoverCompile && (
                                  <div className='popup ModalCompile'>
                                    Upload to Arduino
                                  </div>
                                )}
                                <DisplayDiagramModal
                                  image={activity.images}
                                />
                                <i
                                  onClick={() => handleConsole()}
                                  className='fas fa-terminal hvr-info'
                                  style={{ marginLeft: '6px' }}
                                  onMouseEnter={() => setHoverConsole(true)}
                                  onMouseLeave={() => setHoverConsole(false)}
                                />
                                {hoverConsole && (
                                  <div className='popup ModalCompile'>
                                    Show Serial Monitor
                                  </div>
                                )}
                                <Dropdown overlay={menu}>
                                  <i className='fas fa-ellipsis-v'></i>
                                </Dropdown>
                              </div>
                            </Col>
                          </div>
                        </div>
                      )}

                      <Col flex={'30px'}>
                        <ThreeLines
                          setHoverMenu={setHoverMenu}
                          handleMenuCollapse={handleMenuCollapse}
                        />
                        {hoverMenu && (
                          <div className='popup Menu Lines' style={showMenuIcons ? { right: 265} : { right: 0 }}>
                            {showMenuIcons ? 'Collapse Menu' : 'Expand Menu'}
                          </div>
                        )}
                      </Col>

                    </div>


                  </Row>
                </Col>
              </Row>
              <div id='blockly-canvas' />
            </Spin>
          </div>
        </div>

        <ConsoleModal
          show={showConsole}
          connectionOpen={connectionOpen}
          setConnectionOpen={setConnectionOpen}
        ></ConsoleModal>
        <PlotterModal
          show={showPlotter}
          connectionOpen={connectionOpen}
          setConnectionOpen={setConnectionOpen}
          plotData={plotData}
          setPlotData={setPlotData}
          plotId={plotId}
        />
      </div>

      {/* This xml is for the blocks' menu we will provide. Here are examples on how to include categories and subcategories */}
      <xml id='toolbox' is='Blockly workspace'>
        {
          // Maps out block categories
          activity &&
          activity.toolbox &&
          activity.toolbox.map(([category, blocks]) => (
            <category name={category} is='Blockly category' key={category}>
              {
                // maps out blocks in category
                // eslint-disable-next-line
                blocks.map((block) => {
                  return (
                    <block
                      type={block.name}
                      is='Blockly block'
                      key={block.name}
                    />
                  );
                })
              }
            </category>
          ))
        }
      </xml>

        {compileError && (
            <Alert
                message={compileError}
                type='error'
                closable
                onClose={(e) => setCompileError('')}
            ></Alert>
        )}
      </div>
  );
}